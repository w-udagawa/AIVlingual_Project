"""
Data models for conversations and vocabulary
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class LanguageEnum(str, Enum):
    """Supported languages"""
    JAPANESE = "ja"
    ENGLISH = "en"
    MIXED = "mixed"
    UNKNOWN = "unknown"


class ConversationRole(str, Enum):
    """Conversation participant roles"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationTurn(BaseModel):
    """Single turn in a conversation"""
    role: ConversationRole
    content: str
    language: LanguageEnum
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[dict] = None


class ConversationModel(BaseModel):
    """Full conversation model"""
    session_id: str
    turns: List[ConversationTurn] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    language_preference: Optional[LanguageEnum] = None
    context: Optional[dict] = None


class VocabularyModel(BaseModel):
    """Vocabulary item model"""
    japanese_text: str
    english_text: str
    context: str
    source_video_id: Optional[str] = None
    video_timestamp: Optional[float] = None
    difficulty_level: int = Field(ge=1, le=5, default=3)
    notion_id: Optional[str] = None
    synced_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []
    usage_examples: List[str] = []
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SessionModel(BaseModel):
    """Session model"""
    id: str
    user_id: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    language_preference: Optional[LanguageEnum] = None
    conversation_turns: int = 0
    context: dict = {}
    preferences: dict = {}


class AudioMessage(BaseModel):
    """Audio message model for WebSocket"""
    type: str = "audio"
    data: bytes
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sample_rate: int = 16000
    channels: int = 1


class TextMessage(BaseModel):
    """Text message model for WebSocket"""
    type: str = "text"
    content: str
    language: Optional[LanguageEnum] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ControlMessage(BaseModel):
    """Control message model for WebSocket"""
    type: str = "control"
    command: str
    parameters: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)