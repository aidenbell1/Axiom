# backend/models/strategy.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.models import Base

class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    algorithm_type = Column(String, nullable=False)  # e.g., "mean_reversion", "trend_following", "ml_lstm"
    parameters = Column(JSON, nullable=False, default=dict)  # Store algorithm parameters as JSON
    
    # Strategy metadata
    is_public = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    price = Column(Float, default=0.0)  # For marketplace strategies
    rating = Column(Float, default=0.0)  # Average user rating
    
    # Performance statistics
    annualized_return = Column(Float)
    max_drawdown = Column(Float)
    sharpe_ratio = Column(Float)
    sortino_ratio = Column(Float)
    win_rate = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="strategies")
    backtests = relationship("Backtest", back_populates="strategy")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "algorithm_type": self.algorithm_type,
            "parameters": self.parameters,
            "is_public": self.is_public,
            "is_featured": self.is_featured,
            "price": self.price,
            "rating": self.rating,
            "performance": {
                "annualized_return": self.annualized_return,
                "max_drawdown": self.max_drawdown,
                "sharpe_ratio": self.sharpe_ratio,
                "sortino_ratio": self.sortino_ratio,
                "win_rate": self.win_rate
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user_id": self.user_id
        }