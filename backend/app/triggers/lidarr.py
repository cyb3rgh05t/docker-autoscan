"""
Lidarr webhook trigger.
Handles: Download, TrackFileDelete, Rename, ArtistDelete events.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.rewrite import build_rewriter
from app.triggers.base import upsert_scan

log = logging.getLogger("autoscan.triggers.lidarr")


def create_router(trigger_cfg: dict[str, Any]) -> APIRouter:
    priority: int = trigger_cfg.get("priority", 0)
    rewrite = build_rewriter(trigger_cfg.get("rewrite", []))
    router = APIRouter()

    @router.post("")
    async def lidarr_webhook(request: Request, db: AsyncSession = Depends(get_db)):
        body: dict = await request.json()
        event_type: str = body.get("eventType", "")

        if event_type.lower() == "test":
            log.info("Lidarr test event received")
            return {"status": "ok"}

        paths: list[str] = []

        if event_type.lower() in ("download", "trackfiledelete"):
            artist_path: str = (body.get("artist") or {}).get("path", "")
            track_file_path: str = (body.get("trackFile") or {}).get("path", "")
            if track_file_path:
                paths.append(os.path.dirname(track_file_path))
            elif artist_path:
                paths.append(artist_path)

        elif event_type.lower() == "rename":
            artist_path = (body.get("artist") or {}).get("path", "")
            if artist_path:
                paths.append(artist_path)

        elif event_type.lower() == "artistdelete":
            artist_path = (body.get("artist") or {}).get("path", "")
            if artist_path:
                paths.append(artist_path)

        if not paths:
            log.warning("Lidarr event '%s' produced no paths – ignoring", event_type)
            return {"status": "ignored"}

        for raw_path in paths:
            final_path = rewrite(raw_path)
            log.info("Lidarr queuing scan: %s", final_path)
            await upsert_scan(db, final_path, priority)

        return {"status": "queued", "paths": paths}

    return router
