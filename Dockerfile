# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --prefer-offline

COPY frontend/ .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Python / FastAPI runtime – serves both the API and the React SPA
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim

ARG VERSION=dev
ARG COMMIT_TAG=unknown

ENV AUTOSCAN_CONFIG_DIR=/config \
    AUTOSCAN_VERSION=${VERSION} \
    AUTOSCAN_COMMIT=${COMMIT_TAG} \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Native build toolchain is required on arm/v7 for packages without wheels
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
  && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app/ ./app/
COPY backend/run.py ./run.py

# Copy the compiled React SPA – FastAPI will serve it from /app/static
COPY --from=frontend-builder /app/dist ./static

# Persistent config / database volume
RUN mkdir -p /config

VOLUME ["/config"]

EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3030/api/health')"

CMD ["python", "/app/run.py"]
