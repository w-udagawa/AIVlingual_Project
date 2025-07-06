"""
User model for authentication and authorization
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user model"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    """User creation model"""
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """User login model"""
    username_or_email: str
    password: str


class UserUpdate(BaseModel):
    """User update model"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)


class UserInDB(UserBase):
    """User in database model"""
    id: int
    hashed_password: str
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class User(UserBase):
    """User response model"""
    id: int
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserPreferences(BaseModel):
    """User preferences model"""
    user_id: int
    language_preference: str = "auto"
    difficulty_preference: int = Field(default=3, ge=1, le=5)
    daily_goal: int = Field(default=10, ge=1, le=100)
    notification_enabled: bool = True
    theme: str = Field(default="light", pattern="^(light|dark|auto)$")
    
    class Config:
        from_attributes = True


class UserProgress(BaseModel):
    """User vocabulary progress model"""
    user_id: int
    vocabulary_id: int
    status: str = Field(default="new", pattern="^(new|learning|known)$")
    review_count: int = 0
    last_reviewed_at: Optional[datetime] = None
    next_review_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserStats(BaseModel):
    """User statistics model"""
    total_vocabulary: int = 0
    known_vocabulary: int = 0
    learning_vocabulary: int = 0
    streak_days: int = 0
    total_reviews: int = 0
    average_difficulty: float = 0.0