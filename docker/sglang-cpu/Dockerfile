# SGLang server - CPU only (for testing, very slow for inference)
FROM python:3.11-slim

# Install dependencies (g++ needed for torch_memory_saver)
RUN apt-get update && apt-get install -y \
    git \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment
RUN python -m venv /opt/sglang-env
ENV PATH="/opt/sglang-env/bin:$PATH"

# Install SGLang (CPU version - no CUDA)
# Install sglang without torch_memory_saver (it requires CUDA headers to build)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir sglang --no-deps && \
    pip install --no-cache-dir $(pip show sglang | grep Requires | sed 's/Requires: //' | tr ',' '\n' | grep -v torch_memory_saver | tr '\n' ' ')

# Create directory for HuggingFace cache
RUN mkdir -p /root/.cache/huggingface
VOLUME /root/.cache/huggingface

WORKDIR /app

# Default port for SGLang server
EXPOSE 30000

# Default command - will be overridden by docker-compose
# Note: CPU inference is very slow, use small models only
CMD ["python", "-m", "sglang.launch_server", "--host", "0.0.0.0", "--port", "30000"]
