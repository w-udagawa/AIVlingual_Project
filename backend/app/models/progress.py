"""
User progress and batch processing models
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class LearningStatus(str, Enum):
    """Learning status for vocabulary items"""
    NEW = "new"
    LEARNING = "learning"
    REVIEWING = "reviewing"
    MASTERED = "mastered"


class BatchStatus(str, Enum):
    """Batch processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class UserProgress(BaseModel):
    """Model for user vocabulary progress"""
    id: Optional[int] = None
    user_id: int
    vocabulary_id: int
    status: LearningStatus = LearningStatus.NEW
    review_count: int = 0
    correct_count: int = 0
    incorrect_count: int = 0
    last_reviewed_at: Optional[datetime] = None
    next_review_at: Optional[datetime] = None
    easiness_factor: float = 2.5  # For spaced repetition
    interval_days: int = 0
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class UserProgressCreate(BaseModel):
    """Create model for user progress"""
    vocabulary_id: int
    status: Optional[LearningStatus] = LearningStatus.NEW
    notes: Optional[str] = None


class UserProgressUpdate(BaseModel):
    """Update model for user progress"""
    status: Optional[LearningStatus] = None
    review_count: Optional[int] = None
    correct_count: Optional[int] = None
    incorrect_count: Optional[int] = None
    last_reviewed_at: Optional[datetime] = None
    next_review_at: Optional[datetime] = None
    easiness_factor: Optional[float] = None
    interval_days: Optional[int] = None
    notes: Optional[str] = None


class BatchProcessingHistory(BaseModel):
    """Model for batch processing history"""
    id: str  # UUID string
    user_id: Optional[int] = None
    total_urls: int
    successful: int = 0
    failed: int = 0
    status: BatchStatus = BatchStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: Optional[Dict[str, Any]] = None  # JSON data
    error_message: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class BatchProcessingCreate(BaseModel):
    """Create model for batch processing"""
    urls: List[str]


class BatchProcessingResult(BaseModel):
    """Result model for individual URL in batch processing"""
    url: str
    status: str  # "success", "error", "processing"
    vocabulary_count: Optional[int] = None
    error_message: Optional[str] = None
    vocabulary_ids: Optional[List[int]] = None


class BatchProcessingStatus(BaseModel):
    """Status response for batch processing"""
    batch_id: str
    status: BatchStatus
    total_urls: int
    processed: int
    successful: int
    failed: int
    results: List[BatchProcessingResult] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class LearningStats(BaseModel):
    """User learning statistics"""
    total_vocabulary: int = 0
    new_count: int = 0
    learning_count: int = 0
    reviewing_count: int = 0
    mastered_count: int = 0
    total_reviews: int = 0
    streak_days: int = 0
    last_review_date: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }