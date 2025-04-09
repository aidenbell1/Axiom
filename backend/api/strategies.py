# backend/api/strategies.py
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.models import get_db
from backend.models.user import User
from backend.models.strategy import Strategy
from backend.api.auth import get_current_active_user
from backend.services.strategy_service import create_strategy, update_strategy, delete_strategy, get_strategy, get_strategies
from backend.algorithms.mean_reversion import MeanReversionStrategy
from backend.algorithms.trend_following import TrendFollowingStrategy

router = APIRouter(prefix="/strategies")

# Pydantic models for API
class StrategyBase(BaseModel):
    name: str
    description: Optional[str] = None
    algorithm_type: str
    parameters: Dict[str, Any]
    is_public: bool = False

class StrategyCreate(StrategyBase):
    pass

class StrategyUpdate(StrategyBase):
    name: Optional[str] = None
    algorithm_type: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class StrategyResponse(StrategyBase):
    id: int
    user_id: int
    created_at: str
    updated_at: Optional[str] = None
    performance: Optional[Dict[str, float]] = None

    class Config:
        orm_mode = True

# API endpoints
@router.post("/", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
def create_new_strategy(
    strategy_data: StrategyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Validate algorithm type
    valid_algorithms = ["mean_reversion", "trend_following", "ml_lstm", "random_forest"]
    if strategy_data.algorithm_type not in valid_algorithms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid algorithm type. Must be one of: {', '.join(valid_algorithms)}"
        )
    
    # Validate algorithm parameters
    try:
        if strategy_data.algorithm_type == "mean_reversion":
            MeanReversionStrategy(parameters=strategy_data.parameters)
        elif strategy_data.algorithm_type == "trend_following":
            TrendFollowingStrategy(parameters=strategy_data.parameters)
        # Add validation for other algorithm types as needed
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Create strategy
    strategy = create_strategy(db, strategy_data.dict(), current_user.id)
    return strategy.to_dict()

@router.get("/", response_model=List[StrategyResponse])
def read_strategies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    strategies = get_strategies(db, user_id=current_user.id, skip=skip, limit=limit)
    return [strategy.to_dict() for strategy in strategies]

@router.get("/public", response_model=List[StrategyResponse])
def read_public_strategies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    strategies = get_strategies(db, is_public=True, skip=skip, limit=limit)
    return [strategy.to_dict() for strategy in strategies]

@router.get("/{strategy_id}", response_model=StrategyResponse)
def read_strategy(
    strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    strategy = get_strategy(db, strategy_id=strategy_id)
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found"
        )
    
    # Check if user owns the strategy or if it's public
    if strategy.user_id != current_user.id and not strategy.is_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this strategy"
        )
    
    return strategy.to_dict()

@router.put("/{strategy_id}", response_model=StrategyResponse)
def update_existing_strategy(
    strategy_id: int,
    strategy_data: StrategyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    strategy = get_strategy(db, strategy_id=strategy_id)
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found"
        )
    
    # Check if user owns the strategy
    if strategy.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this strategy"
        )
    
    # Update strategy
    updated_strategy = update_strategy(db, strategy_id=strategy_id, strategy_data=strategy_data.dict(exclude_unset=True))
    return updated_strategy.to_dict()

@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_strategy(
    strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    strategy = get_strategy(db, strategy_id=strategy_id)
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found"
        )
    
    # Check if user owns the strategy
    if strategy.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this strategy"
        )
    
    # Delete strategy
    delete_strategy(db, strategy_id=strategy_id)
    return None