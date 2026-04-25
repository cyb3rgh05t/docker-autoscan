"""
Autoscan – FastAPI application entry point.

Startup sequence:
1. Initialise SQLite database (create tables)
2. Register all API routers (config, scans, stats, health)
3. Dynamically register webhook trigger routes from config.yml
4. Start the background processor loop
"""

from __future__ import annotations

import asyncio
import logging
import secrets
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.config import router as config_router
from app.api.scans import router as scans_router
from app.api.stats import router as stats_router
from app.config import load_config
from app.database import init_db
from app.processor import processor_loop
from app.settings import settings

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------


def configure_logging() -> None:
    """
    Set up v1-style logging for local dev (uvicorn --reload).

    In production the entry point run.py calls setup_logging() *before*
    uvicorn starts and passes log_config=None, so uvicorn never overrides
    the formatter.  Here we do the same thing but only when the root logger
    has no handlers yet (i.e. run.py has NOT already configured it).
    """
    root = logging.getLogger()
    if root.handlers:
        # Already configured by run.py – nothing to do.
        return

    root.setLevel(logging.INFO)

    class _VerbFmt(logging.Formatter):
        _MAP = {
            "DEBUG": "DBG",
            "INFO": "INF",
            "WARNING": "WRN",
            "ERROR": "ERR",
            "CRITICAL": "CRT",
        }

        def format(self, record: logging.LogRecord) -> str:
            record = logging.makeLogRecord(record.__dict__)
            record.levelname = self._MAP.get(record.levelname, record.levelname)
            return super().format(record)

    import sys

    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(
        _VerbFmt(fmt="%(asctime)s %(levelname)s %(message)s", datefmt="%b %d %H:%M:%S")
    )
    root.addHandler(ch)

    fh = RotatingFileHandler(
        filename=settings.log_path,
        maxBytes=5_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    fh.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s  %(levelname)-8s  %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    root.addHandler(fh)

    for _noisy in ("uvicorn", "uvicorn.error", "uvicorn.access", "httpx", "hpack"):
        logging.getLogger(_noisy).setLevel(logging.WARNING)


configure_logging()
log = logging.getLogger("autoscan")

# ---------------------------------------------------------------------------
# Application state
# ---------------------------------------------------------------------------
_stop_event = asyncio.Event()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info('Initialised version="%s (%s)"', settings.version, settings.git_commit)
    log.info("Starting server on :%s", settings.port)

    await init_db()
    log.info("Database initialised at %s", settings.database_path)

    task = asyncio.create_task(processor_loop(_stop_event))
    log.info("Background processor started")

    yield  # ← app is running

    log.info("Shutting down…")
    _stop_event.set()
    await asyncio.wait_for(task, timeout=10)
    log.info("Bye.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Autoscan",
    description="Automated media-server scan trigger service",
    version=settings.version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Shared Basic-Auth dependency (used by webhook triggers)
# ---------------------------------------------------------------------------
security = HTTPBasic(auto_error=False)


def require_auth(credentials: HTTPBasicCredentials | None = Depends(security)):
    cfg = load_config()
    auth = cfg.get("authentication", {})
    username = auth.get("username", "")
    password = auth.get("password", "")

    if not username or not password:
        # No auth configured – allow everything
        return

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )

    ok_user = secrets.compare_digest(credentials.username.encode(), username.encode())
    ok_pass = secrets.compare_digest(credentials.password.encode(), password.encode())
    if not (ok_user and ok_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )


# ---------------------------------------------------------------------------
# Static API routes
# ---------------------------------------------------------------------------
app.include_router(config_router, prefix="/api")
app.include_router(scans_router, prefix="/api")
app.include_router(stats_router, prefix="/api")


# ---------------------------------------------------------------------------
# Dynamic webhook trigger routes (built from config.yml)
# ---------------------------------------------------------------------------
def _register_trigger_routes() -> None:
    """Read config and mount one webhook route per configured trigger."""
    from app.triggers import sonarr, radarr, lidarr, readarr, manual

    cfg = load_config()
    triggers_cfg = cfg.get("triggers", {})

    # Manual trigger (always registered)
    manual_cfg = triggers_cfg.get("manual", {})
    app.include_router(
        manual.create_router(manual_cfg),
        prefix="/triggers/manual",
        dependencies=[Depends(require_auth)],
        tags=["triggers"],
    )

    # Arr triggers
    for t in triggers_cfg.get("sonarr", []):
        name = t.get("name", "sonarr")
        app.include_router(
            sonarr.create_router(t),
            prefix=f"/triggers/{name}",
            dependencies=[Depends(require_auth)],
            tags=["triggers"],
        )

    for t in triggers_cfg.get("radarr", []):
        name = t.get("name", "radarr")
        app.include_router(
            radarr.create_router(t),
            prefix=f"/triggers/{name}",
            dependencies=[Depends(require_auth)],
            tags=["triggers"],
        )

    for t in triggers_cfg.get("lidarr", []):
        name = t.get("name", "lidarr")
        app.include_router(
            lidarr.create_router(t),
            prefix=f"/triggers/{name}",
            dependencies=[Depends(require_auth)],
            tags=["triggers"],
        )

    for t in triggers_cfg.get("readarr", []):
        name = t.get("name", "readarr")
        app.include_router(
            readarr.create_router(t),
            prefix=f"/triggers/{name}",
            dependencies=[Depends(require_auth)],
            tags=["triggers"],
        )

    log.info(
        "Initialised triggers bernard=%d inotify=%d lidarr=%d manual=%d radarr=%d readarr=%d sonarr=%d",
        len(triggers_cfg.get("bernard", [])),
        len(triggers_cfg.get("inotify", [])),
        len(triggers_cfg.get("lidarr", [])),
        1,
        len(triggers_cfg.get("radarr", [])),
        len(triggers_cfg.get("readarr", [])),
        len(triggers_cfg.get("sonarr", [])),
    )


_register_trigger_routes()


# ---------------------------------------------------------------------------
# Serve the React frontend (production build)
# ---------------------------------------------------------------------------
import os
from pathlib import Path


class SPAStaticFiles(StaticFiles):
    """Serve static assets and fall back to index.html for client-side routes."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as ex:
            if ex.status_code != 404:
                raise

        # Keep API/docs semantics untouched; only fallback real SPA routes.
        is_spa_candidate = (
            "." not in path
            and not path.startswith("api")
            and not path.startswith("docs")
            and not path.startswith("redoc")
            and not path.startswith("openapi")
            and not path.startswith("triggers/")
        )

        if is_spa_candidate:
            return await super().get_response("index.html", scope)

        raise StarletteHTTPException(status_code=404)


# In the single-container image the React dist is copied to /app/static.
# In local dev it may live at <repo>/frontend/dist – check both.
_static_candidates = [
    Path(__file__).parent.parent / "static",  # /app/static (Docker)
    Path(__file__).parent.parent.parent
    / "frontend"
    / "dist",  # <repo>/frontend/dist (dev)
]
_frontend_dist = next((p for p in _static_candidates if p.exists()), None)

if _frontend_dist:

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon_ico():
        favicon_svg = _frontend_dist / "favicon.svg"
        if favicon_svg.exists():
            return RedirectResponse(url="/favicon.svg", status_code=307)

        # Fallback if only .ico is present.
        favicon_ico_file = _frontend_dist / "favicon.ico"
        if favicon_ico_file.exists():
            return FileResponse(str(favicon_ico_file), media_type="image/x-icon")

        raise HTTPException(status_code=404, detail="favicon not found")

    app.mount(
        "/", SPAStaticFiles(directory=str(_frontend_dist), html=True), name="frontend"
    )
else:

    @app.get("/")
    async def root():
        return {
            "message": "Autoscan API is running. Build the frontend or use the /docs endpoint.",
            "docs": "/docs",
        }
