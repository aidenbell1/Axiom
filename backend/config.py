# backend/config.py
import os
from pydantic import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # API settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Axiom Quantitative Investment Platform"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-development-replace-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/axiom")
    
    # TimescaleDB settings (for time series data)
    TIMESCALE_URL: str = os.getenv("TIMESCALE_URL", "postgresql://postgres:postgres@localhost:5432/axiom_timeseries")
    
    # Redis settings (for caching)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # External API settings
    ALPACA_API_KEY: str = os.getenv("ALPACA_API_KEY", "")
    ALPACA_API_SECRET: str = os.getenv("ALPACA_API_SECRET", "")
    ALPACA_API_BASE_URL: str = os.getenv("ALPACA_API_BASE_URL", "https://paper-api.alpaca.markets")
    
    # Feature flags
    ENABLE_PAPER_TRADING: bool = os.getenv("ENABLE_PAPER_TRADING", "True").lower() == "true"
    ENABLE_LIVE_TRADING: bool = os.getenv("ENABLE_LIVE_TRADING", "False").lower() == "true"
    
    # Logging settings
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()