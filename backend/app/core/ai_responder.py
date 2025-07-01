"""
AI Responder using Google Gemini API for bilingual responses
"""

import asyncio
from typing import Dict, List, Optional, AsyncIterator
import logging
import json
from datetime import datetime
import time

import google.generativeai as genai

from app.core.config import settings
from app.services.browser_tts_service import BrowserTTSService
from app.models.conversation import ConversationTurn
from app.core.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)

# Configure Gemini
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    logger.info(f"Gemini API configured successfully with key: {settings.GEMINI_API_KEY[:10]}...")
except Exception as e:
    logger.error(f"Failed to configure Gemini API: {str(e)}")
    raise


class ConversationMemory:
    """Simple conversation memory without langchain dependency"""
    
    def __init__(self, window_size: int = 10):
        self.window_size = window_size
        self.messages: List[Dict[str, str]] = []
    
    def add_message(self, role: str, content: str):
        """Add a message to the conversation history"""
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep only the last window_size messages
        if len(self.messages) > self.window_size * 2:  # *2 for user/assistant pairs
            self.messages = self.messages[-self.window_size * 2:]
    
    def get_messages(self) -> List[Dict[str, str]]:
        """Get all messages in the conversation"""
        return self.messages
    
    def clear(self):
        """Clear the conversation history"""
        self.messages = []
    
    def to_string(self) -> str:
        """Convert conversation to string format"""
        return "\n".join([f"{msg['role']}: {msg['content']}" for msg in self.messages])


class BilingualAIResponder:
    """Generates bilingual AI responses using Gemini"""
    
    def __init__(self):
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        self.tts_service = BrowserTTSService()
        self.conversation_memory = ConversationMemory(window_size=settings.MAX_CONVERSATION_TURNS)
        
    async def generate_response(
        self,
        user_input: str,
        detected_language: str,
        session_context: Optional[Dict] = None,
        client_id: str = "default"
    ) -> Dict:
        """Generate AI response based on user input"""
        
        try:
            # Check rate limit
            if not await rate_limiter.check_rate_limit(client_id):
                retry_after = rate_limiter.get_retry_after(client_id)
                return {
                    'text': f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                    'language': detected_language,
                    'tts_command': None,
                    'metadata': {
                        'error': 'rate_limit_exceeded',
                        'retry_after': retry_after,
                        'fallback': True
                    }
                }
            # Detect actual language if set to auto
            if detected_language == 'auto':
                detected_language = self._detect_user_language(user_input)
                logger.info(f"Detected user language: {detected_language} for input: {user_input[:50]}...")
            
            # Add user message to memory
            self.conversation_memory.add_message("user", user_input)
            
            # Build context from session and conversation history
            context = self._build_context(session_context)
            
            # Create prompt for Gemini
            prompt = self._create_prompt(user_input, detected_language, context)
            
            # Generate response with timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.model.generate_content,
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=settings.AI_TEMPERATURE,
                        max_output_tokens=256,
                    )
                ),
                timeout=30.0  # 30 second timeout
            )
            
            # Extract response text
            response_text = response.text.strip()
            
            # Add AI response to memory
            self.conversation_memory.add_message("assistant", response_text)
            
            # Determine response language based on content and user language
            # Count Japanese characters in response
            japanese_chars = sum(1 for c in response_text if 
                               '\u3000' <= c <= '\u9fff' or 
                               '\u3040' <= c <= '\u309f' or 
                               '\u30a0' <= c <= '\u30ff')
            total_chars = len(response_text.replace(' ', ''))
            japanese_ratio = japanese_chars / total_chars if total_chars > 0 else 0
            
            # If user language is Japanese and response contains Japanese, use Japanese TTS
            if detected_language == 'ja-JP' and japanese_ratio > 0.3:
                response_language = 'ja-JP'
            else:
                response_language = self._determine_response_language(
                    response_text, 
                    detected_language
                )
            
            # Generate TTS command
            tts_command = await self.tts_service.synthesize_text(
                text=response_text,
                language=response_language,
                voice_settings={
                    'rate': 0.9 if response_language == 'ja-JP' else 1.0
                }
            )
            
            return {
                'text': response_text,
                'language': response_language,
                'tts_command': tts_command,
                'metadata': {
                    'user_language': detected_language,
                    'conversation_turns': len(self.conversation_memory.messages) // 2
                }
            }
            
        except asyncio.TimeoutError:
            logger.error("AI response generation timed out")
            fallback_response = "Response generation timed out. Please try again."
            
            return {
                'text': fallback_response,
                'language': detected_language,
                'tts_command': None,
                'metadata': {
                    'error': 'timeout',
                    'fallback': True
                }
            }
        except genai.types.generation_types.BlockedPromptException as e:
            logger.error(f"Prompt blocked by safety filters: {str(e)}")
            fallback_response = "I cannot respond to that message due to content filters."
            
            return {
                'text': fallback_response,
                'language': detected_language,
                'tts_command': None,
                'metadata': {
                    'error': 'content_filtered',
                    'fallback': True
                }
            }
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            fallback_response = self._get_fallback_response(detected_language)
            
            return {
                'text': fallback_response,
                'language': detected_language,
                'tts_command': None,
                'metadata': {
                    'error': str(e),
                    'fallback': True
                }
            }
    
    def _build_context(self, session_context: Optional[Dict]) -> Dict:
        """Build context from session and conversation history"""
        context = {
            'conversation_history': self.conversation_memory.to_string(),
            'turn_count': len(self.conversation_memory.messages) // 2
        }
        
        if session_context:
            context.update(session_context)
            
        return context
    
    def _create_prompt(self, user_input: str, language: str, context: Dict) -> str:
        """Create prompt for Gemini"""
        
        system_prompt = """You are Rin (りん), a friendly bilingual AI Vtuber assistant for AIVlingual, 
a revolutionary language learning platform that transforms Vtuber content into educational resources.

🎯 Core Mission: Convert entertainment into education by teaching Japanese through Vtuber culture.

Key behaviors:
1. LANGUAGE MIXING:
   - If user speaks Japanese: Respond primarily in Japanese (70%) with some English explanations (30%)
   - If user speaks English: Respond primarily in English (70%) with Japanese vocabulary (30%)
   - NEVER use romaji (romanized Japanese) - always use proper Japanese characters
   - Include furigana for difficult kanji when needed

2. VTUBER CULTURE EXPERTISE:
   - Recognize and explain Vtuber slang (てぇてぇ, ぽんこつ, 草, etc.)
   - Reference popular Vtuber moments when relevant
   - Use appropriate internet culture terms naturally

3. EDUCATIONAL VALUE:
   - Highlight one interesting vocabulary or grammar point per response
   - Provide difficulty ratings (N5-N1) for Japanese expressions
   - Create memorable examples using Vtuber contexts

4. PERSONALITY:
   - Introduce yourself as "Rin" (りん) when asked
   - Energetic and supportive like a Vtuber
   - Use emotes sparingly but effectively (max 1-2 per response)
   - Keep responses concise (2-3 sentences) but informative

5. LEARNING REINFORCEMENT:
   - When teaching new words, show: [Word | Reading | Meaning | Difficulty]
   - Example: [配信 | はいしん | stream/broadcast | N3]
   - Always write Japanese properly, never in romaji

6. RESPONSE QUALITY:
   - Match the formality level of the user's input
   - For Japanese input, respond naturally in Japanese
   - Keep cultural context appropriate

Previous conversation:
{conversation_history}

Current turn: {turn_count}
User language detected: {user_language}
"""
        
        formatted_prompt = system_prompt.format(
            conversation_history=context.get('conversation_history', 'No previous conversation'),
            turn_count=context.get('turn_count', 1),
            user_language=language
        )
        
        # Add language-specific instruction
        if language == 'ja-JP':
            language_instruction = "\n\nIMPORTANT: The user is speaking in Japanese. You MUST respond primarily in Japanese (70%) with some English explanations (30%). Use proper Japanese characters, NOT romaji."
        else:
            language_instruction = "\n\nIMPORTANT: The user is speaking in English. Respond primarily in English (70%) with Japanese vocabulary teaching (30%)."
        
        return f"{formatted_prompt}{language_instruction}\n\nUser ({language}): {user_input}\nAssistant:"
    
    def _determine_response_language(self, response_text: str, user_language: str) -> str:
        """Determine the primary language of the response"""
        # Count Japanese characters
        japanese_chars = sum(1 for c in response_text if 
                           '\u3000' <= c <= '\u9fff' or 
                           '\u3040' <= c <= '\u309f' or 
                           '\u30a0' <= c <= '\u30ff')
        
        total_chars = len(response_text.replace(' ', ''))
        
        if total_chars == 0:
            return user_language
            
        japanese_ratio = japanese_chars / total_chars
        
        # If response is mostly Japanese
        if japanese_ratio > 0.5:
            return 'ja-JP'
        else:
            return 'en-US'
    
    def _detect_user_language(self, text: str) -> str:
        """Detect the language of user input"""
        # Count Japanese characters
        japanese_chars = sum(1 for c in text if 
                           '\u3000' <= c <= '\u9fff' or 
                           '\u3040' <= c <= '\u309f' or 
                           '\u30a0' <= c <= '\u30ff')
        
        total_chars = len(text.replace(' ', ''))
        
        if total_chars == 0:
            return 'en-US'
            
        japanese_ratio = japanese_chars / total_chars
        
        # If input is mostly Japanese
        if japanese_ratio > 0.3:  # Lower threshold for user input
            return 'ja-JP'
        else:
            return 'en-US'
    
    def _get_fallback_response(self, language: str) -> str:
        """Get fallback response when AI generation fails"""
        fallback_responses = {
            'ja': 'すみません、今は応答できません。もう一度お試しください。',
            'ja-JP': 'すみません、今は応答できません。もう一度お試しください。',
            'en': "Sorry, I couldn't process that. Please try again.",
            'en-US': "Sorry, I couldn't process that. Please try again.",
            'unknown': "Sorry, I couldn't process that. Please try again."
        }
        
        return fallback_responses.get(language, fallback_responses['unknown'])
    
    def reset_conversation(self):
        """Reset conversation memory"""
        self.conversation_memory.clear()
        logger.info("Conversation memory reset")
    
    async def generate_response_stream(
        self,
        user_input: str,
        detected_language: str,
        session_context: Optional[Dict] = None,
        client_id: str = "default"
    ) -> AsyncIterator[Dict]:
        """Generate AI response with streaming support"""
        
        try:
            # Check rate limit
            if not await rate_limiter.check_rate_limit(client_id):
                retry_after = rate_limiter.get_retry_after(client_id)
                yield {
                    'type': 'error',
                    'text': f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                    'language': detected_language,
                    'tts_command': None,
                    'metadata': {
                        'error': 'rate_limit_exceeded',
                        'retry_after': retry_after,
                        'is_final': True
                    }
                }
                return
            
            # Detect actual language if set to auto
            if detected_language == 'auto':
                detected_language = self._detect_user_language(user_input)
                logger.info(f"Detected user language: {detected_language} for input: {user_input[:50]}...")
            
            # Add user message to memory
            self.conversation_memory.add_message("user", user_input)
            
            # Build context from session and conversation history
            context = self._build_context(session_context)
            
            # Create prompt for Gemini
            prompt = self._create_prompt(user_input, detected_language, context)
            
            # Generate streaming response
            # Note: We need to run the blocking call in a thread
            def generate_content_sync():
                return self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=settings.AI_TEMPERATURE,
                        max_output_tokens=256,
                    ),
                    stream=True  # Enable streaming
                )
            
            response_stream = await asyncio.to_thread(generate_content_sync)
            
            # Collect chunks for full response
            full_response = ""
            
            # Stream chunks
            try:
                for chunk in response_stream:
                    if chunk.text:
                        chunk_text = chunk.text
                        full_response += chunk_text
                        
                        # Determine chunk language
                        chunk_language = self._determine_response_language(
                            chunk_text, 
                            detected_language
                        )
                        
                        logger.debug(f"Streaming chunk: {chunk_text[:50]}...")
                        
                        yield {
                            'type': 'chunk',
                            'text': chunk_text,
                            'language': chunk_language,
                            'metadata': {
                                'user_language': detected_language,
                                'is_final': False
                            }
                        }
            except Exception as e:
                logger.error(f"Error during streaming: {str(e)}")
                raise
            
            # Add complete response to memory
            self.conversation_memory.add_message("assistant", full_response)
            
            # Determine final response language based on content and user language
            # Count Japanese characters in response
            japanese_chars = sum(1 for c in full_response if 
                               '\u3000' <= c <= '\u9fff' or 
                               '\u3040' <= c <= '\u309f' or 
                               '\u30a0' <= c <= '\u30ff')
            total_chars = len(full_response.replace(' ', ''))
            japanese_ratio = japanese_chars / total_chars if total_chars > 0 else 0
            
            # If user language is Japanese and response contains Japanese, use Japanese TTS
            if detected_language == 'ja-JP' and japanese_ratio > 0.3:
                response_language = 'ja-JP'
            else:
                response_language = self._determine_response_language(
                    full_response, 
                    detected_language
                )
            
            # Generate TTS command for complete response
            tts_command = await self.tts_service.synthesize_text(
                text=full_response,
                language=response_language,
                voice_settings={
                    'rate': 0.9 if response_language == 'ja-JP' else 1.0
                }
            )
            
            # Send final message with TTS
            yield {
                'type': 'final',
                'text': full_response,
                'language': response_language,
                'tts_command': tts_command,
                'metadata': {
                    'user_language': detected_language,
                    'conversation_turns': len(self.conversation_memory.messages) // 2,
                    'is_final': True
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating streaming AI response: {str(e)}")
            fallback_response = self._get_fallback_response(detected_language)
            
            yield {
                'type': 'error',
                'text': fallback_response,
                'language': detected_language,
                'tts_command': None,
                'metadata': {
                    'error': str(e),
                    'fallback': True,
                    'is_final': True
                }
            }