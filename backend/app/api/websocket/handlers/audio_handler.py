"""
Audio-related WebSocket message handler
"""

import logging
from typing import Dict, Any
from fastapi import WebSocket

from app.core.speech_processor import SpeechProcessor
from app.services.speech.speech_manager import speech_manager

speech_processor = SpeechProcessor()

logger = logging.getLogger(__name__)


class AudioHandler:
    """Handles audio-related WebSocket messages"""
    
    @staticmethod
    async def handle_audio_data(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Process incoming audio data"""
        try:
            audio_data = data.get('audio_data')
            if not audio_data:
                await websocket.send_json({
                    'type': 'error',
                    'message': 'No audio data provided'
                })
                return
            
            # Process audio with speech processor
            result = await speech_processor.process_audio_chunk(client_id, audio_data)
            
            if result:
                # Send transcription result
                await websocket.send_json({
                    'type': 'transcription',
                    'text': result.get('text', ''),
                    'language': result.get('language', 'unknown'),
                    'is_final': result.get('is_final', False),
                    'confidence': result.get('confidence', 0.0)
                })
                
                logger.info(f"Audio processed for client {client_id}: {result.get('text', '')[:50]}...")
                
        except Exception as e:
            logger.error(f"Error processing audio: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Audio processing error: {str(e)}'
            })
    
    @staticmethod
    async def handle_start_recording(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Start audio recording session"""
        try:
            language = data.get('language', 'auto')
            provider = data.get('provider', 'azure')  # 'azure' or 'web'
            
            # Initialize the appropriate speech service
            if provider == 'web':
                # Web Speech API handles recording on client side
                await websocket.send_json({
                    'type': 'recording_started',
                    'provider': 'web',
                    'message': 'Web Speech API ready'
                })
            else:
                # Use speech manager
                success = await speech_manager.start_recognition(
                    client_id=client_id,
                    language=language,
                    provider=provider
                )
                
                if success:
                    await websocket.send_json({
                        'type': 'recording_started',
                        'provider': 'azure',
                        'message': 'Azure Speech recognition started'
                    })
                else:
                    await websocket.send_json({
                        'type': 'error',
                        'message': 'Failed to start Azure recognition'
                    })
                    
        except Exception as e:
            logger.error(f"Error starting recording: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Failed to start recording: {str(e)}'
            })
    
    @staticmethod
    async def handle_stop_recording(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Stop audio recording session"""
        try:
            provider = data.get('provider', 'azure')
            
            # Use speech manager
            await speech_manager.stop_recognition(client_id)
            
            # Clean up any audio processing resources
            speech_processor.cleanup_client(client_id)
            
            await websocket.send_json({
                'type': 'recording_stopped',
                'message': 'Recording stopped successfully'
            })
            
        except Exception as e:
            logger.error(f"Error stopping recording: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Failed to stop recording: {str(e)}'
            })
    
    @staticmethod
    async def handle_web_speech_result(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Handle Web Speech API recognition results"""
        try:
            result = await speech_manager.process_recognition_result(client_id, data)
            
            if result:
                await websocket.send_json({
                    'type': 'transcription',
                    'text': result.get('transcript', ''),
                    'language': result.get('language', 'unknown'),
                    'is_final': result.get('is_final', False),
                    'confidence': result.get('confidence', 0.0)
                })
                
        except Exception as e:
            logger.error(f"Error processing Web Speech result: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Web Speech processing error: {str(e)}'
            })