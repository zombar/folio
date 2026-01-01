# SGLang server with AMD ROCm support
FROM rocm/pytorch:rocm6.0.2_ubuntu22.04_py3.10_pytorch_2.1.2

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install SGLang with ROCm support
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir sglang

# Install triton for ROCm
RUN pip install --no-cache-dir triton

# Create directory for HuggingFace cache
RUN mkdir -p /root/.cache/huggingface
VOLUME /root/.cache/huggingface

WORKDIR /app

# Default port for SGLang server
EXPOSE 30000

# Default command - will be overridden by docker-compose
CMD ["python", "-m", "sglang.launch_server", "--host", "0.0.0.0", "--port", "30000"]
