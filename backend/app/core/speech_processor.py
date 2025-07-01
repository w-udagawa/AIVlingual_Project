"""
Speech processing module for audio recognition and language detection
This is now a simplified version since Web Speech API handles most processing in the browser
"""

import logging
from typing import Dict, Optional, Tuple
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class AudioConfig:
    """Audio configuration parameters"""
    sample_rate: int = 16000
    chunk_duration_ms: int = 20
    
    @property
    def chunk_size(self) -> int:
        """Calculate chunk size in bytes"""
        return int(self.sample_rate * self.chunk_duration_ms / 1000 * 2)  # 2 bytes per sample


class LanguageDetector:
    """Simple language detection from text"""
    
    def __init__(self):
        self.detection_threshold = 0.7
        
    async def detect_from_text(self, text: str) -> Tuple[str, float]:
        """Detect language from text"""
        # Simple heuristic for MVP - can be improved with ML models
        japanese_chars = sum(1 for c in text if '\u3000' <= c <= '\u9fff' or '\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff')
        total_chars = len(text.replace(' ', ''))
        
        if total_chars == 0:
            return 'unknown', 0.0
            
        japanese_ratio = japanese_chars / total_chars
        
        if japanese_ratio > 0.3:
            return 'ja', min(japanese_ratio + 0.2, 1.0)
        else:
            return 'en', 1.0 - japanese_ratio
            
    def detect_code_switching(self, text: str) -> bool:
        """Detect if text contains both Japanese and English"""
        has_japanese = any('\u3000' <= c <= '\u9fff' or '\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff' for c in text)
        has_english = any('a' <= c.lower() <= 'z' for c in text)
        return has_japanese and has_english


class SpeechProcessor:
    """Simplified speech processor for Web Speech API integration"""
    
    def __init__(self):
        self.config = AudioConfig(
            sample_rate=settings.AUDIO_SAMPLE_RATE,
            chunk_duration_ms=settings.AUDIO_CHUNK_DURATION_MS
        )
        self.language_detector = LanguageDetector()
        
    def get_chunk_size(self) -> int:
        """Get the expected audio chunk size in bytes"""
        return self.config.chunk_size
        
    async def process_chunk(self, audio_chunk: bytes) -> Dict:
        """
        Process audio chunk - simplified since Web Speech API handles recognition
        This is kept for backward compatibility
        """
        logger.debug(f"Received audio chunk of {len(audio_chunk)} bytes")
        return {
            'is_final': False,
            'text': '',
            'language': 'unknown',
            'confidence': 0.0
        }
        
    async def analyze_transcript(self, text: str) -> Dict:
        """Analyze transcript for language and other features"""
        if not text:
            return {
                'language': 'unknown',
                'confidence': 0.0,
                'is_mixed': False
            }
            
        language, confidence = await self.language_detector.detect_from_text(text)
        is_mixed = self.language_detector.detect_code_switching(text)
        
        return {
            'language': language,
            'confidence': confidence,
            'is_mixed': is_mixed
        }