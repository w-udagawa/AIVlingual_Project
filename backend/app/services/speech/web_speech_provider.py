"""
Web Speech API provider (browser-based)
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from .base import BaseSpeechService, SpeechProvider

logger = logging.getLogger(__name__)


class WebSpeechProvider(BaseSpeechService):
    """Web Speech API provider - processes results from browser"""
    
    def __init__(self):
        super().__init__(SpeechProvider.WEB_SPEECH)
    
    async def start_recognition(self, client_id: str, language: str = 'auto', **kwargs) -> bool:
        """Initialize recognition session (actual recognition happens in browser)"""
        session_data = {
            'started_at': datetime.utcnow().isoformat(),
            'language': language,
            'transcript_buffer': '',
            'recognition_active': True
        }
        self.set_session(client_id, session_data)
        logger.info(f"Initialized Web Speech session for client {client_id}")
        return True
    
    async def stop_recognition(self, client_id: str) -> None:
        """Stop recognition session"""
        session = self.get_session(client_id)
        if session:
            session['recognition_active'] = False
            session['ended_at'] = datetime.utcnow().isoformat()
        logger.info(f"Stopped Web Speech session for client {client_id}")
    
    async def process_audio(self, client_id: str, audio_data: bytes) -> Optional[Dict[str, Any]]:
        """Web Speech API doesn't process audio directly - it runs in browser"""
        logger.warning("Web Speech API processes audio in browser, not server-side")
        return None
    
    async def process_recognition_result(self, client_id: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Process recognition result from browser"""
        session = self.get_session(client_id)
        if not session:
            session = {'transcript_buffer': ''}
            self.set_session(client_id, session)
        
        transcript = result.get('transcript', '')
        is_final = result.get('isFinal', False)
        confidence = result.get('confidence', 0.0)
        language = result.get('language', 'unknown')
        
        # Detect language if not provided
        if language == 'unknown' or language == 'auto':
            language = self._detect_language(transcript)
        
        # Update session transcript
        if is_final:
            session['transcript_buffer'] = ''
            session['last_final_transcript'] = transcript
        else:
            session['transcript_buffer'] = transcript
        
        return {
            'success': True,
            'text': transcript,
            'language': language,
            'confidence': confidence,
            'is_final': is_final
        }
    
    async def handle_recognition_error(self, client_id: str, error_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle recognition errors from browser"""
        error_type = error_data.get('error', 'unknown')
        error_message = error_data.get('message', 'Unknown error')
        
        logger.error(f"Web Speech error for client {client_id}: {error_type} - {error_message}")
        
        # Common error handling
        error_responses = {
            'no-speech': "No speech detected. Please try again.",
            'audio-capture': "Microphone access denied or unavailable.",
            'not-allowed': "Speech recognition permission denied.",
            'network': "Network error occurred. Please check your connection.",
            'aborted': "Speech recognition was aborted.",
            'language-not-supported': "The selected language is not supported.",
            'service-not-allowed': "Speech recognition service is not available."
        }
        
        user_message = error_responses.get(error_type, f"Speech recognition error: {error_message}")
        
        return {
            'error_type': error_type,
            'message': user_message,
            'technical_details': error_message
        }
    
    def _detect_language(self, text: str) -> str:
        """Simple language detection based on character analysis"""
        if not text:
            return 'unknown'
        
        # Count character types
        japanese_chars = sum(1 for c in text if self._is_japanese(c))
        total_chars = len(text)
        
        # If more than 20% Japanese characters, consider it Japanese
        if total_chars > 0 and japanese_chars / total_chars > 0.2:
            return 'ja-JP'
        else:
            return 'en-US'
    
    @staticmethod
    def _is_japanese(char: str) -> bool:
        """Check if a character is Japanese (Hiragana, Katakana, or Kanji)"""
        code = ord(char)
        return (
            (0x3040 <= code <= 0x309F) or  # Hiragana
            (0x30A0 <= code <= 0x30FF) or  # Katakana
            (0x4E00 <= code <= 0x9FAF) or  # CJK Unified Ideographs (Kanji)
            (0x3400 <= code <= 0x4DBF)     # CJK Extension A
        )