# backend/data/cache.py
"""Cache management utilities."""

import json
import logging
import time
from typing import Any, Dict, Optional, Union, Callable
from functools import wraps
import hashlib

import redis
from redis.exceptions import RedisError

from backend.config import settings
from backend.utils.logging import get_logger

logger = get_logger(__name__)

# Initialize Redis client if configured
redis_client = None
if settings.REDIS_URL:
    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        # Test connection
        redis_client.ping()
        logger.info("Redis connection established")
    except RedisError as e:
        logger.warning(f"Redis connection failed: {str(e)}")
        redis_client = None

class Cache:
    """Cache interface for storing and retrieving data."""
    
    @staticmethod
    def get(key: str) -> Optional[str]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if key does not exist
        """
        if not redis_client:
            return None
        
        try:
            return redis_client.get(key)
        except RedisError as e:
            logger.error(f"Redis get error: {str(e)}")
            return None
    
    @staticmethod
    def set(key: str, value: str, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (optional)
            
        Returns:
            True if successful, False otherwise
        """
        if not redis_client:
            return False
        
        try:
            redis_client.set(key, value, ex=ttl)
            return True
        except RedisError as e:
            logger.error(f"Redis set error: {str(e)}")
            return False
    
    @staticmethod
    def delete(key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if successful, False otherwise
        """
        if not redis_client:
            return False
        
        try:
            redis_client.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Redis delete error: {str(e)}")
            return False
    
    @staticmethod
    def get_json(key: str) -> Optional[Any]:
        """
        Get JSON value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Deserialized JSON object or None if key does not exist
        """
        value = Cache.get(key)
        if value is None:
            return None
        
        try:
            return json.loads(value)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            return None
    
    @staticmethod
    def set_json(key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set JSON value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (optional)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            json_value = json.dumps(value)
            return Cache.set(key, json_value, ttl)
        except (TypeError, ValueError) as e:
            logger.error(f"JSON encode error: {str(e)}")
            return False
    
    @staticmethod
    def exists(key: str) -> bool:
        """
        Check if key exists in cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if key exists, False otherwise
        """
        if not redis_client:
            return False
        
        try:
            return bool(redis_client.exists(key))
        except RedisError as e:
            logger.error(f"Redis exists error: {str(e)}")
            return False
    
    @staticmethod
    def clear_pattern(pattern: str) -> bool:
        """
        Clear keys matching pattern.
        
        Args:
            pattern: Key pattern to clear
            
        Returns:
            True if successful, False otherwise
        """
        if not redis_client:
            return False
        
        try:
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
            return True
        except RedisError as e:
            logger.error(f"Redis clear pattern error: {str(e)}")
            return False

def cached(ttl: int = 300, key_prefix: str = "cache:"):
    """
    Decorator for caching function results.
    
    Args:
        ttl: Time-to-live in seconds
        key_prefix: Prefix for cache keys
        
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Generate cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]
            
            # Add args and kwargs to key
            if args:
                key_parts.append(str(args))
            if kwargs:
                key_parts.append(str(sorted(kwargs.items())))
            
            cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            # Try to get from cache
            cached_result = Cache.get_json(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Call the function and cache the result
            result = func(*args, **kwargs)
            Cache.set_json(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

def check_cache_connection() -> bool:
    """
    Check if cache connection is working.
    
    Returns:
        True if connection is working, False otherwise
    """
    if not redis_client:
        return False
    
    try:
        redis_client.ping()
        return True
    except RedisError:
        return False

def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics.
    
    Returns:
        Dictionary with cache statistics
    """
    if not redis_client:
        return {"connected": False}
    
    try:
        info = redis_client.info()
        return {
            "connected": True,
            "used_memory": info.get("used_memory_human", "N/A"),
            "total_keys": sum(info.get(f"db{i}", {}).get("keys", 0) for i in range(16)),
            "uptime": info.get("uptime_in_seconds", 0),
        }
    except RedisError as e:
        logger.error(f"Redis stats error: {str(e)}")
        return {"connected": False, "error": str(e)}