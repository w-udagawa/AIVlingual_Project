"""
Tests for speech processing module
"""

import pytest
from app.core.speech_processor import SpeechProcessor, LanguageDetector


class TestLanguageDetector:
    def test_detect_japanese(self):
        detector = LanguageDetector()
        
        # Test Japanese text
        lang, confidence = detector.detect_from_text("こんにちは、元気ですか？")
        assert lang == "ja"
        assert confidence > 0.7
        
    def test_detect_english(self):
        detector = LanguageDetector()
        
        # Test English text
        lang, confidence = detector.detect_from_text("Hello, how are you?")
        assert lang == "en"
        assert confidence > 0.7
        
    def test_detect_mixed(self):
        detector = LanguageDetector()
        
        # Test mixed text
        text = "今日のmeetingはどうだった？"
        is_mixed = detector.detect_code_switching(text)
        assert is_mixed is True
        
    def test_empty_text(self):
        detector = LanguageDetector()
        
        # Test empty text
        lang, confidence = detector.detect_from_text("")
        assert lang == "unknown"
        assert confidence == 0.0


class TestSpeechProcessor:
    @pytest.mark.asyncio
    async def test_initialization(self):
        processor = SpeechProcessor()
        assert processor.config.sample_rate == 16000
        assert processor.config.chunk_duration_ms == 20
        
    def test_chunk_size_calculation(self):
        processor = SpeechProcessor()
        expected_size = int(16000 * 20 / 1000) * 2  # 16-bit audio
        assert processor.get_chunk_size() == expected_size