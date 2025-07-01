"""
Vocabulary-related API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from app.services.database_service import db_service
from app.models.vocabulary import VocabularyModel

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_vocabulary_items(
    limit: int = Query(50, ge=1, le=100),
    difficulty: Optional[int] = Query(None, ge=1, le=5),
    search: Optional[str] = Query(None)
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
            items = await db_service.get_vocabulary_items(
                limit=limit,
                difficulty_level=difficulty
            )
        
        return {
            "items": items,
            "total": len(items),
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
        stats = await db_service.get_vocabulary_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))