# backend/data/connectors/alpaca.py
"""
Alpaca API connector for trading and market data.

This module provides functions to interact with the Alpaca API for:
1. Market data retrieval (historical and real-time)
2. Paper trading operations
3. Live trading operations (when enabled)
4. Account and position management
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple, Union

import pandas as pd
import alpaca_trade_api as tradeapi
from alpaca_trade_api.rest import REST, TimeFrame

from backend.config import settings
from backend.utils.logging import get_logger

logger = get_logger(__name__)

# Initialize Alpaca API client
try:
    api = REST(
        key_id=settings.ALPACA_API_KEY,
        secret_key=settings.ALPACA_API_SECRET,
        base_url=settings.ALPACA_API_BASE_URL
    )
    logger.info(f"Alpaca API initialized with base URL: {settings.ALPACA_API_BASE_URL}")
except Exception as e:
    logger.error(f"Failed to initialize Alpaca API: {str(e)}")
    api = None

def is_connected() -> bool:
    """
    Check if Alpaca API connection is working.
    
    Returns:
        True if connection is working, False otherwise
    """
    if not api:
        return False
    
    try:
        api.get_account()
        return True
    except Exception as e:
        logger.error(f"Alpaca API connection check failed: {str(e)}")
        return False

def get_historical_data(
    symbol: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    timeframe: str = "1Day",
    limit: int = 1000
) -> pd.DataFrame:
    """
    Get historical market data from Alpaca.
    
    Args:
        symbol: Stock ticker symbol
        start_date: Start date for historical data
        end_date: End date for historical data
        timeframe: Data timeframe (e.g. "1Day", "1Hour", "1Min")
        limit: Maximum number of bars to return
        
    Returns:
        DataFrame with historical price data
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return pd.DataFrame()
    
    try:
        # Set default dates if not provided
        if end_date is None:
            end_date = datetime.now()
        
        if start_date is None:
            start_date = end_date - timedelta(days=365)
        
        # Map timeframe string to Alpaca TimeFrame
        timeframe_map = {
            "1Day": TimeFrame.Day,
            "1Hour": TimeFrame.Hour,
            "1Min": TimeFrame.Minute
        }
        tf = timeframe_map.get(timeframe, TimeFrame.Day)
        
        # Get historical data from Alpaca
        bars = api.get_bars(
            symbol,
            tf,
            start=start_date.isoformat(),
            end=end_date.isoformat(),
            limit=limit
        ).df
        
        # Handle empty result
        if bars.empty:
            logger.warning(f"No data returned for symbol {symbol}")
            return pd.DataFrame()
        
        # Ensure column names are lowercase for consistency
        bars.columns = [col.lower() for col in bars.columns]
        
        # Add symbol column
        bars['symbol'] = symbol
        
        return bars
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca data for {symbol}: {str(e)}")
        return pd.DataFrame()

def get_multiple_symbols_data(
    symbols: List[str],
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    timeframe: str = "1Day"
) -> Dict[str, pd.DataFrame]:
    """
    Get historical data for multiple symbols.
    
    Args:
        symbols: List of stock ticker symbols
        start_date: Start date for historical data
        end_date: End date for historical data
        timeframe: Data timeframe (e.g. "1Day", "1Hour", "1Min")
        
    Returns:
        Dictionary mapping symbols to their respective DataFrames
    """
    result = {}
    
    for symbol in symbols:
        data = get_historical_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            timeframe=timeframe
        )
        
        if not data.empty:
            result[symbol] = data
    
    return result

def get_latest_quote(symbol: str) -> Dict[str, Any]:
    """
    Get the latest quote for a symbol.
    
    Args:
        symbol: Stock ticker symbol
        
    Returns:
        Dictionary with latest quote information
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return {"symbol": symbol, "error": "API not initialized"}
    
    try:
        # Get last trade
        last_trade = api.get_latest_trade(symbol)
        
        # Get last quote
        last_quote = api.get_latest_quote(symbol)
        
        # Construct response
        return {
            "symbol": symbol,
            "price": last_trade.price,
            "timestamp": last_trade.timestamp.isoformat(),
            "size": last_trade.size,
            "bid": last_quote.bp,
            "ask": last_quote.ap,
            "bid_size": last_quote.bs,
            "ask_size": last_quote.as,
            "spread": last_quote.ap - last_quote.bp
        }
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca quote for {symbol}: {str(e)}")
        return {"symbol": symbol, "error": str(e)}

def get_account_info() -> Dict[str, Any]:
    """
    Get account information from Alpaca.
    
    Returns:
        Dictionary with account information
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return {"error": "API not initialized"}
    
    try:
        account = api.get_account()
        
        return {
            "id": account.id,
            "status": account.status,
            "currency": account.currency,
            "buying_power": float(account.buying_power),
            "cash": float(account.cash),
            "portfolio_value": float(account.portfolio_value),
            "equity": float(account.equity),
            "last_equity": float(account.last_equity),
            "long_market_value": float(account.long_market_value),
            "short_market_value": float(account.short_market_value),
            "initial_margin": float(account.initial_margin),
            "maintenance_margin": float(account.maintenance_margin),
            "daytrade_count": account.daytrade_count,
            "last_maintenance_margin": float(account.last_maintenance_margin),
            "pattern_day_trader": account.pattern_day_trader,
            "trading_blocked": account.trading_blocked,
            "transfers_blocked": account.transfers_blocked,
            "account_blocked": account.account_blocked,
            "created_at": account.created_at.isoformat(),
            "trade_suspended_by_user": account.trade_suspended_by_user,
            "multiplier": float(account.multiplier),
            "shorting_enabled": account.shorting_enabled,
            "equity_change_today": float(account.equity) - float(account.last_equity),
            "equity_change_pct": (float(account.equity) / float(account.last_equity) - 1) if float(account.last_equity) > 0 else 0
        }
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca account info: {str(e)}")
        return {"error": str(e)}

def get_positions() -> List[Dict[str, Any]]:
    """
    Get current positions from Alpaca.
    
    Returns:
        List of position dictionaries
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return []
    
    try:
        positions = api.list_positions()
        
        result = []
        for position in positions:
            result.append({
                "symbol": position.symbol,
                "quantity": float(position.qty),
                "side": "long" if float(position.qty) > 0 else "short",
                "avg_entry_price": float(position.avg_entry_price),
                "market_value": float(position.market_value),
                "cost_basis": float(position.cost_basis),
                "unrealized_pl": float(position.unrealized_pl),
                "unrealized_plpc": float(position.unrealized_plpc),
                "current_price": float(position.current_price),
                "lastday_price": float(position.lastday_price),
                "change_today": float(position.change_today)
            })
        
        return result
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca positions: {str(e)}")
        return []

def get_position(symbol: str) -> Optional[Dict[str, Any]]:
    """
    Get position for a specific symbol.
    
    Args:
        symbol: Stock ticker symbol
        
    Returns:
        Position dictionary or None if not found
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return None
    
    try:
        position = api.get_position(symbol)
        
        return {
            "symbol": position.symbol,
            "quantity": float(position.qty),
            "side": "long" if float(position.qty) > 0 else "short",
            "avg_entry_price": float(position.avg_entry_price),
            "market_value": float(position.market_value),
            "cost_basis": float(position.cost_basis),
            "unrealized_pl": float(position.unrealized_pl),
            "unrealized_plpc": float(position.unrealized_plpc),
            "current_price": float(position.current_price),
            "lastday_price": float(position.lastday_price),
            "change_today": float(position.change_today)
        }
    
    except Exception as e:
        logger.debug(f"No Alpaca position found for {symbol}: {str(e)}")
        return None

def submit_order(
    symbol: str,
    qty: float,
    side: str,
    type: str = "market",
    time_in_force: str = "day",
    limit_price: Optional[float] = None,
    stop_price: Optional[float] = None,
    client_order_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Submit an order to Alpaca.
    
    Args:
        symbol: Stock ticker symbol
        qty: Quantity of shares
        side: Order side ('buy' or 'sell')
        type: Order type ('market', 'limit', 'stop', 'stop_limit')
        time_in_force: Time in force ('day', 'gtc', 'ioc', 'fok')
        limit_price: Limit price for limit orders
        stop_price: Stop price for stop orders
        client_order_id: Client order ID for tracking
        
    Returns:
        Dictionary with order information
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return {"error": "API not initialized"}
    
    if not settings.ENABLE_PAPER_TRADING and not settings.ENABLE_LIVE_TRADING:
        logger.error("Trading is disabled in configuration")
        return {"error": "Trading is disabled"}
    
    try:
        # Submit order
        order = api.submit_order(
            symbol=symbol,
            qty=qty,
            side=side,
            type=type,
            time_in_force=time_in_force,
            limit_price=limit_price,
            stop_price=stop_price,
            client_order_id=client_order_id
        )
        
        return {
            "id": order.id,
            "client_order_id": order.client_order_id,
            "symbol": order.symbol,
            "side": order.side,
            "type": order.type,
            "time_in_force": order.time_in_force,
            "limit_price": order.limit_price,
            "stop_price": order.stop_price,
            "filled_qty": order.filled_qty,
            "status": order.status,
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat() if order.updated_at else None
        }
    
    except Exception as e:
        logger.error(f"Error submitting Alpaca order: {str(e)}")
        return {"error": str(e)}

def get_orders(status: str = "open") -> List[Dict[str, Any]]:
    """
    Get orders from Alpaca.
    
    Args:
        status: Order status ('open', 'closed', 'all')
        
    Returns:
        List of order dictionaries
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return []
    
    try:
        # Get orders
        if status == "open":
            orders = api.list_orders(status="open")
        elif status == "closed":
            orders = api.list_orders(status="closed")
        else:
            orders = api.list_orders()
        
        result = []
        for order in orders:
            result.append({
                "id": order.id,
                "client_order_id": order.client_order_id,
                "symbol": order.symbol,
                "side": order.side,
                "type": order.type,
                "time_in_force": order.time_in_force,
                "limit_price": order.limit_price,
                "stop_price": order.stop_price,
                "filled_qty": order.filled_qty,
                "status": order.status,
                "created_at": order.created_at.isoformat(),
                "updated_at": order.updated_at.isoformat() if order.updated_at else None
            })
        
        return result
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca orders: {str(e)}")
        return []

def cancel_order(order_id: str) -> bool:
    """
    Cancel an order by ID.
    
    Args:
        order_id: Order ID
        
    Returns:
        True if successful, False otherwise
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return False
    
    try:
        api.cancel_order(order_id)
        return True
    
    except Exception as e:
        logger.error(f"Error canceling Alpaca order: {str(e)}")
        return False

def cancel_all_orders() -> bool:
    """
    Cancel all open orders.
    
    Returns:
        True if successful, False otherwise
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return False
    
    try:
        api.cancel_all_orders()
        return True
    
    except Exception as e:
        logger.error(f"Error canceling all Alpaca orders: {str(e)}")
        return False

def get_clock() -> Dict[str, Any]:
    """
    Get current market clock.
    
    Returns:
        Dictionary with market clock information
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return {"error": "API not initialized"}
    
    try:
        clock = api.get_clock()
        
        return {
            "timestamp": clock.timestamp.isoformat(),
            "is_open": clock.is_open,
            "next_open": clock.next_open.isoformat(),
            "next_close": clock.next_close.isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca clock: {str(e)}")
        return {"error": str(e)}

def get_calendar(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """
    Get market calendar.
    
    Args:
        start_date: Start date for calendar
        end_date: End date for calendar
        
    Returns:
        List of trading day dictionaries
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return []
    
    try:
        # Set default dates if not provided
        if start_date is None:
            start_date = datetime.now().date()
        
        if end_date is None:
            end_date = start_date + timedelta(days=7)
        
        # Get calendar
        calendar = api.get_calendar(start=start_date.isoformat(), end=end_date.isoformat())
        
        result = []
        for day in calendar:
            result.append({
                "date": day.date.isoformat(),
                "open": day.open.isoformat(),
                "close": day.close.isoformat(),
                "session_open": day.session_open.isoformat(),
                "session_close": day.session_close.isoformat()
            })
        
        return result
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca calendar: {str(e)}")
        return []

def get_assets(asset_class: str = "us_equity", status: str = "active") -> List[Dict[str, Any]]:
    """
    Get available trading assets.
    
    Args:
        asset_class: Asset class ('us_equity', 'crypto')
        status: Asset status ('active', 'inactive')
        
    Returns:
        List of asset dictionaries
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return []
    
    try:
        # Get assets
        assets = api.list_assets(status=status, asset_class=asset_class)
        
        result = []
        for asset in assets:
            result.append({
                "id": asset.id,
                "symbol": asset.symbol,
                "name": asset.name,
                "asset_class": asset.asset_class,
                "exchange": asset.exchange,
                "status": asset.status,
                "tradable": asset.tradable,
                "marginable": asset.marginable,
                "shortable": asset.shortable,
                "easy_to_borrow": asset.easy_to_borrow,
                "fractionable": asset.fractionable
            })
        
        return result
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca assets: {str(e)}")
        return []

def get_trades(
    symbol: str,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Get historical trades for a symbol.
    
    Args:
        symbol: Stock ticker symbol
        start: Start time
        end: End time
        limit: Maximum number of trades to return
        
    Returns:
        List of trade dictionaries
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return []
    
    try:
        # Set default times if not provided
        if end is None:
            end = datetime.now()
        
        if start is None:
            start = end - timedelta(minutes=15)
        
        # Get trades
        trades = api.get_trades(
            symbol=symbol,
            start=start.isoformat(),
            end=end.isoformat(),
            limit=limit
        ).df
        
        if trades.empty:
            return []
        
        # Convert DataFrame to list of dictionaries
        trades_list = []
        for index, row in trades.iterrows():
            trades_list.append({
                "timestamp": index.isoformat(),
                "price": row["price"],
                "size": row["size"],
                "exchange": row["exchange"],
                "trade_id": row["trade_id"],
                "tape": row["tape"] if "tape" in row else None
            })
        
        return trades_list
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca trades for {symbol}: {str(e)}")
        return []

def get_market_snapshot(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Get market snapshot for multiple symbols.
    
    Args:
        symbols: List of stock ticker symbols
        
    Returns:
        Dictionary mapping symbols to their snapshot data
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return {}
    
    try:
        # Get snapshots
        snapshots = api.get_snapshots(symbols)
        
        result = {}
        for symbol, snapshot in snapshots.items():
            if snapshot:
                result[symbol] = {
                    "latest_trade": {
                        "price": snapshot.latest_trade.price,
                        "size": snapshot.latest_trade.size,
                        "timestamp": snapshot.latest_trade.timestamp.isoformat(),
                        "exchange": snapshot.latest_trade.exchange
                    } if snapshot.latest_trade else None,
                    "latest_quote": {
                        "ask_price": snapshot.latest_quote.ap,
                        "ask_size": snapshot.latest_quote.as,
                        "bid_price": snapshot.latest_quote.bp,
                        "bid_size": snapshot.latest_quote.bs,
                        "timestamp": snapshot.latest_quote.timestamp.isoformat()
                    } if snapshot.latest_quote else None,
                    "minute_bar": {
                        "open": snapshot.minute_bar.open,
                        "high": snapshot.minute_bar.high,
                        "low": snapshot.minute_bar.low,
                        "close": snapshot.minute_bar.close,
                        "volume": snapshot.minute_bar.volume,
                        "timestamp": snapshot.minute_bar.timestamp.isoformat()
                    } if snapshot.minute_bar else None,
                    "daily_bar": {
                        "open": snapshot.daily_bar.open,
                        "high": snapshot.daily_bar.high,
                        "low": snapshot.daily_bar.low,
                        "close": snapshot.daily_bar.close,
                        "volume": snapshot.daily_bar.volume,
                        "timestamp": snapshot.daily_bar.timestamp.isoformat()
                    } if snapshot.daily_bar else None
                }
        
        return result
    
    except Exception as e:
        logger.error(f"Error fetching Alpaca market snapshot: {str(e)}")
        return {}

def close_position(symbol: str) -> Dict[str, Any]:
    """
    Close a position for a symbol.
    
    Args:
        symbol: Stock ticker symbol
        
    Returns:
        Dictionary with result information
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return {"error": "API not initialized"}
    
    if not settings.ENABLE_PAPER_TRADING and not settings.ENABLE_LIVE_TRADING:
        logger.error("Trading is disabled in configuration")
        return {"error": "Trading is disabled"}
    
    try:
        # Close position
        response = api.close_position(symbol)
        
        return {
            "symbol": response.symbol,
            "qty": response.qty,
            "side": response.side,
            "position_value": response.position_value,
            "order_id": response.order_id,
            "status": "closed"
        }
    
    except Exception as e:
        logger.error(f"Error closing Alpaca position for {symbol}: {str(e)}")
        return {"error": str(e)}

def close_all_positions() -> List[Dict[str, Any]]:
    """
    Close all open positions.
    
    Returns:
        List of closed position dictionaries
    """
    if not api:
        logger.error("Alpaca API not initialized")
        return [{"error": "API not initialized"}]
    
    if not settings.ENABLE_PAPER_TRADING and not settings.ENABLE_LIVE_TRADING:
        logger.error("Trading is disabled in configuration")
        return [{"error": "Trading is disabled"}]
    
    try:
        # Close all positions
        responses = api.close_all_positions()
        
        result = []
        for response in responses:
            result.append({
                "symbol": response.symbol,
                "qty": response.qty,
                "side": response.side,
                "position_value": response.position_value,
                "order_id": response.order_id,
                "status": "closed"
            })
        
        return result
    
    except Exception as e:
        logger.error(f"Error closing all Alpaca positions: {str(e)}")
        return [{"error": str(e)}]