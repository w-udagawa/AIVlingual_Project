"""
Language detection service for real-time speech recognition
"""

import re
import logging
from typing import Dict, Tuple, Optional
from collections import Counter

logger = logging.getLogger(__name__)


class LanguageDetector:
    """Advanced language detection for speech recognition results"""
    
    def __init__(self):
        # Japanese character ranges
        self.hiragana_range = (0x3040, 0x309F)
        self.katakana_range = (0x30A0, 0x30FF)
        self.kanji_range = (0x4E00, 0x9FAF)
        
        # Common Japanese particles and words
        self.japanese_particles = {'は', 'が', 'を', 'に', 'で', 'と', 'も', 'や', 'の', 'か', 'ね', 'よ'}
        self.japanese_common = {'です', 'ます', 'だ', 'である', 'でした', 'ました'}
        
        # Common English words
        self.english_common = {
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 
            'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 
            'do', 'at', 'this', 'but', 'his', 'by', 'from'
        }
        
        # Vtuber-specific mixed language patterns
        self.vtuber_patterns = {
            'mixed_greeting': r'(hello|hi|hey).*?(みんな|みな|皆)',
            'mixed_thanks': r'(thank you|thanks).*?(ありがとう|あり)',
            'mixed_gaming': r'(gg|good game|nice).*?(ナイス|いいね)',
        }
    
    def detect_language(self, text: str, browser_hint: Optional[str] = None) -> Tuple[str, float]:
        """
        Detect language with confidence score
        
        Returns:
            Tuple of (language_code, confidence)
            language_code: 'ja-JP', 'en-US', or 'mixed'
            confidence: 0.0 to 1.0
        """
        if not text:
            return browser_hint or 'ja-JP', 0.0
        
        text_lower = text.lower()
        
        # Calculate character type distribution
        char_stats = self._analyze_characters(text)
        
        # Calculate word-based features
        word_stats = self._analyze_words(text_lower)
        
        # Check for mixed language patterns (common in Vtuber streams)
        mixed_score = self._check_mixed_patterns(text_lower)
        
        # Calculate final scores
        ja_score = (
            char_stats['japanese_ratio'] * 0.6 +
            word_stats['japanese_word_ratio'] * 0.3 +
            word_stats['particle_ratio'] * 0.1
        )
        
        en_score = (
            char_stats['latin_ratio'] * 0.6 +
            word_stats['english_word_ratio'] * 0.4
        )
        
        # Determine language
        if mixed_score > 0.3:
            return 'mixed', mixed_score
        elif ja_score > en_score:
            confidence = min(ja_score, 1.0)
            return 'ja-JP', confidence
        else:
            confidence = min(en_score, 1.0)
            return 'en-US', confidence
    
    def _analyze_characters(self, text: str) -> Dict[str, float]:
        """Analyze character type distribution"""
        if not text:
            return {'japanese_ratio': 0.0, 'latin_ratio': 0.0}
        
        total_chars = len(text.replace(' ', ''))
        if total_chars == 0:
            return {'japanese_ratio': 0.0, 'latin_ratio': 0.0}
        
        japanese_chars = 0
        latin_chars = 0
        
        for char in text:
            if char.isspace():
                continue
                
            code_point = ord(char)
            
            # Check Japanese
            if (self.hiragana_range[0] <= code_point <= self.hiragana_range[1] or
                self.katakana_range[0] <= code_point <= self.katakana_range[1] or
                self.kanji_range[0] <= code_point <= self.kanji_range[1]):
                japanese_chars += 1
            # Check Latin alphabet
            elif char.isalpha() and code_point < 256:
                latin_chars += 1
        
        return {
            'japanese_ratio': japanese_chars / total_chars,
            'latin_ratio': latin_chars / total_chars
        }
    
    def _analyze_words(self, text: str) -> Dict[str, float]:
        """Analyze word-based features"""
        # Split by spaces and common Japanese punctuation
        words = re.split(r'[\s、。！？]+', text)
        words = [w for w in words if w]
        
        if not words:
            return {
                'japanese_word_ratio': 0.0,
                'english_word_ratio': 0.0,
                'particle_ratio': 0.0
            }
        
        japanese_word_count = 0
        english_word_count = 0
        particle_count = 0
        
        for word in words:
            # Check Japanese particles
            if word in self.japanese_particles:
                particle_count += 1
                japanese_word_count += 1
            # Check common Japanese words
            elif word in self.japanese_common or any(word.endswith(ending) for ending in ['です', 'ます', 'だ']):
                japanese_word_count += 1
            # Check common English words
            elif word in self.english_common:
                english_word_count += 1
            # Check if word contains Japanese characters
            elif any(self.hiragana_range[0] <= ord(c) <= self.katakana_range[1] for c in word):
                japanese_word_count += 1
            # Otherwise, if it's alphabetic, count as English
            elif word.isalpha():
                english_word_count += 1
        
        total_words = len(words)
        
        return {
            'japanese_word_ratio': japanese_word_count / total_words,
            'english_word_ratio': english_word_count / total_words,
            'particle_ratio': particle_count / total_words
        }
    
    def _check_mixed_patterns(self, text: str) -> float:
        """Check for mixed language patterns common in Vtuber streams"""
        mixed_matches = 0
        
        for pattern_name, pattern in self.vtuber_patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                mixed_matches += 1
        
        # Check for code-switching indicators
        if re.search(r'[a-z]+.*?[ぁ-ん]+', text) or re.search(r'[ぁ-ん]+.*?[a-z]+', text):
            mixed_matches += 0.5
        
        return min(mixed_matches / 3.0, 1.0)
    
    def get_language_features(self, text: str) -> Dict[str, any]:
        """Get detailed language features for debugging/analysis"""
        char_stats = self._analyze_characters(text)
        word_stats = self._analyze_words(text.lower())
        mixed_score = self._check_mixed_patterns(text.lower())
        language, confidence = self.detect_language(text)
        
        return {
            'detected_language': language,
            'confidence': confidence,
            'character_analysis': char_stats,
            'word_analysis': word_stats,
            'mixed_language_score': mixed_score,
            'text_length': len(text),
            'word_count': len(text.split())
        }


# Global instance
language_detector = LanguageDetector()