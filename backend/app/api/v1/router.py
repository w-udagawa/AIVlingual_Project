"""
API v1 main router
"""

from fastapi import APIRouter
from .endpoints import vocabulary, youtube, conversation, health

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(vocabulary.router, prefix="/vocabulary", tags=["vocabulary"])
api_router.include_router(youtube.router, prefix="/youtube", tags=["youtube"])
api_router.include_router(conversation.router, prefix="/conversation", tags=["conversation"])