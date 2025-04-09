# backend/api/market_data.py
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend.data.connectors.yahoo_finance import (
    get_historical_data, 
    get_multiple_symbols_data,
    get_latest_quote,
    get_market_overview
)
from backend.api.auth import get_current_active_user
from backend.models.user import User

router = APIRouter(prefix="/market-data")

# Pydantic models
class HistoricalDataRequest(BaseModel):
    symbol: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    period: Optional[str] = None
    interval: str = "1d"

class HistoricalDataResponse(BaseModel):
    symbol: str
    data: List[Dict[str, Any]]

class QuoteResponse(BaseModel):
    symbol: str
    price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    volume: Optional[int] = None
    high: Optional[float] = None
    low: Optional[float] = None
    timestamp: str

# Endpoints
@router.get("/quote/{symbol}")
async def get_quote(
    symbol: str,
    current_user: User = Depends(get_current_active_user)
) -> QuoteResponse:
    """Get the latest quote for a symbol."""
    quote = get_latest_quote(symbol)
    
    if 'error' in quote:
        raise HTTPException(status_code=404, detail=f"Quote for {symbol} not found")
    
    return quote

@router.get("/quotes")
async def get_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, QuoteResponse]:
    """Get the latest quotes for multiple symbols."""
    symbol_list = [s.strip() for s in symbols.split(',')]
    quotes = {}
    
    for symbol in symbol_list:
        quote = get_latest_quote(symbol)
        if 'error' not in quote:
            quotes[symbol] = quote
    
    return quotes

@router.get("/market-overview")
async def get_overview(
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Get an overview of the market's major indices."""
    return get_market_overview()

@router.post("/historical-data")
async def get_historical(
    request: HistoricalDataRequest,
    current_user: User = Depends(get_current_active_user)
) -> HistoricalDataResponse:
    """Get historical market data for a symbol."""
    # Set default dates if not provided
    if not request.start_date and not request.period:
        request.start_date = datetime.now() - timedelta(days=365)
    
    if not request.end_date and not request.period:
        request.end_date = datetime.now()
    
    # Get historical data
    df = get_historical_data(
        symbol=request.symbol,
        start_date=request.start_date,
        end_date=request.end_date,
        period=request.period,
        interval=request.interval
    )
    
    if df.empty:
        raise HTTPException(status_code=404, detail=f"Historical data for {request.symbol} not found")
    
    # Convert DataFrame to list of records
    data = []
    for idx, row in df.iterrows():
        record = row.to_dict()
        record['date'] = idx.isoformat()
        data.append(record)
    
    return {
        "symbol": request.symbol,
        "data": data
    }

@router.get("/search")
async def search_symbols(
    query: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_active_user)
) -> List[Dict[str, str]]:
    """
    Search for symbols matching the query.
    
    This is a simple implementation that returns a few hardcoded popular stocks
    when their symbols or names match the query. In a production environment, 
    you would connect to a proper symbol lookup API.
    """
    popular_symbols = [
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corporation"},
        {"symbol": "AMZN", "name": "Amazon.com Inc."},
        {"symbol": "GOOGL", "name": "Alphabet Inc. (Google)"},
        {"symbol": "FB", "name": "Meta Platforms Inc. (Facebook)"},
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