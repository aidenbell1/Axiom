# backend/main.py
import logging
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import Base, engine, get_db
from backend.api import auth, strategies, backtesting, portfolio, market_data, user

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for Axiom Quantitative Investment Platform",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["Authentication"])
app.include_router(user.router, prefix=settings.API_V1_PREFIX, tags=["Users"])
app.include_router(strategies.router, prefix=settings.API_V1_PREFIX, tags=["Strategies"])
app.include_router(backtesting.router, prefix=settings.API_V1_PREFIX, tags=["Backtesting"])
app.include_router(portfolio.router, prefix=settings.API_V1_PREFIX, tags=["Portfolio"])
app.include_router(market_data.router, prefix=settings.API_V1_PREFIX, tags=["Market Data"])

# Health check endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "version": "0.1.0"}

# Root endpoint
@app.get("/", tags=["Root"])
def read_root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "0.1.0",
        "description": "Democratizing algorithmic trading for everyone",
        "docs_url": "/api/docs",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)