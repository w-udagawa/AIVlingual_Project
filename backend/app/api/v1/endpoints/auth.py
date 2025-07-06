"""
Authentication API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
import logging

from app.models.user import UserCreate, UserLogin, User, UserPreferences
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    """Get current user from authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.split(" ")[1]
    user_id = await auth_service.validate_session_token(token)
    
    if not user_id:
        return None
    
    return await auth_service.get_user_by_id(user_id)


async def require_auth(authorization: Optional[str] = Header(None)) -> User:
    """Require authenticated user"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/register")
async def register(user_create: UserCreate):
    """Register a new user"""
    try:
        user = await auth_service.create_user(user_create)
        
        if not user:
            raise HTTPException(
                status_code=400,
                detail="User with this username or email already exists"
            )
        
        # Create session
        token = await auth_service.create_user_session(user.id)
        
        return {
            "user": user,
            "access_token": token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login")
async def login(user_login: UserLogin):
    """Login user"""
    try:
        user = await auth_service.authenticate_user(user_login)
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid username/email or password"
            )
        
        # Create session
        token = await auth_service.create_user_session(user.id)
        
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
                "is_verified": user.is_verified
            },
            "access_token": token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/logout")
async def logout(authorization: str = Header(None)):
    """Logout user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    await auth_service.invalidate_session(token)
    
    return {"message": "Successfully logged out"}


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(require_auth)):
    """Get current user information"""
    return current_user


@router.get("/preferences")
async def get_user_preferences(current_user: User = Depends(require_auth)):
    """Get user preferences"""
    preferences = await auth_service.get_user_preferences(current_user.id)
    
    if not preferences:
        # Return default preferences
        return UserPreferences(user_id=current_user.id)
    
    return preferences


@router.put("/preferences")
async def update_user_preferences(
    preferences: dict,
    current_user: User = Depends(require_auth)
):
    """Update user preferences"""
    success = await auth_service.update_user_preferences(
        current_user.id,
        preferences
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update preferences")
    
    return {"message": "Preferences updated successfully"}


@router.get("/check")
async def check_auth(current_user: Optional[User] = Depends(get_current_user)):
    """Check if user is authenticated"""
    return {
        "authenticated": current_user is not None,
        "user": current_user
    }