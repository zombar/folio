FROM ghcr.io/ai-dock/comfyui:cpu-latest

# Update ComfyUI to specific version for compatibility with custom nodes
WORKDIR /opt/ComfyUI
RUN git fetch origin && git checkout f8b981ae9a5676311624bbafa636a1874db79459

# Install dependencies in ComfyUI's virtual environment
ENV COMFYUI_PIP=/opt/environments/python/comfyui/bin/pip

# Install updated ComfyUI requirements
RUN $COMFYUI_PIP install -r requirements.txt

# Install custom nodes required by workflows
WORKDIR /opt/ComfyUI/custom_nodes

# ComfyUI-WD14-Tagger - Image tagging using WD14 models
RUN git clone https://github.com/pythongosssss/ComfyUI-WD14-Tagger && \
    cd ComfyUI-WD14-Tagger && \
    $COMFYUI_PIP install -r requirements.txt && \
    mkdir -p models && chmod 777 models

# ComfyUI-Inpaint-Nodes - Better inpainting with Fooocus
RUN git clone https://github.com/Acly/comfyui-inpaint-nodes && \
    $COMFYUI_PIP install opencv-python

WORKDIR /opt/ComfyUI
