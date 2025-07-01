"""
Azure Speech Service provider
"""

import logging
from typing import Dict, Any, Optional
import azure.cognitiveservices.speech as speechsdk

from app.core.config import settings
from .base import BaseSpeechService, SpeechProvider

logger = logging.getLogger(__name__)


class AzureSpeechProvider(BaseSpeechService):
    """Azure Cognitive Services Speech provider"""
    
    def __init__(self):
        super().__init__(SpeechProvider.AZURE)
        self.speech_config = None
        self._recognizers: Dict[str, speechsdk.SpeechRecognizer] = {}
        
        if settings.AZURE_SPEECH_KEY:
            self.speech_config = speechsdk.SpeechConfig(
                subscription=settings.AZURE_SPEECH_KEY,
                region=settings.AZURE_SPEECH_REGION
            )
            self.speech_config.speech_recognition_language = "ja-JP"
            self.speech_config.set_property(
                speechsdk.PropertyId.SpeechServiceConnection_LanguageIdMode,
                "Continuous"
            )
    
    async def start_recognition(self, client_id: str, language: str = 'auto', **kwargs) -> bool:
        """Start continuous speech recognition"""
        if not self.speech_config:
            logger.error("Azure Speech not configured")
            return False
        
        try:
            # Create audio configuration
            audio_config = speechsdk.audio.AudioConfig(use_default_microphone=True)
            
            # Create recognizer with auto language detection if needed
            if language == 'auto':
                auto_detect_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig(
                    languages=["ja-JP", "en-US"]
                )
                recognizer = speechsdk.SpeechRecognizer(
                    speech_config=self.speech_config,
                    audio_config=audio_config,
                    auto_detect_source_language_config=auto_detect_config
                )
            else:
                self.speech_config.speech_recognition_language = language
                recognizer = speechsdk.SpeechRecognizer(
                    speech_config=self.speech_config,
                    audio_config=audio_config
                )
            
            # Set up event handlers
            def recognized_cb(evt):
                if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
                    result = {
                        'text': evt.result.text,
                        'language': getattr(evt.result, 'language', language),
                        'confidence': 0.95,  # Azure doesn't provide confidence scores
                        'is_final': True
                    }
                    # Store result for retrieval
                    session = self.get_session(client_id) or {}
                    session['last_result'] = result
                    self.set_session(client_id, session)
            
            def recognizing_cb(evt):
                if evt.result.reason == speechsdk.ResultReason.RecognizingSpeech:
                    result = {
                        'text': evt.result.text,
                        'language': getattr(evt.result, 'language', language),
                        'confidence': 0.0,
                        'is_final': False
                    }
                    session = self.get_session(client_id) or {}
                    session['interim_result'] = result
                    self.set_session(client_id, session)
            
            recognizer.recognized.connect(recognized_cb)
            recognizer.recognizing.connect(recognizing_cb)
            
            # Start continuous recognition
            recognizer.start_continuous_recognition()
            self._recognizers[client_id] = recognizer
            
            logger.info(f"Started Azure speech recognition for client {client_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start Azure recognition: {str(e)}")
            return False
    
    async def stop_recognition(self, client_id: str) -> None:
        """Stop continuous speech recognition"""
        if client_id in self._recognizers:
            try:
                self._recognizers[client_id].stop_continuous_recognition()
                del self._recognizers[client_id]
                logger.info(f"Stopped Azure recognition for client {client_id}")
            except Exception as e:
                logger.error(f"Error stopping recognition: {str(e)}")
        
        self.cleanup_session(client_id)
    
    async def process_audio(self, client_id: str, audio_data: bytes) -> Optional[Dict[str, Any]]:
        """Process audio data - not used for Azure (uses microphone directly)"""
        logger.warning("Azure provider uses direct microphone input, not audio chunks")
        return None
    
    def cleanup_session(self, client_id: str) -> None:
        """Clean up resources"""
        if client_id in self._recognizers:
            try:
                self._recognizers[client_id].stop_continuous_recognition()
                del self._recognizers[client_id]
            except:
                pass
        super().cleanup_session(client_id)