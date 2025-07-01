"""
Health check and system status endpoints
"""

from fastapi import APIRouter
from typing import Dict, Any
import logging

try:
    from app.services.notion_service import NotionService
except ImportError:
    NotionService = None
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

notion_service = NotionService() if NotionService else None


@router.get("")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "service": "AIVlingual API"}


@router.get("/status")
async def get_system_status() -> Dict[str, Any]:
    """Get system status including service availability"""
    status = {
        "api": "operational",
        "services": {
            "notion": "unknown",
            "youtube": "operational",
            "speech": "operational"
        },
        "configuration": {
            "notion_configured": bool(settings.NOTION_TOKEN),
            "youtube_configured": bool(settings.YOUTUBE_API_KEY),
            "azure_configured": bool(settings.AZURE_SPEECH_KEY)
        }
    }
    
    # Check Notion connectivity
    try:
        if settings.NOTION_TOKEN and notion_service:
            # Make a simple API call to check connectivity
            notion_service.check_connection()
            status["services"]["notion"] = "operational"
        elif not settings.NOTION_TOKEN:
            status["services"]["notion"] = "not_configured"
        else:
            status["services"]["notion"] = "module_not_available"
    except Exception as e:
        logger.error(f"Notion service check failed: {str(e)}")
        status["services"]["notion"] = "error"
    
    return status