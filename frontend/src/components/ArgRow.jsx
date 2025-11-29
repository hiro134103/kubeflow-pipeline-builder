import React from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * ArgRow - ノード引数の1行
 * 
 * 責務:
 * - 引数の表示・編集
 * - モード切り替え（Literal, Pipeline, Node Out）
 * - 並び替えボタン、削除ボタン
 */
const ArgRow = React.memo(
  ({
    arg,
    index,
    args,
    pipelineParamsList,
    available,
    onUpdate,
    onRemove,
    onMove,
  }) => {
    const handleNameChange = React.useCallback(
      (e) => {
        onUpdate(index, { name: e.target.value });
      },
      [index, onUpdate]
    );

    const handleModeChange = React.useCallback(
      (e) => {
        onUpdate(index, {
          mode: e.target.value,
          value: '',
          key: '',
          nodeId: '',
        });
      },
      [index, onUpdate]
    );

    const handleValueChange = React.useCallback(
      (e) => {
        onUpdate(index, { value: e.target.value });
      },
      [index, onUpdate]
    );

    const handleKeyChange = React.useCallback(
      (e) => {
        onUpdate(index, { key: e.target.value });
      },
      [index, onUpdate]
    );

    const handleNodeIdChange = React.useCallback(
      (e) => {
        onUpdate(index, { nodeId: e.target.value });
      },
      [index, onUpdate]
    );

    const handleRemove = React.useCallback(() => {
      onRemove(index);
    }, [index, onRemove]);

    const handleMoveUp = React.useCallback(() => {
      onMove(index, index - 1);
    }, [index, onMove]);

    const handleMoveDown = React.useCallback(() => {
      onMove(index, index + 1);
    }, [index, onMove]);

    return (
      <Box
        sx={{
          mb: 0.5,
          p: 0.8,
          border: '1px solid #e5e7eb',
          borderRadius: 1,
        }}
      >
        {/* Argument Name Row */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
          <input
            placeholder="name"
            value={arg.name || ''}
            onChange={handleNameChange}
            style={{
              flex: 1,
              padding: 3,
              fontSize: 11,
              borderRadius: 4,
              border: '1px solid #d1d5db',
            }}
          />
          <IconButton
            size="small"
            disabled={index === 0}
            onClick={handleMoveUp}
            sx={{ p: 0.2 }}
          >
            <span style={{ fontSize: 10 }}>▲</span>
          </IconButton>
          <IconButton
            size="small"
            disabled={index === args.length - 1}
            onClick={handleMoveDown}
            sx={{ p: 0.2 }}
          >
            <span style={{ fontSize: 10 }}>▼</span>
          </IconButton>
          <IconButton size="small" onClick={handleRemove} sx={{ p: 0.2 }}>
            <CloseIcon fontSize="inherit" />
          </IconButton>
        </Box>

        {/* Mode + Value */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {/* Mode select */}
          <select
            value={arg.mode || 'literal'}
            onChange={handleModeChange}
            style={{
              width: 90,
              padding: 3,
              fontSize: 10,
              borderRadius: 4,
              border: '1px solid #d1d5db',
            }}
          >
            <option value="literal">Literal</option>
            <option value="pipeline">Pipeline</option>
            <option value="node">Node Out</option>
          </select>

          {/* Literal */}
          {arg.mode === 'literal' && (
            <input
              type="text"
              placeholder="value"
              value={arg.value || ''}
              onChange={handleValueChange}
              style={{
                flex: 1,
                padding: 3,
                fontSize: 11,
                borderRadius: 4,
                border: '1px solid #d1d5db',
              }}
            />
          )}

          {/* Pipeline Param */}
          {arg.mode === 'pipeline' && (
            <select
              value={arg.key || ''}
              onChange={handleKeyChange}
              style={{
                flex: 1,
                padding: 3,
                fontSize: 11,
                borderRadius: 4,
                border: '1px solid #d1d5db',
              }}
            >
              <option value="">-- param --</option>
              {pipelineParamsList.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key}
                </option>
              ))}
            </select>
          )}

          {/* Node Output */}
          {arg.mode === 'node' && (
            <select
              value={arg.nodeId || ''}
              onChange={handleNodeIdChange}
              style={{
                flex: 1,
                padding: 3,
                fontSize: 11,
                borderRadius: 4,
                border: '1px solid #d1d5db',
              }}
            >
              <option value="">-- node --</option>
              {available
                .filter((a) => a.value.startsWith('node:'))
                .map((opt) => (
                  <option key={opt.value} value={opt.value.split(':')[1]}>
                    {opt.label}
                  </option>
                ))}
            </select>
          )}
        </Box>
      </Box>
    );
  }
);

ArgRow.displayName = 'ArgRow';

export default ArgRow;
