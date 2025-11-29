import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import Editor from '@monaco-editor/react';
import LSPClient from '../utils/lspClient';

/**
 * CodeEditorDialog - ノードコード編集ダイアログ
 * 
 * 責務:
 * - Monaco エディタの表示
 * - コード編集・保存
 * - パラメータの動的補完
 */

/**
 * LSP補完種別をMonaco種別に変換
 */
function _getMonacoCompletionKind(lspKind) {
  // LSP CompletionItemKind: Module=9, Class=5, Function=12, Variable=13, Keyword=14
  const kindMap = {
    9: 9,   // Module -> Module
    5: 5,   // Class -> Class
    12: 12, // Function -> Function
    23: 13, // Variable -> Variable
    13: 13, // Variable -> Variable
    14: 14, // Keyword -> Keyword
  };
  return kindMap[lspKind] || 13; // Default to Variable
}

const CodeEditorDialog = React.memo(
  ({ open, code, onClose, onSave, args = [] }) => {
    const [editingCode, setEditingCode] = React.useState('');
    const editorRef = React.useRef(null);
    const lspClientRef = React.useRef(null);

    // Initialize LSP Client
    React.useEffect(() => {
      console.log('[CodeEditorDialog] Initializing LSP Client...');
      lspClientRef.current = new LSPClient('http://localhost:8000');
      lspClientRef.current.initialize().then((success) => {
        if (success) {
          console.log('[CodeEditorDialog] LSP Client initialized successfully');
        } else {
          console.error('[CodeEditorDialog] LSP Client initialization returned false');
        }
      }).catch(err => {
        console.error('[CodeEditorDialog] LSP Client initialization error:', err);
      });
    }, []);

    // Register completion provider once on mount
    React.useEffect(() => {
      const registerCompletionProvider = () => {
        if (!editorRef.current) {
          return false;
        }

        const editor = editorRef.current;
        const monaco = editor._domElement?.ownerDocument?.defaultView?.monaco;

        if (!monaco) {
          console.error('[CodeEditorDialog] Monaco object not found');
          return false;
        }

        const model = editor.getModel();

        // パラメータ名の配列を生成
        const paramNames = (args || []).map(arg => arg.name || '').filter(Boolean);

        // LSP補完とパラメータ補完を統合したプロバイダー
        const disposable = monaco.languages.registerCompletionItemProvider('python', {
          triggerCharacters: ['.', ' ', '('],
          provideCompletionItems: async (model, position) => {
            let suggestions = [];

            try {
              // パラメータ補完
              const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              });

              const match = textUntilPosition.match(/\b\w*$/);
              if (match) {
                const word = match[0];
                const range = new monaco.Range(
                  position.lineNumber,
                  position.column - word.length,
                  position.lineNumber,
                  position.column
                );

                const paramSuggestions = paramNames.map((paramName, index) => ({
                  label: paramName,
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: paramName,
                  range: range,
                  documentation: `Parameter: ${paramName}`,
                  sortText: `0${index}`, // パラメータを最上位に表示
                }));

                suggestions = suggestions.concat(paramSuggestions);
              }

              // LSP補完
              if (lspClientRef.current && lspClientRef.current.initialized) {
                const fullText = model.getValue();
                const lineNumber = position.lineNumber - 1;
                const column = position.column - 1;

                const completions = await lspClientRef.current.getCompletions(
                  fullText,
                  lineNumber,
                  column
                );

                if (completions && completions.length > 0) {
                  const lspSuggestions = completions.map((completion, index) => {
                    const kind = _getMonacoCompletionKind(completion.kind);
                    return {
                      label: completion.label,
                      kind: kind,
                      detail: completion.detail || '',
                      documentation: completion.documentation || '',
                      insertText: completion.insertText || completion.label,
                      sortText: `1${String(index).padStart(3, '0')}`, // LSP補完は下位に表示
                    };
                  });

                  suggestions = suggestions.concat(lspSuggestions);
                }
              }
            } catch (error) {
              console.error('[LSP] Completion error:', error);
            }

            return { suggestions };
          },
        });

        return disposable;
      };

      // Try to register, with a small delay to ensure editor is ready
      const timer = setTimeout(() => {
        registerCompletionProvider();
      }, 500);

      return () => clearTimeout(timer);
    }, [args]);

    // ダイアログが開く、または code が変わるときに確実に同期
    React.useEffect(() => {
      if (open) {
        setEditingCode(code || '');
      }
    }, [open, code]);

    const handleEditorDidMount = React.useCallback((editor, monaco) => {
      editorRef.current = editor;

      editor.addCommand(monaco.KeyCode.Space, () => {
        const position = editor.getPosition();
        if (!position) return;
        const model = editor.getModel();
        if (!model) return;
        editor.executeEdits(
          'my-space-fix',
          [
            {
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column
              ),
              text: ' ',
              forceMoveMarkers: true,
            },
          ],
          [
            new monaco.Selection(
              position.lineNumber,
              position.column + 1,
              position.lineNumber,
              position.column + 1
            ),
          ]
        );
      });
    }, []);

    const handleSave = React.useCallback(() => {
      onSave?.(editingCode);
    }, [editingCode, onSave]);

    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Edit Node Code</DialogTitle>
        <DialogContent>
          <Editor
            height="400px"
            language="python"
            value={editingCode}
            onChange={(value) => setEditingCode(value)}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false
              },
              suggestOnTriggerCharacters: true,
              suggest: {
                enabled: true,
                showMethods: true,
                showFunctions: true,
                showConstructors: true,
                showDeprecated: true,
                showFields: true,
                showVariables: true,
                showClasss: true,
                showStructs: true,
                showInterfaces: true,
                showModules: true,
                showProperties: true,
                showEnums: true,
                showEnumMembers: true,
                showKeywords: true,
                showWords: true,
                showColors: false,
                showFiles: false,
                showReferences: false,
                showFolders: false,
                showUnits: false,
                showValues: true,
                showOperators: false,
                showIssues: false,
                showSnippets: false,
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);

CodeEditorDialog.displayName = 'CodeEditorDialog';

export default CodeEditorDialog;
