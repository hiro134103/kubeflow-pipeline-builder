import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import BuildIcon from '@mui/icons-material/Build';

/**
 * GeneratedCodeDialog - 生成されたパイプラインコード表示・ダウンロードダイアログ
 * 
 * 責務:
 * - 生成コードの表示
 * - Python ファイルとしてのダウンロード機能
 * - YAML へのコンパイル機能
 */
const GeneratedCodeDialog = React.memo(
  ({ open, code, pipelineName, onClose, onDownload, onCompile }) => {
    const [isCompiling, setIsCompiling] = React.useState(false);

    const handleDownload = React.useCallback(() => {
      onDownload?.();
    }, [onDownload]);

    const handleCompile = React.useCallback(async () => {
      setIsCompiling(true);
      try {
        await onCompile?.();
      } finally {
        setIsCompiling(false);
      }
    }, [onCompile]);

    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Generated Pipeline Code</DialogTitle>
        <DialogContent>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              fontSize: 14,
              margin: 0,
              padding: 0,
            }}
          >
            {code}
          </pre>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCompile}
            startIcon={<BuildIcon />}
            variant="contained"
            color="success"
            disabled={isCompiling}
          >
            {isCompiling ? 'Compiling...' : 'Compile to YAML'}
          </Button>
          <Button
            onClick={handleDownload}
            startIcon={<DownloadIcon />}
            variant="contained"
          >
            Download Python
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }
);

GeneratedCodeDialog.displayName = 'GeneratedCodeDialog';

export default GeneratedCodeDialog;
