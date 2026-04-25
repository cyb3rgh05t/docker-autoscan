"""
Autoscan chaining target – forwards scans to another autoscan instance.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.targets.base import BaseTarget

log = logging.getLogger("autoscan.targets.autoscan")


class AutoscanTarget(BaseTarget):
    def __init__(self, cfg: dict[str, Any]) -> None:
        super().__init__(cfg, f"autoscan({cfg.get('url', '')})")
        self._username: str = cfg.get("username", "")
        self._password: str = cfg.get("password", "")

    def _auth(self):
        if self._username and self._password:
            return (self._username, self._password)
        return None

    async def available(self) -> bool:
        try:
            base = self._url.rstrip("/")
            async with httpx.AsyncClient(timeout=5) as client:
                # New API path in this rewrite.
                resp = await client.get(f"{base}/api/health", auth=self._auth())
                if resp.status_code == 200:
                    return True

                # Backward compatibility for older autoscan instances.
                legacy = await client.get(f"{base}/health", auth=self._auth())
                return legacy.status_code == 200
        except Exception:
            return False

    async def scan(self, folder: str) -> None:
        folder = self._rewrite(folder)
        url = f"{self._url.rstrip('/')}/triggers/manual/api"
        payload = {"folders": [folder]}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, auth=self._auth())
            resp.raise_for_status()
        log.info(
            'Scan moved to target path="%s" target=autoscan url=%s',
            folder,
            self._url.rstrip("/"),
        )
