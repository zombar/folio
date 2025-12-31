# Folio

**Think in collections, not files.** Folio is a portfolio-first AI image generator that treats your creative explorations as first-class citizens.

Built for artists and creators who want to iterate fast, organize ideas visually, and never lose a promising direction.

## Why Folio?

Most AI image tools dump outputs into an endless scroll. Folio takes a different approach:

- **Portfolios** — Group related generations together. "Cyberpunk portraits", "Logo concepts v2", "That weird dream I had"
- **Iteration** — Right-click any image to spawn variations. Your creative lineage stays connected
- **Local-first** — Your images, your GPU, your data. Runs alongside ComfyUI via Docker

## Quick Start

```bash
# Clone and start
git clone https://github.com/yourusername/folio.git
cd folio
docker compose up -d

# Open in browser
open http://localhost:5173
```

**Requirements:** Docker, NVIDIA GPU with 8GB+ VRAM, ~20GB disk for models

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

## Features

| Feature | Status |
|---------|--------|
| Portfolio management | Phase 1 |
| Text-to-image generation | Phase 1 |
| Generation queue with progress | Phase 1 |
| Image iteration & variations | Phase 1 |
| Inpainting | Phase 2 |
| Outpainting | Phase 2 |

## Development

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pytest                    # Run tests
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm test                  # Run tests
npm run dev
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
└── docker-compose.yml
```

## License

MIT
