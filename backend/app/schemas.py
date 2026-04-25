"""
Pydantic models for the autoscan config.yml
and for all API request/response schemas.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Config file schemas (mirrors the YAML structure)
# ---------------------------------------------------------------------------


class RewriteRule(BaseModel):
    from_: str = Field(alias="from")
    to: str

    model_config = {"populate_by_name": True}


class AuthConfig(BaseModel):
    username: str = ""
    password: str = ""


class ManualTriggerConfig(BaseModel):
    priority: int = 0
    rewrite: list[RewriteRule] = []
    verbosity: str = ""


class ATrainTriggerConfig(BaseModel):
    priority: int = 0
    rewrite: list[RewriteRule] = []
    verbosity: str = ""


class BernardTriggerConfig(BaseModel):
    id: str
    service_account_path: str = ""
    priority: int = 0
    rewrite: list[RewriteRule] = []
    verbosity: str = ""


class InotifyTriggerConfig(BaseModel):
    path: str
    priority: int = 0
    rewrite: list[RewriteRule] = []
    include: list[str] = []
    exclude: list[str] = []
    verbosity: str = ""


class ArrTriggerConfig(BaseModel):
    name: str
    priority: int = 0
    rewrite: list[RewriteRule] = []
    verbosity: str = ""


class TriggersConfig(BaseModel):
    manual: ManualTriggerConfig = ManualTriggerConfig()
    a_train: ATrainTriggerConfig = Field(
        default_factory=ATrainTriggerConfig, alias="a-train"
    )
    bernard: list[BernardTriggerConfig] = []
    inotify: list[InotifyTriggerConfig] = []
    lidarr: list[ArrTriggerConfig] = []
    radarr: list[ArrTriggerConfig] = []
    readarr: list[ArrTriggerConfig] = []
    sonarr: list[ArrTriggerConfig] = []

    model_config = {"populate_by_name": True}


class PlexTargetConfig(BaseModel):
    url: str
    token: str
    rewrite: list[RewriteRule] = []
    verbosity: str = ""


class EmbyTargetConfig(BaseModel):
    url: str
    token: str
    rewrite: list[RewriteRule] = []
    verbosity: str = ""


class JellyfinTargetConfig(BaseModel):
    url: str
    token: str
    rewrite: list[RewriteRule] = []
    verbosity: str = ""


class AutoscanTargetConfig(BaseModel):
    url: str
    username: str = ""
    password: str = ""
    rewrite: list[RewriteRule] = []
    verbosity: str = ""


class TargetsConfig(BaseModel):
    autoscan: list[AutoscanTargetConfig] = []
    emby: list[EmbyTargetConfig] = []
    jellyfin: list[JellyfinTargetConfig] = []
    plex: list[PlexTargetConfig] = []


class AutoscanConfig(BaseModel):
    """Root config.yml model."""

    host: list[str] = [""]
    port: int = 3030
    minimum_age: str = Field(default="10m", alias="minimum-age")
    scan_delay: str = Field(default="5s", alias="scan-delay")
    scan_stats: str = Field(default="1h", alias="scan-stats")
    anchors: list[str] = []
    authentication: AuthConfig = Field(default_factory=AuthConfig)
    triggers: TriggersConfig = Field(default_factory=TriggersConfig)
    targets: TargetsConfig = Field(default_factory=TargetsConfig)

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# API request / response schemas
# ---------------------------------------------------------------------------


class ScanIn(BaseModel):
    """Incoming scan request (manual trigger)."""

    folder: str
    priority: int = 0


class ScanOut(BaseModel):
    """Scan queue entry as returned by the API."""

    folder: str
    priority: int
    time: datetime

    model_config = {"from_attributes": True}


class ScanHistoryOut(BaseModel):
    id: int
    folder: str
    priority: int
    triggered_at: datetime
    completed_at: datetime
    target: str
    status: str
    message: str

    model_config = {"from_attributes": True}


class StatsOut(BaseModel):
    scans_remaining: int
    scans_processed: int
    targets_available: dict[str, bool]
    uptime_seconds: float


class HealthOut(BaseModel):
    status: str
    version: str
    commit: str


class MessageOut(BaseModel):
    message: str


class ConfigOut(BaseModel):
    config: dict[str, Any]
