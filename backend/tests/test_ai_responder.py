"""
Tests for Gemini 2.0 Flash integration in BilingualAIResponder
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from types import SimpleNamespace

from app.core.ai_responder import BilingualAIResponder, ConversationMemory
from app.core.rate_limiter import rate_limiter


@pytest.fixture
def ai_responder():
    """Create AI responder instance for testing"""
    return BilingualAIResponder()


@pytest.fixture
def mock_gemini_response():
    """Mock Gemini API response"""
    return SimpleNamespace(
        text="こんにちは！Hello! 今日は何について話しましょうか？ [話す | はなす | to talk | N5]"
    )


@pytest.fixture
def mock_streaming_response():
    """Mock streaming Gemini API response"""
    class MockChunk:
        def __init__(self, text):
            self.text = text
    
    chunks = [
        MockChunk("こんにちは！"),
        MockChunk("Hello! "),
        MockChunk("今日は何について話しましょうか？"),
        MockChunk(" [話す | はなす | to talk | N5]")
    ]
    
    return iter(chunks)


class TestConversationMemory:
    """Test conversation memory functionality"""
    
    def test_add_message(self):
        memory = ConversationMemory(window_size=5)
        memory.add_message("user", "Hello")
        memory.add_message("assistant", "Hi there!")
        
        assert len(memory.messages) == 2
        assert memory.messages[0]["role"] == "user"
        assert memory.messages[0]["content"] == "Hello"
        assert memory.messages[1]["role"] == "assistant"
        assert memory.messages[1]["content"] == "Hi there!"
    
    def test_window_size_limit(self):
        memory = ConversationMemory(window_size=2)
        
        # Add more messages than window size
        for i in range(6):
            memory.add_message("user", f"Message {i}")
            memory.add_message("assistant", f"Response {i}")
        
        # Should only keep last 4 messages (2 pairs)
        assert len(memory.messages) == 4
        assert memory.messages[0]["content"] == "Message 4"
        assert memory.messages[-1]["content"] == "Response 5"
    
    def test_clear_memory(self):
        memory = ConversationMemory()
        memory.add_message("user", "Test")
        memory.clear()
        
        assert len(memory.messages) == 0


class TestBilingualAIResponder:
    """Test BilingualAIResponder functionality"""
    
    @pytest.mark.asyncio
    async def test_generate_response_success(self, ai_responder, mock_gemini_response):
        with patch.object(ai_responder.model, 'generate_content', return_value=mock_gemini_response):
            with patch.object(ai_responder.tts_service, 'synthesize_text', return_value={"command": "speak"}):
                response = await ai_responder.generate_response(
                    user_input="Hello",
                    detected_language="en-US"
                )
                
                assert response['text'] == mock_gemini_response.text
                assert response['language'] == "ja-JP"  # Should detect Japanese as primary
                assert response['tts_command'] == {"command": "speak"}
                assert response['metadata']['user_language'] == "en-US"
    
    @pytest.mark.asyncio
    async def test_generate_response_with_rate_limit(self, ai_responder):
        # Mock rate limiter to return False
        with patch.object(rate_limiter, 'check_rate_limit', return_value=False):
            with patch.object(rate_limiter, 'get_retry_after', return_value=30):
                response = await ai_responder.generate_response(
                    user_input="Hello",
                    detected_language="en-US",
                    client_id="test_client"
                )
                
                assert "Rate limit exceeded" in response['text']
                assert response['metadata']['error'] == 'rate_limit_exceeded'
                assert response['metadata']['retry_after'] == 30
    
    @pytest.mark.asyncio
    async def test_generate_response_timeout(self, ai_responder):
        # Mock timeout
        with patch.object(ai_responder.model, 'generate_content', side_effect=asyncio.TimeoutError()):
            response = await ai_responder.generate_response(
                user_input="Hello",
                detected_language="en-US"
            )
            
            assert "timed out" in response['text']
            assert response['metadata']['error'] == 'timeout'
            assert response['metadata']['fallback'] is True
    
    @pytest.mark.asyncio
    async def test_generate_response_stream_success(self, ai_responder, mock_streaming_response):
        with patch.object(ai_responder.model, 'generate_content', return_value=mock_streaming_response):
            with patch.object(ai_responder.tts_service, 'synthesize_text', return_value={"command": "speak"}):
                chunks = []
                async for chunk in ai_responder.generate_response_stream(
                    user_input="Hello",
                    detected_language="en-US"
                ):
                    chunks.append(chunk)
                
                # Should have 4 chunks + 1 final message
                assert len(chunks) == 5
                
                # Check chunk types
                for i in range(4):
                    assert chunks[i]['type'] == 'chunk'
                
                # Check final message
                final_chunk = chunks[-1]
                assert final_chunk['type'] == 'final'
                assert final_chunk['tts_command'] == {"command": "speak"}
                assert final_chunk['metadata']['is_final'] is True
    
    def test_determine_response_language(self, ai_responder):
        # Test Japanese detection
        japanese_text = "こんにちは！元気ですか？"
        assert ai_responder._determine_response_language(japanese_text, "en-US") == "ja-JP"
        
        # Test English detection
        english_text = "Hello! How are you?"
        assert ai_responder._determine_response_language(english_text, "ja-JP") == "en-US"
        
        # Test mixed (more Japanese)
        mixed_jp = "こんにちは！Hello! 今日は良い天気ですね。"
        assert ai_responder._determine_response_language(mixed_jp, "en-US") == "ja-JP"
        
        # Test mixed (more English)
        mixed_en = "Hello! こんにちは！How are you today?"
        assert ai_responder._determine_response_language(mixed_en, "ja-JP") == "en-US"
    
    def test_create_prompt(self, ai_responder):
        context = {
            'conversation_history': 'User: Hello\nAssistant: Hi!',
            'turn_count': 2
        }
        
        prompt = ai_responder._create_prompt("How are you?", "en-US", context)
        
        # Check that prompt contains key elements
        assert "AIVlingual" in prompt
        assert "Vtuber" in prompt
        assert "User: Hello\nAssistant: Hi!" in prompt
        assert "turn_count: 2" in prompt
        assert "User language detected: en-US" in prompt
        assert "User (en-US): How are you?" in prompt
    
    def test_fallback_responses(self, ai_responder):
        # Test Japanese fallback
        ja_fallback = ai_responder._get_fallback_response("ja-JP")
        assert "すみません" in ja_fallback
        
        # Test English fallback
        en_fallback = ai_responder._get_fallback_response("en-US")
        assert "Sorry" in en_fallback
        
        # Test unknown language fallback
        unknown_fallback = ai_responder._get_fallback_response("unknown")
        assert "Sorry" in unknown_fallback


@pytest.mark.asyncio
async def test_conversation_flow():
    """Test a complete conversation flow"""
    responder = BilingualAIResponder()
    
    # Mock the model and TTS
    mock_responses = [
        SimpleNamespace(text="はじめまして！Nice to meet you! 私はAIVlingual assistant です。[初めまして | はじめまして | nice to meet you | N5]"),
        SimpleNamespace(text="ぽんこつ means 'clumsy' or 'airhead' - it's popular Vtuber slang! [ぽんこつ | ぽんこつ | clumsy/airhead | Vtuber slang]"),
    ]
    
    with patch.object(responder.model, 'generate_content', side_effect=mock_responses):
        with patch.object(responder.tts_service, 'synthesize_text', return_value={"command": "speak"}):
            # First message
            response1 = await responder.generate_response("Hello!", "en-US")
            assert "はじめまして" in response1['text']
            assert len(responder.conversation_memory.messages) == 2
            
            # Second message
            response2 = await responder.generate_response("What does ponkotsu mean?", "en-US")
            assert "clumsy" in response2['text']
            assert "Vtuber slang" in response2['text']
            assert len(responder.conversation_memory.messages) == 4