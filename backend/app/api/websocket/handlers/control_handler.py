"""
Control and system message handler
"""

import logging
from typing import Dict, Any
from fastapi import WebSocket
from datetime import datetime

from app.services.obs_service import obs_service
from app.services.session_manager import SessionManager
from app.services.speech_recognition_manager import speech_recognition_manager
from app.core.config import settings

logger = logging.getLogger(__name__)
session_manager = SessionManager()


class ControlHandler:
    """Handles control messages and system commands"""
    
    @staticmethod
    async def handle_ping(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Handle ping/pong for connection keepalive"""
        await websocket.send_json({
            'type': 'pong',
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat())
        })
        logger.debug(f"Ping-pong from client {client_id}")
    
    @staticmethod
    async def handle_config_update(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Handle configuration updates from client"""
        try:
            config_type = data.get('config_type')
            config_data = data.get('config_data', {})
            
            if config_type == 'language':
                # Update language preferences
                language = config_data.get('language', 'ja-JP')
                logger.info(f"Updated language preference to {language} for client {client_id}")
                
            elif config_type == 'voice':
                # Update voice settings
                voice_settings = config_data.get('voice_settings', {})
                logger.info(f"Updated voice settings for client {client_id}")
                
            elif config_type == 'obs':
                # Update OBS settings
                obs_settings = config_data.get('obs_settings', {})
                logger.info(f"Updated OBS settings for client {client_id}")
            
            await websocket.send_json({
                'type': 'config_updated',
                'config_type': config_type,
                'message': f'{config_type} configuration updated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error updating config: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Configuration update error: {str(e)}'
            })
    
    @staticmethod
    async def handle_obs_command(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Handle OBS-related commands"""
        try:
            command = data.get('command')
            
            if not command:
                await websocket.send_json({
                    'type': 'error',
                    'message': 'No OBS command specified'
                })
                return
            
            # Connect to OBS if not connected
            if not obs_service.connected:
                await obs_service.connect()
            
            result = None
            
            if command == 'switch_scene':
                scene_name = data.get('scene_name')
                result = await obs_service.switch_scene(scene_name)
                
            elif command == 'toggle_source':
                source_name = data.get('source_name')
                visible = data.get('visible', True)
                result = await obs_service.toggle_source_visibility(source_name, visible)
                
            elif command == 'start_recording':
                result = await obs_service.start_recording()
                
            elif command == 'stop_recording':
                result = await obs_service.stop_recording()
                
            elif command == 'get_status':
                result = obs_service.get_recording_status()
                await websocket.send_json({
                    'type': 'obs_status',
                    'status': result
                })
                return
                
            elif command == 'create_video_scene':
                video_id = data.get('video_id')
                result = await obs_service.create_scene_for_video_analysis(video_id)
            
            else:
                await websocket.send_json({
                    'type': 'error',
                    'message': f'Unknown OBS command: {command}'
                })
                return
            
            # Send command result
            await websocket.send_json({
                'type': 'obs_command_result',
                'command': command,
                'success': bool(result),
                'result': result
            })
            
            logger.info(f"Executed OBS command '{command}' for client {client_id}")
            
        except Exception as e:
            logger.error(f"Error executing OBS command: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'OBS command error: {str(e)}'
            })
    
    @staticmethod
    async def handle_session_command(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Handle session-related commands"""
        try:
            command = data.get('command')
            
            if command == 'start_session':
                session_type = data.get('session_type', 'conversation')
                await websocket.send_json({
                    'type': 'session_started',
                    'session_type': session_type,
                    'client_id': client_id
                })
                
            elif command == 'end_session':
                # Clean up any resources
                speech_session = await speech_recognition_manager.end_session(client_id)
                stats = {}
                if speech_session:
                    stats = {
                        'speech_duration': speech_session.total_duration,
                        'recognitions': speech_session.recognition_count,
                        'errors': speech_session.error_count
                    }
                
                await websocket.send_json({
                    'type': 'session_ended',
                    'client_id': client_id,
                    'stats': stats
                })
                
            elif command == 'get_session_info':
                # Get comprehensive session info
                speech_stats = await speech_recognition_manager.get_session_stats(client_id)
                session_stats = await session_manager.get_session_stats(client_id)
                
                await websocket.send_json({
                    'type': 'session_info',
                    'client_id': client_id,
                    'connected': True,
                    'version': getattr(settings, 'APP_VERSION', '1.0.0'),
                    'speech_stats': speech_stats,
                    'session_stats': session_stats
                })
            
            else:
                await websocket.send_json({
                    'type': 'error',
                    'message': f'Unknown session command: {command}'
                })
                
        except Exception as e:
            logger.error(f"Error handling session command: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Session command error: {str(e)}'
            })