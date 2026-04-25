"""
Stats & health API endpoints.
"""

from __future__ import annotations

import asyncio
import re
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter

from app.processor import (
    get_scans_processed,
    get_scans_remaining,
    get_uptime,
)
from app.settings import settings

router = APIRouter(tags=["system"])

# ---------------------------------------------------------------------------
# Target-availability cache – refreshed every 30 s in the background
# so /api/stats never blocks on HTTP calls to Plex / Emby / Autoscan.
# ---------------------------------------------------------------------------
_avail_cache: dict[str, bool] = {}
_avail_last_refresh: float = 0.0
_avail_lock = asyncio.Lock()
_AVAIL_TTL = 30  # seconds
_SOURCE_TOKEN_RE = re.compile(
    r"^(?P<prefix>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[A-Z]{3,8}\s+)(?P<source>(?:autoscan|uvicorn|httpx|hpack)[\w.-]*)\s+(?P<message>.*)$"
)


def _normalize_log_line(line: str) -> str:
    match = _SOURCE_TOKEN_RE.match(line)
    if not match:
        return line
    return f"{match.group('prefix')}{match.group('message')}"


async def _refresh_availability() -> dict[str, bool]:
    from app.config import load_config
    from app.targets.plex import PlexTarget
    from app.targets.emby import EmbyTarget
    from app.targets.jellyfin import JellyfinTarget
    from app.targets.autoscan import AutoscanTarget

    cfg = load_config()
    targets: list[Any] = []
    for t in cfg.get("targets", {}).get("plex", []):
        targets.append(PlexTarget(t))
    for t in cfg.get("targets", {}).get("emby", []):
        targets.append(EmbyTarget(t))
    for t in cfg.get("targets", {}).get("jellyfin", []):
        targets.append(JellyfinTarget(t))
    for t in cfg.get("targets", {}).get("autoscan", []):
        targets.append(AutoscanTarget(t))

    result: dict[str, bool] = {}
    for target in targets:
        try:
            result[target.name] = await target.available()
        except Exception:
            result[target.name] = False
    return result


async def get_cached_availability() -> dict[str, bool]:
    global _avail_cache, _avail_last_refresh
    now = time.monotonic()
    if now - _avail_last_refresh < _AVAIL_TTL and _avail_cache:
        return _avail_cache

    async with _avail_lock:
        # Re-check after acquiring lock (another coroutine may have refreshed it)
        now = time.monotonic()
        if now - _avail_last_refresh >= _AVAIL_TTL or not _avail_cache:
            try:
                _avail_cache = await _refresh_availability()
                _avail_last_refresh = time.monotonic()
            except Exception:
                pass  # return stale cache on error
    return _avail_cache


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "version": settings.version,
        "commit": settings.git_commit,
    }


@router.get("/stats")
async def stats():
    availability = await get_cached_availability()
    remaining = await get_scans_remaining()

    return {
        "scans_remaining": remaining,
        "scans_processed": get_scans_processed(),
        "uptime_seconds": get_uptime(),
        "targets_available": availability,
    }


@router.get("/logs")
async def logs(lines: int = 200):
    # Keep payload bounded for UI polling.
    lines = max(20, min(lines, 1000))

    path = Path(settings.log_path)
    if not path.exists():
        return {"lines": []}

    all_lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    return {"lines": [_normalize_log_line(line) for line in all_lines[-lines:]]}
