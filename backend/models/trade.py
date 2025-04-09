# backend/models/trade.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from backend.models import Base

class TradeType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"
    SHORT = "short"
    COVER = "cover"

class TradeStatus(str, enum.Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELED = "canceled"
    REJECTED = "rejected"
    PARTIAL = "partial"

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False)
    trade_type = Column(Enum(TradeType), nullable=False)
    quantity = Column(Float, nullable=False)
    
    # Trade execution details
    price = Column(Float)
    total_amount = Column(Float)
    commission = Column(Float, default=0.0)
    
    # Trade status
    status = Column(Enum(TradeStatus), default=TradeStatus.PENDING)
    executed_at = Column(DateTime(timezone=True))
    
    # Trade results (for closed positions)
    realized_pnl = Column(Float)
    realized_pnl_pct = Column(Float)
    
    # Trade metadata
    notes = Column(String)
    order_id = Column(String)  # Reference to external broker order ID
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="trades")
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"))
    portfolio = relationship("Portfolio", back_populates="trades")
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    strategy = relationship("Strategy")
    
    def to_dict(self):
        return {
            "id": self.id,
            "symbol": self.symbol,
            "trade_type": self.trade_type,
            "quantity": self.quantity,
            "price": self.price,
            "total_amount": self.total_amount,
            "commission": self.commission,
            "status": self.status,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "realized_pnl": self.realized_pnl,
            "realized_pnl_pct": self.realized_pnl_pct,
            "notes": self.notes,
            "order_id": self.order_id,
            "user_id": self.user_id,
            "portfolio_id": self.portfolio_id,
            "strategy_id": self.strategy_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }