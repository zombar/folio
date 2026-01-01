.PHONY: help init build build-fresh up up-gpu up-rocm down restart logs ps clean test test-backend test-frontend lint lint-backend lint-frontend shell-backend shell-frontend push-images pull-images up-images up-images-gpu up-images-rocm

# Docker registry settings
REGISTRY ?= ghcr.io
REPO ?= zombar/folio
COMMIT_HASH := $(shell git rev-parse --short HEAD)
IMAGES := frontend backend comfyui-cpu comfyui comfyui-rocm sglang sglang-rocm
# Note: sglang-cpu is not included because SGLang requires GPU acceleration

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

init: ## Initialize development environment (install dependencies + git hooks)
	@echo "Installing root dependencies (Husky)..."
	npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing backend dependencies (activate venv first)..."
	cd backend && pip install -r requirements.txt
	@echo "Development environment initialized!"

build: ## Build all containers
	docker compose build

build-fresh: ## Build all containers without cache (use after dependency changes)
	docker compose build --no-cache

up: ## Start all services with CPU rendering
	@docker run --rm -v $(PWD)/storage:/storage alpine sh -c "mkdir -p /storage/comfyui-output /storage/images && chmod -R 777 /storage/comfyui-output /storage/images"
	docker compose --profile cpu up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"
	@echo "  ComfyUI:  http://localhost:8188 (CPU)"

up-gpu: ## Start all services including ComfyUI (requires NVIDIA GPU)
	@docker run --rm -v $(PWD)/storage:/storage alpine sh -c "mkdir -p /storage/comfyui-output /storage/images && chmod -R 777 /storage/comfyui-output /storage/images"
	docker compose --profile gpu up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"
	@echo "  ComfyUI:  http://localhost:8188"

up-rocm: ## Start all services including ComfyUI (requires AMD GPU with ROCm)
	@docker run --rm -v $(PWD)/storage:/storage alpine sh -c "mkdir -p /storage/comfyui-output /storage/images && chmod -R 777 /storage/comfyui-output /storage/images"
	docker compose --profile rocm up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"
	@echo "  ComfyUI:  http://localhost:8188"

down: ## Stop all services
	docker compose --profile cpu --profile gpu --profile rocm down

restart: ## Restart all services
	docker compose restart

logs: ## Follow logs from all services
	docker compose logs -f

ps: ## Show running containers
	docker compose ps

clean: ## Stop and remove containers, volumes
	docker compose --profile cpu --profile gpu --profile rocm down -v --remove-orphans

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	cd backend && python3 -m pytest -v

test-frontend: ## Run frontend tests
	cd frontend && npm test -- --run

lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Run backend linter
	cd backend && ruff check .

lint-frontend: ## Run frontend linter
	cd frontend && npm run lint

shell-backend: ## Open shell in backend container
	docker compose exec backend /bin/bash

shell-frontend: ## Open shell in frontend container
	docker compose exec frontend /bin/sh

# === Docker Image Publishing ===

push-images: ## Build and push all images to ghcr.io (requires: docker login ghcr.io)
	@echo "Building and pushing images with tags: $(COMMIT_HASH), latest"
	@echo "Registry: $(REGISTRY)/$(REPO)"
	@echo ""
	@# Frontend
	docker build -t $(REGISTRY)/$(REPO)/frontend:$(COMMIT_HASH) -t $(REGISTRY)/$(REPO)/frontend:latest ./frontend
	docker push $(REGISTRY)/$(REPO)/frontend:$(COMMIT_HASH)
	docker push $(REGISTRY)/$(REPO)/frontend:latest
	@# Backend
	docker build -t $(REGISTRY)/$(REPO)/backend:$(COMMIT_HASH) -t $(REGISTRY)/$(REPO)/backend:latest ./backend
	docker push $(REGISTRY)/$(REPO)/backend:$(COMMIT_HASH)
	docker push $(REGISTRY)/$(REPO)/backend:latest
	@# ComfyUI CPU
	docker build -t $(REGISTRY)/$(REPO)/comfyui-cpu:$(COMMIT_HASH) -t $(REGISTRY)/$(REPO)/comfyui-cpu:latest ./docker/comfyui-cpu
	docker push $(REGISTRY)/$(REPO)/comfyui-cpu:$(COMMIT_HASH)
	docker push $(REGISTRY)/$(REPO)/comfyui-cpu:latest
	@# ComfyUI GPU (NVIDIA)
	docker build -t $(REGISTRY)/$(REPO)/comfyui:$(COMMIT_HASH) -t $(REGISTRY)/$(REPO)/comfyui:latest ./docker/comfyui
	docker push $(REGISTRY)/$(REPO)/comfyui:$(COMMIT_HASH)
	docker push $(REGISTRY)/$(REPO)/comfyui:latest
	@# ComfyUI ROCm
	docker build -t $(REGISTRY)/$(REPO)/comfyui-rocm:$(COMMIT_HASH) -t $(REGISTRY)/$(REPO)/comfyui-rocm:latest ./docker/comfyui-rocm
	docker push $(REGISTRY)/$(REPO)/comfyui-rocm:$(COMMIT_HASH)
	docker push $(REGISTRY)/$(REPO)/comfyui-rocm:latest
	@# SGLang GPU (NVIDIA)
	docker build -t $(REGISTRY)/$(REPO)/sglang:$(COMMIT_HASH) -t $(REGISTRY)/$(REPO)/sglang:latest ./docker/sglang
	docker push $(REGISTRY)/$(REPO)/sglang:$(COMMIT_HASH)
	docker push $(REGISTRY)/$(REPO)/sglang:latest
	@# SGLang ROCm
	docker build -t $(REGISTRY)/$(REPO)/sglang-rocm:$(COMMIT_HASH) -t $(REGISTRY)/$(REPO)/sglang-rocm:latest ./docker/sglang-rocm
	docker push $(REGISTRY)/$(REPO)/sglang-rocm:$(COMMIT_HASH)
	docker push $(REGISTRY)/$(REPO)/sglang-rocm:latest
	@echo ""
	@echo "All images pushed successfully!"

pull-images: ## Pull pre-built images from ghcr.io
	docker pull $(REGISTRY)/$(REPO)/frontend:latest
	docker pull $(REGISTRY)/$(REPO)/backend:latest
	docker pull $(REGISTRY)/$(REPO)/comfyui-cpu:latest
	docker pull $(REGISTRY)/$(REPO)/comfyui:latest
	docker pull $(REGISTRY)/$(REPO)/sglang:latest

up-images: ## Start services using pre-built images (CPU profile)
	@docker run --rm -v $(PWD)/storage:/storage alpine sh -c "mkdir -p /storage/comfyui-output /storage/images && chmod -R 777 /storage/comfyui-output /storage/images"
	docker compose -f docker-compose.yml -f docker-compose.images.yml --profile cpu up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"
	@echo "  ComfyUI:  http://localhost:8188 (CPU)"

up-images-gpu: ## Start services using pre-built images (NVIDIA GPU profile)
	@docker run --rm -v $(PWD)/storage:/storage alpine sh -c "mkdir -p /storage/comfyui-output /storage/images && chmod -R 777 /storage/comfyui-output /storage/images"
	docker compose -f docker-compose.yml -f docker-compose.images.yml --profile gpu up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"
	@echo "  ComfyUI:  http://localhost:8188"

up-images-rocm: ## Start services using pre-built images (AMD ROCm profile)
	@docker run --rm -v $(PWD)/storage:/storage alpine sh -c "mkdir -p /storage/comfyui-output /storage/images && chmod -R 777 /storage/comfyui-output /storage/images"
	docker compose -f docker-compose.yml -f docker-compose.images.yml --profile rocm up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"
	@echo "  ComfyUI:  http://localhost:8188"
