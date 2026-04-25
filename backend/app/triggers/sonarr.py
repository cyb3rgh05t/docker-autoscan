"""
Sonarr webhook trigger.
Handles: Download, EpisodeFileDelete, Rename, SeriesDelete events.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.rewrite import build_rewriter
from app.triggers.base import upsert_scan

log = logging.getLogger("autoscan.triggers.sonarr")


def create_router(trigger_cfg: dict[str, Any]) -> APIRouter:
    priority: int = trigger_cfg.get("priority", 0)
    rewrite = build_rewriter(trigger_cfg.get("rewrite", []))
    router = APIRouter()

    @router.post("")
    async def sonarr_webhook(request: Request, db: AsyncSession = Depends(get_db)):
        body: dict = await request.json()
        event_type: str = body.get("eventType", "")

        if event_type.lower() == "test":
            log.info("Sonarr test event received")
            return {"status": "ok"}

        paths: list[str] = []

        if event_type.lower() in ("download", "episodefiledelete"):
            series_path: str = (body.get("series") or {}).get("path", "")
            relative_path: str = (body.get("episodeFile") or {}).get("relativePath", "")
            if series_path and relative_path:
                folder = os.path.dirname(os.path.join(series_path, relative_path))
                paths.append(folder)

        elif event_type.lower() == "rename":
            series_path = (body.get("series") or {}).get("path", "")
            for f in body.get("renamedEpisodeFiles", []):
                prev = f.get("previousPath", "")
                rel = f.get("relativePath", "")
                if prev:
                    paths.append(os.path.dirname(prev))
                elif series_path and rel:
                    paths.append(os.path.dirname(os.path.join(series_path, rel)))

        elif event_type.lower() == "seriesdelete":
            series_path = (body.get("series") or {}).get("path", "")
            if series_path:
                paths.append(series_path)

        if not paths:
            log.warning("Sonarr event '%s' produced no paths – ignoring", event_type)
            return {"status": "ignored"}

        for raw_path in paths:
            final_path = rewrite(raw_path)
            log.info("Sonarr queuing scan: %s", final_path)
            await upsert_scan(db, final_path, priority)

        return {"status": "queued", "paths": paths}

    return router
