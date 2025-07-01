"""
Speech service manager - coordinates between different speech providers
"""

import logging
from typing import Dict, Any, Optional

from app.core.config import settings
from .base import BaseSpeechService, SpeechProvider
try:
    from .azure_provider import AzureSpeechProvider
except ImportError:
    AzureSpeechProvider = None
from .web_speech_provider import WebSpeechProvider

logger = logging.getLogger(__name__)


class SpeechManager:
    """Manages multiple speech service providers"""
    
    def __init__(self):
        self.providers: Dict[SpeechProvider, BaseSpeechService] = {}
        self._client_providers: Dict[str, SpeechProvider] = {}
        
        # Initialize available providers
        self._init_providers()
    
    def _init_providers(self):
        """Initialize available speech providers"""
        # Always initialize Web Speech provider (free)
        self.providers[SpeechProvider.WEB_SPEECH] = WebSpeechProvider()
        logger.info("Initialized Web Speech provider")
        
        # Initialize Azure if configured
        if settings.AZURE_SPEECH_KEY:
            if AzureSpeechProvider:
                self.providers[SpeechProvider.AZURE] = AzureSpeechProvider()
            logger.info("Initialized Azure Speech provider")
    
    def get_provider(self, provider_type: SpeechProvider) -> Optional[BaseSpeechService]:
        """Get a specific provider"""
        return self.providers.get(provider_type)
    
    def get_default_provider(self) -> BaseSpeechService:
        """Get the default provider (Web Speech for free tier)"""
        return self.providers[SpeechProvider.WEB_SPEECH]
    
    async def start_recognition(
        self, 
        client_id: str, 
        provider: Optional[SpeechProvider] = None,
        language: str = 'auto',
        **kwargs
    ) -> bool:
        """Start speech recognition for a client"""
        # Use specified provider or default
        provider_type = provider or SpeechProvider.WEB_SPEECH
        service = self.get_provider(provider_type)
        
        if not service:
            logger.error(f"Provider {provider_type} not available")
            return False
        
        # Track which provider the client is using
        self._client_providers[client_id] = provider_type
        
        return await service.start_recognition(client_id, language, **kwargs)
    
    async def stop_recognition(self, client_id: str) -> None:
        """Stop speech recognition for a client"""
        provider_type = self._client_providers.get(client_id)
        if provider_type:
            service = self.get_provider(provider_type)
            if service:
                await service.stop_recognition(client_id)
            del self._client_providers[client_id]
    
    async def process_audio(self, client_id: str, audio_data: bytes) -> Optional[Dict[str, Any]]:
        """Process audio data"""
        provider_type = self._client_providers.get(client_id)
        if not provider_type:
            logger.error(f"No provider found for client {client_id}")
            return None
        
        service = self.get_provider(provider_type)
        if not service:
            return None
        
        return await service.process_audio(client_id, audio_data)
    
    async def process_recognition_result(
        self, 
        client_id: str, 
        result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process recognition result (for client-side recognition)"""
        provider_type = self._client_providers.get(client_id, SpeechProvider.WEB_SPEECH)
        service = self.get_provider(provider_type)
        
        if not service:
            return {
                'success': False,
                'error': f'Provider {provider_type} not available'
            }
        
        return await service.process_recognition_result(client_id, result)
    
    def cleanup_client(self, client_id: str) -> None:
        """Clean up all resources for a client"""
        provider_type = self._client_providers.get(client_id)
        if provider_type:
            service = self.get_provider(provider_type)
            if service:
                service.cleanup_session(client_id)
            del self._client_providers[client_id]
    
    def get_available_providers(self) -> list[str]:
        """Get list of available providers"""
        return [p.value for p in self.providers.keys()]
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get information about available providers"""
        return {
            'available': self.get_available_providers(),
            'default': SpeechProvider.WEB_SPEECH.value,
            'azure_configured': SpeechProvider.AZURE in self.providers
        }


# Global speech manager instance
speech_manager = SpeechManager()