import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

/**
 * GeneratedCodeDialog - 生成されたパイプラインコード表示・ダウンロードダイアログ
 * 
 * 責務:
 * - 生成コードの表示
 * - Python ファイルとしてのダウンロード機能
 */
const GeneratedCodeDialog = React.memo(
  ({ open, code, pipelineName, onClose, onDownload }) => {
    const handleDownload = React.useCallback(() => {
      onDownload?.();
    }, [onDownload]);

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
