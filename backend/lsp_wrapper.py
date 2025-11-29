"""
Simple LSP wrapper using Jedi for Python completion
Provides VSCode-like completion and analysis
"""
import json
import logging
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from jedi import Script

app = Flask(__name__)
CORS(app)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# KFP 2.0 API completions for fallback
KFP_COMPLETIONS = {
    'kfp': ['dsl', 'components', 'client', 'compiler', 'v2'],
    'kfp.dsl': ['pipeline', 'component', 'Pipeline', 'ContainerOp', 'PipelineParam', 'Condition'],
    'kfp.components': ['create_component_from_func', 'load_component_from_file', 'load_component_from_url'],
    'kfp.client': ['Client', 'KfpApiException'],
    'kfp.v2': ['dsl', 'components', 'compiler'],
    'kfp.v2.dsl': ['pipeline', 'component', 'Input', 'Output', 'OutputPath', 'InputPath'],
    'kfp.v2.components': ['create_component_from_func'],
    'kfp.v2.compiler': ['Compiler'],
}

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

@app.route('/api/completion', methods=['POST'])
def get_completions():
    """Get completions for given code and position"""
    try:
        data = request.json
        code = data.get('code', '')
        line = data.get('line', 0)
        character = data.get('character', 0)

        logger.info(f"Completion request: line={line}, char={character}, code_length={len(code)}")

        if not code or line < 0 or character < 0:
            logger.warning("Invalid parameters for completion")
            return jsonify({'completions': []})

        # Use Jedi for completion (includes function signatures with arguments)
        try:
            script = Script(code, path='untitled.py')
            jedi_completions = script.complete(line=line + 1, column=character)
            
            completions = []
            for completion in jedi_completions[:50]:  # Limit to 50 results
                insert_text = completion.name
                documentation = ''
                detail = completion.type
                
                try:
                    # For functions, extract signature with arguments
                    if completion.type == 'function':
                        sigs = completion.get_signatures()
                        if sigs:
                            sig = sigs[0]
                            insert_text = f"{completion.name}("
                            documentation = str(sig)  # e.g., "mean(a, axis=None)"
                    
                    # Add docstring for documentation
                    docstring = completion.docstring()
                    if docstring:
                        documentation = f"{documentation}\n{docstring}" if documentation else docstring
                except:
                    pass
                
                completions.append({
                    'label': completion.name,
                    'kind': _get_completion_kind(completion.type),
                    'detail': detail,
                    'documentation': documentation,
                    'insertText': insert_text
                })
            
            logger.info(f"Jedi completions: {len(completions)} (function signatures included)")
            
            # If no completions found and this looks like KFP, try KFP fallback
            if len(completions) == 0 and 'kfp' in code:
                kfp_comps = _get_kfp_fallback_completions(code, line, character)
                if kfp_comps:
                    logger.info(f"KFP fallback completions: {len(kfp_comps)}")
                    return jsonify({'completions': kfp_comps})
            
            return jsonify({'completions': completions})
        except Exception as e:
            logger.warning(f"Jedi error: {e}")
            # Try KFP fallback on error
            kfp_comps = _get_kfp_fallback_completions(code, line, character)
            if kfp_comps:
                logger.info(f"KFP fallback completions after error: {len(kfp_comps)}")
                return jsonify({'completions': kfp_comps})
            return jsonify({'completions': []})

    except Exception as e:
        logger.error(f"Completion error: {e}")
        return jsonify({'completions': [], 'error': str(e)}), 500

@app.route('/api/hover', methods=['POST'])
def get_hover():
    """Get hover information for given position"""
    try:
        data = request.json
        code = data.get('code', '')
        line = data.get('line', 0)
        character = data.get('character', 0)

        if not code or line < 0 or character < 0:
            return jsonify({'hover': None})

        try:
            script = Script(code, path='untitled.py')
            definitions = script.infer(line=line + 1, column=character)
            
            if definitions:
                hover_info = {
                    'contents': definitions[0].docstring() if hasattr(definitions[0], 'docstring') else definitions[0].type,
                    'range': None
                }
                return jsonify({'hover': hover_info})
            
            return jsonify({'hover': None})
        except Exception as e:
            logger.warning(f"Hover error: {e}")
            return jsonify({'hover': None})

    except Exception as e:
        logger.error(f"Hover error: {e}")
        return jsonify({'hover': None}), 500

def _get_completion_kind(jedi_type):
    """Convert Jedi type to LSP completion kind"""
    kind_map = {
        'module': 9,      # Module
        'class': 5,       # Class
        'function': 12,   # Function
        'param': 23,      # Variable
        'type': 5,        # Class
        'variable': 13,   # Variable
        'instance': 13,   # Variable
        'statement': 13,  # Variable
        'keyword': 14,    # Keyword
    }
    return kind_map.get(jedi_type, 13)  # Default to Variable

def _get_kfp_fallback_completions(code, line, character):
    """Get KFP completions from static database"""
    lines = code.split('\n')
    if not (0 <= line < len(lines)):
        return []
    
    line_text = lines[line][:character]
    logger.info(f"KFP fallback: analyzing line_text='{line_text}'")
    
    # Check for 'import kfp' or 'from kfp import'
    if 'import kfp' in code:
        # Match patterns like "kfp." or "kfp.dsl."
        match = re.search(r'(kfp(?:\.[a-zA-Z_]\w*)*)\s*\.\s*(\w*)$', line_text)
        if match:
            module_path = match.group(1)
            prefix = match.group(2)
            logger.info(f"KFP fallback: module_path='{module_path}', prefix='{prefix}'")
            
            if module_path in KFP_COMPLETIONS:
                completions = []
                for item in KFP_COMPLETIONS[module_path]:
                    if item.startswith(prefix) or prefix == '':
                        completions.append({
                            'label': item,
                            'kind': 9 if item[0].isupper() else 12,  # Class or Function
                            'detail': 'kfp',
                            'documentation': f"{module_path}.{item}",
                            'insertText': item
                        })
                return completions
    
    return []

@app.route('/api/definition', methods=['POST'])
def get_definition():
    """Get definition for given symbol"""
    try:
        data = request.json
        code = data.get('code', '')
        line = data.get('line', 0)
        character = data.get('character', 0)

        if not code or line < 0 or character < 0:
            return jsonify({'definitions': []})

        try:
            script = Script(code, path='untitled.py')
            definitions = script.goto(line=line + 1, column=character)
            
            result = []
            for definition in definitions:
                result.append({
                    'uri': definition.module_path if hasattr(definition, 'module_path') else 'untitled.py',
                    'range': {
                        'start': {'line': definition.line - 1 if hasattr(definition, 'line') else 0, 'character': 0},
                        'end': {'line': definition.line - 1 if hasattr(definition, 'line') else 0, 'character': 0}
                    }
                })
            
            return jsonify({'definitions': result})
        except Exception as e:
            logger.warning(f"Definition error: {e}")
            return jsonify({'definitions': []})

    except Exception as e:
        logger.error(f"Definition error: {e}")
        return jsonify({'definitions': []}), 500

if __name__ == '__main__':
    logger.info("Starting Python LSP wrapper on port 8000...")
    app.run(host='0.0.0.0', port=8000, debug=False)
