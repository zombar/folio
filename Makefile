.PHONY: help build up up-gpu down restart logs ps clean test test-backend test-frontend shell-backend shell-frontend

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build all containers
	docker compose build

up: ## Start backend + frontend (no GPU)
	docker compose up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"

up-gpu: ## Start all services including ComfyUI (requires NVIDIA GPU)
	docker compose --profile gpu up -d
	@echo ""
	@echo "  Backend:  http://localhost:8010"
	@echo "  Frontend: http://localhost:5173"
	@echo "  ComfyUI:  http://localhost:8188"

down: ## Stop all services
	docker compose --profile gpu down

restart: ## Restart all services
	docker compose restart

logs: ## Follow logs from all services
	docker compose logs -f

ps: ## Show running containers
	docker compose ps

clean: ## Stop and remove containers, volumes
	docker compose --profile gpu down -v --remove-orphans

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	cd backend && python -m pytest -v

test-frontend: ## Run frontend tests
	cd frontend && npm test -- --run

shell-backend: ## Open shell in backend container
	docker compose exec backend /bin/bash

shell-frontend: ## Open shell in frontend container
	docker compose exec frontend /bin/sh
