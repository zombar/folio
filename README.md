# Folio

A local AI image generator with portfolio organization. Uses ComfyUI for SDXL image generation with a React frontend and FastAPI backend.

## Features

- **Portfolio organization** - Group generated images into collections
- **Text-to-image generation** - SDXL workflows with configurable parameters
- **Inpainting** - Paint over areas to regenerate with marching ants mask visualization
- **Outpainting** - Extend images in any direction
- **Upscaling** - Multiple upscaler models (RealESRGAN, UltraSharp)
- **Image variations** - Iterate on existing images with adjusted parameters
- **Greyscale interface** - Neutral UI that doesn't compete with generated images
- **Queue management** - Priority-based job queue with preemption

## Requirements

- Docker with Compose
- NVIDIA GPU with 8GB+ VRAM
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

# Start all services (requires GPU)
make up-gpu

# Start backend + frontend only (no GPU/ComfyUI)
make up

# Stop all services
make down

# View logs
make logs

# Run tests
make test
```

Services:
- Frontend: http://localhost:5173
- Backend: http://localhost:8010
- ComfyUI: http://localhost:8188 (with `make up-gpu`)

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
