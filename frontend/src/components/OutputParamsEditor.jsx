import React from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

/**
 * ✅ Output[Dataset] パラメータエディタ
 * 
 * コンポーネントの出力パラメータを管理
 * - 出力名とデータ型を指定可能
 * - 複数の出力をサポート
 */

// ✅ 個別の出力パラメータ行をメモ化
const OutputRow = React.memo(({ output, index, onUpdate, onRemove }) => {
  const handleNameChange = React.useCallback((e) => {
    onUpdate(index, { name: e.target.value });
  }, [index, onUpdate]);

  const handleTypeChange = React.useCallback((e) => {
    onUpdate(index, { type: e.target.value });
  }, [index, onUpdate]);

  const handleRemove = React.useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
      {/* Output Name Input */}
      <input
        type="text"
        placeholder="Output Name"
        value={output.name || ''}
        onChange={handleNameChange}
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
        value={output.type || 'Output[Dataset]'}
        onChange={handleTypeChange}
        style={{ 
          width: 180, 
          marginRight: 4, 
          padding: 8, 
          fontSize: 14, 
          borderRadius: 4, 
          border: '1px solid #d1d5db' 
        }}
      >
        <option value="Output[Dataset]">Output[Dataset]</option>
        <option value="Output[Model]">Output[Model]</option>
        <option value="Output[Artifact]">Output[Artifact]</option>
      </select>
      
      {/* Delete Button */}
      <IconButton size="small" onClick={handleRemove}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}, (prevProps, nextProps) => {
  // カスタム比較: outputの内容が同じなら再レンダリングしない
  return (
    prevProps.index === nextProps.index &&
    prevProps.output.name === nextProps.output.name &&
    prevProps.output.type === nextProps.output.type
  );
});

OutputRow.displayName = 'OutputRow';

// ✅ メインコンポーネント
const OutputParamsEditor = React.memo(({ 
  outputs = [], 
  onAddOutput, 
  onUpdateOutput, 
  onRemoveOutput 
}) => {
  return (
    <Box sx={{ 
      mb: 2, 
      p: 2, 
      border: '1px solid #e5e7eb', 
      borderRadius: 2, 
      backgroundColor: '#f0f9ff' 
    }}>
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 'bold' }}>
          Output Parameters
        </Typography>
        <Button 
          variant="contained" 
          onClick={onAddOutput} 
          startIcon={<AddIcon />} 
          size="small"
        >
          Add Output
        </Button>
      </Box>

      {outputs.length === 0 && (
        <Typography variant="caption" sx={{ color: '#6b7280', mb: 1 }}>
          No outputs. Click "Add Output" to define Dataset outputs.
        </Typography>
      )}

      {outputs.map((output, idx) => (
        <OutputRow
          key={output.id || idx}
          output={output}
          index={idx}
          onUpdate={onUpdateOutput}
          onRemove={onRemoveOutput}
        />
      ))}
    </Box>
  );
}, (prevProps, nextProps) => {
  // outputsの長さと各出力の内容を比較
  if (prevProps.outputs.length !== nextProps.outputs.length) {
    return false;
  }

  return prevProps.outputs.every((output, idx) => {
    const nextOutput = nextProps.outputs[idx];
    return (
      output.name === nextOutput.name &&
      output.type === nextOutput.type
    );
  });
});

OutputParamsEditor.displayName = 'OutputParamsEditor';

export default OutputParamsEditor;
