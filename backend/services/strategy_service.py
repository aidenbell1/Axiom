# backend/services/strategy_service.py
from typing import Dict, Any, Optional, List

from sqlalchemy.orm import Session

from backend.models.strategy import Strategy

def create_strategy(db: Session, strategy_data: Dict[str, Any], user_id: int) -> Strategy:
    """
    Create a new strategy.
    
    Args:
        db: Database session
        strategy_data: Strategy data
        user_id: User ID
        
    Returns:
        Created strategy
    """
    # Create strategy
    new_strategy = Strategy(
        user_id=user_id,
        name=strategy_data["name"],
        description=strategy_data.get("description"),
        algorithm_type=strategy_data["algorithm_type"],
        parameters=strategy_data["parameters"],
        is_public=strategy_data.get("is_public", False),
        is_featured=False,
        price=strategy_data.get("price", 0.0),
    )
    
    db.add(new_strategy)
    db.commit()
    db.refresh(new_strategy)
    
    return new_strategy

def get_strategy(db: Session, strategy_id: int) -> Optional[Strategy]:
    """
    Get a strategy by ID.
    
    Args:
        db: Database session
        strategy_id: Strategy ID
        
    Returns:
        Strategy if found, None otherwise
    """
    return db.query(Strategy).filter(Strategy.id == strategy_id).first()

def get_strategies(
    db: Session,
    user_id: Optional[int] = None,
    is_public: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    algorithm_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Strategy]:
    """
    Get strategies with filters.
    
    Args:
        db: Database session
        user_id: Filter by user ID (optional)
        is_public: Filter by public status (optional)
        is_featured: Filter by featured status (optional)
        algorithm_type: Filter by algorithm type (optional)
        skip: Number of records to skip
        limit: Maximum number of records to return
        
    Returns:
        List of strategies
    """
    query = db.query(Strategy)
    
    if user_id is not None:
        query = query.filter(Strategy.user_id == user_id)
    
    if is_public is not None:
        query = query.filter(Strategy.is_public == is_public)
    
    if is_featured is not None:
        query = query.filter(Strategy.is_featured == is_featured)
    
    if algorithm_type is not None:
        query = query.filter(Strategy.algorithm_type == algorithm_type)
    
    return query.offset(skip).limit(limit).all()

def update_strategy(db: Session, strategy_id: int, strategy_data: Dict[str, Any]) -> Optional[Strategy]:
    """
    Update a strategy.
    
    Args:
        db: Database session
        strategy_id: Strategy ID
        strategy_data: Strategy data
        
    Returns:
        Updated strategy if successful, None otherwise
    """
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    
    if not strategy:
        return None
    
    # Update strategy fields
    for key, value in strategy_data.items():
        # Special handling for parameters to merge rather than replace
        if key == "parameters" and isinstance(value, dict) and isinstance(strategy.parameters, dict):
            strategy.parameters.update(value)
        else:
            setattr(strategy, key, value)
    
    db.commit()
    db.refresh(strategy)
    
    return strategy

def delete_strategy(db: Session, strategy_id: int) -> bool:
    """
    Delete a strategy.
    
    Args:
        db: Database session
        strategy_id: Strategy ID
        
    Returns:
        True if successful, False otherwise
    """
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    
    if not strategy:
        return False
    
    db.delete(strategy)
    db.commit()
    
    return True

def feature_strategy(db: Session, strategy_id: int, is_featured: bool = True) -> bool:
    """
    Set a strategy as featured.
    
    Args:
        db: Database session
        strategy_id: Strategy ID
        is_featured: Whether the strategy should be featured
        
    Returns:
        True if successful, False otherwise
    """
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    
    if not strategy:
        return False
    
    strategy.is_featured = is_featured
    db.commit()
    
    return True

def get_featured_strategies(db: Session, limit: int = 10) -> List[Strategy]:
    """
    Get featured strategies.
    
    Args:
        db: Database session
        limit: Maximum number of records to return
        
    Returns:
        List of featured strategies
    """
    return db.query(Strategy).filter(Strategy.is_featured == True).limit(limit).all()

def get_popular_strategies(db: Session, limit: int = 10) -> List[Strategy]:
    """
    Get popular strategies based on rating.
    
    Args:
        db: Database session
        limit: Maximum number of records to return
        
    Returns:
        List of popular strategies
    """
    return db.query(Strategy).filter(Strategy.is_public == True).order_by(Strategy.rating.desc()).limit(limit).all()

def update_strategy_performance(db: Session, strategy_id: int, performance_metrics: Dict[str, float]) -> bool:
    """
    Update strategy performance metrics.
    
    Args:
        db: Database session
        strategy_id: Strategy ID
        performance_metrics: Performance metrics
        
    Returns:
        True if successful, False otherwise
    """
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    
    if not strategy:
        return False
    
    # Update performance metrics
    for key, value in performance_metrics.items():
        if hasattr(strategy, key):
            setattr(strategy, key, value)
    
    db.commit()
    
    return True