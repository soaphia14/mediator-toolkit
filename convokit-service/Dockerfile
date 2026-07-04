# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
# install CPU-only torch first so convokit doesn't drag in the ~5GB NVIDIA CUDA stack
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch
RUN pip install --no-cache-dir --retries 5 --timeout 120 -r requirements.txt
COPY exporter.py app.py ./
EXPOSE 8080
# binds 0.0.0.0 *inside* the container; still private because the port isn't published
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}"]
