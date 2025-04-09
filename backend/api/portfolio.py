# backend/api/portfolio.py
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.models import get_db
from backend.models.user import User
from backend.models.portfolio import Portfolio, Position, PortfolioType
from backend.models.trade import Trade, TradeType, TradeStatus
from backend.api.auth import get_current_active_user
from backend.data.connectors.yahoo_finance import get_latest_quote
from backend.services.portfolio_service import (
    create_portfolio,
    get_portfolio,
    get_portfolios,
    update_portfolio,
    delete_portfolio,
    create_position,
    update_position,
    close_position,
    create_trade,
    update_position_prices
)

router = APIRouter(prefix="/portfolio")

# Pydantic models
class PortfolioBase(BaseModel):
    name: str
    description: Optional[str] = None
    portfolio_type: PortfolioType = PortfolioType.PAPER
    initial_capital: float
    broker: Optional[str] = None
    broker_account_id: Optional[str] = None

class PortfolioCreate(PortfolioBase):
    initial_capital: float

    @validator('initial_capital')
    def validate_initial_capital(cls, value):
        if value <= 0:
            raise ValueError("Initial capital must be greater than 0")
        return value

class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    broker: Optional[str] = None
    broker_account_id: Optional[str] = None

class PortfolioResponse(PortfolioBase):
    id: int
    user_id: int
    current_value: Optional[float] = None
    cash_balance: Optional[float] = None
    is_active: bool
    created_at: str
    updated_at: Optional[str] = None
    positions: List[Dict[str, Any]] = []

class PositionBase(BaseModel):
    symbol: str
    quantity: float
    average_entry_price: float
    strategy_id: Optional[int] = None

class PositionCreate(PositionBase):
    @validator('quantity')
    def validate_quantity(cls, value):
        if value <= 0:
            raise ValueError("Quantity must be greater than 0")
        return value

    @validator('average_entry_price')
    def validate_price(cls, value):
        if value <= 0:
            raise ValueError("Price must be greater than 0")
        return value

class PositionResponse(PositionBase):
    id: int
    portfolio_id: int
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_pct: Optional[float] = None
    is_open: bool
    opened_at: str
    closed_at: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

class TradeBase(BaseModel):
    symbol: str
    trade_type: TradeType
    quantity: float
    price: float
    commission: float = 0.0
    notes: Optional[str] = None
    strategy_id: Optional[int] = None

class TradeCreate(TradeBase):
    @validator('quantity')
    def validate_quantity(cls, value):
        if value <= 0:
            raise ValueError("Quantity must be greater than 0")
        return value

    @validator('price')
    def validate_price(cls, value):
        if value <= 0:
            raise ValueError("Price must be greater than 0")
        return value

class TradeResponse(TradeBase):
    id: int
    portfolio_id: int
    user_id: int
    total_amount: float
    status: TradeStatus
    executed_at: Optional[str] = None
    realized_pnl: Optional[float] = None
    realized_pnl_pct: Optional[float] = None
    order_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# API endpoints
@router.post("/", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
def create_new_portfolio(
    portfolio_data: PortfolioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new portfolio."""
    # Check if user already has an active portfolio with the same name
    existing_portfolios = get_portfolios(db, user_id=current_user.id)
    for portfolio in existing_portfolios:
        if portfolio.name == portfolio_data.name and portfolio.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active portfolio with this name"
            )
    
    # Create portfolio
    portfolio = create_portfolio(db, portfolio_data.dict(), current_user.id)
    return portfolio.to_dict()

@router.get("/", response_model=List[PortfolioResponse])
def read_portfolios(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all portfolios for the current user."""
    portfolios = get_portfolios(
        db, 
        user_id=current_user.id, 
        skip=skip, 
        limit=limit,
        include_inactive=include_inactive
    )
    return [portfolio.to_dict() for portfolio in portfolios]

@router.get("/active", response_model=PortfolioResponse)
def read_active_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get the active portfolio for the current user."""
    # Refresh portfolio values first
    portfolios = get_portfolios(db, user_id=current_user.id, is_active=True)
    
    if not portfolios:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active portfolio found"
        )
    
    # There should only be one active portfolio, but just in case, return the first one
    portfolio = portfolios[0]
    
    # Update position prices
    update_position_prices(db, portfolio.id)
    
    # Get the updated portfolio
    updated_portfolio = get_portfolio(db, portfolio_id=portfolio.id)
    return updated_portfolio.to_dict()

@router.get("/{portfolio_id}", response_model=PortfolioResponse)
def read_portfolio(
    portfolio_id: int = Path(..., description="The ID of the portfolio to get"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific portfolio by ID."""
    portfolio = get_portfolio(db, portfolio_id=portfolio_id)
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Check if user owns the portfolio
    if portfolio.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this portfolio"
        )
    
    # Update position prices
    update_position_prices(db, portfolio_id)
    
    # Get the updated portfolio
    updated_portfolio = get_portfolio(db, portfolio_id=portfolio_id)
    return updated_portfolio.to_dict()

@router.put("/{portfolio_id}", response_model=PortfolioResponse)
def update_portfolio_details(
    portfolio_data: PortfolioUpdate,
    portfolio_id: int = Path(..., description="The ID of the portfolio to update"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a portfolio."""
    portfolio = get_portfolio(db, portfolio_id=portfolio_id)
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Check if user owns the portfolio
    if portfolio.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this portfolio"
        )
    
    # Update portfolio
    updated_portfolio = update_portfolio(db, portfolio_id=portfolio_id, portfolio_data=portfolio_data.dict(exclude_unset=True))
    return updated_portfolio.to_dict()

@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_portfolio_endpoint(
    portfolio_id: int = Path(..., description="The ID of the portfolio to delete"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a portfolio."""
    portfolio = get_portfolio(db, portfolio_id=portfolio_id)
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Check if user owns the portfolio
    if portfolio.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this portfolio"
        )
    
    # Delete portfolio
    delete_portfolio(db, portfolio_id=portfolio_id)
    return None

@router.post("/{portfolio_id}/positions", response_model=PositionResponse, status_code=status.HTTP_201_CREATED)
def create_new_position(
    position_data: PositionCreate,
    portfolio_id: int = Path(..., description="The ID of the portfolio"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new position in a portfolio."""
    portfolio = get_portfolio(db, portfolio_id=portfolio_id)
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Check if user owns the portfolio
    if portfolio.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this portfolio"
        )
    
    # Check if portfolio is active
    if not portfolio.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add positions to an inactive portfolio"
        )
    
    # Calculate position value
    position_value = position_data.quantity * position_data.average_entry_price
    
    # Check if there's enough cash in the portfolio
    if portfolio.cash_balance < position_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough cash in portfolio. Required: ${position_value:.2f}, Available: ${portfolio.cash_balance:.2f}"
        )
    
    # Create position
    position = create_position(db, portfolio_id=portfolio_id, position_data=position_data.dict())
    
    # Create a corresponding "buy" trade
    trade_data = {
        "symbol": position_data.symbol,
        "trade_type": TradeType.BUY,
        "quantity": position_data.quantity,
        "price": position_data.average_entry_price,
        "commission": 0.0,  # Assuming no commission for paper trading
        "strategy_id": position_data.strategy_id,
        "status": TradeStatus.FILLED,
        "executed_at": datetime.now()
    }
    
    create_trade(db, portfolio_id=portfolio_id, user_id=current_user.id, trade_data=trade_data)
    
    return position.to_dict()

@router.post("/{portfolio_id}/positions/{position_id}/close", response_model=PositionResponse)
def close_position_endpoint(
    price: float = Query(..., description="Closing price per share"),
    portfolio_id: int = Path(..., description="The ID of the portfolio"),
    position_id: int = Path(..., description="The ID of the position to close"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Close an existing position."""
    portfolio = get_portfolio(db, portfolio_id=portfolio_id)
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Check if user owns the portfolio
    if portfolio.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this portfolio"
        )
    
    # Close position
    closed_position = close_position(db, position_id=position_id, close_price=price)
    
    if not closed_position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Position not found or already closed"
        )
    
    # Create a corresponding "sell" trade
    trade_data = {
        "symbol": closed_position.symbol,
        "trade_type": TradeType.SELL,
        "quantity": closed_position.quantity,
        "price": price,
        "commission": 0.0,  # Assuming no commission for paper trading
        "strategy_id": closed_position.strategy_id,
        "status": TradeStatus.FILLED,
        "executed_at": datetime.now(),
        "realized_pnl": closed_position.unrealized_pnl,
        "realized_pnl_pct": closed_position.unrealized_pnl_pct
    }
    
    create_trade(db, portfolio_id=portfolio_id, user_id=current_user.id, trade_data=trade_data)
    
    return closed_position.to_dict()

@router.get("/{portfolio_id}/positions", response_model=List[PositionResponse])
def read_positions(
    portfolio_id: int = Path(..., description="The ID of the portfolio"),
    open_only: bool = Query(True, description="Only show open positions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all positions for a portfolio."""
    portfolio = get_portfolio(db, portfolio_id=portfolio_id)
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Check if user owns the portfolio
    if portfolio.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this portfolio"
        )
    
    # Update position prices
    update_position_prices(db, portfolio_id)
    
    # Get the updated portfolio
    updated_portfolio = get_portfolio(db, portfolio_id=portfolio_id)
    
    # Filter positions if needed
    positions = [p for p in updated_portfolio.positions if not open_only or p.is_open]
    
    return [position.to_dict() for position in positions]

@router.get("/{portfolio_id}/trades", response_model=List[TradeResponse])
def read_trades(
    portfolio_id: int = Path(..., description="The ID of the portfolio"),
    symbol: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get trades for a portfolio."""
    portfolio = get_portfolio(db, portfolio_id=portfolio_id)
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Check if user owns the portfolio
    if portfolio.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this portfolio"
        )
    
    # Query trades
    query = db.query(Trade).filter(Trade.portfolio_id == portfolio_id)
    
    if symbol:
        query = query.filter(Trade.symbol == symbol)
    
    trades = query.order_by(Trade.executed_at.desc()).offset(skip).limit(limit).all()
    
    return [trade.to_dict() for trade in trades]