# backend/services/backtest_service.py
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

import pandas as pd
from sqlalchemy.orm import Session

from backend.models.backtest import Backtest
from backend.models.strategy import Strategy
from backend.models.user import User
from backend.data.connectors.yahoo_finance import get_historical_data
from backend.algorithms.mean_reversion import MeanReversionStrategy
from backend.algorithms.trend_following import TrendFollowingStrategy
from backend.algorithms.ml_models.lstm import LSTMPricePredictor

logger = logging.getLogger(__name__)

def create_backtest(
    db: Session, 
    user_id: int,
    strategy_id: int,
    backtest_data: Dict[str, Any]
) -> Backtest:
    """Create a new backtest."""
    # Get strategy
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strategy:
        raise ValueError(f"Strategy with ID {strategy_id} not found")
    
    # Check if user owns the strategy or if it's public
    if strategy.user_id != user_id and not strategy.is_public:
        raise ValueError("You don't have permission to backtest this strategy")
    
    # Create new backtest record
    new_backtest = Backtest(
        user_id=user_id,
        strategy_id=strategy_id,
        start_date=backtest_data.get("start_date"),
        end_date=backtest_data.get("end_date"),
        symbols=backtest_data.get("symbols"),
        initial_capital=backtest_data.get("initial_capital", 10000.0),
        status="pending",
        parameters=strategy.parameters
    )
    
    db.add(new_backtest)
    db.commit()
    db.refresh(new_backtest)
    
    return new_backtest

def run_backtest(db: Session, backtest_id: int) -> Backtest:
    """Run a backtest and update results."""
    # Get backtest
    backtest = db.query(Backtest).filter(Backtest.id == backtest_id).first()
    if not backtest:
        raise ValueError(f"Backtest with ID {backtest_id} not found")
    
    # Check if backtest is already completed
    if backtest.status == "completed":
        return backtest
    
    # Update status to running
    backtest.status = "running"
    db.commit()
    
    try:
        # Get strategy
        strategy = db.query(Strategy).filter(Strategy.id == backtest.strategy_id).first()
        if not strategy:
            raise ValueError(f"Strategy with ID {backtest.strategy_id} not found")
        
        # Get data for each symbol
        all_results = []
        
        for symbol in backtest.symbols:
            # Get historical data
            data = get_historical_data(
                symbol=symbol,
                start_date=backtest.start_date,
                end_date=backtest.end_date
            )
            
            # Run backtest for symbol
            results = run_algorithm_backtest(
                algorithm_type=strategy.algorithm_type,
                parameters=backtest.parameters,
                data=data,
                initial_capital=backtest.initial_capital
            )
            
            # Add symbol to results
            results["symbol"] = symbol
            all_results.append(results)
        
        # Combine results
        combined_results = combine_backtest_results(all_results)
        
        # Update backtest with results
        backtest.results = combined_results
        backtest.completed_at = datetime.now()
        backtest.status = "completed"
        
        # Extract performance metrics
        backtest.annualized_return = combined_results["metrics"]["annualized_return"]
        backtest.sharpe_ratio = combined_results["metrics"]["sharpe_ratio"]
        backtest.max_drawdown = combined_results["metrics"]["max_drawdown"]
        backtest.win_rate = combined_results["metrics"]["win_rate"]
        backtest.total_trades = combined_results["metrics"]["total_trades"]
        backtest.final_equity = combined_results["metrics"]["final_portfolio_value"]
        
        # Update strategy performance metrics if this is the latest backtest
        update_strategy_metrics(db, strategy, combined_results["metrics"])
        
        db.commit()
        
        return backtest
    except Exception as e:
        logger.error(f"Error running backtest ID {backtest_id}: {str(e)}")
        backtest.status = "failed"
        backtest.error_message = str(e)
        db.commit()
        raise

def run_algorithm_backtest(
    algorithm_type: str,
    parameters: Dict[str, Any],
    data: pd.DataFrame,
    initial_capital: float
) -> Dict[str, Any]:
    """Run backtest for a specific algorithm and dataset."""
    # Initialize algorithm
    if algorithm_type == "mean_reversion":
        algorithm = MeanReversionStrategy(parameters=parameters)
    elif algorithm_type == "trend_following":
        algorithm = TrendFollowingStrategy(parameters=parameters)
    elif algorithm_type == "ml_lstm":
        algorithm = LSTMPricePredictor(parameters=parameters)
    else:
        raise ValueError(f"Unsupported algorithm type: {algorithm_type}")
    
    # Run backtest
    return algorithm.backtest(data, initial_capital=initial_capital)

def combine_backtest_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Combine results from multiple symbols into a single result."""
    if not results:
        return {
            "equity_curve": [],
            "trades": [],
            "metrics": {
                "annualized_return": 0,
                "sharpe_ratio": 0,
                "max_drawdown": 0,
                "win_rate": 0,
                "total_trades": 0,
                "final_portfolio_value": 0
            }
        }
    
    # Combine equity curves
    combined_equity_curve = {}
    for result in results:
        for point in result["equity_curve"]:
            timestamp = point["timestamp"]
            if timestamp not in combined_equity_curve:
                combined_equity_curve[timestamp] = 0
            combined_equity_curve[timestamp] += point["portfolio_value"] / len(results)
    
    combined_equity_curve_list = [
        {"timestamp": timestamp, "portfolio_value": value}
        for timestamp, value in combined_equity_curve.items()
    ]
    combined_equity_curve_list.sort(key=lambda x: x["timestamp"])
    
    # Combine trades
    combined_trades = []
    for result in results:
        symbol = result["symbol"]
        for trade in result["trades"]:
            trade["symbol"] = symbol
            combined_trades.append(trade)
    
    combined_trades.sort(key=lambda x: x["timestamp"])
    
    # Calculate combined metrics
    total_trades = sum(result["metrics"]["total_trades"] for result in results)
    win_rate = sum(result["metrics"]["win_rate"] * result["metrics"]["total_trades"] for result in results) / total_trades if total_trades > 0 else 0
    
    # Get final portfolio value
    final_portfolio_value = combined_equity_curve_list[-1]["portfolio_value"] if combined_equity_curve_list else 0
    
    # Calculate annualized return
    initial_portfolio_value = combined_equity_curve_list[0]["portfolio_value"] if combined_equity_curve_list else 0
    days = (combined_equity_curve_list[-1]["timestamp"] - combined_equity_curve_list[0]["timestamp"]).days if combined_equity_curve_list else 0
    annualized_return = (final_portfolio_value / initial_portfolio_value) ** (365 / days) - 1 if days > 0 else 0
    
    # Calculate max drawdown
    max_drawdown = 0
    peak = 0
    for point in combined_equity_curve_list:
        value = point["portfolio_value"]
        if value > peak:
            peak = value
        drawdown = (peak - value) / peak if peak > 0 else 0
        max_drawdown = max(max_drawdown, drawdown)
    
    # Calculate Sharpe ratio
    returns = []
    for i in range(1, len(combined_equity_curve_list)):
        prev_value = combined_equity_curve_list[i-1]["portfolio_value"]
        curr_value = combined_equity_curve_list[i]["portfolio_value"]
        returns.append((curr_value / prev_value) - 1)
    
    sharpe_ratio = (sum(returns) / len(returns)) / (pd.Series(returns).std() or 1) * (252 ** 0.5) if returns else 0
    
    return {
        "equity_curve": combined_equity_curve_list,
        "trades": combined_trades,
        "metrics": {
            "annualized_return": annualized_return,
            "sharpe_ratio": sharpe_ratio,
            "max_drawdown": max_drawdown,
            "win_rate": win_rate,
            "total_trades": total_trades,
            "final_portfolio_value": final_portfolio_value
        }
    }

def update_strategy_metrics(db: Session, strategy: Strategy, metrics: Dict[str, Any]) -> None:
    """Update strategy performance metrics based on latest backtest."""
    strategy.annualized_return = metrics["annualized_return"]
    strategy.max_drawdown = metrics["max_drawdown"]
    strategy.sharpe_ratio = metrics["sharpe_ratio"]
    strategy.win_rate = metrics["win_rate"]
    db.commit()

def get_backtest(db: Session, backtest_id: int) -> Optional[Backtest]:
    """Get a backtest by ID."""
    return db.query(Backtest).filter(Backtest.id == backtest_id).first()

def get_backtests(
    db: Session,
    user_id: Optional[int] = None,
    strategy_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Backtest]:
    """Get list of backtests with filters."""
    query = db.query(Backtest)
    
    if user_id is not None:
        query = query.filter(Backtest.user_id == user_id)
    
    if strategy_id is not None:
        query = query.filter(Backtest.strategy_id == strategy_id)
    
    return query.order_by(Backtest.created_at.desc()).offset(skip).limit(limit).all()

def delete_backtest(db: Session, backtest_id: int) -> bool:
    """Delete a backtest."""
    backtest = db.query(Backtest).filter(Backtest.id == backtest_id).first()
    if not backtest:
        return False
    
    db.delete(backtest)
    db.commit()
    return True