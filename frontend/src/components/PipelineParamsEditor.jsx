import React from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

/**
 * ✅ パフォーマンス最適化版: PipelineParamsEditor
 * 
 * 改善点:
 * - React.memoで不要な再レンダリングを防止
 * - 個別のパラメータ行をメモ化
 */

// ✅ 個別のパラメータ行をメモ化
const ParamRow = React.memo(({ param, index, onUpdate, onRemove }) => {
  const handleKeyChange = React.useCallback((e) => {
    onUpdate(index, e.target.value, param.value, param.type);
  }, [index, param.value, param.type, onUpdate]);

  const handleValueChange = React.useCallback((e) => {
    onUpdate(index, param.key, e.target.value, param.type);
  }, [index, param.key, param.type, onUpdate]);

  const handleTypeChange = React.useCallback((e) => {

    onUpdate(index, param.key, param.value, e.target.value);
  }, [index, param.key, param.value, onUpdate]);

  const handleRemove = React.useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
      {/* Key Input */}
      <input
        type="text"
        placeholder="Key"
        value={param.key}
        onChange={handleKeyChange}
        style={{ 
          flex: 1, 
          padding: 8, 
          fontSize: 14, 
          borderRadius: 4, 
          border: '1px solid #d1d5db' 
        }}
      />
      
      {/* Value Input */}
      <input
        type="text"
        placeholder="Value"
        value={param.value}
        onChange={handleValueChange}
        style={{ 
          flex: 1, 
          padding: 8, 
          fontSize: 14, 
          borderRadius: 4, 
          border: '1px solid #d1d5db' 
        }}
      />
      
      {/* Type Select */}
      <select
        value={param.type || 'str'}
        onChange={handleTypeChange}
        style={{ 
          width: 120, 
          marginRight: 4, 
          padding: 8, 
          fontSize: 14, 
          borderRadius: 4, 
          border: '1px solid #d1d5db' 
        }}
      >
        <option value="str">str</option>
        <option value="int">int</option>
        <option value="float">float</option>
        <option value="bool">bool</option>
      </select>
      
      {/* Delete Button */}
      <IconButton size="small" onClick={handleRemove}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}, (prevProps, nextProps) => {
  // カスタム比較: paramの内容が同じなら再レンダリングしない
  return (
    prevProps.index === nextProps.index &&
    prevProps.param.key === nextProps.param.key &&
    prevProps.param.value === nextProps.param.value &&
    prevProps.param.type === nextProps.param.type
  );
});

ParamRow.displayName = 'ParamRow';

// ✅ メインコンポーネントをメモ化
const PipelineParamsEditor = React.memo(({ 
  pipelineParams = [], 
  onAddPipelineParam, 
  onUpdatePipelineParam, 
  onRemovePipelineParam 
}) => {
  return (
    <Box sx={{ 
      mb: 2, 
      p: 2, 
      border: '1px solid #e5e7eb', 
      borderRadius: 2, 
      backgroundColor: '#f9fafb' 
    }}>
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Typography variant="caption" sx={{ color: '#6b7280' }}>
          Pipeline Parameters
        </Typography>
        <Button 
          variant="contained" 
          onClick={onAddPipelineParam} 
          startIcon={<AddIcon />} 
          size="small"
        >
          Add Parameter
        </Button>
      </Box>

      {pipelineParams.length === 0 && (
        <Typography variant="caption" sx={{ color: '#6b7280', mb: 1 }}>
          No parameters. Click "Add Parameter" to define.
        </Typography>
      )}

      {pipelineParams.map((param, idx) => (
        <ParamRow
          key={param.id || idx}
          param={param}
          index={idx}
          onUpdate={onUpdatePipelineParam}
          onRemove={onRemovePipelineParam}
        />
      ))}
    </Box>
  );
}, (prevProps, nextProps) => {
  // pipelineParamsの長さと各パラメータの内容を比較
  if (prevProps.pipelineParams.length !== nextProps.pipelineParams.length) {
    return false;
  }

  return prevProps.pipelineParams.every((param, idx) => {
    const nextParam = nextProps.pipelineParams[idx];
    return (
      param.key === nextParam.key &&
      param.value === nextParam.value &&
      param.type === nextParam.type
    );
  });
});

PipelineParamsEditor.displayName = 'PipelineParamsEditor';

export default PipelineParamsEditor;