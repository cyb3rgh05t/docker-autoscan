"""
Plex Media Server target.
Triggers a library section scan for the matching path.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.targets.base import BaseTarget

log = logging.getLogger("autoscan.targets.plex")


class PlexTarget(BaseTarget):
    def __init__(self, cfg: dict[str, Any]) -> None:
        super().__init__(cfg, f"plex({cfg.get('url', '')})")
        self._token: str = cfg.get("token", "")
        self._libraries: list[dict] = []

    def _headers(self) -> dict:
        return {
            "X-Plex-Token": self._token,
            "Accept": "application/json",
        }

    async def _fetch_libraries(self) -> list[dict]:
        url = f"{self._url}/library/sections"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            data = resp.json()
        sections = data.get("MediaContainer", {}).get("Directory", [])
        libs = []
        for sec in sections:
            locations = [loc["path"] for loc in sec.get("Location", [])]
            libs.append(
                {"id": sec["key"], "name": sec["title"], "locations": locations}
            )
        return libs

    async def available(self) -> bool:
        try:
            url = f"{self._url}/identity"
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(url, headers=self._headers())
            return resp.status_code == 200
        except Exception:
            return False

    async def scan(self, folder: str) -> None:
        folder = self._rewrite(folder)

        if not self._libraries:
            self._libraries = await self._fetch_libraries()

        matching = [
            lib
            for lib in self._libraries
            if any(folder.startswith(loc) for loc in lib["locations"])
        ]

        if not matching:
            log.warning("Plex: no library found for path %s", folder)
            return

        async with httpx.AsyncClient(timeout=30) as client:
            for lib in matching:
                url = f"{self._url}/library/sections/{lib['id']}/refresh"
                params = {"path": folder, "X-Plex-Token": self._token}
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                log.info(
                    'Scan moved to target library="%s" path="%s" target=plex url=%s',
                    lib["name"],
                    folder,
                    self._url,
                )
