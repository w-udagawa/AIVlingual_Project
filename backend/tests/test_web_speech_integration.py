"""
Tests for Web Speech API integration
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi import WebSocket
from types import SimpleNamespace

from app.api.websocket.handlers.web_speech_handler import WebSpeechHandler
from app.services.language_detector import LanguageDetector
from app.services.speech_recognition_manager import SpeechRecognitionManager, SpeechSession


class MockWebSocket:
    """Mock WebSocket for testing"""
    def __init__(self):
        self.messages_sent = []
        
    async def send_json(self, data):
        self.messages_sent.append(data)


@pytest.fixture
def mock_websocket():
    return MockWebSocket()


@pytest.fixture
def language_detector():
    return LanguageDetector()


@pytest.fixture
def speech_manager():
    return SpeechRecognitionManager()


class TestLanguageDetector:
    """Test language detection functionality"""
    
    def test_detect_japanese(self, language_detector):
        # Pure Japanese
        lang, confidence = language_detector.detect_language("こんにちは、元気ですか？")
        assert lang == 'ja-JP'
        assert confidence > 0.8
        
        # Japanese with particles
        lang, confidence = language_detector.detect_language("私は学生です。")
        assert lang == 'ja-JP'
        assert confidence > 0.8
    
    def test_detect_english(self, language_detector):
        # Pure English
        lang, confidence = language_detector.detect_language("Hello, how are you?")
        assert lang == 'en-US'
        assert confidence > 0.8
        
        # English with common words
        lang, confidence = language_detector.detect_language("I am a student.")
        assert lang == 'en-US'
        assert confidence > 0.8
    
    def test_detect_mixed(self, language_detector):
        # Mixed language (Vtuber style)
        lang, confidence = language_detector.detect_language("Hello みんな！今日もがんばります！")
        assert lang == 'mixed'
        
        # Code-switching
        lang, confidence = language_detector.detect_language("Thank you ありがとう for watching!")
        assert lang == 'mixed'
    
    def test_vtuber_patterns(self, language_detector):
        # Common Vtuber expressions
        features = language_detector.get_language_features("てぇてぇmoment with my genmates")
        assert features['mixed_language_score'] > 0
        
        features = language_detector.get_language_features("草www that was so funny")
        assert features['mixed_language_score'] > 0


class TestSpeechRecognitionManager:
    """Test speech recognition state management"""
    
    @pytest.mark.asyncio
    async def test_create_session(self, speech_manager):
        session = await speech_manager.create_session("test_client", "ja-JP")
        assert session.client_id == "test_client"
        assert session.language == "ja-JP"
        assert session.is_active
        assert session.error_count == 0
    
    @pytest.mark.asyncio
    async def test_add_transcripts(self, speech_manager):
        await speech_manager.create_session("test_client")
        
        # Add interim transcript
        session = await speech_manager.add_interim_transcript("test_client", "こんに")
        assert session.interim_transcript == "こんに"
        
        # Add final transcript
        session = await speech_manager.add_final_transcript(
            "test_client", "こんにちは", 0.95, "ja-JP"
        )
        assert session.interim_transcript == ""
        assert len(session.final_transcripts) == 1
        assert session.recognition_count == 1
    
    @pytest.mark.asyncio
    async def test_record_error(self, speech_manager):
        await speech_manager.create_session("test_client")
        
        session = await speech_manager.record_error(
            "test_client", "no-speech", "No speech detected"
        )
        assert session.error_count == 1
        assert session.metadata['last_error']['type'] == "no-speech"
    
    @pytest.mark.asyncio
    async def test_session_stats(self, speech_manager):
        await speech_manager.create_session("test_client")
        await speech_manager.add_final_transcript("test_client", "test", 0.9, "en-US")
        
        stats = await speech_manager.get_session_stats("test_client")
        assert stats['recognition_count'] == 1
        assert stats['error_count'] == 0
        assert stats['language'] == "ja-JP"
        assert 'duration_seconds' in stats


class TestWebSpeechHandler:
    """Test Web Speech API handler"""
    
    @pytest.mark.asyncio
    async def test_handle_web_speech_result_interim(self, mock_websocket):
        with patch('app.api.websocket.handlers.web_speech_handler.speech_recognition_manager') as mock_manager:
            mock_manager.add_interim_transcript = AsyncMock()
            
            await WebSpeechHandler.handle_web_speech_result(
                mock_websocket,
                "test_client",
                {
                    'data': {
                        'transcript': 'Hello',
                        'confidence': 0.9,
                        'isFinal': False,
                        'language': 'en-US'
                    }
                }
            )
            
            # Should not send any messages for interim results
            assert len(mock_websocket.messages_sent) == 0
            mock_manager.add_interim_transcript.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_web_speech_result_final(self, mock_websocket):
        with patch('app.api.websocket.handlers.web_speech_handler.speech_recognition_manager') as mock_manager:
            with patch('app.api.websocket.handlers.web_speech_handler.ai_responder') as mock_ai:
                with patch('app.api.websocket.handlers.web_speech_handler.session_manager') as mock_session:
                    mock_manager.add_final_transcript = AsyncMock()
                    mock_session.get_context = AsyncMock(return_value={})
                    mock_session.update_context = AsyncMock()
                    
                    # Mock AI response
                    mock_ai.generate_response = AsyncMock(return_value={
                        'text': 'Hello! How can I help you?',
                        'language': 'en-US',
                        'tts_command': {'command': 'speak'}
                    })
                    
                    await WebSpeechHandler.handle_web_speech_result(
                        mock_websocket,
                        "test_client",
                        {
                            'data': {
                                'transcript': 'Hello',
                                'confidence': 0.95,
                                'isFinal': True,
                                'language': 'en-US'
                            }
                        }
                    )
                    
                    # Check messages sent
                    assert len(mock_websocket.messages_sent) >= 2
                    
                    # Check transcription confirmation
                    transcription_msg = next(
                        msg for msg in mock_websocket.messages_sent 
                        if msg['type'] == 'transcription_confirmed'
                    )
                    assert transcription_msg['text'] == 'Hello'
                    assert transcription_msg['confidence'] == 0.95
                    
                    # Check AI response
                    ai_msg = next(
                        msg for msg in mock_websocket.messages_sent 
                        if msg['type'] == 'ai_response'
                    )
                    assert ai_msg['text'] == 'Hello! How can I help you?'
    
    @pytest.mark.asyncio
    async def test_handle_speech_error(self, mock_websocket):
        with patch('app.api.websocket.handlers.web_speech_handler.speech_recognition_manager') as mock_manager:
            mock_manager.record_error = AsyncMock()
            
            await WebSpeechHandler.handle_speech_error(
                mock_websocket,
                "test_client",
                {
                    'data': {
                        'error': 'no-speech',
                        'message': 'No speech detected'
                    }
                }
            )
            
            # Check error handling
            assert len(mock_websocket.messages_sent) == 1
            error_msg = mock_websocket.messages_sent[0]
            assert error_msg['type'] == 'speech_error_handled'
            assert 'No speech was detected' in error_msg['message']
    
    @pytest.mark.asyncio
    async def test_handle_language_change(self, mock_websocket):
        with patch('app.api.websocket.handlers.web_speech_handler.session_manager') as mock_session:
            with patch('app.api.websocket.handlers.web_speech_handler.ai_responder') as mock_ai:
                mock_session.set_preference = AsyncMock()
                mock_ai.reset_conversation = Mock()
                
                await WebSpeechHandler.handle_language_change(
                    mock_websocket,
                    "test_client",
                    {'language': 'ja-JP'}
                )
                
                # Check language change handling
                assert len(mock_websocket.messages_sent) == 1
                lang_msg = mock_websocket.messages_sent[0]
                assert lang_msg['type'] == 'language_changed'
                assert lang_msg['language'] == 'ja-JP'
                
                mock_session.set_preference.assert_called_with("test_client", "language", "ja-JP")
                mock_ai.reset_conversation.assert_called_once()


@pytest.mark.asyncio
async def test_language_detection_integration():
    """Test language detection with real examples"""
    detector = LanguageDetector()
    
    # Test various Vtuber-style inputs
    test_cases = [
        ("草www", "ja-JP"),  # Internet slang
        ("Let's gooooo!", "en-US"),  # English excitement
        ("ありがとうございます！Thank you so much!", "mixed"),  # Mixed gratitude
        ("配信お疲れ様でした", "ja-JP"),  # Stream ending
        ("GG everyone, またね！", "mixed"),  # Gaming + Japanese
    ]
    
    for text, expected_primary in test_cases:
        lang, confidence = detector.detect_language(text)
        if expected_primary == "mixed":
            assert lang == "mixed"
        else:
            assert lang == expected_primary or confidence < 0.7