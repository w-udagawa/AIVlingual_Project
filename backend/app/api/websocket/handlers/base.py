"""
Base handler for WebSocket messages
"""

import logging
from typing import Dict, Any, Optional
from fastapi import WebSocket
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseWebSocketHandler(ABC):
    """Base class for WebSocket message handlers"""
    
    @classmethod
    async def send_message(cls, websocket: WebSocket, message_type: str, data: Dict[str, Any]) -> None:
        """Send a standardized message through WebSocket"""
        try:
            await websocket.send_json({
                'type': message_type,
                **data
            })
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            raise
    
    @classmethod
    async def send_error(cls, websocket: WebSocket, message: str, error_type: str = 'error') -> None:
        """Send an error message through WebSocket"""
        await cls.send_message(websocket, error_type, {'message': message})
    
    @classmethod
    async def send_success(cls, websocket: WebSocket, message: str, data: Optional[Dict[str, Any]] = None) -> None:
        """Send a success message through WebSocket"""
        payload = {'message': message}
        if data:
            payload.update(data)
        await cls.send_message(websocket, 'success', payload)
    
    @classmethod
    def validate_required_fields(cls, data: Dict[str, Any], required_fields: list) -> Optional[str]:
        """Validate that required fields are present in the data"""
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            return f"Missing required fields: {', '.join(missing_fields)}"
        return None
    
    @classmethod
    async def handle_with_validation(cls, websocket: WebSocket, client_id: str, data: Dict[str, Any], 
                                    required_fields: list, handler_func) -> None:
        """Handle a message with field validation"""
        error = cls.validate_required_fields(data, required_fields)
        if error:
            await cls.send_error(websocket, error)
            return
        
        try:
            await handler_func(websocket, client_id, data)
        except Exception as e:
            logger.error(f"Error in handler: {str(e)}")
            await cls.send_error(websocket, f"Handler error: {str(e)}")