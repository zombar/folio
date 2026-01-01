# SGLang server with NVIDIA CUDA support
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment
RUN python3 -m venv /opt/sglang-env
ENV PATH="/opt/sglang-env/bin:$PATH"

# Install SGLang with all dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir "sglang[all]"

# Install flash-attention for better performance
RUN pip install --no-cache-dir flash-attn --no-build-isolation

# Create directory for HuggingFace cache
RUN mkdir -p /root/.cache/huggingface
VOLUME /root/.cache/huggingface

WORKDIR /app

# Default port for SGLang server
EXPOSE 30000

# Default command - will be overridden by docker-compose
CMD ["python", "-m", "sglang.launch_server", "--host", "0.0.0.0", "--port", "30000"]
