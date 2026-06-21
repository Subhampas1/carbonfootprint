# =============================================================================
# Stage 1: Build the React frontend
# =============================================================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Install dependencies first (layer cache optimisation)
COPY frontend/package*.json ./
RUN npm ci --prefer-offline

# Copy source and build
COPY frontend/ ./
RUN npm run build

# =============================================================================
# Stage 2: Python runtime
# =============================================================================
FROM python:3.11-slim AS runtime

WORKDIR /app

# Security: create a non-root system user
RUN groupadd --system appgroup \
    && useradd --system --gid appgroup --no-create-home appuser

# Install curl for HEALTHCHECK
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && rm requirements.txt

# Copy application source
COPY backend/app ./app

# Copy compiled frontend
COPY --from=frontend-build /app/frontend/dist ./static

# Set correct ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 8080

# Liveness probe — checks the health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start uvicorn with 2 workers (suitable for Cloud Run)
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8080", \
     "--workers", "2", \
     "--access-log"]
