$code = @"
from typing import Any
from kfp.dsl import pipeline, component

@component(base_image='python:3.11-slim')
def blank_component(name: str = 'default') -> str:
    return f'Hello, {name}!'

@pipeline(name='test_pipeline')
def test_pipeline(name: str = 'World'):
    task = blank_component(name=name)

if __name__ == "__main__":
    from kfp.compiler import Compiler
    Compiler().compile(pipeline_func=test_pipeline, package_path="test_pipeline.yaml")
"@

$body = @{
    code = $code
    pipeline_name = "test_pipeline"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/compile" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body -ErrorAction Stop
    Write-Host "✓ Compilation successful!"
    Write-Host "Status Code: $($response.StatusCode)"
    $content = $response.Content | ConvertFrom-Json
    if ($content.success) {
        Write-Host "✓ Pipeline compiled"
        Write-Host "YAML size: $($content.yaml.Length) bytes"
    } else {
        Write-Host "✗ Compilation failed: $($content.error)"
    }
}
catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)"
    Write-Host $_.Exception.Response.Content
}
