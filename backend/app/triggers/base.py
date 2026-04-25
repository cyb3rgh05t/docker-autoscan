"""
Shared helpers for all *arr webhook triggers.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Scan
from app.rewrite import build_rewriter

log = logging.getLogger("autoscan.triggers")


async def upsert_scan(session: AsyncSession, folder: str, priority: int) -> None:
    """Insert or update a scan entry in the queue (higher priority wins)."""
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert

    stmt = sqlite_insert(Scan).values(
        folder=folder,
        priority=priority,
        time=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["folder"],
        set_={
            "priority": (
                # keep the maximum priority
                stmt.excluded.priority
            ),
            "time": stmt.excluded.time,
        },
    )
    await session.execute(stmt)
    await session.commit()
