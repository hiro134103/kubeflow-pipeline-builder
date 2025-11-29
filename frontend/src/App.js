import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';

import { 
  AppBar, Toolbar, Typography, Box
} from '@mui/material';
import { CssBaseline } from "@mui/material";

// カスタムフックとコンポーネント
import { useNodeArguments } from './hooks/useNodeArguments';
import { usePipelineFlow } from './hooks/usePipelineFlow';
import NodeHeader from './components/NodeHeader';
import ArgumentsSection from './components/ArgumentsSection';
import OutputTypeSelector from './components/OutputTypeSelector';
import CodeEditorDialog from './components/CodeEditorDialog';
import GeneratedCodeDialog from './components/GeneratedCodeDialog';
import SidebarPanel from './components/SidebarPanel';
import FlowArea from './components/FlowArea';
import { generatePipelineCode, validateForCodeGeneration } from './utils/codeGenerator';
import { validateAllNodes } from './utils/nodeNormalizer';

// ---------------------------------------------------
// ✅ パフォーマンス最適化: CustomNode
// 分割されたサブコンポーネントを活用
// ---------------------------------------------------
const CustomNode = React.memo(({ data, id }) => {
  const available = data.availableSources || [];
  const pipelineParamsList = (data.pipelineParams || []).filter(p => p.key);

  const { args, addArg, removeArg, moveArg, updateArg } = useNodeArguments(
    id,
    data,
    data.onArgChange
  );

  return (
    <Box sx={{
      borderRadius: 1,
      boxShadow: 1,
      border: '1px solid #374151',
      minWidth: 100,
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Left} id="input" />

      {/* Header */}
      <NodeHeader
        label={data.label}
        componentType={data.componentType}
        onRename={() => data.onRename?.(id)}
        onOpenCode={() => data.onOpenCode?.(id)}
        onDelete={() => data.onDelete?.(id)}
      />

      {/* Body */}
      <Box sx={{ px: 1, py: 1, backgroundColor: 'white' }}>
        {/* Arguments */}
        <ArgumentsSection
          args={args}
          pipelineParamsList={pipelineParamsList}
          available={available}
          onAddArg={addArg}
          onUpdateArg={updateArg}
          onRemoveArg={removeArg}
          onMoveArg={moveArg}
        />

        {/* Output */}
        <OutputTypeSelector
          returnType={data.returnType}
          onOutputTypeChange={(type) => data.onOutputTypeChange?.(id, type)}
        />
      </Box>

      <Handle type="source" position={Position.Right} id="output" />
    </Box>
  );
}, (prevProps, nextProps) => {
  // ✅ カスタム比較関数: 必要な props のみを比較
  return (
    prevProps.id === nextProps.id &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.componentType === nextProps.data.componentType &&
    prevProps.data.returnType === nextProps.data.returnType &&
    prevProps.data.args === nextProps.data.args &&
    prevProps.data.availableSources?.length === nextProps.data.availableSources?.length &&
    prevProps.data.pipelineParams?.length === nextProps.data.pipelineParams?.length
  );
});

const nodeTypes = { custom: CustomNode };

const defaultComponentDefinitions = [
  {
    type: 'blank',
    label: 'Blank Component',
    // ✅ 新形式: args を使用（params は非推奨）
    args: [],
    codeString: `print("hello world")`
  },
];

// ---------------------------------------------------
// ✅ App Component (改善版)
// ---------------------------------------------------
function App() {
  // ------------------------ 1. State ------------------------
  const reactFlowWrapper = useRef(null);
  const [pipelineName, setPipelineName] = useState('MyPipeline');
  const [pipelineParams, setPipelineParams] = useState([
    { id: 1, key: 'input_path', type: 'str', value: 's3://my-data' },
  ]);
  const [showCode, setShowCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Code Editor State
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editingCode, setEditingCode] = useState('');

  // Sidebar State
  // const [components, setComponents] = useState(defaultComponentDefinitions);

  // ------------------------ 2. Hooks ------------------------
  // ✅ 改善: usePipelineFlowからコールバックを分離
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDragOver,
    onReconnect,
    onReconnectStart,
    onReconnectEnd,
    addNode,
    deleteNode,
    renameNode,
    onArgChange,
    onOutputTypeChange,
    updateNodeData,
    injectCallbacksToNode, // ✅ 名前変更
  } = usePipelineFlow(pipelineParams);

  // ダイアログが開くときに、最新のノード情報から常にコードを取得
  React.useEffect(() => {
    if (codeEditorOpen && editingNodeId) {
      const node = nodes.find(n => n.id === editingNodeId);
      const code = node?.data?.codeString || '';
      setEditingCode(code);
    }
  }, [codeEditorOpen, editingNodeId, nodes]);

  // ------------------------ 3. ノード操作ハンドラ (App.js内で定義) ------------------------
  
  /**
   * ✅ コードエディタを開く
   */
  const openCodeEditor = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    const code = node?.data?.codeString || '';
    setEditingNodeId(nodeId);
    setEditingCode(code);
    setCodeEditorOpen(true);
  }, [nodes]);

  /**
   * ✅ ノードの名前変更
   */
  const handleRename = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    const newName = prompt('Enter new node label:', node?.data.label || '');
    if (newName) {
      renameNode(nodeId, newName);
    }
  }, [nodes, renameNode]);

  /**
   * ✅ ノード削除
   */
  const handleDelete = useCallback((nodeId) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('Delete this node?')) {
      deleteNode(nodeId);
    }
  }, [deleteNode]);

  /**
   * ✅ 改善: ノード追加
   * - コールバックを含めたcomponentDefを渡す
   */
  const handleAddNode = useCallback((componentDef, position) => {
    // 位置情報とコールバックをcomponentDefに追加
    const defWithPosition = { 
      ...componentDef, 
      position,
      callbacks: {
        onArgChange,
        onOutputTypeChange,
        onOpenCode: openCodeEditor,
        onRename: handleRename,
        onDelete: handleDelete,
      }
    };
    
    // ノード作成（コールバック付き）
    addNode(defWithPosition);
  }, [addNode, onArgChange, onOutputTypeChange, openCodeEditor, handleRename, handleDelete]);

  // ✅ コールバック関数は各ノード追加時に注入されるため、useEffectは不要

  // ------------------------ 4. Pipeline Params Handlers ------------------------
  
  const handleAddPipelineParam = useCallback(() => {
    setPipelineParams((prev) => [
      ...prev,
      { id: Date.now(), key: `new_param_${prev.length + 1}`, type: 'str', value: '' },
    ]);
  }, []);

  const handleUpdatePipelineParam = useCallback((index, newKey, newValue, newType) => {
    setPipelineParams((prev) =>
      prev.map((param, i) => {
        if (i === index) {
          return { ...param, key: newKey, value: newValue, type: newType };
        }
        return param;
      })
    );
  }, []);

  const handleRemovePipelineParam = useCallback((index) => {
    setPipelineParams((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ------------------------ 5. Drag & Drop Handlers ------------------------
  
  const handleOnDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const componentData = event.dataTransfer.getData('application/reactflow');

      if (typeof componentData === 'undefined' || !componentData) {
        return;
      }

      const componentDef = JSON.parse(componentData);

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      handleAddNode(componentDef, position);
    },
    [handleAddNode]
  );

  /**
   * ✅ コードエディタの保存
   */
  const saveNodeCode = useCallback((newCode) => {
    const codeToSave = typeof newCode === 'string' ? newCode : editingCode;
    updateNodeData(editingNodeId, { codeString: codeToSave });
  }, [editingNodeId, editingCode, updateNodeData]);

  // ------------------------ 6. Code Generation & Download ------------------------

  const handleGenerateCode = useCallback(() => {
    if (!nodes.length) {
      alert('Please add at least one node');
      return;
    }

    // ✅ データ構造のバリデーション（開発環境）
    if (process.env.NODE_ENV === 'development') {
      validateAllNodes(nodes);
    }

    // ✅ コード生成前のバリデーション
    const validation = validateForCodeGeneration(nodes, pipelineParams);
    if (!validation.valid) {
      const errorMessage = 'Code generation failed:\n\n' + 
        validation.errors.map(e => `• ${e}`).join('\n');
      alert(errorMessage);
      console.error('Code generation errors:', validation.errors);
      return;
    }

    try {
      const code = generatePipelineCode(
        nodes,
        edges,
        pipelineParams,
        pipelineName,
        defaultComponentDefinitions
      );
      console.log('Generated code:', code);
      setGeneratedCode(code);
      setShowCode(true);
    } catch (error) {
      console.error('Code generation error:', error);
      alert(`Failed to generate code: ${error.message}`);
    }
  }, [nodes, edges, pipelineParams, pipelineName]);

  const downloadPipelineCode = useCallback(() => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pipelineName}.py`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedCode, pipelineName]);

  // ------------------------ 7. Render ------------------------
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', m: 0, p: 0 }}>
      <CssBaseline />
      
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'flex-start', gap: 3 }}>
          <Typography variant="h5">Pipeline Builder</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">Pipeline Name:</Typography>
            <input
              type="text"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              style={{ padding: 5, borderRadius: 4, border: '1px solid #ccc' }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* メインコンテンツエリア (Sidebar + Flow) */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* サイドバー */}
        <SidebarPanel
          pipelineParams={pipelineParams}
          onAddPipelineParam={handleAddPipelineParam}
          onUpdatePipelineParam={handleUpdatePipelineParam}
          onRemovePipelineParam={handleRemovePipelineParam}
          componentDefinitions={defaultComponentDefinitions}
          onComponentDragStart={() => {}}
          onComponentClick={(comp) => handleAddNode(comp)}
          nodes={nodes}
        />

        {/* Flowエリア */}
        <FlowArea
          ref={reactFlowWrapper}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={handleOnDrop}
          onDragOver={onDragOver}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          nodeTypes={nodeTypes}
          onGenerateCode={handleGenerateCode}
        />

      </Box>

      {/* ノードコードエディタダイアログ */}
      <CodeEditorDialog
        open={codeEditorOpen}
        code={editingCode}
        args={editingNodeId ? nodes.find(n => n.id === editingNodeId)?.data?.args || [] : []}
        onClose={() => {
          setCodeEditorOpen(false);
          setEditingNodeId(null);
          setEditingCode('');
        }}
        onSave={(code) => {
          saveNodeCode(code);
          setCodeEditorOpen(false);
          setEditingNodeId(null);
          setEditingCode('');
        }}
      />

      {/* 生成コードダイアログ */}
      <GeneratedCodeDialog
        open={showCode}
        code={generatedCode}
        pipelineName={pipelineName}
        onClose={() => setShowCode(false)}
        onDownload={downloadPipelineCode}
      />
    </Box>
  );
}

export default App;