import React from 'react';

/**
 * ✅ useNodeArguments - args形式のみをサポート
 * 
 * ノードの引数を管理するカスタムフック
 * - 引数の追加・削除・更新・並び替え
 * - 出力パラメータの管理
 * - バリデーション
 */
export const useNodeArguments = (nodeId, data, onArgChange, onOutputChange) => {
  
  // データから引数を取得（args形式のみ）
  const args = React.useMemo(() => data?.args || [], [data?.args]);
  
  // データから出力を取得
  const outputs = React.useMemo(() => data?.outputs || [], [data?.outputs]);

  // ✅ 開発環境でのバリデーション
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && args.length > 0) {
      // 引数の必須フィールドのみを検証（modeが'node'でもnodeIdが空の場合は警告しない）
      const hasValidId = args.every(arg => arg.id);
      if (!hasValidId) {
        console.warn(
          `[useNodeArguments] Node ${nodeId} has arguments without id`
        );
      }
    }
  }, [args, nodeId]);

  // 変更を親コンポーネントに伝える
  const onArgsUpdate = React.useCallback((newArgs) => {
    if (onArgChange) {
      onArgChange(nodeId, newArgs);
    }
  }, [nodeId, onArgChange]);

  // 出力パラメータの更新を親コンポーネントに伝える
  const onOutputsUpdate = React.useCallback((newOutputs) => {
    if (onOutputChange) {
      onOutputChange(nodeId, newOutputs);
    } else {
      console.error('[useNodeArguments] onOutputChange is not defined!');
    }
  }, [nodeId, onOutputChange]);

  // ✅ 引数の追加
  const addArg = React.useCallback(() => {
    // デフォルト名を生成：arg1, arg2, arg3...
    const existingNames = args.map(a => a.name).filter(Boolean);
    let defaultName = '';
    let counter = 1;
    while (!defaultName || existingNames.includes(defaultName)) {
      defaultName = `arg${counter}`;
      counter++;
    }
    
    const newArg = {
      id: `arg_${Date.now()}`,
      name: defaultName,
      mode: 'literal',
      value: '',
      key: '',
      nodeId: '',
      type: 'str',
    };
    onArgsUpdate([...args, newArg]);
  }, [args, onArgsUpdate]);

  // ✅ 引数の削除
  const removeArg = React.useCallback((index) => {
    if (index < 0 || index >= args.length) {
      console.warn(`[useNodeArguments] Invalid index ${index} for removeArg`);
      return;
    }
    
    const copy = [...args];
    copy.splice(index, 1);
    onArgsUpdate(copy);
  }, [args, onArgsUpdate]);
  
  // ✅ 引数の順序変更
  const moveArg = React.useCallback((from, to) => {
    if (to < 0 || to >= args.length) {
      console.warn(`[useNodeArguments] Invalid target index ${to} for moveArg`);
      return;
    }
    if (from < 0 || from >= args.length) {
      console.warn(`[useNodeArguments] Invalid source index ${from} for moveArg`);
      return;
    }
    
    const copy = [...args];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    onArgsUpdate(copy);
  }, [args, onArgsUpdate]);

  // ✅ 引数の部分更新
  const updateArg = React.useCallback((index, patch) => {
    if (index < 0 || index >= args.length) {
      console.warn(`[useNodeArguments] Invalid index ${index} for updateArg`);
      return;
    }
    
    const copy = [...args];
    copy[index] = { ...copy[index], ...patch };
    
    // ✅ mode変更時のクリーンアップ（typeは保護）
    if (patch.mode) {
      // mode変更時は関係ないフィールドをクリア（typeはそのまま）
      if (patch.mode === 'literal') {
        copy[index].key = '';
        copy[index].nodeId = '';
        copy[index].outputName = '';
      } else if (patch.mode === 'pipeline') {
        copy[index].value = '';
        copy[index].nodeId = '';
        copy[index].outputName = '';
      } else if (patch.mode === 'node') {
        copy[index].value = '';
        copy[index].key = '';
      }
    }
    

    onArgsUpdate(copy);
  }, [args, onArgsUpdate]);

  // ✅ 出力パラメータの追加
  const addOutput = React.useCallback(() => {
    const newOutput = {
      id: `output_${Date.now()}`,
      name: '',
      type: 'Output[Dataset]',
    };
    onOutputsUpdate([...outputs, newOutput]);
  }, [outputs, onOutputsUpdate]);

  // ✅ 出力パラメータの削除
  const removeOutput = React.useCallback((index) => {
    if (index < 0 || index >= outputs.length) {
      console.warn(`[useNodeArguments] Invalid index ${index} for removeOutput`);
      return;
    }
    
    const copy = [...outputs];
    copy.splice(index, 1);
    onOutputsUpdate(copy);
  }, [outputs, onOutputsUpdate]);

  // ✅ 出力パラメータの部分更新
  const updateOutput = React.useCallback((index, patch) => {
    if (index < 0 || index >= outputs.length) {
      console.warn(`[useNodeArguments] Invalid index ${index} for updateOutput`);
      return;
    }
    
    const copy = [...outputs];
    copy[index] = { ...copy[index], ...patch };
    onOutputsUpdate(copy);
  }, [outputs, onOutputsUpdate]);

  return {
    args,
    outputs,
    addArg,
    removeArg,
    moveArg,
    updateArg,
    addOutput,
    removeOutput,
    updateOutput,
  };
};