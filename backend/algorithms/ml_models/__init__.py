# backend/algorithms/ml_models/__init__.py
"""
Machine learning models for trading algorithms.

This module contains machine learning-based trading strategy implementations
that use various ML approaches to predict market movements and generate signals.
"""

from backend.algorithms.ml_models.lstm import LSTMPricePredictor
from backend.algorithms.ml_models.random_forest import RandomForestStrategy

__all__ = [
    "LSTMPricePredictor",
    "RandomForestStrategy"
]