# backend/algorithms/__init__.py
"""
Trading algorithms for Axiom Quantitative Investment Platform.

This module contains all the trading strategy algorithms available in the platform,
from simple rule-based strategies to more complex machine learning models.
Each algorithm extends from the BaseAlgorithm class to maintain a consistent interface.
"""

from backend.algorithms.base import BaseAlgorithm
from backend.algorithms.mean_reversion import MeanReversionStrategy
from backend.algorithms.trend_following import TrendFollowingStrategy
from backend.algorithms.ml_models.lstm import LSTMPricePredictor
from backend.algorithms.ml_models.random_forest import RandomForestStrategy

# Dictionary mapping algorithm names to their class implementations
ALGORITHM_REGISTRY = {
    "mean_reversion": MeanReversionStrategy,
    "trend_following": TrendFollowingStrategy,
    "ml_lstm": LSTMPricePredictor,
    "random_forest": RandomForestStrategy
}

__all__ = [
    "BaseAlgorithm",
    "MeanReversionStrategy",
    "TrendFollowingStrategy",
    "LSTMPricePredictor",
    "RandomForestStrategy",
    "ALGORITHM_REGISTRY",
    "get_algorithm_class",
    "create_algorithm_instance"
]

def get_algorithm_class(algorithm_type: str):
    """
    Get the algorithm class for a given algorithm type.
    
    Args:
        algorithm_type: Algorithm type identifier
        
    Returns:
        Algorithm class
        
    Raises:
        ValueError: If algorithm type is not found
    """
    if algorithm_type not in ALGORITHM_REGISTRY:
        raise ValueError(f"Unknown algorithm type: {algorithm_type}")
    
    return ALGORITHM_REGISTRY[algorithm_type]

def create_algorithm_instance(algorithm_type: str, parameters=None):
    """
    Create an instance of a trading algorithm.
    
    Args:
        algorithm_type: Algorithm type identifier
        parameters: Optional parameters for the algorithm
        
    Returns:
        Algorithm instance
        
    Raises:
        ValueError: If algorithm type is not found
    """
    algorithm_class = get_algorithm_class(algorithm_type)
    return algorithm_class(parameters)