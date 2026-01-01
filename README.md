# Folio

Local-first AI image generator with portfolio based image management. Uses ComfyUI under the hood for SDXL image generation and transformation, with super-light React frontend. Also includes local LLM chat powered by Ollama.

## Features

### Image Generation
- **Portfolio organization** - Group generated images into collections
- **Text-to-image generation** - Import your custom SDXL workflows with configurable parameters
- **Inpainting** - Paint over areas to regenerate the bits you don't like
- **Outpainting** - Extend images in any direction
- **Upscaling** - Multiple upscaler models (RealESRGAN, UltraSharp)
- **Image variations** - Rework existing images with adjusted parameters
- **Optimized defaults** - Pre-tuned settings for realistic photo generation (dpmpp_2m sampler, karras scheduler, CFG 5.5)
- **Queue management** - Priority-based job queue with preemption

### Text Chat
- **Local LLM chat** - Converse with Ollama-hosted models
- **Multiple conversations** - Manage separate chat threads
- **Model switching** - Switch between available Ollama models
- **Streaming responses** - Real-time response streaming with markdown rendering

### User Interface
- **Greyscale interface** - Neutral UI that doesn't compete with generated images
- **Dark/light mode** - Toggle between themes

## Requirements

- Docker with Compose
- NVIDIA GPU with 8GB+ VRAM (for image generation)
- ~20GB disk for models

## Model Setup

Place model files in the `models/` directory. This directory is mounted to ComfyUI at `/opt/ComfyUI/models`.

```
models/
├── checkpoints/          # SDXL base models (.safetensors)
├── vae/                  # VAE models
├── loras/                # LoRA models
└── clip/                 # CLIP models
```

For SDXL, download a checkpoint such as `sd_xl_base_1.0.safetensors` and place it in `models/checkpoints/`.

## Usage

```bash
# Show all available commands
make help
```

### Launch Profiles

Choose the right profile for your hardware:

| Command | Description | GPU Required |
|---------|-------------|--------------|
| `make up` | CPU rendering (slow, for testing) | No |
| `make up-gpu` | NVIDIA GPU with CUDA | NVIDIA GPU |
| `make up-rocm` | AMD GPU with ROCm | AMD GPU |

Pre-built images (faster startup, no local build):

| Command | Description |
|---------|-------------|
| `make up-images` | CPU profile with pre-built images |
| `make up-images-gpu` | NVIDIA GPU with pre-built images |
| `make up-images-rocm` | AMD ROCm with pre-built images |

### Common Commands

```bash
# Stop all services
make down

# View logs
make logs

# Run tests
make test

# Show running containers
make ps
```

### Services

Once running, access the services at:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:8010
- **ComfyUI:** http://localhost:8188

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│   FastAPI   │────▶│  ComfyUI    │
│   Frontend  │ SSE │   Backend   │ REST│   (GPU)     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │   SQLite    │
                    └─────────────┘
```

- **Frontend:** React 18 + Vite + Tailwind + TanStack Query
- **Backend:** FastAPI + SQLAlchemy + asyncio job queue
- **Generation:** ComfyUI with SDXL workflows

## Development

```bash
# Initialize development environment (installs all dependencies + git hooks)
make init

# Or manually:
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pytest

# Frontend
cd frontend
npm install
npm test
```

### Pre-commit Hooks

The project uses Husky for pre-commit hooks. After running `make init`, every commit will automatically:

1. Lint frontend code (ESLint)
2. Lint backend code (ruff)
3. Run frontend tests (Vitest)
4. Run backend tests (pytest)

Run linting and tests manually:

```bash
make lint      # Run all linters
make test      # Run all tests
```

## Project Structure

```
folio/
├── backend/              # FastAPI + SQLite
│   ├── app/
│   │   ├── api/          # REST endpoints
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # Business logic
│   │   └── workflows/    # ComfyUI JSON templates
│   └── tests/
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom hooks
│   │   └── stores/       # Zustand stores
│   └── tests/
├── models/               # ComfyUI model files
└── docker-compose.yml
```

## License

MIT
