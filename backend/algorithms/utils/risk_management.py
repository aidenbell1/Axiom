# backend/algorithms/utils/risk_management.py
"""
Risk management utilities for trading algorithms.

This module contains functions to manage risk in trading strategies,
including position sizing, stop-loss calculation, and portfolio risk metrics.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Union, Tuple, List

def calculate_position_size(
    capital: float,
    risk_per_trade: float,
    entry_price: float,
    stop_loss_price: float,
    risk_pct: Optional[float] = None
) -> float:
    """
    Calculate position size based on fixed risk per trade.
    
    Args:
        capital: Total available capital
        risk_per_trade: Amount to risk per trade in currency units (if risk_pct is None)
        entry_price: Entry price for the position
        stop_loss_price: Stop loss price for the position
        risk_pct: Percentage of capital to risk per trade (overrides risk_per_trade if provided)
        
    Returns:
        Position size in number of shares/contracts
    """
    # Calculate risk per trade as percentage of capital if specified
    if risk_pct is not None:
        risk_per_trade = capital * risk_pct
    
    # Calculate risk per share
    risk_per_share = abs(entry_price - stop_loss_price)
    
    # Prevent division by zero
    if risk_per_share == 0:
        return 0
    
    # Calculate position size
    position_size = risk_per_trade / risk_per_share
    
    return position_size

def calculate_stop_loss(
    entry_price: float,
    direction: str,
    atr_value: float,
    atr_multiplier: float = 2.0
) -> float:
    """
    Calculate stop loss price based on Average True Range (ATR).
    
    Args:
        entry_price: Entry price for the position
        direction: Trade direction ('long' or 'short')
        atr_value: ATR value at entry
        atr_multiplier: Multiplier for ATR to set stop distance
        
    Returns:
        Stop loss price
    """
    if direction.lower() == 'long':
        stop_loss = entry_price - (atr_value * atr_multiplier)
    elif direction.lower() == 'short':
        stop_loss = entry_price + (atr_value * atr_multiplier)
    else:
        raise ValueError("Direction must be 'long' or 'short'")
    
    return stop_loss

def calculate_risk_reward_ratio(
    entry_price: float,
    stop_loss_price: float,
    take_profit_price: float
) -> float:
    """
    Calculate risk-to-reward ratio for a trade.
    
    Args:
        entry_price: Entry price for the position
        stop_loss_price: Stop loss price for the position
        take_profit_price: Take profit price for the position
        
    Returns:
        Risk-to-reward ratio (reward divided by risk)
    """
    # Calculate risk and reward
    risk = abs(entry_price - stop_loss_price)
    reward = abs(entry_price - take_profit_price)
    
    # Prevent division by zero
    if risk == 0:
        return 0
    
    # Calculate risk-to-reward ratio
    risk_reward_ratio = reward / risk
    
    return risk_reward_ratio

def calculate_portfolio_var(
    positions: List[Dict[str, Any]],
    confidence_level: float = 0.95,
    time_horizon: int = 1,
    historical_returns: Optional[Dict[str, pd.Series]] = None
) -> float:
    """
    Calculate portfolio Value at Risk (VaR) using historical simulation.
    
    Args:
        positions: List of position dictionaries with 'symbol' and 'value' keys
        confidence_level: Confidence level for VaR calculation
        time_horizon: Time horizon in days
        historical_returns: Dictionary mapping symbols to their historical returns
        
    Returns:
        Portfolio VaR as a positive number
    """
    if not positions:
        return 0
    
    if not historical_returns:
        return 0  # Can't calculate VaR without historical data
    
    # Extract symbols and position values
    symbols = [p['symbol'] for p in positions]
    position_values = [p['value'] for p in positions]
    total_portfolio_value = sum(position_values)
    
    # Calculate portfolio weights
    weights = [value / total_portfolio_value for value in position_values]
    
    # Get historical returns for each symbol
    symbol_returns = []
    for symbol in symbols:
        if symbol in historical_returns:
            symbol_returns.append(historical_returns[symbol])
        else:
            # If no returns data available, use zeros
            symbol_returns.append(pd.Series(np.zeros(len(max(historical_returns.values(), key=len)))))
    
    # Ensure all return series have the same length
    min_length = min(len(returns) for returns in symbol_returns)
    aligned_returns = [returns.iloc[-min_length:] for returns in symbol_returns]
    
    # Create a DataFrame of historical returns
    returns_df = pd.concat(aligned_returns, axis=1)
    returns_df.columns = symbols
    
    # Calculate portfolio returns
    portfolio_returns = returns_df.dot(weights)
    
    # Calculate VaR
    var_percentile = 1 - confidence_level
    var = -np.percentile(portfolio_returns, var_percentile * 100) * np.sqrt(time_horizon)
    
    # Return VaR as a percentage of portfolio value
    return var

def calculate_max_drawdown(equity_curve: pd.Series) -> float:
    """
    Calculate maximum drawdown from an equity curve.
    
    Args:
        equity_curve: Series of equity values over time
        
    Returns:
        Maximum drawdown as a decimal (0.1 = 10% drawdown)
    """
    # Calculate running maximum
    running_max = equity_curve.cummax()
    
    # Calculate drawdown
    drawdown = (equity_curve / running_max) - 1
    
    # Get maximum drawdown
    max_drawdown = drawdown.min()
    
    return abs(max_drawdown)

def check_portfolio_allocation(positions: List[Dict[str, Any]], max_allocation: float = 0.25) -> Dict[str, Any]:
    """
    Check if any position exceeds maximum allocation of portfolio.
    
    Args:
        positions: List of position dictionaries with 'symbol' and 'value' keys
        max_allocation: Maximum allocation for any single position (0.25 = 25%)
        
    Returns:
        Dictionary with check results
    """
    if not positions:
        return {"compliant": True, "violations": []}
    
    # Calculate total portfolio value
    total_value = sum(p['value'] for p in positions)
    
    # Check allocation for each position
    violations = []
    for position in positions:
        allocation = position['value'] / total_value
        if allocation > max_allocation:
            violations.append({
                "symbol": position['symbol'],
                "allocation": allocation,
                "max_allowed": max_allocation
            })
    
    return {
        "compliant": len(violations) == 0,
        "violations": violations
    }

def calculate_kelly_criterion(win_rate: float, avg_win_loss_ratio: float) -> float:
    """
    Calculate optimal position size using Kelly Criterion.
    
    Args:
        win_rate: Probability of winning (between 0 and 1)
        avg_win_loss_ratio: Ratio of average win to average loss
        
    Returns:
        Kelly percentage as a decimal (0.1 = 10% of capital)
    """
    kelly = win_rate - ((1 - win_rate) / avg_win_loss_ratio)
    
    # Cap Kelly at 0.5 (50%) to be more conservative
    return max(0, min(kelly, 0.5))

def apply_trailing_stop(
    position_entry: float,
    current_price: float,
    highest_price: float,
    direction: str,
    trail_percent: float = 0.1
) -> Tuple[bool, float]:
    """
    Apply a trailing stop to a position.
    
    Args:
        position_entry: Entry price of the position
        current_price: Current market price
        highest_price: Highest price reached since entry (for long) or lowest price (for short)
        direction: Trade direction ('long' or 'short')
        trail_percent: Trailing stop percentage
        
    Returns:
        Tuple of (stop_triggered, stop_price)
    """
    if direction.lower() == 'long':
        # For long positions
        stop_price = highest_price * (1 - trail_percent)
        stop_triggered = current_price <= stop_price
    elif direction.lower() == 'short':
        # For short positions
        stop_price = highest_price * (1 + trail_percent)
        stop_triggered = current_price >= stop_price
    else:
        raise ValueError("Direction must be 'long' or 'short'")
    
    return stop_triggered, stop_price