.PHONY: help init build build-fresh up down restart logs ps clean test test-backend test-frontend lint lint-backend lint-frontend shell-backend shell-frontend push-images push-images-parallel pull-images up-images buildx-setup

# Docker registry settings
REGISTRY ?= ghcr.io
REPO ?= zombar/folio
COMMIT_HASH := $(shell git rev-parse --short HEAD)
# Platforms for multi-arch builds (amd64 for Linux, arm64 for macOS M-series)
PLATFORMS ?= linux/amd64,linux/arm64

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

up: ## Start all services
	@docker run --rm -v $(PWD)/storage:/storage alpine sh -c "mkdir -p /storage/images && chmod -R 777 /storage/images"
	docker compose up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## Follow logs from all services
	docker compose logs -f

ps: ## Show running containers
	docker compose ps

clean: ## Stop and remove containers, volumes
	docker compose down -v --remove-orphans

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
	@echo "Platforms: $(PLATFORMS)"
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
	@echo ""
	@echo "All images pushed successfully!"

push-images-parallel: buildx-setup ## Build and push all images in parallel (faster)
	@echo "Building and pushing images in parallel..."
	@echo "Registry: $(REGISTRY)/$(REPO)"
	@echo "Tags: $(COMMIT_HASH), latest"
	@echo ""
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(REPO)/frontend:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/frontend:latest \
		--push ./frontend & \
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(REPO)/backend:$(COMMIT_HASH) \
		-t $(REGISTRY)/$(REPO)/backend:latest \
		--push ./backend & \
	wait
	@echo ""
	@echo "All images pushed successfully!"

pull-images: ## Pull pre-built images from ghcr.io
	docker pull $(REGISTRY)/$(REPO)/frontend:latest
	docker pull $(REGISTRY)/$(REPO)/backend:latest

up-images: ## Start services using pre-built images
	@docker run --rm -v $(PWD)/storage:/storage alpine sh -c "mkdir -p /storage/images && chmod -R 777 /storage/images"
	docker compose -f docker-compose.yml -f docker-compose.images.yml up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"
