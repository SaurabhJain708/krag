# Multi-stage Dockerfile for ingestion-worker
# Stage 1: Builder - Install dependencies and build
FROM ghcr.io/astral-sh/uv:python3.12-bookworm AS builder

WORKDIR /app

# Copy entire workspace structure
# .dockerignore will exclude unnecessary files (node_modules, .git, etc.)
COPY . .

# Install dependencies using uv workspace sync
# This will automatically resolve the workspace dependency for modal_services
# and install only what's needed for ingestion-worker
RUN uv sync --frozen --workspace --no-dev

# Stage 2: Runtime - Minimal image with only runtime dependencies
FROM python:3.12-slim

WORKDIR /app

# Copy virtual environment from builder (contains all installed dependencies)
COPY --from=builder /app/.venv /app/.venv

# Copy only the built packages needed for ingestion-worker
# modal_services is a workspace dependency
COPY --from=builder /app/packages/modal_services ./packages/modal_services
# ingestion-worker application code (includes generated/ directory)
COPY --from=builder /app/apps/ingestion-worker ./apps/ingestion-worker

# Set PATH to use the virtual environment
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set working directory to the ingestion-worker
WORKDIR /app/apps/ingestion-worker

# Run the application
CMD ["python", "main.py"]
