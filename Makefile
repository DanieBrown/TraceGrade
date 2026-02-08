# ===========================
# TraceGrade Makefile
# ===========================
# Convenience commands for Docker Compose operations
# Usage: make <command>

.PHONY: help setup up down restart logs clean rebuild

# Default target
.DEFAULT_GOAL := help

# Display available commands
help:
	@echo "TraceGrade - Available Commands"
	@echo "================================"
	@echo "  make setup      - Initial setup (copy .env.example to .env)"
	@echo "  make up         - Start all services"
	@echo "  make up-d       - Start all services in detached mode"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs from all services"
	@echo "  make logs-f     - Follow logs from all services"
	@echo "  make clean      - Stop services and remove volumes"
	@echo "  make rebuild    - Rebuild and restart all services"
	@echo "  make ps         - List running containers"
	@echo "  make shell-be   - Open shell in backend container"
	@echo "  make shell-fe   - Open shell in frontend container"
	@echo "  make shell-db   - Open PostgreSQL shell"
	@echo "  make tools      - Start with optional tools (pgAdmin)"

# Initial setup
setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env file from .env.example"; \
		echo "→ Edit .env with your configuration"; \
	else \
		echo "✗ .env already exists"; \
	fi

# Start services
up:
	docker compose up

# Start services in detached mode
up-d:
	docker compose up -d

# Stop services
down:
	docker compose down

# Restart services
restart:
	docker compose restart

# View logs
logs:
	docker compose logs

# Follow logs
logs-f:
	docker compose logs -f

# Clean everything (including volumes)
clean:
	docker compose down -v
	@echo "✓ Removed all containers, networks, and volumes"

# Rebuild and restart
rebuild:
	docker compose build
	docker compose up -d
	@echo "✓ Services rebuilt and restarted"

# List running containers
ps:
	docker compose ps

# Backend shell
shell-be:
	docker compose exec backend /bin/sh

# Frontend shell
shell-fe:
	docker compose exec frontend /bin/sh

# Database shell
shell-db:
	docker compose exec postgres psql -U tracegrade -d tracegrade

# Start with tools
tools:
	docker compose --profile tools up
