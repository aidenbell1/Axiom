# backend/services/market_data_service.py
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import pandas as pd

from backend.data.connectors.yahoo_finance import (
    get_historical_data,
    get_multiple_symbols_data,
    get_latest_quote,
    get_market_overview
)
from backend.data.cache import Cache, cached
from backend.utils.logging import get_logger

logger = get_logger(__name__)

@cached(ttl=60)  # Cache for 60 seconds
def get_symbol_quote(symbol: str) -> Dict[str, Any]:
    """
    Get the latest quote for a symbol.
    
    Args:
        symbol: Stock ticker symbol
        
    Returns:
        Dictionary with quote information
    """
    return get_latest_quote(symbol)

@cached(ttl=3600)  # Cache for 1 hour
def get_stock_historical_data(
    symbol: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    period: Optional[str] = None,
    interval: str = "1d"
) -> List[Dict[str, Any]]:
    """
    Get historical market data for a symbol.
    
    Args:
        symbol: Stock ticker symbol
        start_date: Start date for historical data
        end_date: End date for historical data
        period: Period of data (e.g. "1y", "6mo", "1d")
        interval: Data interval (e.g. "1d", "1h", "5m")
        
    Returns:
        List of dictionaries with historical price data
    """
    df = get_historical_data(
        symbol=symbol,
        start_date=start_date,
        end_date=end_date,
        period=period,
        interval=interval
    )
    
    if df.empty:
        return []
    
    # Convert DataFrame to list of dictionaries
    data = []
    for idx, row in df.iterrows():
        record = row.to_dict()
        record['date'] = idx.isoformat()
        data.append(record)
    
    return data

def get_multiple_stocks_data(
    symbols: List[str],
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    period: Optional[str] = None,
    interval: str = "1d"
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get historical data for multiple symbols.
    
    Args:
        symbols: List of stock ticker symbols
        start_date: Start date for historical data
        end_date: End date for historical data
        period: Period of data (e.g. "1y", "6mo", "1d")
        interval: Data interval (e.g. "1d", "1h", "5m")
        
    Returns:
        Dictionary mapping symbols to their respective historical data
    """
    results = {}
    
    for symbol in symbols:
        data = get_stock_historical_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            period=period,
            interval=interval
        )
        
        if data:
            results[symbol] = data
    
    return results

@cached(ttl=300)  # Cache for 5 minutes
def get_market_indices() -> Dict[str, Any]:
    """
    Get an overview of the market's major indices.
    
    Returns:
        Dictionary with major index data
    """
    return get_market_overview()

def search_symbols(query: str) -> List[Dict[str, str]]:
    """
    Search for symbols matching the query.
    
    Args:
        query: Search query
        
    Returns:
        List of matching symbols with names
    """
    # This is a simple implementation that returns a few hardcoded popular stocks
    # when their symbols or names match the query. In a production environment, 
    # you would connect to a proper symbol lookup API.
    popular_symbols = [
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corporation"},
        {"symbol": "AMZN", "name": "Amazon.com Inc."},
        {"symbol": "GOOGL", "name": "Alphabet Inc. (Google)"},
        {"symbol": "META", "name": "Meta Platforms Inc. (Facebook)"},
        {"symbol": "TSLA", "name": "Tesla Inc."},
        {"symbol": "NVDA", "name": "NVIDIA Corporation"},
        {"symbol": "JPM", "name": "JPMorgan Chase & Co."},
        {"symbol": "V", "name": "Visa Inc."},
        {"symbol": "JNJ", "name": "Johnson & Johnson"},
        {"symbol": "WMT", "name": "Walmart Inc."},
        {"symbol": "MA", "name": "Mastercard Incorporated"},
        {"symbol": "PG", "name": "Procter & Gamble Co."},
        {"symbol": "DIS", "name": "The Walt Disney Company"},
        {"symbol": "BAC", "name": "Bank of America Corporation"},
        {"symbol": "NFLX", "name": "Netflix Inc."},
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust"},
        {"symbol": "QQQ", "name": "Invesco QQQ Trust (NASDAQ-100 Index)"},
        {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF"},
        {"symbol": "VOO", "name": "Vanguard S&P 500 ETF"}
    ]
    
    # Filter symbols based on query
    query = query.lower()
    matching_symbols = [
        symbol for symbol in popular_symbols 
        if query in symbol["symbol"].lower() or query in symbol["name"].lower()
    ]
    
    return matching_symbols[:10]  # Return at most 10 results

def get_symbol_info(symbol: str) -> Dict[str, Any]:
    """
    Get detailed information about a symbol.
    
    Args:
        symbol: Stock ticker symbol
        
    Returns:
        Dictionary with symbol information
    """
    # This is a placeholder implementation. In a production environment,
    # you would fetch this information from a proper API.
    popular_symbols = {
        "AAPL": {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "sector": "Technology",
            "industry": "Consumer Electronics",
            "exchange": "NASDAQ",
            "currency": "USD",
            "country": "United States",
            "website": "https://www.apple.com",
            "description": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide."
        },
        "MSFT": {
            "symbol": "MSFT",
            "name": "Microsoft Corporation",
            "sector": "Technology",
            "industry": "Software—Infrastructure",
            "exchange": "NASDAQ",
            "currency": "USD",
            "country": "United States",
            "website": "https://www.microsoft.com",
            "description": "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide."
        },
        # Add more symbols as needed
    }
    
    # Return symbol info if available, otherwise a basic response
    return popular_symbols.get(symbol, {
        "symbol": symbol,
        "name": f"{symbol} Inc.",
        "sector": "Unknown",
        "industry": "Unknown",
        "exchange": "Unknown",
        "currency": "USD",
        "country": "Unknown",
        "description": f"Information for {symbol} is not available."
    })

def clear_market_data_cache() -> bool:
    """
    Clear market data cache.
    
    Returns:
        True if successful, False otherwise
    """
    return Cache.clear_pattern("cache:get_*")