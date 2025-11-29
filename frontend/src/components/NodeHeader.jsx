import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import DeleteIcon from '@mui/icons-material/Delete';
import CreateIcon from '@mui/icons-material/Create';

/**
 * NodeHeader - ノードのヘッダー部分
 * 
 * 責務:
 * - ノードのラベル・コンポーネント型の表示
 * - アクション（編集・コード・削除）ボタン
 * - ノードの色分け
 */
const NodeHeader = React.memo(
  ({ label, componentType, onRename, onOpenCode, onDelete }) => {
    const getNodeColor = (type) => {
      const colors = {
        'blank': '#9ca3af',
      };
      return colors[type] || '#6b7280';
    };

    const handleRename = React.useCallback(() => {
      onRename?.();
    }, [onRename]);

    const handleOpenCode = React.useCallback(() => {
      onOpenCode?.();
    }, [onOpenCode]);

    const handleDelete = React.useCallback(() => {
      onDelete?.();
    }, [onDelete]);

    return (
      <Box
        sx={{
          px: 1.2,
          py: 0.6,
          backgroundColor: getNodeColor(componentType),
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontSize: 12, fontWeight: 'bold', lineHeight: 1 }}
            >
              {label}
            </Typography>

            {componentType !== 'blank' && (
              <Typography variant="caption" sx={{ fontSize: 10, opacity: 0.8 }}>
                {componentType}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right side Icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
          <IconButton
            size="small"
            onClick={handleRename}
            sx={{ color: 'white', p: 0.3 }}
          >
            <CreateIcon fontSize="inherit" />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleOpenCode}
            sx={{ color: 'white', p: 0.3 }}
          >
            <CodeIcon fontSize="inherit" />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleDelete}
            sx={{ color: 'white', p: 0.3 }}
          >
            <DeleteIcon fontSize="inherit" />
          </IconButton>
        </Box>
      </Box>
    );
  }
);

NodeHeader.displayName = 'NodeHeader';

export default NodeHeader;
