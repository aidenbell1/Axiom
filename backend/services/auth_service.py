# backend/services/auth_service.py
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

from jose import jwt
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models.user import User
from backend.utils.security import get_password_hash, verify_password

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Expiration time delta (optional)
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticate a user.
    
    Args:
        db: Database session
        username: Username
        password: Password
        
    Returns:
        User if authentication is successful, None otherwise
    """
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """
    Get a user by username.
    
    Args:
        db: Database session
        username: Username
        
    Returns:
        User if found, None otherwise
    """
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Get a user by email.
    
    Args:
        db: Database session
        email: Email
        
    Returns:
        User if found, None otherwise
    """
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """
    Get a user by ID.
    
    Args:
        db: Database session
        user_id: User ID (UUID)
        
    Returns:
        User if found, None otherwise
    """
    return db.query(User).filter(User.uuid == user_id).first()

def create_user(db: Session, user_data: Dict[str, Any]) -> User:
    """
    Create a new user.
    
    Args:
        db: Database session
        user_data: User data
        
    Returns:
        Created user
    """
    # Hash password
    hashed_password = get_password_hash(user_data["password"])
    
    # Create user
    new_user = User(
        email=user_data["email"],
        username=user_data["username"],
        full_name=user_data["full_name"],
        hashed_password=hashed_password,
        is_active=True,
        is_verified=False,
        subscription_tier="free"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

def update_user(db: Session, user_id: int, user_data: Dict[str, Any]) -> Optional[User]:
    """
    Update a user.
    
    Args:
        db: Database session
        user_id: User ID
        user_data: User data
        
    Returns:
        Updated user if successful, None otherwise
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        return None
    
    # Update user fields
    for key, value in user_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    return user

def delete_user(db: Session, user_id: int) -> bool:
    """
    Delete a user.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        True if successful, False otherwise
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        return False
    
    db.delete(user)
    db.commit()
    
    return True

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """
    Get all users.
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        
    Returns:
        List of users
    """
    return db.query(User).offset(skip).limit(limit).all()

def verify_user_email(db: Session, user_id: int) -> bool:
    """
    Verify a user's email.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        True if successful, False otherwise
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        return False
    
    user.is_verified = True
    db.commit()
    
    return True

def update_subscription_tier(db: Session, user_id: int, tier: str, expires_at: Optional[datetime] = None) -> bool:
    """
    Update a user's subscription tier.
    
    Args:
        db: Database session
        user_id: User ID
        tier: Subscription tier
        expires_at: Subscription expiration date (optional)
        
    Returns:
        True if successful, False otherwise
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        return False
    
    user.subscription_tier = tier
    user.subscription_expires = expires_at
    db.commit()
    
    return True