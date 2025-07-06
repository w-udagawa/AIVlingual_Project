"""
Authentication service for user management
"""

import aiosqlite
from typing import Optional, Dict
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
import logging
import secrets

from app.core.config import settings
from app.models.user import UserCreate, UserInDB, User, UserLogin
from app.services.database_service import db_service

logger = logging.getLogger(__name__)


class AuthService:
    """Handles user authentication and authorization"""
    
    def __init__(self):
        self.db_path = db_service.db_path
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return self.pwd_context.hash(password)
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
        
    def create_access_token(self, user_id: int) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            'user_id': user_id,
            'exp': expire
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return token
        
    def create_session_token(self) -> str:
        """Create a random session token"""
        return secrets.token_urlsafe(32)
        
    async def create_user(self, user_create: UserCreate) -> Optional[User]:
        """Create a new user"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Check if user already exists
                cursor = await db.execute("""
                    SELECT id FROM users WHERE username = ? OR email = ?
                """, (user_create.username, user_create.email))
                
                if await cursor.fetchone():
                    logger.warning(f"User already exists: {user_create.username}")
                    return None
                
                # Create user
                hashed_password = self.hash_password(user_create.password)
                cursor = await db.execute("""
                    INSERT INTO users (username, email, hashed_password)
                    VALUES (?, ?, ?)
                """, (user_create.username, user_create.email, hashed_password))
                
                user_id = cursor.lastrowid
                
                # Create default preferences
                await db.execute("""
                    INSERT INTO user_preferences (user_id) VALUES (?)
                """, (user_id,))
                
                await db.commit()
                
                # Return created user
                return await self.get_user_by_id(user_id)
                
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return None
            
    async def authenticate_user(self, user_login: UserLogin) -> Optional[UserInDB]:
        """Authenticate user with username/email and password"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                
                # Find user by username or email
                cursor = await db.execute("""
                    SELECT * FROM users 
                    WHERE username = ? OR email = ?
                """, (user_login.username_or_email, user_login.username_or_email))
                
                row = await cursor.fetchone()
                if not row:
                    return None
                
                user_data = dict(row)
                
                # Verify password
                if not self.verify_password(user_login.password, user_data['hashed_password']):
                    return None
                
                # Check if user is active
                if not user_data.get('is_active', True):
                    return None
                
                return UserInDB(**user_data)
                
        except Exception as e:
            logger.error(f"Error authenticating user: {str(e)}")
            return None
            
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                
                cursor = await db.execute("""
                    SELECT id, username, email, is_active, is_verified, created_at
                    FROM users WHERE id = ?
                """, (user_id,))
                
                row = await cursor.fetchone()
                if row:
                    return User(**dict(row))
                    
                return None
                
        except Exception as e:
            logger.error(f"Error getting user: {str(e)}")
            return None
            
    async def create_user_session(self, user_id: int) -> Optional[str]:
        """Create a new user session and return token"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                token = self.create_session_token()
                expires_at = datetime.utcnow() + timedelta(days=7)
                
                await db.execute("""
                    INSERT INTO user_sessions (user_id, token, expires_at)
                    VALUES (?, ?, ?)
                """, (user_id, token, expires_at))
                
                await db.commit()
                return token
                
        except Exception as e:
            logger.error(f"Error creating user session: {str(e)}")
            return None
            
    async def validate_session_token(self, token: str) -> Optional[int]:
        """Validate session token and return user_id"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute("""
                    SELECT user_id FROM user_sessions
                    WHERE token = ? AND expires_at > datetime('now')
                """, (token,))
                
                row = await cursor.fetchone()
                if row:
                    return row[0]
                    
                return None
                
        except Exception as e:
            logger.error(f"Error validating session: {str(e)}")
            return None
            
    async def invalidate_session(self, token: str):
        """Invalidate a user session"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    DELETE FROM user_sessions WHERE token = ?
                """, (token,))
                
                await db.commit()
                
        except Exception as e:
            logger.error(f"Error invalidating session: {str(e)}")
            
    async def get_user_preferences(self, user_id: int) -> Optional[Dict]:
        """Get user preferences"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                
                cursor = await db.execute("""
                    SELECT * FROM user_preferences WHERE user_id = ?
                """, (user_id,))
                
                row = await cursor.fetchone()
                if row:
                    return dict(row)
                    
                return None
                
        except Exception as e:
            logger.error(f"Error getting user preferences: {str(e)}")
            return None
            
    async def update_user_preferences(self, user_id: int, preferences: Dict) -> bool:
        """Update user preferences"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Build update query dynamically
                fields = []
                values = []
                
                allowed_fields = [
                    'language_preference', 'difficulty_preference',
                    'daily_goal', 'notification_enabled', 'theme'
                ]
                
                for field in allowed_fields:
                    if field in preferences:
                        fields.append(f"{field} = ?")
                        values.append(preferences[field])
                
                if not fields:
                    return True
                
                values.append(user_id)
                query = f"""
                    UPDATE user_preferences 
                    SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                """
                
                await db.execute(query, values)
                await db.commit()
                return True
                
        except Exception as e:
            logger.error(f"Error updating user preferences: {str(e)}")
            return False


# Global auth service instance
auth_service = AuthService()