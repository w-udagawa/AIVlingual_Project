"""
Speech recognition state management
"""

import logging
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class SpeechSession:
    """Speech recognition session state"""
    client_id: str
    language: str = 'ja-JP'
    started_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    is_active: bool = True
    interim_transcript: str = ""
    final_transcripts: list = field(default_factory=list)
    error_count: int = 0
    total_duration: float = 0.0
    recognition_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


class SpeechRecognitionManager:
    """Manages speech recognition sessions and state"""
    
    def __init__(self, session_timeout_minutes: int = 30):
        self.sessions: Dict[str, SpeechSession] = {}
        self.session_timeout = timedelta(minutes=session_timeout_minutes)
        self._cleanup_task = None
        
    async def start(self):
        """Start the manager with background cleanup task"""
        self._cleanup_task = asyncio.create_task(self._cleanup_inactive_sessions())
        
    async def stop(self):
        """Stop the manager and cleanup"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
    
    async def create_session(self, client_id: str, language: str = 'ja-JP') -> SpeechSession:
        """Create or update a speech recognition session"""
        if client_id in self.sessions:
            # Update existing session
            session = self.sessions[client_id]
            session.is_active = True
            session.language = language
            session.last_activity = datetime.utcnow()
            logger.info(f"Reactivated speech session for {client_id}")
        else:
            # Create new session
            session = SpeechSession(client_id=client_id, language=language)
            self.sessions[client_id] = session
            logger.info(f"Created new speech session for {client_id}")
        
        return session
    
    async def update_session_activity(self, client_id: str) -> Optional[SpeechSession]:
        """Update session activity timestamp"""
        if client_id in self.sessions:
            session = self.sessions[client_id]
            session.last_activity = datetime.utcnow()
            return session
        return None
    
    async def add_interim_transcript(self, client_id: str, transcript: str) -> Optional[SpeechSession]:
        """Add interim transcript to session"""
        session = await self.update_session_activity(client_id)
        if session:
            session.interim_transcript = transcript
            logger.debug(f"Updated interim transcript for {client_id}: {transcript[:50]}...")
        return session
    
    async def add_final_transcript(
        self, 
        client_id: str, 
        transcript: str, 
        confidence: float,
        language: str
    ) -> Optional[SpeechSession]:
        """Add final transcript to session history"""
        session = await self.update_session_activity(client_id)
        if session:
            # Clear interim transcript
            session.interim_transcript = ""
            
            # Add to history
            session.final_transcripts.append({
                'transcript': transcript,
                'confidence': confidence,
                'language': language,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Update stats
            session.recognition_count += 1
            
            # Keep only last 50 transcripts to prevent memory issues
            if len(session.final_transcripts) > 50:
                session.final_transcripts = session.final_transcripts[-50:]
            
            logger.info(f"Added final transcript for {client_id}: {transcript}")
        return session
    
    async def record_error(self, client_id: str, error_type: str, error_message: str) -> Optional[SpeechSession]:
        """Record speech recognition error"""
        session = await self.update_session_activity(client_id)
        if session:
            session.error_count += 1
            
            # Store last error in metadata
            session.metadata['last_error'] = {
                'type': error_type,
                'message': error_message,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            logger.warning(f"Speech error for {client_id}: {error_type} - {error_message}")
        return session
    
    async def end_session(self, client_id: str) -> Optional[SpeechSession]:
        """End a speech recognition session"""
        if client_id in self.sessions:
            session = self.sessions[client_id]
            session.is_active = False
            session.total_duration = (datetime.utcnow() - session.started_at).total_seconds()
            
            logger.info(
                f"Ended speech session for {client_id}. "
                f"Duration: {session.total_duration:.1f}s, "
                f"Recognitions: {session.recognition_count}, "
                f"Errors: {session.error_count}"
            )
            
            return session
        return None
    
    async def get_session(self, client_id: str) -> Optional[SpeechSession]:
        """Get session by client ID"""
        return self.sessions.get(client_id)
    
    async def get_session_stats(self, client_id: str) -> Dict[str, Any]:
        """Get session statistics"""
        session = self.sessions.get(client_id)
        if not session:
            return {}
        
        current_duration = session.total_duration
        if session.is_active:
            current_duration = (datetime.utcnow() - session.started_at).total_seconds()
        
        return {
            'client_id': client_id,
            'language': session.language,
            'is_active': session.is_active,
            'duration_seconds': current_duration,
            'recognition_count': session.recognition_count,
            'error_count': session.error_count,
            'error_rate': session.error_count / max(session.recognition_count, 1),
            'last_activity': session.last_activity.isoformat(),
            'transcript_history_length': len(session.final_transcripts)
        }
    
    async def get_all_active_sessions(self) -> Dict[str, SpeechSession]:
        """Get all active sessions"""
        return {
            client_id: session 
            for client_id, session in self.sessions.items() 
            if session.is_active
        }
    
    async def _cleanup_inactive_sessions(self):
        """Background task to cleanup inactive sessions"""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                
                current_time = datetime.utcnow()
                sessions_to_remove = []
                
                for client_id, session in self.sessions.items():
                    if not session.is_active and (current_time - session.last_activity) > self.session_timeout:
                        sessions_to_remove.append(client_id)
                
                for client_id in sessions_to_remove:
                    del self.sessions[client_id]
                    logger.info(f"Cleaned up inactive speech session: {client_id}")
                
                if sessions_to_remove:
                    logger.info(f"Cleaned up {len(sessions_to_remove)} inactive speech sessions")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in speech session cleanup: {str(e)}")


# Global instance
speech_recognition_manager = SpeechRecognitionManager()