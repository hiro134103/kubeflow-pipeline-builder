FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir python-lsp-server==1.7.4 python-lsp-jsonrpc==1.0.0 pylsp-rope==0.1.15 jedi==0.18.1 flask==3.0.0 flask-cors==4.0.0 numpy==1.24.3 pandas==2.0.3 requests==2.31.0

# Copy server code
COPY . /app

EXPOSE 8000

# Run the server
CMD ["python", "lsp_wrapper.py"]
