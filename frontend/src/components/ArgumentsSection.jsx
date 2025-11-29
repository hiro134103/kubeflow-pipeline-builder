import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArgRow from './ArgRow';

/**
 * ArgumentsSection - ノードの引数セクション
 * 
 * 責務:
 * - 引数リストの表示・管理
 * - 引数追加ボタンの制御
 * - ArgRow コンポーネントの並列化
 */
const ArgumentsSection = React.memo(
  ({ args, pipelineParamsList, available, onAddArg, onUpdateArg, onRemoveArg, onMoveArg }) => {
    const handleAddArg = React.useCallback(() => {
      onAddArg?.();
    }, [onAddArg]);

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#4b5563', fontSize: 11 }}>
            Args
          </Typography>
          <IconButton size="small" onClick={handleAddArg} sx={{ p: 0.3 }}>
            <AddIcon fontSize="inherit" />
          </IconButton>
        </Box>

        {args.length === 0 && (
          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: 10, mb: 1 }}>
            No arguments. Click + to add.
          </Typography>
        )}

        {args.map((arg, idx) => (
          <ArgRow
            key={arg.id}
            arg={arg}
            index={idx}
            args={args}
            pipelineParamsList={pipelineParamsList}
            available={available}
            onUpdate={onUpdateArg}
            onRemove={onRemoveArg}
            onMove={onMoveArg}
          />
        ))}
      </Box>
    );
  }
);

ArgumentsSection.displayName = 'ArgumentsSection';

export default ArgumentsSection;
