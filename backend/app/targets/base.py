"""
Base class for all media-server targets.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.rewrite import build_rewriter


class BaseTarget(ABC):
    def __init__(self, cfg: dict[str, Any], target_name: str) -> None:
        self._name = target_name
        self._url: str = cfg.get("url", "").rstrip("/")
        self._rewrite = build_rewriter(cfg.get("rewrite", []))

    @property
    def name(self) -> str:
        return self._name

    @abstractmethod
    async def available(self) -> bool: ...

    @abstractmethod
    async def scan(self, folder: str) -> None: ...
