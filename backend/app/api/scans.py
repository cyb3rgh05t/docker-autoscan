"""
Scan queue API – inspect and manage the scan queue.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Scan, ScanHistory
from app.schemas import ScanHistoryOut, ScanIn, ScanOut
from app.triggers.base import upsert_scan

router = APIRouter(prefix="/scans", tags=["scans"])


@router.get("", response_model=list[ScanOut])
async def list_scans(db: AsyncSession = Depends(get_db)):
    """Return all pending scans ordered by priority desc, time asc."""
    result = await db.execute(
        select(Scan).order_by(Scan.priority.desc(), Scan.time.asc())
    )
    return result.scalars().all()


@router.post("", response_model=ScanOut, status_code=status.HTTP_201_CREATED)
async def add_scan(scan_in: ScanIn, db: AsyncSession = Depends(get_db)):
    """Manually add a scan to the queue."""
    await upsert_scan(db, scan_in.folder, scan_in.priority)
    result = await db.execute(select(Scan).where(Scan.folder == scan_in.folder))
    return result.scalar_one()


@router.delete("/{folder:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(folder: str, db: AsyncSession = Depends(get_db)):
    """Remove a specific scan from the queue."""
    result = await db.execute(delete(Scan).where(Scan.folder == folder))
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found"
        )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_scans(db: AsyncSession = Depends(get_db)):
    """Remove all pending scans from the queue."""
    await db.execute(delete(Scan))
    await db.commit()


@router.get("/history", response_model=list[ScanHistoryOut])
async def list_history(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Return recent scan history (newest first)."""
    result = await db.execute(
        select(ScanHistory)
        .order_by(ScanHistory.completed_at.desc())
        .limit(min(limit, 500))
    )
    return result.scalars().all()
