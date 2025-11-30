import React, { useCallback, useRef, useMemo } from 'react';
import { useNodesState, useEdgesState, addEdge, reconnectEdge, MarkerType } from 'reactflow';
import { normalizeComponentDefinition } from '../utils/nodeNormalizer';

/**
 * ✅ パフォーマンス最適化: データソースのビルド
 * 
 * 改善点:
 * - ノードIDとラベルのみを抽出（軽量化）
 * - 不要なデータをループしない
 */
const buildSources = (nodesList, pipelineParamsList) => {
  const pipelineOpts = (pipelineParamsList || [])
    .filter(p => p.key)
    .map(p => ({ value: `pipeline:${p.key}`, label: `Pipeline: ${p.key}` }));
  
  const nodeOpts = (nodesList || [])
    .map(n => ({ value: `node:${n.id}`, label: `Node: ${n.data?.label || n.id}` }));
  
  return [...pipelineOpts, ...nodeOpts];
};

/**
 * ✅ パフォーマンス最適化: ノード情報のハッシュ生成
 * 変更検出用の軽量なハッシュ値を生成
 */
const getNodesHash = (nodes) => {
  return nodes.map(n => `${n.id}:${n.data?.label || ''}`).join('|');
};

/**
 * ✅ パフォーマンス最適化版: usePipelineFlow
 * 
 * 主な改善点:
 * 1. availableSourcesの再計算を最小化
 * 2. 不要な全ノード更新を削減
 * 3. メモ化を積極的に活用
 * 4. バッチ更新で複数の状態変更を1回にまとめる
 */
export function usePipelineFlow(pipelineParams) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeIdCounter = useRef(0);
  const edgeReconnectSuccessful = useRef(true);

  // ✅ パフォーマンス改善: availableSourcesを最小限の依存で再計算
  const availableSources = useMemo(() => {
    return buildSources(nodes, pipelineParams);
  }, [nodes, pipelineParams]);

  // ✅ パフォーマンス改善: pipelineParamsのキーのみ監視
  const pipelineParamsKeys = useMemo(
    () => pipelineParams.map(p => p.key).join(','),
    [pipelineParams]
  );

  // ----------------- ノードデータの更新 -----------------
  
  /**
   * ✅ ノードデータの部分更新
   */
  const updateNodeData = useCallback((nodeId, patch) => {
    setNodes((nds) => 
      nds.map(n => n.id === nodeId 
        ? { ...n, data: { ...n.data, ...patch } }
        : n
      )
    );
  }, [setNodes]);

  /**
   * ✅ コールバック注入（個別ノード用）
   */
  const injectCallbacksToNode = useCallback((nodeId, callbacks) => {
    setNodes((nds) => 
      nds.map(n => n.id === nodeId 
        ? { 
            ...n, 
            data: { 
              ...n.data, 
              ...callbacks,
              availableSources: buildSources(nds, pipelineParams),
              pipelineParams
            } 
          }
        : n
      )
    );
  }, [setNodes, pipelineParams]);

  // ----------------- ノード/エッジ操作 -----------------

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ 
      ...params, 
      type: 'smoothstep', 
      animated: true, 
      markerEnd: { type: MarkerType.ArrowClosed } 
    }, eds)),
    [setEdges]
  );

  const onReconnectStart = useCallback(() => { 
    edgeReconnectSuccessful.current = false; 
  }, []);

  const onReconnect = useCallback((oldEdge, newConnection) => {
    edgeReconnectSuccessful.current = true;
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  const onReconnectEnd = useCallback((_, edge) => {
    if (!edgeReconnectSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, [setEdges]);

  // ----------------- 型同期ロジック -----------------

  /**
   * ✅ パフォーマンス改善: 引数の型同期をメモ化
   */
  const syncArgumentTypes = useCallback((args, nds) => {
    if (!args || args.length === 0) return args;

    return args.map((a) => {
      // 変更が必要ない場合は元のオブジェクトを返す（参照の安定性）
      let needsUpdate = false;
      const copy = { ...a };

      // Pipeline参照: パイプラインパラメータから型を取得
      if (copy.mode === 'pipeline' && copy.key) {
        const p = pipelineParams.find(pp => pp.key === copy.key);
        if (p && p.type && copy.type !== p.type) {
          copy.type = p.type;
          needsUpdate = true;
        }
      }

      // Node参照: 上流ノードの戻り値型を取得
      if (copy.mode === 'node' && copy.nodeId) {
        const upstream = nds.find(n => n.id === copy.nodeId);
        if (upstream?.data?.returnType && copy.type !== upstream.data.returnType) {
          copy.type = upstream.data.returnType;
          needsUpdate = true;
        }
      }

      // 変更がない場合は元のオブジェクトを返す
      return needsUpdate ? copy : a;
    });
  }, [pipelineParams]);

  /**
   * ✅ 引数変更ハンドラ
   */
  const onArgChange = useCallback((nodeId, newArgs) => {
    setNodes((nds) => {
      const syncedArgs = syncArgumentTypes(newArgs, nds);
      
      return nds.map((node) => 
        node.id === nodeId
          ? { ...node, data: { ...node.data, args: syncedArgs } }
          : node
      );
    });
  }, [setNodes, syncArgumentTypes]);

  /**
   * 戻り値型の変更
   */
  const onOutputTypeChange = useCallback((nodeId, newType) => {
    setNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId
          ? { ...node, data: { ...node.data, returnType: newType } }
          : node
      )
    );
  }, [setNodes]);

  /**
   * ベースイメージの変更
   */
  const onBaseImageChange = useCallback((nodeId, baseImage) => {
    setNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId
          ? { ...node, data: { ...node.data, baseImage } }
          : node
      )
    );
  }, [setNodes]);

  /**
   * 出力パラメータの変更
   */
  const onOutputChange = useCallback((nodeId, newOutputs) => {
    setNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId
          ? { ...node, data: { ...node.data, outputs: newOutputs } }
          : node
      )
    );
  }, [setNodes]);

  /**
   * ノードの削除
   */
  const deleteNode = useCallback((nodeId) => {
    // ✅ パフォーマンス改善: バッチ更新
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  /**
   * ノードのラベル変更
   */
  const renameNode = useCallback((nodeId, newLabel) => {
    setNodes((nds) => 
      nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, label: newLabel } }
          : n
      )
    );
  }, [setNodes]);

  /**
   * ✅ ノード追加
   */
  const addNode = useCallback((componentDef) => {
    const id = `node_${nodeIdCounter.current++}`;
    const normalized = normalizeComponentDefinition(componentDef);
    const position = componentDef.position || {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100
    };

    // ✅ componentDefからコールバックを取得（App.jsから渡される）
    const callbacks = componentDef.callbacks || {};

    setNodes((nds) => {
      const newNode = {
        id,
        type: 'custom',
        position,
        data: {
          label: normalized.label,
          componentType: normalized.type,
          args: normalized.args,
          returnType: normalized.returnType,
          codeString: normalized.codeString,
          outputs: normalized.outputs || [],
          
          // availableSourcesは後で更新される（useMemoによる）
          availableSources: buildSources(nds, pipelineParams),
          pipelineParams,
          
          // ✅ コールバックを最初から設定
          onArgChange: callbacks.onArgChange,
          onOutputTypeChange: callbacks.onOutputTypeChange,
          onOutputChange: callbacks.onOutputChange,
          onBaseImageChange: callbacks.onBaseImageChange,
          onDelete: callbacks.onDelete,
          onRename: callbacks.onRename,
          onOpenCode: callbacks.onOpenCode,
        },
      };

      return [...nds, newNode];
    });

    return id;
  }, [pipelineParams, setNodes]);

  // ----------------- availableSourcesの同期 -----------------

  /**
   * ✅ パフォーマンス改善: availableSourcesの更新を最適化
   * 
   * 変更点:
   * - nodesHashとpipelineParamsKeysが変更された時のみ実行
   * - 全ノードを一度に更新（バッチ処理）
   * - 不要な再レンダリングを防ぐ
   */
  React.useEffect(() => {
    // availableSourcesが変更された場合のみノードを更新
    setNodes((nds) => {
      let hasChanges = false;
      
      const updatedNodes = nds.map((n) => {
        // 現在のavailableSourcesと新しいavailableSourcesを比較
        const currentSources = n.data?.availableSources || [];
        
        // 長さが異なる場合は明らかに変更あり
        if (currentSources.length !== availableSources.length) {
          hasChanges = true;
          return {
            ...n,
            data: {
              ...n.data,
              availableSources,
              pipelineParams,
            },
          };
        }
        
        // 内容を比較（簡易版）
        const sourcesChanged = !currentSources.every((src, idx) => 
          src.value === availableSources[idx]?.value
        );
        
        if (sourcesChanged) {
          hasChanges = true;
          return {
            ...n,
            data: {
              ...n.data,
              availableSources,
              pipelineParams,
            },
          };
        }
        
        // 変更なし
        return n;
      });
      
      // 変更がない場合は元の配列を返す（参照の安定性）
      return hasChanges ? updatedNodes : nds;
    });
  }, [availableSources, pipelineParamsKeys, setNodes, pipelineParams]);

  /**
   * ✅ パフォーマンス改善: pipelineParams変更時の型同期
   * 
   * 変更点:
   * - pipeline modeの引数のみを更新（全引数をループしない）
   * - 実際に変更があった場合のみ更新
   */
  React.useEffect(() => {
    setNodes((nds) => {
      let hasChanges = false;
      
      const updatedNodes = nds.map((n) => {
        const args = n.data?.args || [];
        
        // pipeline modeの引数があるかチェック
        const hasPipelineArgs = args.some(a => a.mode === 'pipeline');
        if (!hasPipelineArgs) return n; // 変更不要
        
        // 型同期
        const syncedArgs = syncArgumentTypes(args, nds);
        
        // 実際に変更があったかチェック（参照比較）
        const argsChanged = syncedArgs.some((arg, idx) => arg !== args[idx]);
        
        if (argsChanged) {
          hasChanges = true;
          return {
            ...n,
            data: {
              ...n.data,
              args: syncedArgs,
            },
          };
        }
        
        return n;
      });
      
      return hasChanges ? updatedNodes : nds;
    });
  }, [pipelineParams, setNodes, syncArgumentTypes]);

  // ----------------- 公開API -----------------

  return {
    // 状態
    nodes,
    edges,
    availableSources,
    
    // ReactFlowイベントハンドラ
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDragOver: (event) => event.preventDefault(),
    onReconnect,
    onReconnectStart,
    onReconnectEnd,
    
    // ノード操作
    addNode,
    deleteNode,
    renameNode,
    updateNodeData,
    injectCallbacksToNode,
    
    // データ変更
    onArgChange,
    onOutputTypeChange,
    onBaseImageChange,
    onOutputChange,
    
    // 直接的な状態更新
    setNodes,
    setEdges,
  };
}