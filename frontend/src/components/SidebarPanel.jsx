import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemText } from '@mui/material';
import PipelineParamsEditor from './PipelineParamsEditor';

/**
 * SidebarPanel - アプリケーション左側のサイドバーパネル
 * 
 * 責務:
 * - パイプラインパラメータエディタの表示
 * - コンポーネント定義リストの表示
 * - ドラッグ&ドロップ対応
 */
const SidebarPanel = React.memo(
  ({
    pipelineParams,
    onAddPipelineParam,
    onUpdatePipelineParam,
    onRemovePipelineParam,
    componentDefinitions,
    onComponentDragStart,
    onComponentClick,
    nodes,
  }) => {
    const handleDragStart = React.useCallback(
      (event, componentDef) => {
        event.dataTransfer.setData(
          'application/reactflow',
          JSON.stringify(componentDef)
        );
        onComponentDragStart?.(componentDef);
      },
      [onComponentDragStart]
    );

    const handleComponentClick = React.useCallback(
      (componentDef) => {
        onComponentClick?.(componentDef);
      },
      [onComponentClick]
    );

    return (
      <Box
        sx={{
          width: 600,
          transition: 'width 0.3s',
          overflowX: 'hidden',
          borderRight: '1px solid #ccc',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {/* パイプラインパラメータエディタ */}
        <Box sx={{ flexShrink: 0 }}>
          <PipelineParamsEditor
            pipelineParams={pipelineParams}
            onAddPipelineParam={onAddPipelineParam}
            onUpdatePipelineParam={onUpdatePipelineParam}
            onRemovePipelineParam={onRemovePipelineParam}
          />
        </Box>

        {/* コンポーネントリスト */}
        <Box sx={{ p: 1, borderTop: '1px solid #ccc' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Components
          </Typography>
          <List dense>
            {componentDefinitions.map((comp) => (
              <ListItemButton
                key={comp.type}
                onDragStart={(e) => handleDragStart(e, comp)}
                onClick={() => handleComponentClick(comp)}
                draggable
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  my: 0.5,
                }}
              >
                <ListItemText
                  primary={comp.label}
                  secondary={`Type: ${comp.type}`}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* ノード一覧 */}
        <Box sx={{ p: 1, borderTop: '1px solid #ccc', flex: 1, overflow: 'auto' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Nodes
          </Typography>
          <List dense>
            {(nodes || []).map((node) => (
              <ListItemButton
                key={node.id}
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  my: 0.5,
                  py: 1,
                }}
              >
                <ListItemText
                  primary={node.data?.label || 'Unnamed'}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
            ))}
            {(!nodes || nodes.length === 0) && (
              <Typography variant="body2" sx={{ color: '#999', py: 1 }}>
                No nodes yet
              </Typography>
            )}
          </List>
        </Box>
      </Box>
    );
  }
);

SidebarPanel.displayName = 'SidebarPanel';

export default SidebarPanel;
