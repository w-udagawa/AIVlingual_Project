"""
YouTube-related API endpoints
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict
from pydantic import BaseModel
import logging
from datetime import datetime
import asyncio

from app.services.youtube_service import YouTubeService
from app.services.vocabulary_extractor import VocabularyExtractor

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
youtube_service = YouTubeService()
vocabulary_extractor = VocabularyExtractor()

# Global batch progress tracking
batch_progress: Dict[str, dict] = {}


class BatchExtractRequest(BaseModel):
    urls: List[str]
    

class BatchExtractProgress(BaseModel):
    total: int
    completed: int
    failed: int
    current_url: Optional[str] = None
    progress_percentage: float


@router.get("/extract-vocabulary")
async def extract_vocabulary_from_youtube(
    url: str = Query(..., description="YouTube video URL")
):
    """Extract vocabulary from a YouTube video"""
    try:
        # Extract video ID
        video_id = youtube_service._extract_video_id(url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        
        # Process the video
        result = await vocabulary_extractor.process_youtube_video(video_id)
        
        return {
            "success": True,
            "video_id": video_id,
            "vocabulary_count": result.get('vocabulary_count', 0),
            "message": result.get('message', "Video processed successfully"),
            "data": result
        }
    except Exception as e:
        logger.error(f"Error processing YouTube video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-extract")
async def batch_extract_vocabulary(
    request: BatchExtractRequest,
    background_tasks: BackgroundTasks
):
    """Extract vocabulary from multiple YouTube videos"""
    try:
        batch_id = f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Initialize batch progress
        batch_progress[batch_id] = {
            "total": len(request.urls),
            "completed": 0,
            "failed": 0,
            "current_url": None,
            "results": [],
            "status": "processing"
        }
        
        # Start background processing
        background_tasks.add_task(_process_batch, batch_id, request.urls)
        
        return {
            "batch_id": batch_id,
            "total_urls": len(request.urls),
            "message": "Batch processing started"
        }
    except Exception as e:
        logger.error(f"Error starting batch processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-status/{batch_id}")
async def get_batch_status(batch_id: str):
    """Get the status of a batch processing job"""
    if batch_id not in batch_progress:
        raise HTTPException(status_code=404, detail="Batch ID not found")
    
    progress = batch_progress[batch_id]
    progress_percentage = (progress["completed"] / progress["total"] * 100) if progress["total"] > 0 else 0
    
    return BatchExtractProgress(
        total=progress["total"],
        completed=progress["completed"],
        failed=progress["failed"],
        current_url=progress["current_url"],
        progress_percentage=round(progress_percentage, 2)
    )


async def _process_batch(batch_id: str, urls: List[str]):
    """Process a batch of YouTube URLs in the background"""
    for i, url in enumerate(urls):
        try:
            batch_progress[batch_id]["current_url"] = url
            
            # Extract video ID
            video_id = youtube_service._extract_video_id(url)
            if not video_id:
                batch_progress[batch_id]["failed"] += 1
                batch_progress[batch_id]["results"].append({
                    "url": url,
                    "success": False,
                    "error": "Invalid YouTube URL"
                })
                continue
            
            # Process the video
            result = await vocabulary_extractor.process_youtube_video(video_id)
            
            batch_progress[batch_id]["completed"] += 1
            batch_progress[batch_id]["results"].append({
                "url": url,
                "success": True,
                "video_id": video_id,
                "vocabulary_count": result.get('vocabulary_count', 0)
            })
            
        except Exception as e:
            logger.error(f"Error processing URL {url}: {str(e)}")
            batch_progress[batch_id]["failed"] += 1
            batch_progress[batch_id]["results"].append({
                "url": url,
                "success": False,
                "error": str(e)
            })
        
        # Small delay between requests
        await asyncio.sleep(1)
    
    batch_progress[batch_id]["current_url"] = None
    batch_progress[batch_id]["status"] = "completed"