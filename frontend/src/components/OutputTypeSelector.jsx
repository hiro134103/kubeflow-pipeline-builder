import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * OutputTypeSelector - ノードの出力型選択
 * 
 * 責務:
 * - 出力データ型（str, int, float, bool, Dataset, Model等）の選択
 * - 出力設定パネルの表示
 */
const OutputTypeSelector = React.memo(
  ({ returnType, onOutputTypeChange }) => {
    const handleTypeChange = React.useCallback(
      (e) => {
        onOutputTypeChange?.(e.target.value);
      },
      [onOutputTypeChange]
    );

    return (
      <Box sx={{ mt: 0.5, p: 0.5, borderTop: '1px dashed #e5e7eb' }}>
        <Typography
          variant="caption"
          sx={{ fontSize: 11, color: '#4b5563', mb: 0.3, display: 'block' }}
        >
          Output
        </Typography>

        <select
          value={returnType || 'Any'}
          onChange={handleTypeChange}
          style={{
            width: '100%',
            padding: 3,
            fontSize: 11,
            borderRadius: 4,
            border: '1px solid #d1d5db',
          }}
        >
          <option value="Any">Any</option>
          <option value="str">str</option>
          <option value="int">int</option>
          <option value="float">float</option>
          <option value="bool">bool</option>
          <option value="Dataset">Dataset</option>
          <option value="Model">Model</option>
        </select>
      </Box>
    );
  }
);

OutputTypeSelector.displayName = 'OutputTypeSelector';

export default OutputTypeSelector;
