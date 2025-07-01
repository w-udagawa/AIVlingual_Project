"""
Speech synthesis and AI response handler
"""

import logging
from typing import Dict, Any
from fastapi import WebSocket

from app.core.ai_responder import BilingualAIResponder
from app.services.browser_tts_service import BrowserTTSService
from app.models.conversation import ConversationModel
from app.core.config import settings
from .base import BaseWebSocketHandler

ai_responder = BilingualAIResponder()
browser_tts_service = BrowserTTSService()

logger = logging.getLogger(__name__)


class SpeechHandler(BaseWebSocketHandler):
    """Handles speech synthesis and AI responses"""
    
    @classmethod
    async def handle_generate_response(cls, websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Generate AI response for user input"""
        try:
            # Validate required fields
            error = cls.validate_required_fields(data, ['text'])
            if error:
                await cls.send_error(websocket, error)
                return
            
            text = data['text']
            context = data.get('context', {})
            conversation_id = data.get('conversation_id')
            
            # Generate AI response
            response = await ai_responder.generate_response(
                user_input=text,
                detected_language=context.get('language', 'auto'),
                session_context=context,
                client_id=client_id
            )
            
            if response:
                # Send AI response
                await websocket.send_json({
                    'type': 'ai_response',
                    'text': response['text'],
                    'language': response['language'],
                    'tts_command': response.get('tts_command'),
                    'metadata': response.get('metadata', {})
                })
                
                # If TTS is enabled, send synthesis command
                if data.get('enable_tts', True):
                    await SpeechHandler.handle_synthesize_speech(
                        websocket, 
                        client_id,
                        {
                            'text': response['text'],
                            'language': response['language'],
                            'emotion': response.get('metadata', {}).get('emotion')
                        }
                    )
                
                logger.info(f"AI response generated for client {client_id}")
                
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Response generation error: {str(e)}'
            })
    
    @staticmethod
    async def handle_synthesize_speech(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Handle speech synthesis request"""
        try:
            text = data.get('text', '')
            language = data.get('language', 'ja-JP')
            voice_settings = data.get('voice_settings', {})
            
            if not text:
                await websocket.send_json({
                    'type': 'error',
                    'message': 'No text provided for synthesis'
                })
                return
            
            # Use browser TTS service
            synthesis_command = await browser_tts_service.synthesize_text(
                text=text,
                language=language,
                voice_settings=voice_settings
            )
            
            # Send synthesis command to client
            await websocket.send_json({
                'type': 'tts_command',
                'command': synthesis_command
            })
            
            logger.info(f"TTS command sent for client {client_id}")
            
        except Exception as e:
            logger.error(f"Error synthesizing speech: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Speech synthesis error: {str(e)}'
            })
    
    @staticmethod
    async def handle_generate_response_stream(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Generate AI response with streaming support"""
        logger.info(f"handle_generate_response_stream called for {client_id} with data: {data}")
        try:
            text = data.get('text', '')
            context = data.get('context', {})
            conversation_id = data.get('conversation_id')
            enable_streaming = data.get('enable_streaming', True)
            
            logger.info(f"Processing request - text: {text[:50]}..., streaming: {enable_streaming}, STREAM_ENABLED: {settings.STREAM_ENABLED}")
            
            if not text:
                await websocket.send_json({
                    'type': 'error',
                    'message': 'No text provided for response generation'
                })
                return
            
            # Check if streaming is enabled in config and requested by client
            if settings.STREAM_ENABLED and enable_streaming:
                # Generate streaming AI response
                async for chunk in ai_responder.generate_response_stream(
                    user_input=text,
                    detected_language=context.get('language', 'auto'),
                    session_context=context,
                    client_id=client_id
                ):
                    if chunk['type'] == 'chunk':
                        # Send partial response chunk
                        await websocket.send_json({
                            'type': 'ai_response_chunk',
                            'text': chunk['text'],
                            'language': chunk['language'],
                            'metadata': chunk.get('metadata', {})
                        })
                    elif chunk['type'] == 'final':
                        # Send final response with TTS
                        await websocket.send_json({
                            'type': 'ai_response_final',
                            'text': chunk['text'],
                            'language': chunk['language'],
                            'tts_command': chunk.get('tts_command'),
                            'metadata': chunk.get('metadata', {})
                        })
                        
                        # If TTS is enabled, send synthesis command
                        if data.get('enable_tts', True) and chunk.get('tts_command'):
                            await SpeechHandler.handle_synthesize_speech(
                                websocket, 
                                client_id,
                                {
                                    'text': chunk['text'],
                                    'language': chunk['language'],
                                    'emotion': chunk.get('metadata', {}).get('emotion')
                                }
                            )
                    elif chunk['type'] == 'error':
                        # Send error message
                        await websocket.send_json({
                            'type': 'error',
                            'message': chunk['text'],
                            'metadata': chunk.get('metadata', {})
                        })
                
                logger.info(f"Streaming AI response completed for client {client_id}")
            else:
                # Fall back to non-streaming response
                logger.info(f"Falling back to non-streaming response for {client_id}")
                await SpeechHandler.handle_generate_response(websocket, client_id, data)
                
        except Exception as e:
            logger.error(f"Error generating streaming response: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Streaming response generation error: {str(e)}'
            })
    
    @staticmethod
    async def handle_tts_status(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Handle TTS status updates from client"""
        try:
            status = data.get('status')
            synthesis_id = data.get('synthesis_id')
            
            if status == 'started':
                logger.info(f"TTS started for synthesis {synthesis_id}")
                # Update avatar state
                await websocket.send_json({
                    'type': 'avatar_state',
                    'state': 'talking'
                })
                
            elif status == 'completed':
                logger.info(f"TTS completed for synthesis {synthesis_id}")
                # Update avatar state
                await websocket.send_json({
                    'type': 'avatar_state',
                    'state': 'idle'
                })
                
            elif status == 'error':
                error_message = data.get('error', 'Unknown TTS error')
                logger.error(f"TTS error for synthesis {synthesis_id}: {error_message}")
                await websocket.send_json({
                    'type': 'error',
                    'message': f'TTS error: {error_message}'
                })
                
        except Exception as e:
            logger.error(f"Error handling TTS status: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'TTS status error: {str(e)}'
            })