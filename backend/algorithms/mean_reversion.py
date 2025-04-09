# backend/algorithms/mean_reversion.py
import pandas as pd
import numpy as np
from typing import Dict, Any

from backend.algorithms.base import BaseAlgorithm
from backend.algorithms.utils.indicators import calculate_bollinger_bands, calculate_rsi

class MeanReversionStrategy(BaseAlgorithm):
    """
    Mean Reversion Strategy using Bollinger Bands and RSI.
    
    This strategy buys when price is below lower Bollinger Band and RSI is oversold,
    and sells when price is above upper Bollinger Band and RSI is overbought.
    """
    
    DEFAULT_PARAMETERS = {
        "bollinger_window": 20,
        "bollinger_std": 2.0,
        "rsi_window": 14,
        "rsi_oversold": 30,
        "rsi_overbought": 70,
        "position_size_pct": 0.1  # 10% of portfolio per position
    }
    
    def __init__(self, parameters: Dict[str, Any] = None):
        """Initialize with default parameters and override with provided ones."""
        merged_params = {**self.DEFAULT_PARAMETERS, **(parameters or {})}
        super().__init__(merged_params)
    
    def validate_parameters(self):
        """Validate strategy parameters."""
        required_params = [
            "bollinger_window", "bollinger_std", 
            "rsi_window", "rsi_oversold", "rsi_overbought",
            "position_size_pct"
        ]
        
        for param in required_params:
            if param not in self.parameters:
                raise ValueError(f"Missing required parameter: {param}")
        
        # Type and value validation
        if not isinstance(self.parameters["bollinger_window"], int) or self.parameters["bollinger_window"] <= 0:
            raise ValueError("bollinger_window must be a positive integer")
        
        if not isinstance(self.parameters["bollinger_std"], (int, float)) or self.parameters["bollinger_std"] <= 0:
            raise ValueError("bollinger_std must be a positive number")
        
        if not isinstance(self.parameters["rsi_window"], int) or self.parameters["rsi_window"] <= 0:
            raise ValueError("rsi_window must be a positive integer")
        
        if not isinstance(self.parameters["rsi_oversold"], (int, float)) or not 0 <= self.parameters["rsi_oversold"] <= 100:
            raise ValueError("rsi_oversold must be a number between 0 and 100")
        
        if not isinstance(self.parameters["rsi_overbought"], (int, float)) or not 0 <= self.parameters["rsi_overbought"] <= 100:
            raise ValueError("rsi_overbought must be a number between 0 and 100")
        
        if not isinstance(self.parameters["position_size_pct"], (int, float)) or not 0 < self.parameters["position_size_pct"] <= 1:
            raise ValueError("position_size_pct must be a number between 0 and 1")
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on Bollinger Bands and RSI.
        
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
        
        # Calculate Bollinger Bands
        df = calculate_bollinger_bands(
            df, 
            window=self.parameters["bollinger_window"],
            num_std=self.parameters["bollinger_std"]
        )
        
        # Calculate RSI
        df = calculate_rsi(df, window=self.parameters["rsi_window"])
        
        # Initialize signal column
        df['signal'] = 0
        
        # Generate buy signals (price below lower BB and RSI oversold)
        buy_condition = (
            (df['close'] < df['lower_band']) & 
            (df['rsi'] < self.parameters["rsi_oversold"])
        )
        df.loc[buy_condition, 'signal'] = 1
        
        # Generate sell signals (price above upper BB and RSI overbought)
        sell_condition = (
            (df['close'] > df['upper_band']) & 
            (df['rsi'] > self.parameters["rsi_overbought"])
        )
        df.loc[sell_condition, 'signal'] = -1
        
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
        
        # Calculate position size based on portfolio percentage
        position_value = portfolio_value * self.parameters["position_size_pct"]
        
        # Calculate number of shares based on latest close price
        latest_price = df['close'].iloc[-1]
        shares = position_value / latest_price if latest_price > 0 else 0
        
        # Calculate position size in shares (positive for long, negative for short)
        df['position_size'] = df['signal'] * shares
        
        # Only take action on new signals (when signal changes)
        df['signal_change'] = df['signal'].diff().fillna(0)
        df.loc[df['signal_change'] == 0, 'position_size'] = 0
        
        return df