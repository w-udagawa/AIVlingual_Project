"""
Vocabulary models
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class VocabularyModel(BaseModel):
    """Model for vocabulary items"""
    id: Optional[str] = None
    japanese_text: str  # データベースと一致させる
    reading: Optional[str] = None
    english_text: str  # データベースと一致させる
    context: Optional[str] = None
    difficulty_level: int = 3  # 1-5 scale, データベースと一致
    tags: List[str] = []
    source: str = 'conversation'  # 'conversation', 'video', 'manual'
    source_video_id: Optional[str] = None  # データベースと一致
    video_timestamp: Optional[float] = None  # データベースと一致
    notes: Optional[str] = None
    notion_id: Optional[str] = None
    synced_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class VocabularyExtractRequest(BaseModel):
    """Request model for vocabulary extraction"""
    source_type: str = 'conversation'  # 'conversation' or 'video'
    transcript: Optional[str] = None
    video_id: Optional[str] = None
    context: Optional[dict] = None
    sync_to_notion: bool = False


class VocabularyListResponse(BaseModel):
    """Response model for vocabulary list"""
    items: List[VocabularyModel]
    total: int
    page: int = 1
    page_size: int = 50
    has_more: bool = False