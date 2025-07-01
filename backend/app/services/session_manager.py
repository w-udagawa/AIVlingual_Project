"""
Session management for user conversations (in-memory version)
"""

import asyncio
from typing import Dict, Optional, List, Any
import uuid
from datetime import datetime, timedelta
import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages user sessions and conversation context using in-memory storage"""
    
    def __init__(self):
        # In-memory storage for MVP (replace with Redis/database in production)
        self.sessions: Dict[str, Dict] = {}
        self.session_ttl = 3600  # 1 hour
        
    async def create_session(self) -> str:
        """Create a new session and return session ID"""
        session_id = str(uuid.uuid4())
        
        self.sessions[session_id] = {
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'conversation_history': '',
            'language_preference': 'auto',
            'context': {},
            'metadata': {
                'turn_count': 0,
                'languages_used': set()
            }
        }
        
        logger.info(f"Created new session: {session_id}")
        return session_id
    
    async def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session data"""
        session = self.sessions.get(session_id)
        
        if session:
            # Check if session is expired
            created_at = datetime.fromisoformat(session['created_at'])
            if datetime.utcnow() - created_at > timedelta(seconds=self.session_ttl):
                logger.info(f"Session {session_id} expired")
                del self.sessions[session_id]
                return None
                
        return session
    
    async def update_context(
        self,
        session_id: str,
        user_input: str,
        ai_response: str
    ) -> bool:
        """Update session context with new conversation turn"""
        session = await self.get_session(session_id)
        
        if not session:
            logger.warning(f"Session {session_id} not found")
            return False
        
        # Update conversation history
        if session['conversation_history']:
            session['conversation_history'] += f"\nUser: {user_input}\nAI: {ai_response}"
        else:
            session['conversation_history'] = f"User: {user_input}\nAI: {ai_response}"
        
        # Update metadata
        session['metadata']['turn_count'] += 1
        session['updated_at'] = datetime.utcnow().isoformat()
        
        # Keep conversation history reasonable size
        lines = session['conversation_history'].split('\n')
        if len(lines) > 20:  # Keep last 10 turns (20 lines)
            session['conversation_history'] = '\n'.join(lines[-20:])
        
        self.sessions[session_id] = session
        return True
    
    async def get_context(self, session_id: str) -> Dict:
        """Get session context for AI response generation"""
        session = await self.get_session(session_id)
        
        if not session:
            return {
                'conversation_history': '',
                'turn_count': 0,
                'language_preference': 'auto'
            }
        
        return {
            'conversation_history': session['conversation_history'],
            'turn_count': session['metadata']['turn_count'],
            'language_preference': session['language_preference'],
            'context': session['context']
        }
    
    async def set_preference(
        self,
        session_id: str,
        preference_type: str,
        value: Any
    ) -> bool:
        """Set user preference for session"""
        session = await self.get_session(session_id)
        
        if not session:
            return False
        
        if preference_type == 'language':
            session['language_preference'] = value
        else:
            session['context'][preference_type] = value
        
        session['updated_at'] = datetime.utcnow().isoformat()
        self.sessions[session_id] = session
        
        logger.info(f"Updated {preference_type} preference for session {session_id}")
        return True
    
    async def reset_context(self, session_id: str) -> bool:
        """Reset conversation context"""
        session = await self.get_session(session_id)
        
        if not session:
            return False
        
        session['conversation_history'] = ''
        session['metadata']['turn_count'] = 0
        session['updated_at'] = datetime.utcnow().isoformat()
        
        self.sessions[session_id] = session
        
        logger.info(f"Reset context for session {session_id}")
        return True
    
    async def end_session(self, session_id: str) -> bool:
        """End a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Ended session {session_id}")
            return True
        return False
    
    async def cleanup_expired_sessions(self):
        """Clean up expired sessions (call periodically)"""
        expired = []
        now = datetime.utcnow()
        
        for session_id, session in self.sessions.items():
            created_at = datetime.fromisoformat(session['created_at'])
            if now - created_at > timedelta(seconds=self.session_ttl):
                expired.append(session_id)
        
        for session_id in expired:
            del self.sessions[session_id]
            
        if expired:
            logger.info(f"Cleaned up {len(expired)} expired sessions")