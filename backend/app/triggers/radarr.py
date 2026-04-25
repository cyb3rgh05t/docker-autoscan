"""
Radarr webhook trigger.
Handles: Download, MovieFileDelete, Rename, MovieDelete events.
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

log = logging.getLogger("autoscan.triggers.radarr")


def create_router(trigger_cfg: dict[str, Any]) -> APIRouter:
    priority: int = trigger_cfg.get("priority", 0)
    rewrite = build_rewriter(trigger_cfg.get("rewrite", []))
    router = APIRouter()

    @router.post("")
    async def radarr_webhook(request: Request, db: AsyncSession = Depends(get_db)):
        body: dict = await request.json()
        event_type: str = body.get("eventType", "")

        if event_type.lower() == "test":
            log.info("Radarr test event received")
            return {"status": "ok"}

        path: str | None = None

        if event_type.lower() in ("download", "moviefiledelete"):
            folder_path: str = (body.get("movie") or {}).get("folderPath", "")
            rel: str = (body.get("movieFile") or {}).get("relativePath", "")
            if folder_path and rel:
                path = os.path.dirname(os.path.join(folder_path, rel))
            elif folder_path:
                path = folder_path

        elif event_type.lower() == "rename":
            path = (body.get("movie") or {}).get("folderPath", "")

        elif event_type.lower() == "moviedelete":
            path = (body.get("movie") or {}).get("folderPath", "")

        if not path:
            log.warning("Radarr event '%s' produced no path – ignoring", event_type)
            return {"status": "ignored"}

        final_path = rewrite(path)
        log.info("Radarr queuing scan: %s", final_path)
        await upsert_scan(db, final_path, priority)
        return {"status": "queued", "path": final_path}

    return router
