"""
Jellyfin Media Server target.
API is identical to Emby but uses different auth header.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.targets.base import BaseTarget

log = logging.getLogger("autoscan.targets.jellyfin")


class JellyfinTarget(BaseTarget):
    def __init__(self, cfg: dict[str, Any]) -> None:
        super().__init__(cfg, f"jellyfin({cfg.get('url', '')})")
        self._token: str = cfg.get("token", "")

    def _headers(self) -> dict:
        return {
            "X-MediaBrowser-Token": self._token,
            "Content-Type": "application/json",
        }

    async def _fetch_libraries(self) -> list[dict]:
        url = f"{self._url}/Library/VirtualFolders"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
        libs = []
        for folder in resp.json():
            locations = folder.get("Locations", [])
            libs.append(
                {"id": folder["ItemId"], "name": folder["Name"], "locations": locations}
            )
        return libs

    async def available(self) -> bool:
        try:
            url = f"{self._url}/System/Info/Public"
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(url, headers=self._headers())
            return resp.status_code == 200
        except Exception:
            return False

    async def scan(self, folder: str) -> None:
        folder = self._rewrite(folder)
        libraries = await self._fetch_libraries()

        matching = [
            lib
            for lib in libraries
            if any(folder.startswith(loc) for loc in lib["locations"])
        ]

        if not matching:
            log.warning("Jellyfin: no library found for path %s", folder)
            return

        async with httpx.AsyncClient(timeout=30) as client:
            for lib in matching:
                url = f"{self._url}/Items/{lib['id']}/Refresh"
                params = {"Recursive": "true", "ImageRefreshMode": "Default"}
                resp = await client.post(url, headers=self._headers(), params=params)
                resp.raise_for_status()
                log.info(
                    "Jellyfin scan triggered: library=%s path=%s", lib["name"], folder
                )
