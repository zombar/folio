.PHONY: help init build build-fresh up up-gpu up-rocm down restart logs ps clean test test-backend test-frontend lint lint-backend lint-frontend shell-backend shell-frontend push-images push-images-parallel pull-images up-images up-images-gpu up-images-rocm buildx-setup

# Docker registry settings
REGISTRY ?= ghcr.io
REPO ?= zombar/folio
COMMIT_HASH := $(shell git rev-parse --short HEAD)
# Platforms for multi-arch builds (amd64 for Linux, arm64 for macOS M-series)
PLATFORMS ?= linux/amd64,linux/arm64
# Note: sglang-cpu is not included because SGLang requires GPU acceleration
# Note: GPU images (comfyui, comfyui-rocm, sglang, sglang-rocm) are amd64-only

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

# === Docker Image Publishing with Buildx ===

buildx-setup: ## Setup buildx builder for multi-arch builds
	@docker buildx inspect folio-builder >/dev/null 2>&1 || \
		docker buildx create --name folio-builder --driver docker-container --bootstrap
	@docker buildx use folio-builder

push-images: buildx-setup ## Build and push all images with buildx (multi-arch, sequential)
	@echo "Building and pushing multi-arch images with tags: $(COMMIT_HASH), latest"
	@echo "Registry: $(REGISTRY)/$(REPO)"
	@echo "Platforms: $(PLATFORMS) (multi-arch), linux/amd64 (GPU-only)"
	@echo ""
	@# Frontend (multi-arch)
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(REPO)/frontend:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/frontend:latest \
		--push ./frontend
	@# Backend (multi-arch)
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(REPO)/backend:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/backend:latest \
		--push ./backend
	@# ComfyUI CPU (multi-arch)
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(REPO)/comfyui-cpu:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/comfyui-cpu:latest \
		--push ./docker/comfyui-cpu
	@# ComfyUI GPU - NVIDIA CUDA (amd64 only)
	docker buildx build --platform linux/amd64 \
		-t $(REGISTRY)/$(REPO)/comfyui:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/comfyui:latest \
		--push ./docker/comfyui
	@# ComfyUI ROCm (amd64 only)
	docker buildx build --platform linux/amd64 \
		-t $(REGISTRY)/$(REPO)/comfyui-rocm:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/comfyui-rocm:latest \
		--push ./docker/comfyui-rocm
	@# SGLang GPU - NVIDIA CUDA (amd64 only)
	docker buildx build --platform linux/amd64 \
		-t $(REGISTRY)/$(REPO)/sglang:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/sglang:latest \
		--push ./docker/sglang
	@# SGLang ROCm (amd64 only)
	docker buildx build --platform linux/amd64 \
		-t $(REGISTRY)/$(REPO)/sglang-rocm:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/sglang-rocm:latest \
		--push ./docker/sglang-rocm
	@echo ""
	@echo "All images pushed successfully!"

push-images-parallel: buildx-setup ## Build and push all images in parallel (faster)
	@echo "Building and pushing images in parallel..."
	@echo "Registry: $(REGISTRY)/$(REPO)"
	@echo "Tags: $(COMMIT_HASH), latest"
	@echo ""
	@# Multi-arch images (frontend, backend, comfyui-cpu) in parallel
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(REPO)/frontend:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/frontend:latest \
		--push ./frontend & \
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(REPO)/backend:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/backend:latest \
		--push ./backend & \
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(REPO)/comfyui-cpu:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/comfyui-cpu:latest \
		--push ./docker/comfyui-cpu & \
	wait
	@# GPU images (amd64 only) in parallel
	docker buildx build --platform linux/amd64 \
		-t $(REGISTRY)/$(REPO)/comfyui:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/comfyui:latest \
		--push ./docker/comfyui & \
	docker buildx build --platform linux/amd64 \
		-t $(REGISTRY)/$(REPO)/comfyui-rocm:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/comfyui-rocm:latest \
		--push ./docker/comfyui-rocm & \
	docker buildx build --platform linux/amd64 \
		-t $(REGISTRY)/$(REPO)/sglang:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/sglang:latest \
		--push ./docker/sglang & \
	docker buildx build --platform linux/amd64 \
		-t $(REGISTRY)/$(REPO)/sglang-rocm:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/sglang-rocm:latest \
		--push ./docker/sglang-rocm & \
	wait
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
