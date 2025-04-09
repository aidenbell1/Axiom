# backend/api/__init__.py
"""
API endpoints for Axiom Quantitative Investment Platform.

This module contains all the FastAPI route definitions for the application,
organized by resource type.
"""

# Import all API route modules to make them available
from backend.api import auth
from backend.api import strategies
from backend.api import backtesting
from backend.api import portfolio
from backend.api import market_data
from backend.api import user

__all__ = [
    "auth",
    "strategies",
    "backtesting",
    "portfolio",
    "market_data",
    "user"
]