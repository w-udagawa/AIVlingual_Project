"""
Conversation-related API endpoints
"""

from fastapi import APIRouter, HTTPException, Path
from typing import Optional
import logging

from app.services.database_service import db_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/sessions")
async def get_conversation_sessions(limit: int = 10):
    """Get recent conversation sessions"""
    try:
        sessions = await db_service.get_conversation_sessions(limit)
        return {
            "sessions": sessions,
            "total": len(sessions)
        }
    except Exception as e:
        logger.error(f"Error fetching sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_conversation_detail(
    session_id: str = Path(..., description="Conversation session ID")
):
    """Get detailed conversation messages for a session"""
    try:
        messages = await db_service.get_conversation_messages(session_id)
        if not messages:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "session_id": session_id,
            "messages": messages,
            "message_count": len(messages)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))