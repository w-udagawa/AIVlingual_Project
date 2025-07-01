"""
Service layer exports
"""

from .database_service import DatabaseService
from .session_manager import SessionManager
from .vocabulary_extractor import VocabularyExtractor
from .browser_tts_service import BrowserTTSService

# Optional services - will import if dependencies are available
try:
    from .notion_service import NotionService
except ImportError:
    NotionService = None
    
try:
    from .obs_service import OBSService
except ImportError:
    OBSService = None
    
try:
    from .youtube_service import YouTubeService
except ImportError:
    YouTubeService = None
    
try:
    from .speech.speech_manager import SpeechManager
except ImportError:
    SpeechManager = None

__all__ = [
    'DatabaseService',
    'SessionManager',
    'VocabularyExtractor',
    'BrowserTTSService',
    'NotionService',
    'OBSService',
    'YouTubeService',
    'SpeechManager'
]