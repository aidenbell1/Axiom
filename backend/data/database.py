# backend/data/database.py
"""Database connection management utilities."""

import logging
from contextlib import contextmanager
from typing import Generator, Dict, Any

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session

from backend.config import settings
from backend.utils.logging import get_logger

logger = get_logger(__name__)

# Create database engines
main_engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,
)

# Create timescale engine if configured
timescale_engine = None
if settings.TIMESCALE_URL:
    timescale_engine = create_engine(
        settings.TIMESCALE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        echo=settings.DEBUG,
    )

# Create session factories
MainSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=main_engine)
TimeScaleSessionLocal = None
if timescale_engine:
    TimeScaleSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=timescale_engine)

# Enable SQLite foreign key support if using SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key support for SQLite connections."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Get a database session.
    
    Yields:
        Session: Database session
    """
    session = MainSessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database session error: {str(e)}")
        raise
    finally:
        session.close()

@contextmanager
def get_timescale_session() -> Generator[Session, None, None]:
    """
    Get a TimescaleDB session.
    
    Yields:
        Session: TimescaleDB session
    """
    if not TimeScaleSessionLocal:
        raise ValueError("TimescaleDB is not configured")
    
    session = TimeScaleSessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"TimescaleDB session error: {str(e)}")
        raise
    finally:
        session.close()

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database session.
    
    Yields:
        Session: Database session
    """
    session = MainSessionLocal()
    try:
        yield session
    finally:
        session.close()

def get_timescale_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for TimescaleDB session.
    
    Yields:
        Session: TimescaleDB session
    """
    if not TimeScaleSessionLocal:
        raise ValueError("TimescaleDB is not configured")
    
    session = TimeScaleSessionLocal()
    try:
        yield session
    finally:
        session.close()

def execute_raw_sql(query: str, params: Dict[str, Any] = None, is_timescale: bool = False) -> Any:
    """
    Execute raw SQL query.
    
    Args:
        query: SQL query
        params: Query parameters
        is_timescale: Whether to use TimescaleDB
        
    Returns:
        Query results
    """
    engine = timescale_engine if is_timescale and timescale_engine else main_engine
    
    with engine.connect() as connection:
        result = connection.execute(query, params or {})
        return result.fetchall()

def check_database_connection() -> bool:
    """
    Check if database connection is working.
    
    Returns:
        True if connection is working, False otherwise
    """
    try:
        with get_db_session() as session:
            session.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {str(e)}")
        return False

def check_timescale_connection() -> bool:
    """
    Check if TimescaleDB connection is working.
    
    Returns:
        True if connection is working, False otherwise
    """
    if not timescale_engine:
        return False
    
    try:
        with get_timescale_session() as session:
            session.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"TimescaleDB connection check failed: {str(e)}")
        return False