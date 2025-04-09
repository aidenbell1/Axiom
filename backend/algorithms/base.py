# backend/algorithms/base.py
from abc import ABC, abstractmethod
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any

class BaseAlgorithm(ABC):
    """Base class for all trading algorithms."""
    
    def __init__(self, parameters: Dict[str, Any] = None):
        """
        Initialize the algorithm with parameters.
        
        Args:
            parameters: Dictionary of algorithm parameters
        """
        self.parameters = parameters or {}
        self.validate_parameters()
    
    @abstractmethod
    def validate_parameters(self):
        """Validate algorithm parameters."""
        pass
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals (buy/sell/hold) from market data.
        
        Args:
            data: DataFrame with market data
            
        Returns:
            DataFrame with added signal column
        """
        pass
    
    @abstractmethod
    def calculate_position_sizes(self, data: pd.DataFrame, portfolio_value: float) -> pd.DataFrame:
        """
        Calculate position sizes based on signals and risk management rules.
        
        Args:
            data: DataFrame with market data and signals
            portfolio_value: Current portfolio value
            
        Returns:
            DataFrame with added position_size column
        """
        pass
    
    def backtest(self, data: pd.DataFrame, initial_capital: float = 10000.0) -> Dict[str, Any]:
        """
        Run a backtest of the algorithm on historical data.
        
        Args:
            data: DataFrame with market data
            initial_capital: Starting capital for the backtest
            
        Returns:
            Dictionary with backtest results
        """
        # Generate signals
        data_with_signals = self.generate_signals(data)
        
        # Initialize backtest variables
        portfolio_value = initial_capital
        cash = initial_capital
        positions = {}
        trades = []
        equity_curve = []
        
        # Run backtest simulation
        for i, row in data_with_signals.iterrows():
            # Calculate position sizes for this timestamp
            position_data = self.calculate_position_sizes(
                data_with_signals.loc[:i],
                portfolio_value
            )
            current_row = position_data.iloc[-1]
            
            # Execute trades based on position changes
            # ... (trade execution logic)
            
            # Update portfolio value
            # ... (portfolio value calculation)
            
            # Record equity curve
            equity_curve.append({
                'timestamp': row.name,
                'portfolio_value': portfolio_value
            })
        
        # Calculate performance metrics
        equity_df = pd.DataFrame(equity_curve).set_index('timestamp')
        returns = equity_df['portfolio_value'].pct_change().dropna()
        
        # Calculate key metrics
        annualized_return = (equity_df['portfolio_value'].iloc[-1] / initial_capital) ** (252 / len(equity_df)) - 1
        daily_returns = returns
        excess_returns = daily_returns - 0.0001  # Assuming 0.01% daily risk-free rate
        sharpe_ratio = (excess_returns.mean() / excess_returns.std()) * np.sqrt(252) if len(excess_returns) > 0 and excess_returns.std() > 0 else 0
        
        # Calculate drawdowns
        cumulative_returns = (1 + returns).cumprod()
        running_max = cumulative_returns.cummax()
        drawdowns = (cumulative_returns / running_max) - 1
        max_drawdown = drawdowns.min() if not drawdowns.empty else 0
        
        # Calculate win rate
        win_rate = len(daily_returns[daily_returns > 0]) / len(daily_returns) if len(daily_returns) > 0 else 0
        
        return {
            "equity_curve": equity_df.to_dict(orient='records'),
            "trades": trades,
            "metrics": {
                "annualized_return": annualized_return,
                "sharpe_ratio": sharpe_ratio,
                "max_drawdown": max_drawdown,
                "win_rate": win_rate,
                "total_trades": len(trades),
                "final_portfolio_value": portfolio_value
            }
        }