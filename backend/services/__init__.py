# backend/services/__init__.py
"""
Business logic services for Axiom Quantitative Investment Platform.

This module contains service layers that encapsulate the business logic
of the application, separate from the API request handling and data access layers.
Each service focuses on a specific domain area of the application.
"""

from backend.services import auth_service
from backend.services import strategy_service
from backend.services import backtest_service
from backend.services import portfolio_service
from backend.services import market_data_service

__all__ = [
    "auth_service",
    "strategy_service",
    "backtest_service",
    "portfolio_service",
    "market_data_service"
]