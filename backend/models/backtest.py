# backend/models/backtest.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from backend.models import Base

class BacktestStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class Backtest(Base):
    """Database model for backtests."""
    
    __tablename__ = "backtests"

    id = Column(Integer, primary_key=True, index=True)
    
    # Backtest parameters
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    symbols = Column(JSON, nullable=False)  # List of symbols
    initial_capital = Column(Float, nullable=False, default=10000.0)
    parameters = Column(JSON, nullable=False, default=dict)  # Strategy parameters
    
    # Backtest status
    status = Column(String, default=BacktestStatus.PENDING)
    error_message = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Backtest results
    results = Column(JSON)  # Full backtest results
    
    # Performance metrics
    annualized_return = Column(Float)
    sharpe_ratio = Column(Float)
    sortino_ratio = Column(Float)
    max_drawdown = Column(Float)
    win_rate = Column(Float)
    total_trades = Column(Integer)
    profit_factor = Column(Float)
    final_equity = Column(Float)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="backtests")
    strategy_id = Column(Integer, ForeignKey("strategies.id"))
    strategy = relationship("Strategy", back_populates="backtests")
    
    def to_dict(self):
        """Convert model to dictionary."""
        result = {
            "id": self.id,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "symbols": self.symbols,
            "initial_capital": self.initial_capital,
            "parameters": self.parameters,
            "status": self.status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "user_id": self.user_id,
            "strategy_id": self.strategy_id,
            "strategy": self.strategy.to_dict() if self.strategy else None,
        }
        
        # Include performance metrics if available
        if self.status == BacktestStatus.COMPLETED:
            result.update({
                "annualized_return": self.annualized_return,
                "sharpe_ratio": self.sharpe_ratio,
                "sortino_ratio": self.sortino_ratio,
                "max_drawdown": self.max_drawdown,
                "win_rate": self.win_rate,
                "total_trades": self.total_trades,
                "profit_factor": self.profit_factor,
                "final_equity": self.final_equity,
                "results": self.results
            })
        
        return result