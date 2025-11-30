/**
 * KFP Pythonコード生成ユーティリティ
 * 
 * ✅ args形式のみをサポート（params形式は完全に削除）
 */

const sanitizeName = (s) => {
  // 変数名として無効な文字をアンダースコアに置き換える
  return String(s || '').replace(/\W+/g, '_') || 'arg';
};

const pythonTypeFor = (t) => {
  if (!t) return 'str';  // デフォルトは 'Any' ではなく 'str' に変更
  if (t === 'str' || t === 'string') return 'str';
  if (t === 'int') return 'int';
  if (t === 'float') return 'float';
  if (t === 'bool') return 'bool';
  if (t === 'Dataset' || t === 'Input[Dataset]' || t === 'Output[Dataset]') return t;
  return t;
};

const formatLiteralByType = (value, type) => {
  const s = String(value);
  
  if (type === 'int') {
    const n = Number(s);
    if (!Number.isNaN(n) && Number.isInteger(n)) return String(n);
    return `'${s.replace(/'/g, "\\'")}'`; // 変換不能な場合は文字列として扱う
  }
  
  if (type === 'float') {
    const n = parseFloat(s);
    if (!Number.isNaN(n)) {
      return Number.isInteger(n) ? `${n}.0` : String(n);
    }
    return `'${s.replace(/'/g, "\\'")}'`;
  }
  
  if (type === 'bool') {
    const v = s.toLowerCase();
    return (v === 'true' || v === '1') ? 'True' : 'False';
  }
  
  // デフォルト (str, Any, その他)
  return `'${s.replace(/'/g, "\\'")}'`;
};

/**
 * ReactFlowのノードとエッジ構造からKFPパイプラインコードを生成する
 * 
 * @param {Array<Object>} nodes - ReactFlowノードの配列
 * @param {Array<Object>} edges - ReactFlowエッジの配列
 * @param {Array<Object>} pipelineParams - パイプラインパラメータの配列
 * @param {string} pipelineName - パイプライン名
 * @param {Array<Object>} componentDefinitions - コンポーネント定義（未使用、互換性のため残存）
 * @returns {string} 生成されたPythonコード
 */
export function generatePipelineCode(nodes, edges, pipelineParams, pipelineName, componentDefinitions) {
  if (!nodes.length) return '';

  // 1. ノードIDと関数名のマッピングを構築
  // Use the node label (sanitized) so component names are reflected in the generated code
  const nodeFunctionMap = {};
  const nameCount = {}; // 重複名の追跡
  
  nodes.forEach((node) => {
    const baseName = sanitizeName(node.data.label || node.data.componentType || 'component');
    
    // 重複をチェック - 同じ名前が複数ある場合のみ番号を付与
    if (!nameCount[baseName]) {
      nameCount[baseName] = 0;
    }
    nameCount[baseName]++;
  });

  // 2回目のループで、重複がある場合のみ番号を付与
  const usedNames = new Set();
  nodes.forEach((node) => {
    const baseName = sanitizeName(node.data.label || node.data.componentType || 'component');
    
    if (nameCount[baseName] > 1) {
      // 重複がある場合、番号を付与
      const count = usedNames.has(baseName) ? Object.keys(nodeFunctionMap).filter(k => 
        nodeFunctionMap[k].startsWith(baseName + '_')
      ).length : 0;
      nodeFunctionMap[node.id] = `${baseName}_${count}`;
      usedNames.add(baseName);
    } else {
      // 重複がない場合、そのまま使用
      nodeFunctionMap[node.id] = baseName;
    }
  });

  // 2. コンポーネント関数定義の生成 (Python)
  const componentFunctions = nodes.map((node) => {
    const funcName = nodeFunctionMap[node.id];
    const argsArray = node.data.args || [];
    const baseImage = node.data.baseImage || 'python:3.11-slim';

    // 入力引数の生成
    const paramNames = argsArray.map((a) => sanitizeName(a.name || `arg_${a.id}`));
    const paramList = paramNames.map((nm, i) => {
      const declaredType = pythonTypeFor(argsArray[i]?.type || 'str');
      return `${nm}: ${declaredType}`;
    }).join(', ');

    // 出力パラメータの生成 (Output[Dataset] 型)
    const outputs = node.data.outputs || [];
    const outputList = outputs.map((out) => {
      const outName = sanitizeName(out.name || `output_${out.id}`);
      const outType = pythonTypeFor(out.type || 'Output[Dataset]');
      return `${outName}: ${outType}`;
    }).join(', ');

    // 完全な引数リスト (入力 + 出力)
    const fullParamList = [paramList, outputList].filter(Boolean).join(', ');

    // ノードのコードソース
    const rawSource = node.data.codeString?.trim() || '';

    // Pythonの関数定義の構造を作成
    if (/\bdef\s+[A-Za-z_]\w*\s*\([^)]*\)\s*:/.test(rawSource)) {
      // 既存の関数定義がある場合、シグネチャを置き換え
      return rawSource.replace(
        /(^|\n)\s*def\s+[A-Za-z_]\w*\s*\([^)]*\)\s*:/,
        `$1@component(base_image='${baseImage}')\ndef ${funcName}(${fullParamList}):`
      );
    } else {
      // 生のコードをインデントして関数内に挿入
      const indented = rawSource.split('\n').map(line => '    ' + line).join('\n');
      return `@component(base_image='${baseImage}')\ndef ${funcName}(${fullParamList}):\n${indented || '    pass'}`;
    }
  }).join('\n\n');

  // 3. パイプライン関数のシグネチャ生成
  const pipelineParamDefs = pipelineParams.filter(p => p.key).map(p => {
    const nm = sanitizeName(p.key);
    const t = pythonTypeFor(p.type || 'str');

    // デフォルト値の追加
    if (p.value !== undefined && p.value !== '') {
      return `${nm}: ${t} = ${formatLiteralByType(p.value, p.type)}`;
    }
    return `${nm}: ${t}`;
  });
  const pipelineSig = pipelineParamDefs.join(', ');

  // 4. パイプラインステップと依存関係の生成
  const nodeStepName = {};
  nodes.forEach((n, i) => { 
    nodeStepName[n.id] = `step${i}`; 
  });

  const pipelineSteps = nodes.map((node) => {
    const funcName = nodeFunctionMap[node.id];
    const stepVar = nodeStepName[node.id];
    const argsArray = node.data.args || [];

    // ステップ呼び出しの引数リストを生成
    const argList = argsArray.map((a) => {
      if (!a || typeof a !== 'object') return 'None';

      if (a.mode === 'literal') {
        const declaredType = a.type || 'str';
        return formatLiteralByType(a.value, declaredType);
      }
      
      if (a.mode === 'pipeline') {
        // パイプライン関数の引数名を参照
        return sanitizeName(a.key || 'None') || 'None';
      }
      
      if (a.mode === 'node') {
        // 上流のステップ変数を参照
        const refStep = nodeStepName[a.nodeId];
        if (!refStep) return 'None';
        
        // 出力が指定されている場合は .outputs['name'] 構文を使用
        if (a.outputName) {
          return `${refStep}.outputs['${sanitizeName(a.outputName)}']`;
        }
        
        // 出力が指定されていない場合は .output を使用（後方互換性）
        return `${refStep}.output`;
      }
      
      return 'None';
    }).join(', ');

    return `    ${stepVar} = ${funcName}(${argList})`;
  }).join('\n');

  const dependencyLines = (edges || []).map((e) => {
    const src = nodeStepName[e.source];
    const tgt = nodeStepName[e.target];
    if (src && tgt) return `    ${tgt}.after(${src})`;
    return null;
  }).filter(Boolean).join('\n');

  // 5. 最終的なコード構造の組み立て
  const sanitizedPipelineName = sanitizeName(pipelineName || 'ml_pipeline');

  // Dataset型が使われているかチェック
  const usesDataset = nodes.some(node => {
    const outputs = node.data.outputs || [];
    const args = node.data.args || [];
    return outputs.some(o => o.type?.includes('Dataset')) || 
           args.some(a => a.type?.includes('Dataset'));
  });

  const code = `# Pipeline: ${pipelineName}
# Generated by Pipeline Builder
# Params: ${JSON.stringify(pipelineParams)}

from kfp.dsl import pipeline, component${usesDataset ? ', Input, Output' : ''}
from kfp.dsl import Dataset

${componentFunctions}


@pipeline(name='${pipelineName}')
def ${sanitizedPipelineName}(${pipelineSig}):
${pipelineSteps || '    pass'}
${dependencyLines ? '\n' + dependencyLines : ''}

# Compile the pipeline to YAML
import sys
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    logger.info("Attempting to compile pipeline...")
    from kfp.compiler import Compiler
    logger.info(f"Compiler imported successfully, starting compilation...")
    Compiler().compile(
        pipeline_func=${sanitizedPipelineName}, 
        package_path="${sanitizedPipelineName}.yaml"
    )
    logger.info(f"Pipeline compiled successfully to ${sanitizedPipelineName}.yaml")
except Exception as e:
    logger.error(f"Compilation failed: {e}")
    import traceback
    logger.error(traceback.format_exc())
    raise
`;

  return code;
}

/**
 * コード生成のバリデーション
 * 
 * @param {Array} nodes - ノード配列
 * @param {Array} pipelineParams - パイプラインパラメータ
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateForCodeGeneration(nodes, pipelineParams) {
  const errors = [];

  // ノードのチェック
  if (!nodes || nodes.length === 0) {
    errors.push('No nodes found. Add at least one component.');
  }

  nodes.forEach((node, idx) => {
    // 必須フィールドのチェック
    if (!node.data?.label) {
      errors.push(`Node ${idx}: Missing label`);
    }
    if (!node.data?.componentType) {
      errors.push(`Node ${idx}: Missing component type`);
    }

    // 引数のチェック
    const args = node.data?.args || [];
    args.forEach((arg, argIdx) => {
      if (arg.mode === 'pipeline' && arg.key) {
        // パイプラインパラメータが存在するかチェック
        const paramExists = pipelineParams.some(p => p.key === arg.key);
        if (!paramExists) {
          errors.push(
            `Node "${node.data.label}", Arg ${argIdx}: ` +
            `References non-existent pipeline parameter '${arg.key}'`
          );
        }
      }
      
      if (arg.mode === 'node' && arg.nodeId) {
        // 参照先ノードが存在するかチェック
        const nodeExists = nodes.some(n => n.id === arg.nodeId);
        if (!nodeExists) {
          errors.push(
            `Node "${node.data.label}", Arg ${argIdx}: ` +
            `References non-existent node '${arg.nodeId}'`
          );
        }
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}