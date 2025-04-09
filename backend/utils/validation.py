# backend/utils/validation.py
"""Input validation utilities."""

import re
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, date

def validate_email(email: str) -> bool:
    """
    Validate an email address.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if email is valid, False otherwise
    """
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_pattern, email))

def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Validate password strength.
    
    Args:
        password: Password to validate
        
    Returns:
        Dictionary with validation results
    """
    results = {
        "valid": True,
        "errors": [],
    }
    
    if len(password) < 8:
        results["valid"] = False
        results["errors"].append("Password must be at least 8 characters long")
    
    if not any(char.isupper() for char in password):
        results["valid"] = False
        results["errors"].append("Password must contain at least one uppercase letter")
    
    if not any(char.islower() for char in password):
        results["valid"] = False
        results["errors"].append("Password must contain at least one lowercase letter")
    
    if not any(char.isdigit() for char in password):
        results["valid"] = False
        results["errors"].append("Password must contain at least one number")
    
    special_chars = "!@#$%^&*()-_=+[]{}|;:'\",.<>/?"
    if not any(char in special_chars for char in password):
        results["valid"] = False
        results["errors"].append("Password must contain at least one special character")
    
    return results

def validate_ticker_symbol(symbol: str) -> bool:
    """
    Validate a stock ticker symbol.
    
    Args:
        symbol: Ticker symbol to validate
        
    Returns:
        True if symbol is valid, False otherwise
    """
    # Simple validation: 1-5 uppercase letters, possibly followed by a dot and more letters
    ticker_pattern = r'^[A-Z]{1,5}(\.[A-Z]{1,2})?$'
    return bool(re.match(ticker_pattern, symbol))

def validate_date_range(start_date: Union[str, date, datetime], 
                       end_date: Union[str, date, datetime]) -> Dict[str, Any]:
    """
    Validate a date range.
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        Dictionary with validation results
    """
    results = {
        "valid": True,
        "errors": [],
    }
    
    # Convert string dates to datetime objects if necessary
    if isinstance(start_date, str):
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except ValueError:
            results["valid"] = False
            results["errors"].append("Invalid start date format")
            return results
    
    if isinstance(end_date, str):
        try:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            results["valid"] = False
            results["errors"].append("Invalid end date format")
            return results
    
    # Convert date objects to datetime if necessary
    if isinstance(start_date, date) and not isinstance(start_date, datetime):
        start_date = datetime.combine(start_date, datetime.min.time())
    
    if isinstance(end_date, date) and not isinstance(end_date, datetime):
        end_date = datetime.combine(end_date, datetime.min.time())
    
    # Check if start date is before end date
    if start_date > end_date:
        results["valid"] = False
        results["errors"].append("Start date must be before end date")
    
    # Check if dates are in the future
    if start_date > datetime.now():
        results["valid"] = False
        results["errors"].append("Start date cannot be in the future")
    
    if end_date > datetime.now():
        results["valid"] = False
        results["errors"].append("End date cannot be in the future")
    
    return results

def sanitize_input(input_string: str) -> str:
    """
    Sanitize input string to prevent injection attacks.
    
    Args:
        input_string: String to sanitize
        
    Returns:
        Sanitized string
    """
    # Remove HTML tags
    sanitized = re.sub(r'<[^>]*>', '', input_string)
    
    # Replace potentially dangerous characters
    sanitized = sanitized.replace('&', '&amp;')
    sanitized = sanitized.replace('<', '&lt;')
    sanitized = sanitized.replace('>', '&gt;')
    sanitized = sanitized.replace('"', '&quot;')
    sanitized = sanitized.replace("'", '&#39;')
    
    return sanitized