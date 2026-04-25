"""
Autoscan entry point.

This module MUST be the process entry point so that logging is configured
BEFORE uvicorn imports the app and tries to set up its own log handlers.

With log_config=None, uvicorn will NOT install its own formatters, so our
custom v1-style format (e.g. "Apr 24 16:46:20 INF Processor started") is
preserved throughout the entire lifetime of the process.
"""

from __future__ import annotations

import logging
import logging.handlers
import os
import sys
import time
from pathlib import Path

# Apply TZ env var before any time-related code runs.
# In Docker, set  TZ=Europe/Berlin  (or your zone) to get local timestamps.
_tz = os.getenv("TZ")
if _tz:
    os.environ["TZ"] = _tz
    if hasattr(time, "tzset"):  # Linux / macOS only
        time.tzset()


# ---------------------------------------------------------------------------
# Logging – must run before uvicorn is imported
# ---------------------------------------------------------------------------


class _VerbFmt(logging.Formatter):
    """Maps Python level names to short v1-style abbreviations (INF/WRN/ERR…)."""

    _MAP = {
        "DEBUG": "DBG",
        "INFO": "INF",
        "WARNING": "WRN",
        "ERROR": "ERR",
        "CRITICAL": "CRT",
    }

    def format(self, record: logging.LogRecord) -> str:
        record = logging.makeLogRecord(record.__dict__)  # shallow copy – don't mutate
        record.levelname = self._MAP.get(record.levelname, record.levelname)
        return super().format(record)


def _log_path() -> Path:
    config_dir = Path(os.getenv("AUTOSCAN_CONFIG_DIR", "/config"))
    config_dir.mkdir(parents=True, exist_ok=True)
    return config_dir / "activity.log"


def setup_logging() -> None:
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()

    # Console – clean v1-style: "Apr 24 16:46:20 INF Processor started"
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(
        _VerbFmt(
            fmt="%(asctime)s %(levelname)s %(message)s",
            datefmt="%b %d %H:%M:%S",
        )
    )
    root.addHandler(ch)

    # Rotating file – verbose (includes logger name for grep-ability)
    fh = logging.handlers.RotatingFileHandler(
        _log_path(),
        maxBytes=5_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    fh.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s  %(levelname)-8s  %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    root.addHandler(fh)

    # Silence loggers that produce noise on the console.
    # uvicorn.access  → per-request HTTP lines  (only visible at DEBUG)
    # uvicorn / uvicorn.error → startup banner / process lines (only visible at DEBUG)
    # Our own lifespan code emits a clean "Starting server on :3030" instead.
    for _noisy in ("uvicorn", "uvicorn.error", "uvicorn.access", "httpx", "hpack"):
        logging.getLogger(_noisy).setLevel(logging.WARNING)


# Configure before any other import that might touch logging
setup_logging()

# ---------------------------------------------------------------------------
# Start server
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("AUTOSCAN_PORT", "3030"))

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*",
        # Critical: tells uvicorn not to touch the logging config we set above
        log_config=None,
    )
