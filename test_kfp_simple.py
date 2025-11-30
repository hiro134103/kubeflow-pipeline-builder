#!/usr/bin/env python3
"""
Simple test to understand KFP compilation behavior
"""
import tempfile
import os
import sys

code = """
from typing import Any
from kfp.dsl import pipeline, component

@component(base_image='python:3.11-slim')
def blank_component(name: str = 'default') -> str:
    return f'Hello, {name}!'

@pipeline(name='test_pipeline')
def test_pipeline(name: str = 'World'):
    task = blank_component(name=name)

print("About to compile...")
try:
    from kfp.compiler import Compiler
    print("Compiler imported successfully")
    Compiler().compile(
        pipeline_func=test_pipeline, 
        package_path="test_pipeline.yaml"
    )
    print("Compilation successful!")
except Exception as e:
    print(f"Compilation error: {e}")
    import traceback
    traceback.print_exc()
"""

with tempfile.TemporaryDirectory() as tmpdir:
    os.chdir(tmpdir)
    print(f"Working in: {os.getcwd()}")
    
    # Write code
    with open('temp_pipeline.py', 'w') as f:
        f.write(code)
    
    # Load and execute
    import importlib.util
    spec = importlib.util.spec_from_file_location("temp_pipeline", "temp_pipeline.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules["temp_pipeline"] = module
    
    print("\nExecuting module...")
    try:
        spec.loader.exec_module(module)
    except Exception as e:
        print(f"Module execution error: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"\nDirectory contents after execution:")
    print(os.listdir('.'))
