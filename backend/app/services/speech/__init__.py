"""
Speech services package
"""

from .base import BaseSpeechService, SpeechProvider
try:
    from .azure_provider import AzureSpeechProvider
except ImportError:
    AzureSpeechProvider = None
from .web_speech_provider import WebSpeechProvider
from .speech_manager import SpeechManager

__all__ = [
    "BaseSpeechService",
    "SpeechProvider",
    "AzureSpeechProvider", 
    "WebSpeechProvider",
    "SpeechManager"
]