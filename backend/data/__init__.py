# backend/data/__init__.py
"""
Data management modules for Axiom Quantitative Investment Platform.

This module contains all data-related functionality, including
database connections, external API connectors for market data,
and caching mechanisms.
"""

from backend.data import database
from backend.data import cache
from backend.data.connectors import yahoo_finance, alpaca

__all__ = [
    "database",
    "cache",
    "connectors"
]

# Create connectors namespace
connectors = type('Connectors', (), {
    'yahoo_finance': yahoo_finance,
    'alpaca': alpaca
})()