import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';

import { 
  AppBar, Toolbar, Typography, Box
} from '@mui/material';
import { CssBaseline } from "@mui/material";

import { useNodeArguments } from './hooks/useNodeArguments';
import { usePipelineFlow } from './hooks/usePipelineFlow';
import NodeHeader from './components/NodeHeader';
import ArgumentsSection from './components/ArgumentsSection';
import BaseImageSelector from './components/BaseImageSelector';
import OutputParamsEditor from './components/OutputParamsEditor';
import CodeEditorDialog from './components/CodeEditorDialog';
import GeneratedCodeDialog from './components/GeneratedCodeDialog';
import SidebarPanel from './components/SidebarPanel';
import FlowArea from './components/FlowArea';
import { generatePipelineCode, validateForCodeGeneration } from './utils/codeGenerator';
import { validateAllNodes } from './utils/nodeNormalizer';

const CustomNode = React.memo(({ data, id }) => {
  const available = data.availableSources || [];
  const pipelineParamsList = (data.pipelineParams || []).filter(p => p.key);

  const { args, outputs, addArg, removeArg, moveArg, updateArg, addOutput, removeOutput, updateOutput } = useNodeArguments(
    id,
    data,
    data.onArgChange,
    data.onOutputChange
  );

  return (
    <Box sx={{
      borderRadius: 1,
      boxShadow: 1,
      border: '1px solid #374151',
      minWidth: 100,
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Left} id="input" />

      <NodeHeader
        label={data.label}
        componentType={data.componentType}
        onRename={() => data.onRename?.(id)}
        onOpenCode={() => data.onOpenCode?.(id)}
        onDelete={() => data.onDelete?.(id)}
      />

      {/* Body */}
      <Box sx={{ px: 1, py: 1, backgroundColor: 'white' }}>
        {/* Base Image */}
        <BaseImageSelector
          baseImage={data.baseImage || 'python:3.11-slim'}
          onUpdate={(image) => data.onBaseImageChange?.(id, image)}
        />

        {/* Arguments */}
        <ArgumentsSection
          args={args}
          pipelineParamsList={pipelineParamsList}
          available={available}
          onAddArg={addArg}
          onUpdateArg={updateArg}
          onRemoveArg={removeArg}
          onMoveArg={moveArg}
        />

        {/* Output Parameters */}
        <OutputParamsEditor
          outputs={outputs}
          onAddOutput={addOutput}
          onUpdateOutput={updateOutput}
          onRemoveOutput={removeOutput}
        />
      </Box>

      <Handle type="source" position={Position.Right} id="output" />
    </Box>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.componentType === nextProps.data.componentType &&
    prevProps.data.returnType === nextProps.data.returnType &&
    prevProps.data.baseImage === nextProps.data.baseImage &&
    prevProps.data.args === nextProps.data.args &&
    prevProps.data.outputs === nextProps.data.outputs &&
    prevProps.data.availableSources?.length === nextProps.data.availableSources?.length &&
    prevProps.data.pipelineParams?.length === nextProps.data.pipelineParams?.length
  );
});

const nodeTypes = { custom: CustomNode };

const defaultComponentDefinitions = [
  {
    type: 'blank',
    label: 'Blank Component',
    args: [],
    codeString: `print("hello world")`
  },
];

function App() {
  const reactFlowWrapper = useRef(null);
  const [pipelineName, setPipelineName] = useState('MyPipeline');
  const [pipelineParams, setPipelineParams] = useState([
    { id: 1, key: 'input_path', type: 'str', value: 's3://my-data' },
  ]);
  const [showCode, setShowCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editingCode, setEditingCode] = useState('');

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDragOver,
    onReconnect,
    onReconnectStart,
    onReconnectEnd,
    addNode,
    deleteNode,
    renameNode,
    onArgChange,
    onOutputTypeChange,
    onOutputChange,
    onBaseImageChange,
    updateNodeData,
    injectCallbacksToNode,
  } = usePipelineFlow(pipelineParams);

  React.useEffect(() => {
    if (codeEditorOpen && editingNodeId) {
      const node = nodes.find(n => n.id === editingNodeId);
      const code = node?.data?.codeString || '';
      setEditingCode(code);
    }
  }, [codeEditorOpen, editingNodeId, nodes]);
  
  const openCodeEditor = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    const code = node?.data?.codeString || '';
    setEditingNodeId(nodeId);
    setEditingCode(code);
    setCodeEditorOpen(true);
  }, [nodes]);

  const handleRename = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    const newName = window.prompt('Enter new node label:', node?.data.label || '');
    if (newName) {
      renameNode(nodeId, newName);
    }
  }, [nodes, renameNode]);

  const handleDelete = useCallback((nodeId) => {
    if (window.confirm('Delete this node?')) {
      deleteNode(nodeId);
    }
  }, [deleteNode]);

  const handleAddNode = useCallback((componentDef, position) => {
    const defWithPosition = { 
      ...componentDef, 
      position,
      callbacks: {
        onArgChange,
        onOutputTypeChange,
        onOutputChange,
        onBaseImageChange,
        onOpenCode: openCodeEditor,
        onRename: handleRename,
        onDelete: handleDelete,
      }
    };
    
    addNode(defWithPosition);
  }, [addNode, onArgChange, onOutputTypeChange, onOutputChange, onBaseImageChange, openCodeEditor, handleRename, handleDelete]);

  const handleAddPipelineParam = useCallback(() => {
    setPipelineParams((prev) => [
      ...prev,
      { id: Date.now(), key: `new_param_${prev.length + 1}`, type: 'str', value: '' },
    ]);
  }, []);

  const handleUpdatePipelineParam = useCallback((index, newKey, newValue, newType) => {
    setPipelineParams((prev) =>
      prev.map((param, i) => {
        if (i === index) {
          return { ...param, key: newKey, value: newValue, type: newType };
        }
        return param;
      })
    );
  }, []);

  const handleRemovePipelineParam = useCallback((index) => {
    setPipelineParams((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleOnDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const componentData = event.dataTransfer.getData('application/reactflow');

      if (typeof componentData === 'undefined' || !componentData) {
        return;
      }

      const componentDef = JSON.parse(componentData);

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      handleAddNode(componentDef, position);
    },
    [handleAddNode]
  );

  /**
   * ✅ コードエディタの保存
   */
  const saveNodeCode = useCallback((newCode) => {
    const codeToSave = typeof newCode === 'string' ? newCode : editingCode;
    updateNodeData(editingNodeId, { codeString: codeToSave });
  }, [editingNodeId, editingCode, updateNodeData]);

  const handleGenerateCode = useCallback(() => {
    if (!nodes.length) {
      alert('Please add at least one node');
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      validateAllNodes(nodes);
    }

    const validation = validateForCodeGeneration(nodes, pipelineParams);
    if (!validation.valid) {
      const errorMessage = 'Code generation failed:\n\n' + 
        validation.errors.map(e => `• ${e}`).join('\n');
      alert(errorMessage);
      console.error('Code generation errors:', validation.errors);
      return;
    }

    try {
      const code = generatePipelineCode(
        nodes,
        edges,
        pipelineParams,
        pipelineName,
        defaultComponentDefinitions
      );
      console.log('Generated code:', code);
      setGeneratedCode(code);
      setShowCode(true);
    } catch (error) {
      console.error('Code generation error:', error);
      alert(`Failed to generate code: ${error.message}`);
    }
  }, [nodes, edges, pipelineParams, pipelineName]);

  const handleCompileCode = useCallback(async () => {
    if (!generatedCode) {
      alert('Please generate code first');
      return;
    }

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: generatedCode,
          pipeline_name: pipelineName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(`Compilation failed: ${result.error}`);
        console.error('Compilation error:', result.error);
        return;
      }

      alert('Pipeline compiled successfully!');
      console.log('Compiled YAML:', result.yaml);

      // Create a download link for the YAML
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(result.yaml));
      element.setAttribute('download', `${pipelineName}.yaml`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Compilation error:', error);
      alert(`Failed to compile: ${error.message}`);
    }
  }, [generatedCode, pipelineName]);

  const downloadPipelineCode = useCallback(() => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pipelineName}.py`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedCode, pipelineName]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', m: 0, p: 0 }}>
      <CssBaseline />
      
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'flex-start', gap: 3 }}>
          <Typography variant="h5">Pipeline Builder</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">Pipeline Name:</Typography>
            <input
              type="text"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              style={{ padding: 5, borderRadius: 4, border: '1px solid #ccc' }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* メインコンテンツエリア (Sidebar + Flow) */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* サイドバー */}
        <SidebarPanel
          pipelineParams={pipelineParams}
          onAddPipelineParam={handleAddPipelineParam}
          onUpdatePipelineParam={handleUpdatePipelineParam}
          onRemovePipelineParam={handleRemovePipelineParam}
          componentDefinitions={defaultComponentDefinitions}
          onComponentDragStart={() => {}}
          onComponentClick={(comp) => handleAddNode(comp)}
          nodes={nodes}
        />

        {/* Flowエリア */}
        <FlowArea
          ref={reactFlowWrapper}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={handleOnDrop}
          onDragOver={onDragOver}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          nodeTypes={nodeTypes}
          onGenerateCode={handleGenerateCode}
        />

      </Box>

      {/* ノードコードエディタダイアログ */}
      <CodeEditorDialog
        open={codeEditorOpen}
        code={editingCode}
        args={editingNodeId ? nodes.find(n => n.id === editingNodeId)?.data?.args || [] : []}
        onClose={() => {
          setCodeEditorOpen(false);
          setEditingNodeId(null);
          setEditingCode('');
        }}
        onSave={(code) => {
          saveNodeCode(code);
          setCodeEditorOpen(false);
          setEditingNodeId(null);
          setEditingCode('');
        }}
      />

      {/* 生成コードダイアログ */}
      <GeneratedCodeDialog
        open={showCode}
        code={generatedCode}
        pipelineName={pipelineName}
        onClose={() => setShowCode(false)}
        onDownload={downloadPipelineCode}
        onCompile={handleCompileCode}
      />
    </Box>
  );
}

export default App;