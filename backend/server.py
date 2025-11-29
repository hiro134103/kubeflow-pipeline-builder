"""
Python Language Server wrapper using Flask
Communicates with Monaco Editor via HTTP
"""
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.route('/api/completion', methods=['POST'])
def handle_completion():
    """Handle completion requests"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        position = data.get('position', {})

        logger.info(f"Completion request at {position}")

        # Parse Python code for completions
        completions = get_python_completions(text, position)
        return jsonify({'items': completions})

    except Exception as e:
        logger.error(f"Error in completion: {e}")
        return jsonify({'items': []}), 500


@app.route('/api/hover', methods=['POST'])
def handle_hover():
    """Handle hover requests"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        position = data.get('position', {})

        logger.info(f"Hover request at {position}")

        hover_info = get_hover_info(text, position)
        return jsonify(hover_info)

    except Exception as e:
        logger.error(f"Error in hover: {e}")
        return jsonify({'contents': ''}), 500


@app.route('/api/definition', methods=['POST'])
def handle_definition():
    """Handle definition requests"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        position = data.get('position', {})

        logger.info(f"Definition request at {position}")

        return jsonify({
            'uri': '',
            'range': {'start': {'line': 0, 'character': 0}, 'end': {'line': 0, 'character': 0}}
        })

    except Exception as e:
        logger.error(f"Error in definition: {e}")
        return jsonify({}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})


def get_python_completions(text, position):
    """Get Python completions based on context"""
    line = position.get('line', 0)
    character = position.get('character', 0)

    # Extract word at cursor
    lines = text.split('\n')
    if line < len(lines):
        line_text = lines[line][:character]
    else:
        line_text = ''

    # Check if we're in a dot notation (e.g., np.zero)
    if '.' in line_text:
        # Extract module/object and attribute being typed
        parts = line_text.rstrip().split('.')
        if len(parts) >= 2:
            module = parts[-2].split()[-1]  # Get the last word before the dot
            partial_attr = parts[-1]  # Get text after the dot
            
            # Get completions for that module
            completions = get_module_completions(module, partial_attr)
            if completions:
                return completions

    # Default completions (keywords, modules, etc.)
    completions = [
        {'label': 'import', 'kind': 14, 'detail': 'keyword'},
        {'label': 'from', 'kind': 14, 'detail': 'keyword'},
        {'label': 'def', 'kind': 14, 'detail': 'keyword'},
        {'label': 'class', 'kind': 14, 'detail': 'keyword'},
        {'label': 'if', 'kind': 14, 'detail': 'keyword'},
        {'label': 'else', 'kind': 14, 'detail': 'keyword'},
        {'label': 'for', 'kind': 14, 'detail': 'keyword'},
        {'label': 'while', 'kind': 14, 'detail': 'keyword'},
        {'label': 'numpy', 'kind': 9, 'detail': 'module'},
        {'label': 'np', 'kind': 9, 'detail': 'module alias'},
        {'label': 'pandas', 'kind': 9, 'detail': 'module'},
        {'label': 'pd', 'kind': 9, 'detail': 'module alias'},
        {'label': 'os', 'kind': 9, 'detail': 'module'},
        {'label': 'sys', 'kind': 9, 'detail': 'module'},
        {'label': 'json', 'kind': 9, 'detail': 'module'},
        {'label': 'pathlib', 'kind': 9, 'detail': 'module'},
        {'label': 'Path', 'kind': 5, 'detail': 'class'},
    ]

    return completions


def get_module_completions(module, partial_attr):
    """Get completions for module attributes/methods"""
    
    # Module API definitions
    module_apis = {
        'np': {
            'array': 'Create an array',
            'zeros': 'Create an array of zeros',
            'ones': 'Create an array of ones',
            'arange': 'Create an array with evenly spaced values',
            'linspace': 'Create an array with linearly spaced values',
            'reshape': 'Change array shape',
            'transpose': 'Transpose an array',
            'sum': 'Sum of array elements',
            'mean': 'Mean of array elements',
            'std': 'Standard deviation',
            'min': 'Minimum value',
            'max': 'Maximum value',
            'dot': 'Dot product',
            'concatenate': 'Join arrays',
        },
        'numpy': {
            'array': 'Create an array',
            'zeros': 'Create an array of zeros',
            'ones': 'Create an array of ones',
            'arange': 'Create an array with evenly spaced values',
            'linspace': 'Create an array with linearly spaced values',
            'reshape': 'Change array shape',
            'transpose': 'Transpose an array',
            'sum': 'Sum of array elements',
            'mean': 'Mean of array elements',
            'std': 'Standard deviation',
            'min': 'Minimum value',
            'max': 'Maximum value',
            'dot': 'Dot product',
            'concatenate': 'Join arrays',
        },
        'pd': {
            'DataFrame': 'Create a DataFrame',
            'Series': 'Create a Series',
            'read_csv': 'Read a CSV file',
            'read_excel': 'Read an Excel file',
            'concat': 'Concatenate DataFrames',
            'merge': 'Merge DataFrames',
            'pivot_table': 'Create a pivot table',
        },
        'pandas': {
            'DataFrame': 'Create a DataFrame',
            'Series': 'Create a Series',
            'read_csv': 'Read a CSV file',
            'read_excel': 'Read an Excel file',
            'concat': 'Concatenate DataFrames',
            'merge': 'Merge DataFrames',
            'pivot_table': 'Create a pivot table',
        },
        'os': {
            'path': 'OS path functions',
            'getcwd': 'Get current working directory',
            'chdir': 'Change directory',
            'listdir': 'List directory contents',
            'mkdir': 'Create a directory',
            'remove': 'Remove a file',
            'rename': 'Rename a file',
            'environ': 'Environment variables',
        },
        'sys': {
            'argv': 'Command line arguments',
            'exit': 'Exit the program',
            'path': 'Python path',
            'version': 'Python version',
            'executable': 'Python executable path',
        },
        'json': {
            'dumps': 'Serialize to JSON string',
            'loads': 'Deserialize from JSON string',
            'dump': 'Write JSON to file',
            'load': 'Read JSON from file',
        },
    }

    # Get API for this module
    if module not in module_apis:
        return []

    api = module_apis[module]
    
    # Filter by partial attribute
    completions = []
    for attr, description in api.items():
        if attr.startswith(partial_attr) or not partial_attr:
            completions.append({
                'label': attr,
                'kind': 2,  # Function kind
                'detail': description,
                'insertText': attr,
            })

    return sorted(completions, key=lambda x: x['label'])


def get_hover_info(text, position):
    """Get hover information for symbol at position"""
    return {
        'contents': 'Python Language Server v1.0'
    }


if __name__ == '__main__':
    logger.info("Python Language Server started on 0.0.0.0:8000")
    app.run(host='0.0.0.0', port=8000, debug=False)

