import React from 'react';
import { Box, Button } from '@mui/material';
import ReactFlow, { MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';

/**
 * FlowArea - React Flow キャンバスエリア
 * 
 * 責務:
 * - React Flow の描画
 * - ドラッグ&ドロップハンドラ
 * - コード生成ボタン
 */
const FlowArea = React.forwardRef(
  (
    {
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onDrop,
      onDragOver,
      onReconnect,
      onReconnectStart,
      onReconnectEnd,
      nodeTypes,
      onGenerateCode,
    },
    flowRef
  ) => {
    const handleGenerateCode = React.useCallback(() => {
      onGenerateCode?.();
    }, [onGenerateCode]);

    return (
      <Box sx={{ flex: 1, position: 'relative' }} ref={flowRef}>
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            display: 'flex',
            gap: 8,
          }}
        >
          <Button variant="contained" onClick={handleGenerateCode}>
            Generate Pipeline Code
          </Button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          nodeTypes={nodeTypes}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </Box>
    );
  }
);

FlowArea.displayName = 'FlowArea';

export default FlowArea;
