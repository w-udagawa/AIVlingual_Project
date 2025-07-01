"""
Base interface for speech services
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from enum import Enum


class SpeechProvider(str, Enum):
    """Available speech service providers"""
    AZURE = "azure"
    WEB_SPEECH = "web_speech"
    LOCAL = "local"


class BaseSpeechService(ABC):
    """Abstract base class for speech recognition services"""
    
    def __init__(self, provider: SpeechProvider):
        self.provider = provider
        self._sessions: Dict[str, Dict[str, Any]] = {}
    
    @abstractmethod
    async def start_recognition(self, client_id: str, language: str = 'auto', **kwargs) -> bool:
        """Start speech recognition for a client"""
        pass
    
    @abstractmethod
    async def stop_recognition(self, client_id: str) -> None:
        """Stop speech recognition for a client"""
        pass
    
    @abstractmethod
    async def process_audio(self, client_id: str, audio_data: bytes) -> Optional[Dict[str, Any]]:
        """Process audio data and return recognition result"""
        pass
    
    async def process_recognition_result(self, client_id: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Process recognition result (for client-side recognition like Web Speech API)"""
        return {
            'success': True,
            'text': result.get('transcript', ''),
            'language': result.get('language', 'unknown'),
            'confidence': result.get('confidence', 0.0),
            'is_final': result.get('isFinal', False)
        }
    
    def cleanup_session(self, client_id: str) -> None:
        """Clean up resources for a client session"""
        if client_id in self._sessions:
            del self._sessions[client_id]
    
    def get_session(self, client_id: str) -> Optional[Dict[str, Any]]:
        """Get session data for a client"""
        return self._sessions.get(client_id)
    
    def set_session(self, client_id: str, data: Dict[str, Any]) -> None:
        """Set session data for a client"""
        self._sessions[client_id] = data