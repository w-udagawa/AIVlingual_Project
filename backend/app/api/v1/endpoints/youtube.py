"""
YouTube-related API endpoints
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
import logging
from datetime import datetime
import asyncio
import uuid

from app.services.youtube_service import YouTubeService
from app.services.vocabulary_extractor import VocabularyExtractor
from app.services.database_service import db_service
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Try to import NLP extractor
try:
    from app.services.nlp_vocabulary_extractor import nlp_extractor
    NLP_AVAILABLE = True
    logger.info("NLP-enhanced vocabulary extraction enabled")
except ImportError:
    NLP_AVAILABLE = False
    logger.warning("NLP vocabulary extractor not available, using basic extractor")

# Initialize services
youtube_service = YouTubeService()
# Initialize basic extractor for fallback
basic_vocabulary_extractor = VocabularyExtractor()

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
        video_id = youtube_service.extract_video_id(url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        
        # Get video info and transcript
        video_info = await youtube_service.get_video_info(video_id)
        if not video_info:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Get transcript
        transcript = await youtube_service.get_transcript(video_id)
        if not transcript:
            raise HTTPException(status_code=404, detail="No transcript available for this video")
        
        # Combine transcript text
        full_text = " ".join([entry['text'] for entry in transcript])
        logger.info(f"Transcript length: {len(full_text)} characters")
        
        # Process vocabulary extraction
        if NLP_AVAILABLE:
            # Detect language of the transcript
            import re
            japanese_chars = len(re.findall(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', full_text[:1000]))
            english_chars = len(re.findall(r'[a-zA-Z]', full_text[:1000]))
            total_chars = japanese_chars + english_chars
            
            if total_chars > 0:
                japanese_ratio = japanese_chars / total_chars
                english_ratio = english_chars / total_chars
                
                # Determine target language based on ratio
                if japanese_ratio > 0.7:
                    target_language = 'japanese'
                elif english_ratio > 0.7:
                    target_language = 'english'
                else:
                    target_language = None  # Let NLP extractor auto-detect
            else:
                target_language = None
            
            # Use NLP extractor
            logger.info(f"Using NLP-enhanced vocabulary extraction (language: {target_language or 'auto'})")
            logger.info(f"Language detection - Japanese: {japanese_ratio:.2%}, English: {english_ratio:.2%}")
            
            # Call NLP extractor
            vocabulary_data = await nlp_extractor.extract_from_text_nlp(full_text[:10000], target_language)  # Limit to 10k chars
            logger.info(f"NLP extracted {len(vocabulary_data)} vocabulary items")
            
            # Convert to VocabularyModel format
            from app.models.vocabulary import VocabularyModel
            vocabulary_items = []
            logger.info(f"Processing {len(vocabulary_data)} items from NLP extraction")
            
            for idx, expr in enumerate(vocabulary_data[:100]):  # Limit to top 100
                # Skip empty expressions
                if not expr.get('expression'):
                    continue
                    
                # Prepare fields based on expression data
                if expr.get('language') == 'english':
                    english_text = expr['expression']
                    japanese_text = expr.get('meaning', '')
                else:
                    japanese_text = expr['expression']
                    english_text = expr.get('meaning', '')
                
                # Skip if both are empty
                if not english_text and not japanese_text:
                    continue
                
                vocab_item = VocabularyModel(
                    japanese_text=japanese_text,
                    english_text=english_text,
                    reading=expr.get('reading', ''),
                    difficulty_level=expr.get('difficulty', 3),
                    context=expr.get('sentence', expr.get('context', '')),
                    tags=[expr.get('category', 'general'), expr.get('type', 'vocabulary')],
                    source='youtube',
                    source_video_id=video_id,
                    video_timestamp=0,  # TODO: Extract timestamp from transcript
                    created_at=datetime.utcnow()
                )
                
                # Generate ID
                vocab_item.id = basic_vocabulary_extractor._generate_vocabulary_id(japanese_text, english_text)
                
                # Save to database
                await db_service.save_vocabulary_item(vocab_item)
                vocabulary_items.append(vocab_item)
            
            result = {
                "video_info": {
                    "video_id": video_id,
                    "title": video_info.get("title"),
                    "channel_title": video_info.get("channel_title"),
                    "thumbnail_url": video_info.get("thumbnail_url"),
                    "description": video_info.get("description", "")[:200]
                },
                "vocabulary_count": len(vocabulary_items),
                "vocabulary_items": [item.dict() for item in vocabulary_items[:50]],  # Return top 50
                "extraction_method": "nlp"
            }
        else:
            # Fall back to basic extractor
            logger.info("Using basic pattern-based extraction")
            result = await basic_vocabulary_extractor.process_youtube_video(video_id)
            result["extraction_method"] = "pattern"
        
        # Log final result
        logger.info(f"Returning response with {result.get('vocabulary_count', 0)} items using {result.get('extraction_method', 'unknown')} extraction")
        
        return {
            "success": True,
            "video_id": video_id,
            "vocabulary_count": result.get('vocabulary_count', 0),
            "message": f"Video processed successfully using {result.get('extraction_method', 'unknown')} extraction",
            "data": result
        }
    except Exception as e:
        logger.exception(f"Error processing YouTube video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-extract")
async def batch_extract_vocabulary(
    request: BatchExtractRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Extract vocabulary from multiple YouTube videos"""
    try:
        batch_id = str(uuid.uuid4())
        
        # Initialize batch progress
        batch_progress[batch_id] = {
            "total": len(request.urls),
            "completed": 0,
            "failed": 0,
            "current_url": None,
            "results": [],
            "status": "processing",
            "url_statuses": [],
            "vocabulary_preview": []
        }
        
        # Save batch to database
        if current_user:
            await db_service.create_batch_history(
                batch_id=batch_id,
                user_id=current_user.id,
                total_urls=len(request.urls)
            )
        
        # Start background processing
        background_tasks.add_task(_process_batch, batch_id, request.urls, current_user.id if current_user else None)
        
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


async def _process_batch(batch_id: str, urls: List[str], user_id: Optional[int] = None):
    """Process a batch of YouTube URLs in the background"""
    # Initialize URL statuses
    url_statuses = [{"url": url, "status": "pending"} for url in urls]
    batch_progress[batch_id]["url_statuses"] = url_statuses
    
    for i, url in enumerate(urls):
        try:
            batch_progress[batch_id]["current_url"] = url
            url_statuses[i]["status"] = "processing"
            
            # Extract video ID
            video_id = youtube_service._extract_video_id(url)
            if not video_id:
                batch_progress[batch_id]["failed"] += 1
                url_statuses[i]["status"] = "failed"
                url_statuses[i]["error"] = "Invalid YouTube URL"
                batch_progress[batch_id]["results"].append({
                    "url": url,
                    "success": False,
                    "error": "Invalid YouTube URL"
                })
                continue
            
            # Get video info
            video_info = await youtube_service.get_video_info(video_id)
            if video_info:
                url_statuses[i]["title"] = video_info.get("title", "Unknown")
            
            # Process the video with appropriate extractor
            if NLP_AVAILABLE:
                # Get transcript for NLP processing
                transcript = await youtube_service.get_transcript(video_id)
                if transcript:
                    full_text = " ".join([entry['text'] for entry in transcript])
                    # Detect language
                    import re
                    japanese_chars = len(re.findall(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', full_text[:1000]))
                    english_chars = len(re.findall(r'[a-zA-Z]', full_text[:1000]))
                    total_chars = japanese_chars + english_chars
                    
                    if total_chars > 0:
                        if japanese_chars / total_chars > 0.7:
                            target_language = 'japanese'
                        elif english_chars / total_chars > 0.7:
                            target_language = 'english'
                        else:
                            target_language = None
                    else:
                        target_language = None
                    
                    vocabulary_data = await nlp_extractor.extract_from_text_nlp(full_text[:10000], target_language)
                    result = {
                        "vocabulary_count": len(vocabulary_data),
                        "vocabulary_items": vocabulary_data[:50],  # Top 50 items
                        "extraction_method": "nlp"
                    }
                else:
                    result = await basic_vocabulary_extractor.process_youtube_video(video_id)
                    result["extraction_method"] = "pattern"
            else:
                result = await basic_vocabulary_extractor.process_youtube_video(video_id)
                result["extraction_method"] = "pattern"
            
            # Update URL status
            vocabulary_count = result.get('vocabulary_count', 0)
            url_statuses[i]["status"] = "completed"
            url_statuses[i]["vocabularyCount"] = vocabulary_count
            
            # Add vocabulary preview (first 10 items)
            if 'vocabulary_items' in result and result['vocabulary_items']:
                preview_items = result['vocabulary_items'][:10]
                batch_progress[batch_id]["vocabulary_preview"].extend(preview_items)
            
            batch_progress[batch_id]["completed"] += 1
            batch_progress[batch_id]["results"].append({
                "url": url,
                "success": True,
                "video_id": video_id,
                "vocabulary_count": vocabulary_count,
                "video_title": url_statuses[i].get("title", "Unknown")
            })
            
        except Exception as e:
            logger.error(f"Error processing URL {url}: {str(e)}")
            batch_progress[batch_id]["failed"] += 1
            url_statuses[i]["status"] = "failed"
            url_statuses[i]["error"] = str(e)
            batch_progress[batch_id]["results"].append({
                "url": url,
                "success": False,
                "error": str(e)
            })
        
        # Small delay between requests
        await asyncio.sleep(1)
    
    batch_progress[batch_id]["current_url"] = None
    batch_progress[batch_id]["status"] = "completed"
    
    # Update database
    if user_id:
        await db_service.update_batch_history(
            batch_id=batch_id,
            successful=batch_progress[batch_id]["completed"],
            failed=batch_progress[batch_id]["failed"],
            status="completed",
            results=batch_progress[batch_id]["results"]
        )


@router.get("/debug-env")
async def debug_environment():
    """Debug Python environment and spaCy installation"""
    import sys
    import os
    import platform
    import importlib
    
    result = {
        "python": {
            "executable": sys.executable,
            "version": sys.version,
            "platform": platform.platform()
        },
        "environment": {
            "CONDA_DEFAULT_ENV": os.getenv("CONDA_DEFAULT_ENV"),
            "CONDA_PREFIX": os.getenv("CONDA_PREFIX"),
            "VIRTUAL_ENV": os.getenv("VIRTUAL_ENV"),
            "PATH": os.getenv("PATH", "").split(os.pathsep)[:5]  # First 5 paths
        },
        "spacy": {},
        "models": {}
    }
    
    # Check spaCy
    try:
        import spacy
        result["spacy"] = {
            "version": spacy.__version__,
            "location": spacy.__file__,
            "available": True
        }
    except ImportError as e:
        result["spacy"] = {
            "available": False,
            "error": str(e)
        }
    
    # Check models
    for model_name in ["en_core_web_lg", "en_core_web_sm", "ja_core_news_sm"]:
        try:
            model = importlib.import_module(model_name)
            result["models"][model_name] = {
                "available": True,
                "location": model.__file__ if hasattr(model, "__file__") else "unknown"
            }
        except ModuleNotFoundError:
            result["models"][model_name] = {
                "available": False,
                "error": "Module not found"
            }
        except Exception as e:
            result["models"][model_name] = {
                "available": False,
                "error": str(e)
            }
    
    # Test direct loading
    if result["spacy"].get("available"):
        try:
            # Try loading with direct import
            import en_core_web_sm
            nlp = en_core_web_sm.load()
            result["direct_load_test"] = {
                "en_core_web_sm": "SUCCESS",
                "pipeline": nlp.pipe_names
            }
        except Exception as e:
            result["direct_load_test"] = {
                "en_core_web_sm": f"FAILED: {str(e)}"
            }
    
    return result


@router.get("/test-nlp")
async def test_nlp_extraction():
    """Test NLP extraction with a simple text"""
    test_text = "welcome to faster Foods everyone basically we just quit nii and now we all open we all opened a franchise together"
    
    logger.info(f"Starting NLP test with text: {test_text[:50]}...")
    
    result = {
        "test_text": test_text,
        "nlp_available": NLP_AVAILABLE,
        "nlp_extractor_exists": nlp_extractor is not None if NLP_AVAILABLE else False,
        "extraction_results": {}
    }
    
    if NLP_AVAILABLE and nlp_extractor:
        try:
            # Test with English
            logger.info("Testing English extraction...")
            english_results = await nlp_extractor.extract_from_text_nlp(test_text, 'english')
            result["extraction_results"]["english"] = {
                "count": len(english_results),
                "first_3": english_results[:3] if english_results else []
            }
            logger.info(f"English extraction: {len(english_results)} items")
            
            # Check model status
            result["model_status"] = {
                "english_model": nlp_extractor.nlp_en is not None,
                "japanese_model": nlp_extractor.nlp_ja is not None
            }
            
        except Exception as e:
            logger.exception("Error in NLP test")
            result["error"] = {
                "message": str(e),
                "traceback": None  # Don't expose traceback in API response
            }
    
    return result


@router.get("/search")
async def search_youtube_videos(
    q: str = Query(..., description="Search query"),
    max_results: int = Query(10, description="Maximum number of results"),
    vtuber_filter: bool = Query(True, description="Filter for Vtuber content")
):
    """Search for YouTube videos with optional Vtuber filter"""
    try:
        videos = await youtube_service.search_videos(q, max_results, vtuber_filter)
        
        if videos is None:
            raise HTTPException(
                status_code=503, 
                detail="YouTube API unavailable. Please check API key configuration."
            )
        
        return {
            "success": True,
            "query": q,
            "result_count": len(videos),
            "videos": videos
        }
    except Exception as e:
        logger.error(f"Error searching YouTube videos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channel/{channel_id}/videos")
async def get_channel_videos(
    channel_id: str,
    max_results: int = Query(20, description="Maximum number of results")
):
    """Get recent videos from a YouTube channel"""
    try:
        videos = await youtube_service.get_channel_videos(channel_id, max_results)
        
        if videos is None:
            raise HTTPException(
                status_code=503, 
                detail="YouTube API unavailable. Please check API key configuration."
            )
        
        return {
            "success": True,
            "channel_id": channel_id,
            "video_count": len(videos),
            "videos": videos
        }
    except Exception as e:
        logger.error(f"Error getting channel videos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/video/{video_id}/info")
async def get_video_information(video_id: str):
    """Get detailed information about a YouTube video"""
    try:
        video_info = await youtube_service.get_video_info(video_id)
        
        if video_info is None:
            raise HTTPException(status_code=404, detail="Video not found")
        
        return {
            "success": True,
            "video": video_info
        }
    except Exception as e:
        logger.error(f"Error getting video info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-history")
async def get_batch_history(
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get user's batch processing history"""
    try:
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        history = await db_service.get_batch_history(
            user_id=current_user.id,
            limit=limit
        )
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        logger.error(f"Error getting batch history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-history/{batch_id}")
async def get_batch_details(
    batch_id: str,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get detailed information about a specific batch"""
    try:
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        batch = await db_service.get_batch_details(
            batch_id=batch_id,
            user_id=current_user.id
        )
        
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        return {
            "success": True,
            "batch": batch
        }
    except Exception as e:
        logger.error(f"Error getting batch details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))