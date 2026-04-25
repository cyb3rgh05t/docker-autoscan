"""
Readarr webhook trigger.
Handles: Download, BookFileDelete, Rename, AuthorDelete events.
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

log = logging.getLogger("autoscan.triggers.readarr")


def create_router(trigger_cfg: dict[str, Any]) -> APIRouter:
    priority: int = trigger_cfg.get("priority", 0)
    rewrite = build_rewriter(trigger_cfg.get("rewrite", []))
    router = APIRouter()

    @router.post("")
    async def readarr_webhook(request: Request, db: AsyncSession = Depends(get_db)):
        body: dict = await request.json()
        event_type: str = body.get("eventType", "")

        if event_type.lower() == "test":
            log.info("Readarr test event received")
            return {"status": "ok"}

        paths: list[str] = []

        if event_type.lower() in ("download", "bookfiledelete"):
            author_path: str = (body.get("author") or {}).get("path", "")
            book_file_path: str = (body.get("bookFile") or {}).get("path", "")
            if book_file_path:
                paths.append(os.path.dirname(book_file_path))
            elif author_path:
                paths.append(author_path)

        elif event_type.lower() == "rename":
            author_path = (body.get("author") or {}).get("path", "")
            if author_path:
                paths.append(author_path)

        elif event_type.lower() == "authordelete":
            author_path = (body.get("author") or {}).get("path", "")
            if author_path:
                paths.append(author_path)

        if not paths:
            log.warning("Readarr event '%s' produced no paths – ignoring", event_type)
            return {"status": "ignored"}

        for raw_path in paths:
            final_path = rewrite(raw_path)
            log.info("Readarr queuing scan: %s", final_path)
            await upsert_scan(db, final_path, priority)

        return {"status": "queued", "paths": paths}

    return router
