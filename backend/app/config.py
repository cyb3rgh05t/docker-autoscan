"""
Config loader – reads and writes config.yml using PyYAML.
The config is cached in memory and can be reloaded via the API.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

from app.settings import settings


def _load_raw() -> dict[str, Any]:
    path: Path = settings.config_path
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def _save_raw(data: dict[str, Any]) -> None:
    settings.config_path.parent.mkdir(parents=True, exist_ok=True)
    with settings.config_path.open("w", encoding="utf-8") as fh:
        yaml.dump(data, fh, default_flow_style=False, allow_unicode=True)


def load_config() -> dict[str, Any]:
    return _load_raw()


def save_config(data: dict[str, Any]) -> None:
    _save_raw(data)


# ---------------------------------------------------------------------------
# Helper: parse Go-style duration strings (e.g. "10m", "5s", "1h") to seconds
# ---------------------------------------------------------------------------

_DURATION_RE = re.compile(r"^(\d+)(ms|s|m|h|d)$")
_UNIT_SECONDS = {"ms": 0.001, "s": 1, "m": 60, "h": 3600, "d": 86400}


def parse_duration(value: str | int | float) -> float:
    """Return duration in seconds."""
    if isinstance(value, (int, float)):
        return float(value)
    m = _DURATION_RE.match(str(value).strip())
    if not m:
        return 0.0
    return int(m.group(1)) * _UNIT_SECONDS[m.group(2)]
