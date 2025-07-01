"""
Vocabulary extraction and management handler
"""

import logging
from typing import Dict, Any, List
from fastapi import WebSocket

from app.services.vocabulary_extractor import VocabularyExtractor
try:
    from app.services.notion_service import NotionService
except ImportError:
    NotionService = None
from app.models.vocabulary import VocabularyModel

vocabulary_extractor = VocabularyExtractor()
notion_service = NotionService() if NotionService else None

logger = logging.getLogger(__name__)


class VocabularyHandler:
    """Handles vocabulary extraction and management"""
    
    @staticmethod
    async def handle_extract_vocabulary(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Extract vocabulary from conversation or text"""
        try:
            source_type = data.get('source_type', 'conversation')  # 'conversation' or 'video'
            
            if source_type == 'conversation':
                # Extract from conversation transcript
                transcript = data.get('transcript', '')
                context = data.get('context', {})
                
                if not transcript:
                    await websocket.send_json({
                        'type': 'error',
                        'message': 'No transcript provided for vocabulary extraction'
                    })
                    return
                
                vocabulary_items = await vocabulary_extractor.extract_from_conversation(
                    transcript=transcript,
                    context=context
                )
                
            elif source_type == 'video':
                # Extract from video
                video_id = data.get('video_id')
                
                if not video_id:
                    await websocket.send_json({
                        'type': 'error',
                        'message': 'No video ID provided for vocabulary extraction'
                    })
                    return
                
                vocabulary_items = await vocabulary_extractor.extract_from_video(video_id)
            
            else:
                await websocket.send_json({
                    'type': 'error',
                    'message': f'Unknown source type: {source_type}'
                })
                return
            
            # Send extracted vocabulary
            await websocket.send_json({
                'type': 'vocabulary_extracted',
                'items': [item.model_dump() for item in vocabulary_items],
                'count': len(vocabulary_items)
            })
            
            # Optionally sync to Notion
            if data.get('sync_to_notion', False):
                await VocabularyHandler._sync_to_notion(websocket, vocabulary_items)
            
            logger.info(f"Extracted {len(vocabulary_items)} vocabulary items for client {client_id}")
            
        except Exception as e:
            logger.error(f"Error extracting vocabulary: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Vocabulary extraction error: {str(e)}'
            })
    
    @staticmethod
    async def handle_save_vocabulary(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Save vocabulary items to database"""
        try:
            items = data.get('items', [])
            
            if not items:
                await websocket.send_json({
                    'type': 'error',
                    'message': 'No vocabulary items provided'
                })
                return
            
            saved_items = []
            for item_data in items:
                vocabulary_item = VocabularyModel(**item_data)
                # Save to database (implement database save)
                saved_items.append(vocabulary_item)
            
            await websocket.send_json({
                'type': 'vocabulary_saved',
                'count': len(saved_items),
                'message': f'Saved {len(saved_items)} vocabulary items'
            })
            
            logger.info(f"Saved {len(saved_items)} vocabulary items for client {client_id}")
            
        except Exception as e:
            logger.error(f"Error saving vocabulary: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Vocabulary save error: {str(e)}'
            })
    
    @staticmethod
    async def handle_highlight_vocabulary(websocket: WebSocket, client_id: str, data: Dict[str, Any]) -> None:
        """Send vocabulary highlight to OBS overlay"""
        try:
            japanese = data.get('japanese', '')
            english = data.get('english', '')
            duration = data.get('duration', 3000)
            
            if not japanese or not english:
                await websocket.send_json({
                    'type': 'error',
                    'message': 'Japanese and English text required for highlight'
                })
                return
            
            # Send highlight command
            await websocket.send_json({
                'type': 'vocabulary_highlight',
                'japanese': japanese,
                'english': english,
                'showDuration': duration
            })
            
            logger.info(f"Vocabulary highlight sent: {japanese} -> {english}")
            
        except Exception as e:
            logger.error(f"Error highlighting vocabulary: {str(e)}")
            await websocket.send_json({
                'type': 'error',
                'message': f'Vocabulary highlight error: {str(e)}'
            })
    
    @staticmethod
    async def _sync_to_notion(websocket: WebSocket, vocabulary_items: List[VocabularyModel]) -> None:
        """Sync vocabulary items to Notion database"""
        try:
            synced_count = 0
            
            for item in vocabulary_items:
                if notion_service:
                    success = await notion_service.add_vocabulary_entry(
                        japanese=item.japanese,
                        english=item.english,
                        context=item.context,
                        difficulty=item.difficulty,
                        tags=item.tags,
                        source=item.source,
                        video_id=item.video_id,
                        timestamp=item.timestamp
                    )
                    
                    if success:
                        synced_count += 1
            
            await websocket.send_json({
                'type': 'notion_sync_complete',
                'synced': synced_count,
                'total': len(vocabulary_items)
            })
            
            logger.info(f"Synced {synced_count}/{len(vocabulary_items)} items to Notion")
            
        except Exception as e:
            logger.error(f"Error syncing to Notion: {str(e)}")
            await websocket.send_json({
                'type': 'warning',
                'message': f'Notion sync error: {str(e)}'
            })