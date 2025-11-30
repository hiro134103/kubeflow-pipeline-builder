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
        const newMode = e.target.value;
        
        // mode変更時の初期化
        const update = {
          mode: newMode,
          value: '',
          key: '',
          nodeId: '',
          outputName: '',
        };
        
        // Pipeline モードに切り替えた場合、最初のパイプラインパラメータを自動選択
        if (newMode === 'pipeline' && pipelineParamsList.length > 0) {
          const firstParam = pipelineParamsList[0];
          update.key = firstParam.key;
          update.type = firstParam.type || 'str';
  
        }
        
        onUpdate(index, update);
      },
      [index, onUpdate, pipelineParamsList]
    );

    const handleValueChange = React.useCallback(
      (e) => {
        onUpdate(index, { value: e.target.value });
      },
      [index, onUpdate]
    );

    const handleKeyChange = React.useCallback(
      (e) => {
        const selectedKey = e.target.value;
        if (!selectedKey) {
          onUpdate(index, { key: selectedKey });
          return;
        }
        
        // pipelineParamsList から選択したパラメータを探して型を取得
        const selectedParam = pipelineParamsList.find(p => p.key === selectedKey);
        const paramType = selectedParam?.type || 'str';
        
        console.log('🔍 Pipeline param selected:', { 
          selectedKey, 
          selectedParam,
          paramType,
          allParams: pipelineParamsList 
        });
        
        // key と type を一度に更新
        onUpdate(index, { key: selectedKey, type: paramType });
      },
      [index, onUpdate, pipelineParamsList]
    );

    const handleNodeIdChange = React.useCallback(
      (e) => {
        onUpdate(index, { nodeId: e.target.value });
      },
      [index, onUpdate]
    );

    const handleOutputNameChange = React.useCallback(
      (e) => {
        const selectedOutputName = e.target.value;
        // 選択した出力パラメータの型を available から検索して自動設定
        const selectedOutput = available.find(
          a => a.nodeId === arg.nodeId && a.outputName === selectedOutputName
        );
        
        const outputType = selectedOutput?.outputType || 'Dataset';
        // outputType が Dataset の場合は Input[Dataset] にする
        const finalType = outputType === 'Dataset' || outputType === 'Output[Dataset]' 
          ? 'Input[Dataset]' 
          : outputType;
        // ✅ mode を 'node' に設定して、outputName と type を更新
        onUpdate(index, { mode: 'node', outputName: selectedOutputName, type: finalType });
      },
      [index, onUpdate, available, arg.nodeId]
    );

    const handleTypeChange = React.useCallback(
      (e) => {
        onUpdate(index, { type: e.target.value });
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
            id={`arg-name-${index}`}
            name={`arg-name-${index}`}
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
          {/* Type selector */}
          <select
            id={`arg-type-${index}`}
            name={`arg-type-${index}`}
            value={arg.type || 'str'}
            onChange={handleTypeChange}
            style={{
              width: 130,
              padding: 3,
              fontSize: 10,
              borderRadius: 4,
              border: '1px solid #d1d5db',
            }}
          >
            <option value="str">str</option>
            <option value="int">int</option>
            <option value="float">float</option>
            <option value="bool">bool</option>
            <option value="Input[Dataset]">Input[Dataset]</option>
          </select>
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
            id={`arg-mode-${index}`}
            name={`arg-mode-${index}`}
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
              id={`arg-value-${index}`}
              name={`arg-value-${index}`}
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
              id={`arg-key-${index}`}
              name={`arg-key-${index}`}
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
            <>
              <select
                id={`arg-nodeId-${index}`}
                name={`arg-nodeId-${index}`}
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
                  .filter((a) => {
                    const isNodeOption = a.value.startsWith('node:') && 
                                        (a.value.match(/:/g) || []).length === 1;
                    return isNodeOption;
                  })
                  .reduce((unique, opt) => {
                    // ノードIDの重複を排除して表示
                    if (!unique.find(u => u.nodeId === opt.nodeId)) {
                      unique.push(opt);
                    }
                    return unique;
                  }, [])
                  .map((opt) => (
                    <option key={opt.nodeId} value={opt.nodeId}>
                      {opt.nodeName || opt.nodeId}
                    </option>
                  ))}
              </select>
              
              {/* Output Parameter Name (if node outputs data) */}
              {arg.nodeId && (
                <select
                  id={`arg-outputName-${index}`}
                  name={`arg-outputName-${index}`}
                  value={arg.outputName || ''}
                  onChange={handleOutputNameChange}
                  style={{
                    width: 120,
                    padding: 3,
                    fontSize: 11,
                    borderRadius: 4,
                    border: '1px solid #d1d5db',
                  }}
                >
                  <option value="">-- output --</option>
                  {available
                    .filter((a) => a.value.startsWith(`node:${arg.nodeId}:`))
                    .map((opt) => (
                      <option key={opt.value} value={opt.outputName}>
                        {opt.outputName} ({opt.outputType})
                      </option>
                    ))}
                </select>
              )}
            </>
          )}
        </Box>
      </Box>
    );
  }
);

ArgRow.displayName = 'ArgRow';

export default ArgRow;
