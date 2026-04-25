"""
Manual trigger – accepts arbitrary folder paths via POST.
Also serves the simple HTML form for browser-based manual scanning.
"""

from __future__ import annotations

import logging
import secrets
from typing import Any

from fastapi import APIRouter, Depends, Form, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.rewrite import build_rewriter
from app.triggers.base import upsert_scan

log = logging.getLogger("autoscan.triggers.manual")

_FORM_HTML = """<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Autoscan – Manual Trigger</title>
<style>body{{font-family:sans-serif;max-width:600px;margin:2rem auto;padding:0 1rem}}
input,button{{padding:.5rem;margin:.25rem 0;width:100%;box-sizing:border-box}}
button{{background:#2563eb;color:#fff;border:none;cursor:pointer;border-radius:4px}}</style>
</head>
<body>
<h2>Autoscan – Manual Trigger</h2>
<form method="post">
  <label>Folder path<br><input name="dir" placeholder="/media/movies/Interstellar" required></label>
  <label>Priority (optional)<br><input name="priority" type="number" value="0"></label>
  <button type="submit">Queue scan</button>
</form>
{message}
</body></html>"""


def create_router(trigger_cfg: dict[str, Any]) -> APIRouter:
    priority_default: int = trigger_cfg.get("priority", 0)
    rewrite = build_rewriter(trigger_cfg.get("rewrite", []))
    router = APIRouter()

    @router.get("", response_class=HTMLResponse)
    async def manual_form():
        return _FORM_HTML.format(message="")

    @router.post("", response_class=HTMLResponse)
    async def manual_form_submit(
        request: Request,
        dir_form: str | None = Form(default=None, alias="dir"),
        priority_form: int | None = Form(default=None, alias="priority"),
        dir_query: str | None = Query(default=None, alias="dir"),
        priority_query: int | None = Query(default=None, alias="priority"),
        db: AsyncSession = Depends(get_db),
    ):
        folder = dir_form or dir_query
        if not folder:
            msg = '<p style="color:#dc2626">Missing "dir" parameter.</p>'
            return _FORM_HTML.format(message=msg)

        priority_value = (
            priority_form
            if priority_form is not None
            else priority_query if priority_query is not None else priority_default
        )

        final_path = rewrite(folder)
        eff_priority = priority_value
        await upsert_scan(db, final_path, eff_priority)
        scan_id = secrets.token_hex(8)
        log.info(
            'Scan moved to processor id=%s method=%s path="%s" url=%s',
            scan_id,
            request.method,
            final_path,
            request.url.path + (f"?{request.url.query}" if request.url.query else ""),
        )
        msg = f'<p style="color:green">Queued: <code>{final_path}</code></p>'
        return _FORM_HTML.format(message=msg)

    @router.post("/api")
    async def manual_api(
        request: Request,
        db: AsyncSession = Depends(get_db),
    ):
        """JSON API endpoint for manual trigger."""
        body: dict = await request.json()
        folders = body.get("folders") or ([body.get("dir")] if body.get("dir") else [])
        prio = int(body.get("priority", priority_default))
        queued = []
        for folder in folders:
            if folder:
                final_path = rewrite(folder)
                await upsert_scan(db, final_path, prio)
                scan_id = secrets.token_hex(8)
                log.info(
                    'Scan moved to processor id=%s method=%s path="%s" url=%s',
                    scan_id,
                    request.method,
                    final_path,
                    request.url.path,
                )
                queued.append(final_path)
        return {"status": "queued", "paths": queued}

    return router
