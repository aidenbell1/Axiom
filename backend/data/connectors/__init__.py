# backend/data/connectors/__init__.py
"""
External data source connectors for Axiom.

This module contains connectors to various external data sources
that provide market data for the platform, such as price data,
technical indicators, and fundamental analysis.
"""

from backend.data.connectors import yahoo_finance
from backend.data.connectors import alpaca

__all__ = [
    "yahoo_finance",
    "alpaca"
]