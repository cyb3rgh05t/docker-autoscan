"""
Application settings – loaded from environment variables / .env file.
These are *runtime* settings (paths, server port, etc.)
and are separate from the autoscan config.yml (media-server config).
"""

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_config_dir() -> Path:
    """Resolve the default config directory (mirrors Go behaviour)."""
    env = os.environ.get("AUTOSCAN_CONFIG_DIR")
    if env:
        return Path(env)
    return Path("/config")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AUTOSCAN_", env_file=".env", extra="ignore"
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 3030

    # Paths
    config_dir: Path = _default_config_dir()

    @property
    def config_path(self) -> Path:
        return self.config_dir / "config.yml"

    @property
    def database_path(self) -> Path:
        return self.config_dir / "autoscan.db"

    @property
    def log_path(self) -> Path:
        return self.config_dir / "activity.log"

    # CORS origins for the frontend dev server
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3030"]

    # Version info (injected at build time via env)
    version: str = "2.0.0"
    git_commit: str = "dev"
    build_timestamp: str = "unknown"


settings = Settings()

# Ensure config directory exists
settings.config_dir.mkdir(parents=True, exist_ok=True)
