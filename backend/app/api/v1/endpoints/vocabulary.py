"""
Vocabulary-related API endpoints
"""

from fastapi import APIRouter, HTTPException, Query, Depends, Response
from typing import List, Optional
import logging
from datetime import datetime

from app.services.database_service import db_service
from app.models.vocabulary import VocabularyModel
from app.models.user import User
from app.models.progress import (
    UserProgress, UserProgressCreate, UserProgressUpdate,
    LearningStats, LearningStatus
)
from app.api.v1.endpoints.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_vocabulary_items(
    limit: int = Query(50, ge=1, le=100),
    difficulty: Optional[int] = Query(None, ge=1, le=5),
    search: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get vocabulary items with optional filtering"""
    try:
        # Build filter conditions
        filters = {}
        if difficulty:
            filters['difficulty_level'] = difficulty
        if search:
            filters['search'] = search
            
        # Handle search separately if provided
        if search:
            items = await db_service.search_vocabulary(search)
            # Apply difficulty filter on search results if needed
            if difficulty:
                items = [item for item in items if item.get('difficulty_level') == difficulty]
            # Apply limit
            items = items[:limit]
        else:
            # Use get_vocabulary_items for non-search queries
            user_id = current_user.id if current_user else None
            items = await db_service.get_vocabulary_items(
                limit=limit,
                difficulty_level=difficulty,
                user_id=user_id
            )
        
        return {
            "items": items,
            "count": len(items),
            "filters": {
                "limit": limit,
                "difficulty": difficulty,
                "search": search
            }
        }
    except Exception as e:
        logger.error(f"Error fetching vocabulary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_vocabulary_stats():
    """Get vocabulary statistics"""
    try:
        stats = await db_service.get_statistics()  # Use existing method
        return stats
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/csv")
async def export_vocabulary_csv(
    difficulty_level: Optional[int] = Query(None, ge=1, le=5),
    limit: int = Query(1000, le=10000),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Export vocabulary to CSV format"""
    try:
        from app.services.export_service import export_service
        
        user_id = current_user.id if current_user else None
        
        csv_data = await export_service.export_to_csv(
            user_id=user_id,
            difficulty_level=difficulty_level,
            limit=limit
        )
        
        filename = f"aivlingual_vocabulary_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Error exporting vocabulary to CSV: {str(e)}")
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/export/anki")
async def export_vocabulary_anki(
    difficulty_level: Optional[int] = Query(None, ge=1, le=5),
    limit: int = Query(1000, le=10000),
    deck_name: str = Query("AIVlingual Vocabulary"),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Export vocabulary to Anki deck format (apkg)"""
    try:
        from app.services.export_service import export_service
        
        user_id = current_user.id if current_user else None
        
        apkg_data = await export_service.export_to_anki(
            user_id=user_id,
            difficulty_level=difficulty_level,
            limit=limit,
            deck_name=deck_name
        )
        
        filename = f"aivlingual_vocabulary_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.apkg"
        
        return Response(
            content=apkg_data,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Error exporting vocabulary to Anki: {str(e)}")
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/export/json")
async def export_vocabulary_json(
    difficulty_level: Optional[int] = Query(None, ge=1, le=5),
    limit: int = Query(1000, le=10000),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Export vocabulary to JSON format"""
    try:
        from app.services.export_service import export_service
        
        user_id = current_user.id if current_user else None
        
        json_data = await export_service.export_to_json(
            user_id=user_id,
            difficulty_level=difficulty_level,
            limit=limit
        )
        
        filename = f"aivlingual_vocabulary_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        
        return Response(
            content=json_data,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Error exporting vocabulary to JSON: {str(e)}")
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/{vocabulary_id}/progress")
async def get_vocabulary_progress(
    vocabulary_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get user's learning progress for a specific vocabulary item"""
    try:
        progress = await db_service.get_user_progress(
            user_id=current_user.id,
            vocabulary_id=vocabulary_id
        )
        
        if not progress:
            # Return default progress if none exists
            return UserProgress(
                user_id=current_user.id,
                vocabulary_id=vocabulary_id,
                status=LearningStatus.NEW
            )
        
        return progress
        
    except Exception as e:
        logger.error(f"Error fetching vocabulary progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch progress")


@router.post("/{vocabulary_id}/progress")
async def update_vocabulary_progress(
    vocabulary_id: int,
    progress: UserProgressCreate,
    current_user: User = Depends(get_current_user)
):
    """Create or update user's learning progress for a vocabulary item"""
    try:
        # Set vocabulary_id from path parameter
        progress_data = progress.dict()
        progress_data['vocabulary_id'] = vocabulary_id
        
        updated_progress = await db_service.update_user_progress(
            user_id=current_user.id,
            vocabulary_id=vocabulary_id,
            progress_data=progress_data
        )
        
        return updated_progress
        
    except Exception as e:
        logger.error(f"Error updating vocabulary progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update progress")


@router.put("/{vocabulary_id}/progress")
async def update_vocabulary_progress_partial(
    vocabulary_id: int,
    progress: UserProgressUpdate,
    current_user: User = Depends(get_current_user)
):
    """Partially update user's learning progress"""
    try:
        # Only update provided fields
        progress_data = progress.dict(exclude_unset=True)
        
        updated_progress = await db_service.update_user_progress(
            user_id=current_user.id,
            vocabulary_id=vocabulary_id,
            progress_data=progress_data
        )
        
        return updated_progress
        
    except Exception as e:
        logger.error(f"Error updating vocabulary progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update progress")


@router.post("/{vocabulary_id}/review")
async def record_vocabulary_review(
    vocabulary_id: int,
    correct: bool,
    time_spent_seconds: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Record a review session for a vocabulary item"""
    try:
        from app.services.spaced_repetition import calculate_next_review
        
        # Get current progress
        progress = await db_service.get_user_progress(
            user_id=current_user.id,
            vocabulary_id=vocabulary_id
        )
        
        if not progress:
            # Create new progress if doesn't exist
            progress = {
                'user_id': current_user.id,
                'vocabulary_id': vocabulary_id,
                'status': LearningStatus.LEARNING.value,
                'review_count': 0,
                'correct_count': 0,
                'incorrect_count': 0,
                'easiness_factor': 2.5,
                'interval_days': 0
            }
        
        # Update review counts
        progress['review_count'] = progress.get('review_count', 0) + 1
        if correct:
            progress['correct_count'] = progress.get('correct_count', 0) + 1
        else:
            progress['incorrect_count'] = progress.get('incorrect_count', 0) + 1
        
        # Calculate next review using spaced repetition
        easiness_factor, interval_days, next_review_date = calculate_next_review(
            easiness_factor=progress.get('easiness_factor', 2.5),
            interval_days=progress.get('interval_days', 0),
            quality=4 if correct else 2  # Quality: 0-5 scale
        )
        
        progress['easiness_factor'] = easiness_factor
        progress['interval_days'] = interval_days
        progress['last_reviewed_at'] = datetime.utcnow()
        progress['next_review_at'] = next_review_date
        
        # Update status based on review count and accuracy
        accuracy = progress['correct_count'] / progress['review_count']
        if progress['review_count'] >= 5 and accuracy >= 0.8:
            progress['status'] = LearningStatus.MASTERED.value
        elif progress['review_count'] >= 3:
            progress['status'] = LearningStatus.REVIEWING.value
        else:
            progress['status'] = LearningStatus.LEARNING.value
        
        # Save updated progress
        updated_progress = await db_service.update_user_progress(
            user_id=current_user.id,
            vocabulary_id=vocabulary_id,
            progress_data=progress
        )
        
        return {
            "progress": updated_progress,
            "next_review_in_days": interval_days,
            "accuracy": accuracy
        }
        
    except Exception as e:
        logger.error(f"Error recording vocabulary review: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record review")


@router.get("/progress/stats")
async def get_learning_stats(
    current_user: User = Depends(get_current_user)
):
    """Get user's overall learning statistics"""
    try:
        stats = await db_service.get_user_learning_stats(current_user.id)
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching learning stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch stats")


@router.get("/progress/due")
async def get_due_reviews(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get vocabulary items due for review"""
    try:
        due_items = await db_service.get_due_reviews(
            user_id=current_user.id,
            limit=limit
        )
        
        return {
            "items": due_items,
            "total": len(due_items)
        }
        
    except Exception as e:
        logger.error(f"Error fetching due reviews: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch due reviews")