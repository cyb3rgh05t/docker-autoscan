"""
Config API – read and write the autoscan config.yml through the REST API.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.config import load_config, save_config

router = APIRouter(prefix="/config", tags=["config"])


@router.get("")
async def get_config() -> dict[str, Any]:
    """Return the current config.yml as a JSON object."""
    return load_config()


@router.put("")
async def update_config(body: dict[str, Any]) -> dict[str, Any]:
    """Overwrite the entire config.yml with the provided JSON object."""
    try:
        save_config(body)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        )
    return {"message": "Config saved"}


@router.patch("")
async def patch_config(body: dict[str, Any]) -> dict[str, Any]:
    """Merge the provided JSON into the existing config.yml (shallow merge)."""
    current = load_config()
    current.update(body)
    try:
        save_config(current)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        )
    return {"message": "Config updated"}
