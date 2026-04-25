"""
Background scan processor.
Reads pending scans from the database and dispatches them to all configured targets.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import load_config, parse_duration
from app.database import AsyncSessionLocal
from app.models import Scan, ScanHistory

log = logging.getLogger("autoscan.processor")

# Global counters (in-process only; reset on restart)
_scans_processed: int = 0
_start_time: float = time.monotonic()


def get_scans_processed() -> int:
    return _scans_processed


def get_uptime() -> float:
    return time.monotonic() - _start_time


async def _get_targets(cfg: dict):
    """Instantiate all configured targets from the current config."""
    from app.targets.plex import PlexTarget
    from app.targets.emby import EmbyTarget
    from app.targets.jellyfin import JellyfinTarget
    from app.targets.autoscan import AutoscanTarget

    targets = []

    for t in cfg.get("targets", {}).get("plex", []):
        targets.append(PlexTarget(t))

    for t in cfg.get("targets", {}).get("emby", []):
        targets.append(EmbyTarget(t))

    for t in cfg.get("targets", {}).get("jellyfin", []):
        targets.append(JellyfinTarget(t))

    for t in cfg.get("targets", {}).get("autoscan", []):
        targets.append(AutoscanTarget(t))

    return targets


async def _check_anchors(anchors: list[str]) -> bool:
    """Return True only if all anchor files exist."""
    for anchor in anchors:
        if not os.path.exists(anchor):
            log.warning("Anchor file not found: %s – halting processor", anchor)
            return False
    return True


async def _get_available_scan(
    session: AsyncSession, minimum_age_seconds: float
) -> Scan | None:
    """Return the highest-priority scan that is old enough to process."""
    cutoff = datetime.utcnow() - timedelta(seconds=minimum_age_seconds)
    stmt = (
        select(Scan)
        .where(Scan.time <= cutoff)
        .order_by(Scan.priority.desc(), Scan.time.asc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def _delete_scan(session: AsyncSession, folder: str) -> None:
    await session.execute(delete(Scan).where(Scan.folder == folder))
    await session.commit()


async def _record_history(
    session: AsyncSession,
    scan: Scan,
    target_name: str,
    status: str,
    message: str,
) -> None:
    entry = ScanHistory(
        folder=scan.folder,
        priority=scan.priority,
        triggered_at=scan.time,
        completed_at=datetime.utcnow(),
        target=target_name,
        status=status,
        message=message,
    )
    session.add(entry)
    await session.commit()

    # Trim history to last 500 entries
    subq = select(ScanHistory.id).order_by(ScanHistory.id.desc()).limit(500).subquery()
    await session.execute(
        delete(ScanHistory).where(ScanHistory.id.not_in(select(subq.c.id)))
    )
    await session.commit()


async def process_once(targets) -> bool:
    """
    Process one available scan.
    Returns True if a scan was processed, False if queue was empty.
    """
    global _scans_processed

    cfg = load_config()
    minimum_age = parse_duration(cfg.get("minimum-age", "10m"))
    anchors: list[str] = cfg.get("anchors", [])

    if not await _check_anchors(anchors):
        return False

    async with AsyncSessionLocal() as session:
        scan = await _get_available_scan(session, minimum_age)
        if scan is None:
            return False

        log.info('Scan processing path="%s" priority=%d', scan.folder, scan.priority)

        for target in targets:
            try:
                ok = await target.available()
                if not ok:
                    log.warning("Target %s unavailable – requeueing scan", target.name)
                    return False

                await target.scan(scan.folder)
                await _record_history(session, scan, target.name, "success", "")
            except Exception as exc:
                log.error("Target %s error for %s: %s", target.name, scan.folder, exc)
                await _record_history(session, scan, target.name, "error", str(exc))

        await _delete_scan(session, scan.folder)
        _scans_processed += 1
        return True


async def get_scans_remaining() -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count()).select_from(Scan))
        return result.scalar_one()


async def get_target_availability(targets) -> dict[str, bool]:
    result: dict[str, bool] = {}
    for target in targets:
        try:
            result[target.name] = await target.available()
        except Exception:
            result[target.name] = False
    return result


async def processor_loop(stop_event: asyncio.Event) -> None:
    """Main processor loop – runs until stop_event is set."""
    cfg = load_config()
    minimum_age = cfg.get("minimum-age", "10m")
    anchors: list[str] = cfg.get("anchors", [])

    log.info("Initialised processor anchors=%s min_age=%s", anchors, minimum_age)
    log.info(
        "Initialised targets autoscan=%d emby=%d jellyfin=%d plex=%d",
        len(cfg.get("targets", {}).get("autoscan", [])),
        len(cfg.get("targets", {}).get("emby", [])),
        len(cfg.get("targets", {}).get("jellyfin", [])),
        len(cfg.get("targets", {}).get("plex", [])),
    )
    log.info("Processor started")

    next_stats_at = time.monotonic() + 30

    while not stop_event.is_set():
        cfg = load_config()
        scan_delay = parse_duration(cfg.get("scan-delay", "5s"))

        targets = await _get_targets(cfg)

        try:
            processed = await process_once(targets)
        except Exception as exc:
            log.error("Processor error: %s", exc)
            processed = False

        now = time.monotonic()
        if now >= next_stats_at:
            remaining = await get_scans_remaining()
            log.info(
                "Scan stats processed=%d remaining=%d",
                _scans_processed,
                remaining,
            )
            next_stats_at = now + 30

        if not processed:
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=scan_delay)
            except asyncio.TimeoutError:
                pass

    log.info("Processor stopped")
