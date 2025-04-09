# backend/data/connectors/yahoo_finance.py
import logging
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

def get_historical_data(
    symbol: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    period: str = None,
    interval: str = "1d"
) -> pd.DataFrame:
    """
    Get historical market data from Yahoo Finance.
    
    Args:
        symbol: Stock ticker symbol
        start_date: Start date for historical data
        end_date: End date for historical data
        period: Period of data (e.g. "1y", "6mo", "1d")
        interval: Data interval (e.g. "1d", "1h", "5m")
        
    Returns:
        DataFrame with historical price data
    """
    try:
        # Use period if dates aren't provided
        if start_date is None and period:
            data = yf.download(symbol, period=period, interval=interval, progress=False)
        else:
            # Ensure we have dates if period isn't provided
            if start_date is None:
                start_date = datetime.now() - timedelta(days=365)
            if end_date is None:
                end_date = datetime.now()
                
            data = yf.download(
                symbol,
                start=start_date,
                end=end_date,
                interval=interval,
                progress=False
            )
        
        # Check if data is empty
        if data.empty:
            logger.warning(f"No data returned for symbol {symbol}")
            return pd.DataFrame()
        
        # Ensure column names are lowercase for consistency
        data.columns = [col.lower() for col in data.columns]
        
        # Make sure index is datetime
        if not isinstance(data.index, pd.DatetimeIndex):
            data.index = pd.to_datetime(data.index)
        
        # Calculate additional fields that might be useful
        data['returns'] = data['close'].pct_change()
        
        return data
    
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {str(e)}")
        return pd.DataFrame()

def get_multiple_symbols_data(
    symbols: List[str],
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    period: str = None,
    interval: str = "1d"
) -> Dict[str, pd.DataFrame]:
    """
    Get historical data for multiple symbols.
    
    Args:
        symbols: List of stock ticker symbols
        start_date: Start date for historical data
        end_date: End date for historical data
        period: Period of data (e.g. "1y", "6mo", "1d")
        interval: Data interval (e.g. "1d", "1h", "5m")
        
    Returns:
        Dictionary mapping symbols to their respective DataFrames
    """
    results = {}
    
    for symbol in symbols:
        data = get_historical_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            period=period,
            interval=interval
        )
        
        if not data.empty:
            results[symbol] = data
    
    return results

def get_latest_quote(symbol: str) -> Dict[str, Any]:
    """
    Get the latest quote for a symbol.
    
    Args:
        symbol: Stock ticker symbol
        
    Returns:
        Dictionary with latest quote information
    """
    try:
        ticker = yf.Ticker(symbol)
        quote = ticker.info
        
        # Create a simplified quote with key information
        simplified_quote = {
            'symbol': symbol,
            'price': quote.get('regularMarketPrice', None),
            'change': quote.get('regularMarketChange', None),
            'change_percent': quote.get('regularMarketChangePercent', None),
            'volume': quote.get('regularMarketVolume', None),
            'market_cap': quote.get('marketCap', None),
            'high': quote.get('regularMarketDayHigh', None),
            'low': quote.get('regularMarketDayLow', None),
            'open': quote.get('regularMarketOpen', None),
            'prev_close': quote.get('regularMarketPreviousClose', None),
            'timestamp': datetime.now().isoformat()
        }
        
        return simplified_quote
    
    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {str(e)}")
        return {'symbol': symbol, 'error': str(e)}

def get_market_overview() -> Dict[str, Any]:
    """
    Get an overview of the market's major indices.
    
    Returns:
        Dictionary with major index data
    """
    indices = {
        'S&P 500': '^GSPC',
        'Nasdaq': '^IXIC',
        'Dow Jones': '^DJI',
        'Russell 2000': '^RUT',
        'VIX': '^VIX'
    }
    
    results = {}
    
    for name, symbol in indices.items():
        quote = get_latest_quote(symbol)
        if 'error' not in quote:
            results[name] = quote
    
    return results