# Autoscan v2

A complete rewrite of autoscan with a Python/FastAPI backend and a React web UI.

## Stack

| Layer       | Technology                                    |
| ----------- | --------------------------------------------- |
| Backend API | FastAPI + Uvicorn                             |
| Database    | SQLAlchemy 2 async + SQLite                   |
| Frontend    | React 18 + Vite + Tailwind utilities + Lucide |
| Container   | Single Docker image + docker-compose          |

## Features

- Webhook triggers: Sonarr, Radarr, Lidarr, Readarr, Manual
- Targets: Plex, Emby, Jellyfin, Autoscan chaining
- Priority queue with configurable minimum-age delay
- Anchor file support
- Regex path rewrite rules
- Basic auth for webhook endpoints
- Web UI for config, queue, triggers, targets, and raw config editing

## Quick Start

```bash
docker-compose up -d --build
```

Open:

```text
http://localhost:3030
```

The mounted `config/` folder contains:

- `config.yml` - autoscan configuration
- `autoscan.db` - SQLite queue database
- `activity.log` - runtime log file

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
AUTOSCAN_CONFIG_DIR=../config uvicorn app.main:app --reload --port 3030
```

Windows PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:AUTOSCAN_CONFIG_DIR = "../config"
uvicorn app.main:app --reload --port 3030
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies `/api` and `/triggers` to the backend on `http://localhost:3030`.

## Webhook URL Format

```text
POST http://localhost:3030/triggers/{name}
```

Where `{name}` matches the configured trigger name.

Example:

```text
http://localhost:3030/triggers/sonarr
```

## Environment Variables

| Variable                | Default                                       | Description                             |
| ----------------------- | --------------------------------------------- | --------------------------------------- |
| `AUTOSCAN_CONFIG_DIR`   | `/config`                                     | Directory for `config.yml` and database |
| `AUTOSCAN_VERSION`      | `2.0.0`                                       | Version string shown in UI              |
| `AUTOSCAN_CORS_ORIGINS` | `http://localhost:5173,http://localhost:3030` | Allowed CORS origins                    |
