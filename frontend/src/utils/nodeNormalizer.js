/**
 * ノードデータの正規化とバリデーションユーティリティ
 * 
 * ✅ params形式は完全に削除され、args形式のみをサポート
 */

/**
 * 引数の構造を検証・正規化
 * 
 * @param {Array} args - 引数配列
 * @returns {Array} 正規化された引数配列
 */
export const normalizeArguments = (args) => {
  if (!args || !Array.isArray(args)) {
    return [];
  }

  return args.map((arg, idx) => ({
    id: arg.id || `arg_${idx}_${Date.now()}`,
    name: arg.name || '',
    mode: arg.mode || 'literal',
    value: arg.value || '',
    key: arg.key || '',
    nodeId: arg.nodeId || '',
    type: arg.type || 'str',
  }));
};

/**
 * コンポーネント定義全体を正規化
 * 
 * @param {Object} componentDef - コンポーネント定義
 * @returns {Object} 正規化されたコンポーネント定義
 */
export const normalizeComponentDefinition = (componentDef) => {
  return {
    // 基本情報
    type: componentDef.type || 'blank',
    label: componentDef.label || 'New Component',
    
    // コード
    codeString: componentDef.codeString || '',
    
    // 引数（args形式のみサポート）
    args: normalizeArguments(componentDef.args),
    
    // 出力パラメータ
    outputs: componentDef.outputs || [],
    
    // その他のメタデータ
    returnType: componentDef.returnType || 'str',
    description: componentDef.description || '',
    
    // 位置情報（オプション）
    position: componentDef.position,
  };
};

/**
 * ノードデータの正規化（ReactFlow用）
 * 
 * @param {Object} nodeData - ノードのdataオブジェクト
 * @returns {Object} 正規化されたノードデータ
 */
export const normalizeNodeData = (nodeData) => {
  if (!nodeData) {
    return { args: [] };
  }

  return {
    ...nodeData,
    args: normalizeArguments(nodeData.args),
  };
};

/**
 * バリデーション: 引数構造が正しいかチェック
 * 
 * @param {Array} args - 引数配列
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateArguments = (args) => {
  const errors = [];

  if (!Array.isArray(args)) {
    errors.push('Arguments must be an array');
    return { valid: false, errors };
  }

  args.forEach((arg, idx) => {
    // 必須フィールドのチェック
    if (!arg.id) {
      errors.push(`Argument ${idx}: Missing 'id' field`);
    }
    if (arg.name === undefined) {
      errors.push(`Argument ${idx}: Missing 'name' field`);
    }

    // modeの妥当性チェック
    const validModes = ['literal', 'pipeline', 'node'];
    if (!validModes.includes(arg.mode)) {
      errors.push(`Argument ${idx}: Invalid mode '${arg.mode}'. Must be one of: ${validModes.join(', ')}`);
    }

    // mode別の必須フィールドチェック
    if (arg.mode === 'pipeline' && !arg.key) {
      errors.push(`Argument ${idx}: 'pipeline' mode requires 'key' field`);
    }
    if (arg.mode === 'node' && !arg.nodeId) {
      errors.push(`Argument ${idx}: 'node' mode requires 'nodeId' field`);
    }

    // 型の妥当性チェック
    const validTypes = ['str', 'int', 'float', 'bool', 'Any', 'Dataset', 'Model'];
    if (!validTypes.includes(arg.type)) {
      errors.push(`Argument ${idx}: Invalid type '${arg.type}'. Must be one of: ${validTypes.join(', ')}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * コンポーネント定義のバリデーション
 * 
 * @param {Object} componentDef - コンポーネント定義
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateComponentDefinition = (componentDef) => {
  const errors = [];

  // 必須フィールドのチェック
  if (!componentDef.type) {
    errors.push('Missing required field: type');
  }
  if (!componentDef.label) {
    errors.push('Missing required field: label');
  }

  // args のバリデーション
  if (componentDef.args) {
    const argsValidation = validateArguments(componentDef.args);
    if (!argsValidation.valid) {
      errors.push(...argsValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 開発環境用: すべてのノードを検証
 * 
 * @param {Array} nodes - ReactFlowのノード配列
 */
export const validateAllNodes = (nodes) => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('🔍 Node Data Structure Validation');
  
  let totalErrors = 0;
  const invalidNodes = [];

  nodes.forEach((node) => {
    // 引数のバリデーション
    const validation = validateArguments(node.data?.args || []);
    if (!validation.valid) {
      invalidNodes.push({
        id: node.id,
        label: node.data?.label,
        errors: validation.errors,
      });
      totalErrors += validation.errors.length;
    }
  });

  if (totalErrors === 0) {
    console.log(`✅ All ${nodes.length} node(s) are valid`);
  } else {
    console.warn(`⚠️  Found ${totalErrors} validation error(s) in ${invalidNodes.length} node(s):`);
    invalidNodes.forEach(node => {
      console.warn(`  Node ${node.id} (${node.label}):`);
      node.errors.forEach(error => {
        console.warn(`    - ${error}`);
      });
    });
  }

  console.groupEnd();
};

/**
 * 引数配列から重複するIDを検出
 * 
 * @param {Array} args - 引数配列
 * @returns {Array} 重複しているID
 */
export const findDuplicateArgIds = (args) => {
  const ids = args.map(arg => arg.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  return [...new Set(duplicates)];
};

/**
 * 引数配列のIDをユニークにする
 * 
 * @param {Array} args - 引数配列
 * @returns {Array} IDが修正された引数配列
 */
export const ensureUniqueArgIds = (args) => {
  const usedIds = new Set();
  
  return args.map((arg, idx) => {
    let id = arg.id;
    
    // IDが重複している場合は新しいIDを生成
    if (usedIds.has(id)) {
      id = `arg_${idx}_${Date.now()}`;
      console.warn(`Duplicate arg ID detected. Changed '${arg.id}' to '${id}'`);
    }
    
    usedIds.add(id);
    
    return {
      ...arg,
      id,
    };
  });
};