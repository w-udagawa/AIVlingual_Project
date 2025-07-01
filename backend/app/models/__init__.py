"""
Data models for AIVlingual
"""

from .conversation import ConversationModel, ConversationTurn
from .vocabulary import VocabularyModel, VocabularyExtractRequest, VocabularyListResponse

__all__ = [
    "ConversationModel",
    "ConversationTurn",
    "VocabularyModel", 
    "VocabularyExtractRequest",
    "VocabularyListResponse"
]