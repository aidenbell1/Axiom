# backend/algorithms/trend_following.py
import pandas as pd
import numpy as np
from typing import Dict, Any

from backend.algorithms.base import BaseAlgorithm
from backend.algorithms.utils.indicators import calculate_moving_average, calculate_atr

class TrendFollowingStrategy(BaseAlgorithm):
    """
    Trend Following Strategy using Moving Averages and ATR for position sizing.
    
    This strategy buys when the fast moving average crosses above the slow moving average,
    and sells when the fast moving average crosses below the slow moving average.
    ATR is used for position sizing to manage risk.
    """
    
    DEFAULT_PARAMETERS = {
        "fast_ma_window": 10,
        "slow_ma_window": 30,
        "ma_type": "ema",  # 'sma' or 'ema'
        "atr_window": 14,
        "risk_pct": 0.01,  # 1% risk per trade
        "position_size_pct": 0.2  # Max 20% of portfolio per position
    }
    
    def __init__(self, parameters: Dict[str, Any] = None):
        """Initialize with default parameters and override with provided ones."""
        merged_params = {**self.DEFAULT_PARAMETERS, **(parameters or {})}
        super().__init__(merged_params)
    
    def validate_parameters(self):
        """Validate strategy parameters."""
        required_params = [
            "fast_ma_window", "slow_ma_window", "ma_type",
            "atr_window", "risk_pct", "position_size_pct"
        ]
        
        for param in required_params:
            if param not in self.parameters:
                raise ValueError(f"Missing required parameter: {param}")
        
        # Type and value validation
        if not isinstance(self.parameters["fast_ma_window"], int) or self.parameters["fast_ma_window"] <= 0:
            raise ValueError("fast_ma_window must be a positive integer")
        
        if not isinstance(self.parameters["slow_ma_window"], int) or self.parameters["slow_ma_window"] <= 0:
            raise ValueError("slow_ma_window must be a positive integer")
        
        if self.parameters["fast_ma_window"] >= self.parameters["slow_ma_window"]:
            raise ValueError("fast_ma_window must be less than slow_ma_window")
        
        if self.parameters["ma_type"] not in ["sma", "ema"]:
            raise ValueError("ma_type must be either 'sma' or 'ema'")
        
        if not isinstance(self.parameters["atr_window"], int) or self.parameters["atr_window"] <= 0:
            raise ValueError("atr_window must be a positive integer")
        
        if not isinstance(self.parameters["risk_pct"], (int, float)) or not 0 < self.parameters["risk_pct"] <= 0.1:
            raise ValueError("risk_pct must be a number between 0 and 0.1 (0% to 10%)")
        
        if not isinstance(self.parameters["position_size_pct"], (int, float)) or not 0 < self.parameters["position_size_pct"] <= 1:
            raise ValueError("position_size_pct must be a number between 0 and 1 (0% to 100%)")
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on moving average crossovers.
        
        Args:
            data: DataFrame with at least 'close' price column
            
        Returns:
            DataFrame with added 'signal' column (1 for buy, -1 for sell, 0 for hold)
        """
        # Make a copy to avoid modifying original data
        df = data.copy()
        
        # Check if required column exists
        if 'close' not in df.columns:
            raise ValueError("DataFrame must contain 'close' price column")
        
        # Calculate fast moving average
        df = calculate_moving_average(
            df, 
            window=self.parameters["fast_ma_window"],
            ma_type=self.parameters["ma_type"],
            column='close',
            new_column='fast_ma'
        )
        
        # Calculate slow moving average
        df = calculate_moving_average(
            df, 
            window=self.parameters["slow_ma_window"],
            ma_type=self.parameters["ma_type"],
            column='close',
            new_column='slow_ma'
        )
        
        # Calculate Average True Range for position sizing
        df = calculate_atr(df, window=self.parameters["atr_window"])
        
        # Initialize signal column
        df['signal'] = 0
        
        # Generate buy signals (fast MA crosses above slow MA)
        df['fast_above_slow'] = df['fast_ma'] > df['slow_ma']
        df['cross_above'] = df['fast_above_slow'] & (~df['fast_above_slow'].shift(1).fillna(False))
        df.loc[df['cross_above'], 'signal'] = 1
        
        # Generate sell signals (fast MA crosses below slow MA)
        df['cross_below'] = (~df['fast_above_slow']) & (df['fast_above_slow'].shift(1).fillna(False))
        df.loc[df['cross_below'], 'signal'] = -1
        
        # Clean up intermediate columns
        df = df.drop(['fast_above_slow', 'cross_above', 'cross_below'], axis=1)
        
        return df
    
    def calculate_position_sizes(self, data: pd.DataFrame, portfolio_value: float) -> pd.DataFrame:
        """
        Calculate position sizes based on signals and risk management rules.
        
        Args:
            data: DataFrame with market data and signals
            portfolio_value: Current portfolio value
            
        Returns:
            DataFrame with added position_size column
        """
        # Make a copy to avoid modifying original data
        df = data.copy()
        
        # Get the latest row with signal and ATR
        latest_row = df.iloc[-1]
        latest_signal = latest_row['signal']
        latest_price = latest_row['close']
        latest_atr = latest_row['atr']
        
        # If there's no signal or price, return with zero position size
        if latest_signal == 0 or latest_price <= 0 or latest_atr <= 0:
            df['position_size'] = 0
            return df
        
        # Calculate risk amount
        risk_amount = portfolio_value * self.parameters["risk_pct"]
        
        # Calculate position size based on ATR risk (using 2 * ATR as stop loss distance)
        stop_loss_distance = 2 * latest_atr
        shares_based_on_risk = risk_amount / stop_loss_distance
        
        # Calculate maximum position value based on position size percentage
        max_position_value = portfolio_value * self.parameters["position_size_pct"]
        max_shares = max_position_value / latest_price
        
        # Use the smaller of the two share amounts (risk-based or max position)
        shares = min(shares_based_on_risk, max_shares)
        
        # Set position size based on signal direction (positive for long, negative for short)
        position_size = shares if latest_signal > 0 else -shares
        
        # Update position size in the dataframe
        df['position_size'] = 0
        df.iloc[-1, df.columns.get_loc('position_size')] = position_size
        
        return df