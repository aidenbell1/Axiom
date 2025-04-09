# backend/services/portfolio_service.py
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from backend.models.portfolio import Portfolio, Position, PortfolioType
from backend.models.trade import Trade, TradeStatus
from backend.data.connectors.yahoo_finance import get_latest_quote

logger = logging.getLogger(__name__)

def create_portfolio(db: Session, portfolio_data: Dict[str, Any], user_id: int) -> Portfolio:
    """Create a new portfolio."""
    # Create portfolio
    new_portfolio = Portfolio(
        user_id=user_id,
        name=portfolio_data["name"],
        description=portfolio_data.get("description"),
        portfolio_type=portfolio_data.get("portfolio_type", PortfolioType.PAPER),
        initial_capital=portfolio_data["initial_capital"],
        current_value=portfolio_data["initial_capital"],
        cash_balance=portfolio_data["initial_capital"],
        is_active=True,
        broker=portfolio_data.get("broker"),
        broker_account_id=portfolio_data.get("broker_account_id")
    )
    
    db.add(new_portfolio)
    db.commit()
    db.refresh(new_portfolio)
    
    return new_portfolio

def get_portfolio(db: Session, portfolio_id: int) -> Optional[Portfolio]:
    """Get a portfolio by ID."""
    return db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()

def get_portfolios(
    db: Session,
    user_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    include_inactive: bool = False,
    skip: int = 0,
    limit: int = 100
) -> List[Portfolio]:
    """Get list of portfolios with filters."""
    query = db.query(Portfolio)
    
    if user_id is not None:
        query = query.filter(Portfolio.user_id == user_id)
    
    if is_active is not None:
        query = query.filter(Portfolio.is_active == is_active)
    elif not include_inactive:
        query = query.filter(Portfolio.is_active == True)
    
    return query.order_by(Portfolio.created_at.desc()).offset(skip).limit(limit).all()

def update_portfolio(db: Session, portfolio_id: int, portfolio_data: Dict[str, Any]) -> Portfolio:
    """Update a portfolio."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    
    if not portfolio:
        return None
    
    # Update portfolio fields
    for key, value in portfolio_data.items():
        setattr(portfolio, key, value)
    
    db.commit()
    db.refresh(portfolio)
    
    return portfolio

def delete_portfolio(db: Session, portfolio_id: int) -> bool:
    """Delete a portfolio."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    
    if not portfolio:
        return False
    
    db.delete(portfolio)
    db.commit()
    
    return True

def create_position(db: Session, portfolio_id: int, position_data: Dict[str, Any]) -> Position:
    """Create a new position in a portfolio."""
    # First get the portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    
    if not portfolio:
        return None
    
    # Create position
    new_position = Position(
        portfolio_id=portfolio_id,
        symbol=position_data["symbol"],
        quantity=position_data["quantity"],
        average_entry_price=position_data["average_entry_price"],
        strategy_id=position_data.get("strategy_id"),
        is_open=True,
        opened_at=datetime.now()
    )
    
    # Calculate current value
    position_value = position_data["quantity"] * position_data["average_entry_price"]
    new_position.current_price = position_data["average_entry_price"]
    new_position.current_value = position_value
    new_position.unrealized_pnl = 0
    new_position.unrealized_pnl_pct = 0
    
    # Update portfolio cash balance
    portfolio.cash_balance -= position_value
    
    db.add(new_position)
    db.commit()
    db.refresh(new_position)
    
    # Update portfolio value
    update_portfolio_value(db, portfolio_id)
    
    return new_position

def update_position(db: Session, position_id: int, position_data: Dict[str, Any]) -> Position:
    """Update an existing position."""
    position = db.query(Position).filter(Position.id == position_id).first()
    
    if not position or not position.is_open:
        return None
    
    # Update position fields
    for key, value in position_data.items():
        setattr(position, key, value)
    
    db.commit()
    db.refresh(position)
    
    # Update portfolio value
    update_portfolio_value(db, position.portfolio_id)
    
    return position

def close_position(db: Session, position_id: int, close_price: float) -> Position:
    """Close an existing position."""
    position = db.query(Position).filter(Position.id == position_id, Position.is_open == True).first()
    
    if not position:
        return None
    
    # Get portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.id == position.portfolio_id).first()
    
    if not portfolio:
        return None
    
    # Calculate realized profit/loss
    close_value = position.quantity * close_price
    cost_basis = position.quantity * position.average_entry_price
    realized_pnl = close_value - cost_basis
    realized_pnl_pct = realized_pnl / cost_basis if cost_basis > 0 else 0
    
    # Update position
    position.current_price = close_price
    position.current_value = close_value
    position.unrealized_pnl = realized_pnl
    position.unrealized_pnl_pct = realized_pnl_pct
    position.is_open = False
    position.closed_at = datetime.now()
    
    # Update portfolio cash balance
    portfolio.cash_balance += close_value
    
    db.commit()
    db.refresh(position)
    
    # Update portfolio value
    update_portfolio_value(db, position.portfolio_id)
    
    return position

def create_trade(db: Session, portfolio_id: int, user_id: int, trade_data: Dict[str, Any]) -> Trade:
    """Create a new trade."""
    # Create trade
    new_trade = Trade(
        portfolio_id=portfolio_id,
        user_id=user_id,
        symbol=trade_data["symbol"],
        trade_type=trade_data["trade_type"],
        quantity=trade_data["quantity"],
        price=trade_data["price"],
        total_amount=trade_data["quantity"] * trade_data["price"],
        commission=trade_data.get("commission", 0.0),
        status=trade_data.get("status", TradeStatus.PENDING),
        executed_at=trade_data.get("executed_at"),
        realized_pnl=trade_data.get("realized_pnl"),
        realized_pnl_pct=trade_data.get("realized_pnl_pct"),
        notes=trade_data.get("notes"),
        order_id=trade_data.get("order_id"),
        strategy_id=trade_data.get("strategy_id")
    )
    
    db.add(new_trade)
    db.commit()
    db.refresh(new_trade)
    
    return new_trade

def update_position_prices(db: Session, portfolio_id: int) -> None:
    """Update current prices and values for all open positions in a portfolio."""
    # Get all open positions for the portfolio
    positions = db.query(Position).filter(
        Position.portfolio_id == portfolio_id,
        Position.is_open == True
    ).all()
    
    if not positions:
        return
    
    # Get unique symbols
    symbols = list(set(position.symbol for position in positions))
    
    # Fetch latest quotes for all symbols
    quotes = {}
    for symbol in symbols:
        quote = get_latest_quote(symbol)
        if 'error' not in quote and quote.get('price') is not None:
            quotes[symbol] = quote['price']
    
    # Update positions
    for position in positions:
        if position.symbol in quotes:
            current_price = quotes[position.symbol]
            current_value = position.quantity * current_price
            cost_basis = position.quantity * position.average_entry_price
            unrealized_pnl = current_value - cost_basis
            unrealized_pnl_pct = unrealized_pnl / cost_basis if cost_basis > 0 else 0
            
            position.current_price = current_price
            position.current_value = current_value
            position.unrealized_pnl = unrealized_pnl
            position.unrealized_pnl_pct = unrealized_pnl_pct
    
    db.commit()
    
    # Update portfolio value
    update_portfolio_value(db, portfolio_id)

def update_portfolio_value(db: Session, portfolio_id: int) -> None:
    """Update the total value of a portfolio based on positions and cash."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    
    if not portfolio:
        return
    
    # Get all positions for the portfolio
    positions = db.query(Position).filter(Position.portfolio_id == portfolio_id).all()
    
    # Calculate total positions value
    positions_value = sum(p.current_value for p in positions if p.is_open and p.current_value is not None)
    
    # Update portfolio value (positions + cash)
    portfolio.current_value = positions_value + portfolio.cash_balance
    
    db.commit()

def get_portfolio_performance(db: Session, portfolio_id: int, timeframe: str = "1M") -> Dict[str, Any]:
    """
    Get historical performance data for a portfolio.
    
    Args:
        db: Database session
        portfolio_id: ID of the portfolio
        timeframe: Time period for performance data (e.g., "1D", "1W", "1M", "3M", "1Y", "ALL")
        
    Returns:
        Dictionary with performance data
    """
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    
    if not portfolio:
        return {"error": "Portfolio not found"}
    
    # Get all trades for the portfolio
    trades = db.query(Trade).filter(
        Trade.portfolio_id == portfolio_id,
        Trade.status == TradeStatus.FILLED
    ).order_by(Trade.executed_at).all()
    
    if not trades:
        return {
            "portfolio_id": portfolio_id,
            "initial_value": portfolio.initial_capital,
            "current_value": portfolio.current_value,
            "total_return": 0,
            "total_return_pct": 0,
            "performance_data": []
        }
    
    # Calculate start date based on timeframe
    start_date = None
    now = datetime.now()
    
    if timeframe == "1D":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif timeframe == "1W":
        start_date = now - timedelta(days=7)
    elif timeframe == "1M":
        start_date = now - timedelta(days=30)
    elif timeframe == "3M":
        start_date = now - timedelta(days=90)
    elif timeframe == "6M":
        start_date = now - timedelta(days=180)
    elif timeframe == "1Y":
        start_date = now - timedelta(days=365)
    # "ALL" uses all available data
    
    # Filter trades by date if needed
    if start_date:
        trades = [t for t in trades if t.executed_at >= start_date]
    
    # Reconstruct portfolio value over time
    performance_data = []
    
    # Start with initial capital
    current_value = portfolio.initial_capital
    
    # Add portfolio creation point
    performance_data.append({
        "date": portfolio.created_at.isoformat(),
        "value": current_value
    })
    
    # Process each trade to update portfolio value
    for trade in trades:
        if trade.trade_type in ["buy", "short"]:
            # Buying reduces cash
            current_value -= trade.total_amount
        else:
            # Selling increases cash and adds profit/loss
            current_value += trade.total_amount
            if trade.realized_pnl is not None:
                current_value += trade.realized_pnl
        
        performance_data.append({
            "date": trade.executed_at.isoformat(),
            "value": current_value
        })
    
    # Add current value
    performance_data.append({
        "date": now.isoformat(),
        "value": portfolio.current_value
    })
    
    # Calculate returns
    initial_value = portfolio.initial_capital
    current_value = portfolio.current_value
    total_return = current_value - initial_value
    total_return_pct = (total_return / initial_value) if initial_value > 0 else 0
    
    return {
        "portfolio_id": portfolio_id,
        "initial_value": initial_value,
        "current_value": current_value,
        "total_return": total_return,
        "total_return_pct": total_return_pct,
        "performance_data": performance_data
    }