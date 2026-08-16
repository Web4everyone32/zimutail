"""Compatibility entry point. Prefer: uvicorn backend.app.main:app"""

from .app.main import app

__all__ = ["app"]
