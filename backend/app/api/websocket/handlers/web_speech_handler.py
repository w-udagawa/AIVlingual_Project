"""
Web Speech API WebSocket message handler
"""

import logging
from typing import Dict, Any, Optional
from fastapi import WebSocket
from datetime import datetime

from app.core.ai_responder import BilingualAIResponder
from app.services.session_manager import SessionManager
from app.services.database_service import db_service
from app.services.language_detector import language_detector
from app.services.speech_recognition_manager import speech_recognition_manager
from app.models.conversation import ConversationModel
from app.core.config import settings

logger = logging.getLogger(__name__)

ai_responder = BilingualAIResponder()
session_manager = SessionManager()


class WebSpeechHandler:
    """Handles Web Speech API results and integration"""
    
    @staticmethod
    async def handle_web_speech_result(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Process Web Speech API recognition results"""
        try:
            speech_data = data.get('data', {})
            transcript = speech_data.get('transcript', '')
            confidence = speech_data.get('confidence', 0.0)
            is_final = speech_data.get('isFinal', False)
            language = speech_data.get('language', 'ja-JP')
            
            if not transcript:
                return
            
            # Handle interim results
            if not is_final:
                await speech_recognition_manager.add_interim_transcript(client_id, transcript)
                logger.debug(f"Interim transcript from {client_id}: {transcript[:50]}...")
                return
            
            logger.info(f"Final transcript from {client_id}: {transcript} (confidence: {confidence:.2f})")
            
            # Update speech session
            await speech_recognition_manager.add_final_transcript(
                client_id, transcript, confidence, language
            )
            
            # Send transcription confirmation
            await websocket.send_json({
                'type': 'transcription_confirmed',
                'text': transcript,
                'language': language,
                'confidence': confidence,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Detect language if auto-detection is enabled
            detected_language = await WebSpeechHandler._detect_language(transcript, language)
            
            # Get session context
            session_context = await session_manager.get_context(client_id)
            session_context['detected_language'] = detected_language
            
            # Generate AI response (with streaming if enabled)
            if settings.STREAM_ENABLED:
                async for chunk in ai_responder.generate_response_stream(
                    user_input=transcript,
                    detected_language=detected_language,
                    session_context=session_context,
                    client_id=client_id
                ):
                    if chunk['type'] == 'chunk':
                        await websocket.send_json({
                            'type': 'ai_response_chunk',
                            'text': chunk['text'],
                            'language': chunk['language'],
                            'metadata': chunk.get('metadata', {})
                        })
                    elif chunk['type'] == 'final':
                        await websocket.send_json({
                            'type': 'ai_response_final',
                            'text': chunk['text'],
                            'language': chunk['language'],
                            'tts_command': chunk.get('tts_command'),
                            'metadata': chunk.get('metadata', {})
                        })
                        
                        # Save to conversation history
                        await WebSpeechHandler._save_conversation(
                            client_id, 
                            transcript, 
                            chunk['text'],
                            detected_language,
                            chunk['language']
                        )
                    elif chunk['type'] == 'error':
                        await websocket.send_json({
                            'type': 'error',
                            'message': chunk['text'],
                            'metadata': chunk.get('metadata', {})
                        })
            else:
                # Non-streaming response
                response = await ai_responder.generate_response(
                    user_input=transcript,
                    detected_language=detected_language,
                    session_context=session_context,
                    client_id=client_id
                )
                
                await websocket.send_json({
                    'type': 'ai_response',
                    'text': response['text'],
                    'language': response['language'],
                    'tts_command': response.get('tts_command'),
                    'metadata': response.get('metadata', {})
                })
                
                # Save to conversation history
                await WebSpeechHandler._save_conversation(
                    client_id, 
                    transcript, 
                    response['text'],
                    detected_language,
                    response['language']
                )
            
            # Update session context
            # Note: In streaming mode, we don't have a single response object
            # The AI response is sent in chunks and saved during the streaming process
            await session_manager.update_context(
                client_id,
                user_input=transcript,
                ai_response=None  # AI response is handled in the streaming chunks
            )
            
        except Exception as e:
            logger.error(f"Error processing Web Speech result: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Speech processing error: {str(e)}'
            })
    
    @staticmethod
    async def handle_speech_error(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Handle Web Speech API errors"""
        try:
            error_data = data.get('data', {})
            error_type = error_data.get('error', 'unknown')
            error_message = error_data.get('message', 'Unknown error')
            
            logger.error(f"Web Speech API error for {client_id}: {error_type} - {error_message}")
            
            # Record error in session
            await speech_recognition_manager.record_error(client_id, error_type, error_message)
            
            # Provide helpful error messages
            user_message = WebSpeechHandler._get_user_friendly_error(error_type)
            
            await websocket.send_json({
                'type': 'speech_error_handled',
                'error': error_type,
                'message': user_message,
                'original_message': error_message
            })
            
        except Exception as e:
            logger.error(f"Error handling speech error: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': 'Failed to process speech error'
            })
    
    @staticmethod
    async def handle_language_change(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Handle language preference changes"""
        try:
            new_language = data.get('language', 'ja-JP')
            
            # Update session preference
            await session_manager.set_preference(client_id, 'language', new_language)
            
            # Reset conversation context for new language
            ai_responder.reset_conversation()
            
            await websocket.send_json({
                'type': 'language_changed',
                'language': new_language,
                'message': f'Language changed to {new_language}'
            })
            
            logger.info(f"Language changed to {new_language} for client {client_id}")
            
        except Exception as e:
            logger.error(f"Error changing language: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': 'Failed to change language'
            })
    
    @staticmethod
    async def _detect_language(text: str, browser_language: str) -> str:
        """Detect language from text with browser hint"""
        
        # Use advanced language detection
        detected_lang, confidence = language_detector.detect_language(text, browser_language)
        
        # Log detection results for debugging
        logger.debug(f"Language detection: {detected_lang} (confidence: {confidence:.2f})")
        
        # If mixed language detected, default to the browser hint or Japanese
        if detected_lang == 'mixed':
            if browser_language and browser_language != 'auto':
                return browser_language
            else:
                return 'ja-JP'  # Default for mixed Vtuber content
        
        return detected_lang
    
    @staticmethod
    async def _save_conversation(
        client_id: str, 
        user_text: str, 
        ai_text: str,
        user_language: str,
        ai_language: str
    ) -> None:
        """Save conversation to database"""
        try:
            conversation = ConversationModel(
                session_id=client_id,
                user_message=user_text,
                ai_response=ai_text,
                user_language=user_language,
                ai_language=ai_language,
                timestamp=datetime.utcnow()
            )
            
            await db_service.save_conversation(conversation)
            
        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}")
    
    @staticmethod
    def _get_user_friendly_error(error_type: str) -> str:
        """Get user-friendly error message"""
        error_messages = {
            'no-speech': 'No speech was detected. Please try speaking clearly.',
            'audio-capture': 'Unable to access microphone. Please check your microphone settings.',
            'not-allowed': 'Microphone permission denied. Please allow microphone access and refresh.',
            'network': 'Network error. Please check your internet connection.',
            'aborted': 'Speech recognition was cancelled.',
            'language-not-supported': 'The selected language is not supported by your browser.',
            'service-not-allowed': 'Speech recognition service is not available.',
            'bad-grammar': 'Speech recognition grammar error.',
        }
        
        return error_messages.get(error_type, f'Speech recognition error: {error_type}')