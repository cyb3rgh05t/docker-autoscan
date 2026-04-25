"""
Rewrite and filter helpers – mirrors the Go autoscan package behaviour.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class RewriteRule:
    from_: str
    to: str


def build_rewriter(rules: list[dict]) -> callable:
    """Return a callable that applies the first matching rewrite rule."""
    compiled: list[tuple[re.Pattern, str]] = []
    for rule in rules:
        from_ = rule.get("from") or rule.get("from_") or ""
        to = rule.get("to", "")
        compiled.append((re.compile(from_), to))

    def rewrite(path: str) -> str:
        for pattern, replacement in compiled:
            if pattern.search(path):
                return pattern.sub(replacement, path)
        return path

    return rewrite


def build_filterer(includes: list[str], excludes: list[str]) -> callable:
    """Return a callable that returns True when a path should be processed."""
    re_includes = [re.compile(p) for p in includes]
    re_excludes = [re.compile(p) for p in excludes]

    def allow(path: str) -> bool:
        # Exclude wins over include
        for pattern in re_excludes:
            if pattern.search(path):
                return False
        if re_includes:
            return any(p.search(path) for p in re_includes)
        return True

    return allow
