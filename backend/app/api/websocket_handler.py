"""
WebSocket handler for real-time audio streaming and communication
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json
import asyncio
import logging

from app.core.speech_processor import SpeechProcessor
from app.core.ai_responder import BilingualAIResponder
from app.services.session_manager import SessionManager
from app.services.vocabulary_extractor import VocabularyExtractor
from app.api.websocket.handlers import (
    AudioHandler,
    SpeechHandler,
    VocabularyHandler,
    ControlHandler,
    WebSpeechHandler
)

logger = logging.getLogger(__name__)
websocket_router = APIRouter()

class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected")
        
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected")
            
    async def send_message(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)
            
    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()
speech_processor = SpeechProcessor()
ai_responder = BilingualAIResponder()
session_manager = SessionManager()
vocabulary_extractor = VocabularyExtractor()


@websocket_router.websocket("/audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    """WebSocket endpoint for audio streaming"""
    client_id = await session_manager.create_session()
    
    try:
        await manager.connect(websocket, client_id)
        
        # Send initial connection confirmation
        await manager.send_message(client_id, {
            "type": "connection",
            "status": "connected",
            "client_id": client_id
        })
        
        # Create processing tasks
        audio_queue = asyncio.Queue()
        
        # Start audio processing task
        processing_task = asyncio.create_task(
            process_audio_stream(client_id, audio_queue)
        )
        
        # Main message loop
        while True:
            try:
                # Receive message from client
                message = await websocket.receive()
                
                # Check if we received a disconnect message
                if message.get("type") == "websocket.disconnect":
                    logger.info(f"Received disconnect message from {client_id}")
                    break
                    
                # Handle different message types
                if "bytes" in message:
                    # Legacy audio streaming support
                    data = message["bytes"]
                    if data.startswith(b'AUDIO:'):
                        await audio_queue.put(data[6:])  # Remove 'AUDIO:' prefix
                elif "text" in message:
                    # Handle JSON messages (including Web Speech API results)
                    try:
                        msg_data = json.loads(message["text"])
                        await handle_message(client_id, msg_data)
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON message from {client_id}: {message['text']}")
            except asyncio.CancelledError:
                # Task was cancelled, exit gracefully
                logger.info(f"Message loop cancelled for {client_id}")
                break
            except Exception as e:
                logger.error(f"Error in message loop for {client_id}: {str(e)}")
                break
                    
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"Error in websocket connection {client_id}: {str(e)}")
    finally:
        # Cleanup
        manager.disconnect(client_id)
        await session_manager.end_session(client_id)
        
        # Cancel the processing task gracefully
        if not processing_task.done():
            processing_task.cancel()
            try:
                await processing_task
            except asyncio.CancelledError:
                pass


async def process_audio_stream(client_id: str, audio_queue: asyncio.Queue):
    """Process audio stream from queue"""
    buffer = bytearray()
    
    try:
        while True:
            # Get audio chunk from queue
            chunk = await audio_queue.get()
            buffer.extend(chunk)
            
            # Process when buffer reaches threshold
            if len(buffer) >= speech_processor.get_chunk_size():
                # Extract chunk for processing
                audio_chunk = bytes(buffer[:speech_processor.get_chunk_size()])
                buffer = buffer[speech_processor.get_chunk_size():]
                
                # Process audio chunk
                result = await speech_processor.process_chunk(audio_chunk)
                
                if result.get('is_final'):
                    # Send transcription to client
                    await manager.send_message(client_id, {
                        "type": "transcription",
                        "text": result['text'],
                        "language": result['language'],
                        "confidence": result['confidence']
                    })
                    
                    # Generate AI response
                    session_context = await session_manager.get_context(client_id)
                    response = await ai_responder.generate_response(
                        result['text'],
                        result['language'],
                        session_context
                    )
                    
                    # Send AI response
                    await manager.send_message(client_id, {
                        "type": "ai_response",
                        "text": response['text'],
                        "language": response['language'],
                        "tts_command": response.get('tts_command'),
                        "metadata": response.get('metadata', {})
                    })
                    
                    # Update session context
                    await session_manager.update_context(
                        client_id,
                        user_input=result['text'],
                        ai_response=response['text']
                    )
                    
    except asyncio.CancelledError:
        logger.info(f"Audio processing cancelled for {client_id}")
    except Exception as e:
        logger.error(f"Error processing audio for {client_id}: {str(e)}")
        await manager.send_message(client_id, {
            "type": "error",
            "message": "Audio processing error occurred"
        })


async def handle_message(client_id: str, message: dict):
    """Handle messages from client including Web Speech API results"""
    msg_type = message.get('type')
    logger.info(f"Handling message from {client_id}: type={msg_type}, message={message}")
    
    # Create a WebSocket wrapper to work with existing handlers
    websocket = manager.active_connections.get(client_id)
    if not websocket:
        logger.error(f"No active connection found for client {client_id}")
        return
    
    # Route to appropriate handler
    handlers = {
        # Audio/Speech recognition
        'speech_recognition': WebSpeechHandler.handle_web_speech_result,
        'web_speech_result': WebSpeechHandler.handle_web_speech_result,
        'speech_error': WebSpeechHandler.handle_speech_error,
        'language_change': WebSpeechHandler.handle_language_change,
        
        # AI response generation
        'generate_response': SpeechHandler.handle_generate_response,
        'generate_response_stream': SpeechHandler.handle_generate_response_stream,
        'synthesize_speech': SpeechHandler.handle_synthesize_speech,
        'tts_status': SpeechHandler.handle_tts_status,
        'tts_command': handle_tts_command,  # Add TTS command handler
        
        # Vocabulary
        'extract_vocabulary': VocabularyHandler.handle_extract_vocabulary,
        'save_vocabulary': VocabularyHandler.handle_save_vocabulary,
        'highlight_vocabulary': VocabularyHandler.handle_highlight_vocabulary,
        
        # Control
        'ping': ControlHandler.handle_ping,
        'language_preference': handle_language_preference,
        'reset_context': handle_reset_context,
        'config_update': ControlHandler.handle_config_update,
        'obs_command': ControlHandler.handle_obs_command,
        'session_command': ControlHandler.handle_session_command,
    }
    
    handler = handlers.get(msg_type)
    if handler:
        # Check if it's a new modular handler or legacy handler
        if handler.__module__.startswith('app.api.websocket.handlers'):
            # New modular handlers expect (websocket, client_id, data)
            await handler(websocket, client_id, message)
        else:
            # Legacy handlers
            await handler(client_id, message)
    else:
        logger.warning(f"Unknown message type: {msg_type}")
        await websocket.send_json({
            'type': 'error',
            'message': f'Unknown message type: {msg_type}'
        })


# Legacy handlers (to be refactored later)
async def handle_web_speech_recognition(client_id: str, message: dict):
    """Handle Web Speech API result (legacy)"""
    # This function is now handled by WebSpeechHandler
    pass


async def handle_speech_error(client_id: str, message: dict):
    """Handle Web Speech API error (legacy)"""
    # This function is now handled by WebSpeechHandler
    pass


async def handle_language_preference(client_id: str, message: dict):
    """Update language preference (legacy)"""
    await session_manager.set_preference(
        client_id,
        'language',
        message.get('language')
    )


async def handle_reset_context(client_id: str, message: dict):
    """Reset conversation context (legacy)"""
    await session_manager.reset_context(client_id)
    await manager.send_message(client_id, {
        "type": "context_reset",
        "status": "success"
    })


async def handle_tts_command(client_id: str, message: dict):
    """Handle TTS command acknowledgment (legacy)"""
    # Simply acknowledge the TTS command was received
    # The actual TTS is handled by the client-side browser
    command = message.get('command', {})
    logger.debug(f"TTS command received from {client_id}: {command.get('text', '')[:50]}...")
    
    await manager.send_message(client_id, {
        "type": "tts_acknowledged",
        "status": "success"
    })