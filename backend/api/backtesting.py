# backend/api/backtesting.py
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.models import get_db
from backend.models.user import User
from backend.models.backtest import Backtest
from backend.api.auth import get_current_active_user
from backend.services.backtest_service import (
    create_backtest,
    run_backtest,
    get_backtest,
    get_backtests,
    delete_backtest
)

router = APIRouter(prefix="/backtesting")

# Pydantic models
class BacktestBase(BaseModel):
    strategy_id: int
    start_date: datetime
    end_date: datetime
    symbols: List[str]
    initial_capital: float = 10000.0

class BacktestCreate(BacktestBase):
    @validator('symbols')
    def validate_symbols(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one symbol is required")
        return v

    @validator('initial_capital')
    def validate_initial_capital(cls, v):
        if v <= 0:
            raise ValueError("Initial capital must be greater than 0")
        return v

    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and values['start_date'] > v:
            raise ValueError("End date must be after start date")
        return v

class BacktestResponse(BaseModel):
    id: int
    user_id: int
    strategy_id: int
    start_date: datetime
    end_date: datetime
    symbols: List[str]
    initial_capital: float
    status: str
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None
    annualized_return: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    win_rate: Optional[float] = None
    total_trades: Optional[int] = None
    final_equity: Optional[float] = None
    created_at: datetime
    results: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True

# API endpoints
@router.post("/", response_model=BacktestResponse, status_code=status.HTTP_201_CREATED)
def create_new_backtest(
    backtest_data: BacktestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create and run a new backtest."""
    # Create the backtest
    backtest = create_backtest(db, user_id=current_user.id, strategy_id=backtest_data.strategy_id, backtest_data=backtest_data.dict())
    
    # Run the backtest asynchronously (in a real-world application, this would be done in a background task)
    try:
        backtest = run_backtest(db, backtest_id=backtest.id)
    except Exception as e:
        # If backtest fails, update the status and error message
        backtest.status = "failed"
        backtest.error_message = str(e)
        db.commit()
        db.refresh(backtest)
    
    return backtest

@router.get("/", response_model=List[BacktestResponse])
def read_backtests(
    strategy_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all backtests for the current user."""
    backtests = get_backtests(db, user_id=current_user.id, strategy_id=strategy_id, skip=skip, limit=limit)
    return backtests

@router.get("/{backtest_id}", response_model=BacktestResponse)
def read_backtest(
    backtest_id: int = Path(..., description="The ID of the backtest to get"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific backtest by ID."""
    backtest = get_backtest(db, backtest_id=backtest_id)
    
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )
    
    # Check if user owns the backtest
    if backtest.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this backtest"
        )
    
    return backtest

@router.delete("/{backtest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_backtest_endpoint(
    backtest_id: int = Path(..., description="The ID of the backtest to delete"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a backtest."""
    backtest = get_backtest(db, backtest_id=backtest_id)
    
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )
    
    # Check if user owns the backtest
    if backtest.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this backtest"
        )
    
    # Delete backtest
    delete_backtest(db, backtest_id=backtest_id)
    return None