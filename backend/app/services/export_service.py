"""
Export service for vocabulary data
Supports Anki deck and CSV formats
"""

import csv
import json
import io
from typing import List, Dict, Optional
from datetime import datetime
import logging
import zipfile

from app.services.database_service import db_service
from app.models.vocabulary import VocabularyModel

logger = logging.getLogger(__name__)


class ExportService:
    """Handles vocabulary export to various formats"""
    
    def __init__(self):
        pass
        
    async def export_to_csv(
        self, 
        user_id: Optional[int] = None,
        difficulty_level: Optional[int] = None,
        limit: int = 1000
    ) -> bytes:
        """Export vocabulary to CSV format"""
        try:
            # Get vocabulary items
            items = await db_service.get_vocabulary_items(
                limit=limit,
                difficulty_level=difficulty_level,
                user_id=user_id
            )
            
            # Create CSV in memory
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow([
                'Japanese',
                'English',
                'Reading',
                'Context',
                'Difficulty',
                'Source',
                'Video ID',
                'Timestamp',
                'Created Date'
            ])
            
            # Write data
            for item in items:
                writer.writerow([
                    item.get('japanese', ''),
                    item.get('english', ''),
                    item.get('reading', ''),
                    item.get('context', ''),
                    item.get('difficulty', ''),
                    item.get('source', ''),
                    item.get('video_id', ''),
                    item.get('timestamp', ''),
                    item.get('created_at', '')
                ])
            
            # Convert to bytes
            csv_content = output.getvalue()
            return csv_content.encode('utf-8-sig')  # UTF-8 with BOM for Excel compatibility
            
        except Exception as e:
            logger.error(f"Error exporting to CSV: {str(e)}")
            raise
            
    async def export_to_anki(
        self,
        user_id: Optional[int] = None,
        difficulty_level: Optional[int] = None,
        limit: int = 1000,
        deck_name: str = "AIVlingual Vocabulary"
    ) -> bytes:
        """Export vocabulary to Anki deck format (apkg)"""
        try:
            # Get vocabulary items
            items = await db_service.get_vocabulary_items(
                limit=limit,
                difficulty_level=difficulty_level,
                user_id=user_id
            )
            
            # Create Anki deck structure
            deck_id = int(datetime.now().timestamp() * 1000)
            
            # Create deck info
            deck_info = {
                "name": deck_name,
                "extendRev": 50,
                "usn": -1,
                "collapsed": False,
                "newToday": [0, 0],
                "timeToday": [0, 0],
                "dyn": 0,
                "extendNew": 10,
                "conf": 1,
                "revToday": [0, 0],
                "lrnToday": [0, 0],
                "id": deck_id,
                "mod": int(datetime.now().timestamp())
            }
            
            # Create notes
            notes = []
            for idx, item in enumerate(items):
                note_id = deck_id + idx + 1
                
                # Create card front (Japanese with context)
                front = f"""<div class='japanese'>{item.get('japanese_text', '')}</div>
<div class='reading'>{item.get('reading', '')}</div>
<div class='context'>{item.get('context', '')}</div>"""
                
                # Create card back (English with additional info)
                back = f"""<div class='english'>{item.get('english_text', '')}</div>
<div class='difficulty'>Difficulty: {item.get('difficulty_level', 'N/A')}</div>"""
                
                if item.get('source_video_id'):
                    video_url = f"https://www.youtube.com/watch?v={item['source_video_id']}"
                    if item.get('video_timestamp'):
                        video_url += f"&t={int(item['video_timestamp'])}s"
                    back += f"\n<div class='source'><a href='{video_url}'>Source Video</a></div>"
                
                note = {
                    "id": note_id,
                    "guid": f"aivlingual_{note_id}",
                    "mid": 1,  # Model ID (basic model)
                    "mod": int(datetime.now().timestamp()),
                    "usn": -1,
                    "tags": [f"AIVlingual", f"N{item.get('difficulty_level', 3)}"],
                    "flds": [front, back],
                    "sfld": item.get('japanese_text', ''),
                    "csum": 0,
                    "flags": 0,
                    "data": ""
                }
                notes.append(note)
            
            # Create collection structure
            collection = {
                "decks": {str(deck_id): deck_info},
                "notes": notes,
                "cards": [],
                "models": {
                    "1": {
                        "id": 1,
                        "name": "Basic",
                        "type": 0,
                        "flds": [
                            {"name": "Front", "ord": 0},
                            {"name": "Back", "ord": 1}
                        ],
                        "tmpls": [{
                            "name": "Card 1",
                            "qfmt": "{{Front}}",
                            "afmt": "{{FrontSide}}<hr id=answer>{{Back}}"
                        }],
                        "css": """
.card {
    font-family: 'Noto Sans JP', sans-serif;
    font-size: 20px;
    text-align: center;
    color: #333;
}

.japanese {
    font-size: 30px;
    font-weight: bold;
    margin-bottom: 10px;
}

.reading {
    font-size: 18px;
    color: #666;
    margin-bottom: 15px;
}

.context {
    font-size: 16px;
    color: #888;
    font-style: italic;
    margin-bottom: 20px;
}

.english {
    font-size: 24px;
    color: #2196F3;
    margin-bottom: 15px;
}

.difficulty {
    font-size: 14px;
    color: #666;
}

.source {
    font-size: 14px;
    margin-top: 20px;
}

.source a {
    color: #2196F3;
    text-decoration: none;
}
"""
                    }
                }
            }
            
            # Create cards for each note
            for idx, note in enumerate(notes):
                card = {
                    "id": note["id"] + 1000000,
                    "nid": note["id"],
                    "did": deck_id,
                    "ord": 0,
                    "mod": int(datetime.now().timestamp()),
                    "usn": -1,
                    "type": 0,
                    "queue": 0,
                    "due": idx,
                    "ivl": 0,
                    "factor": 2500,
                    "reps": 0,
                    "lapses": 0,
                    "left": 2500,
                    "odue": 0,
                    "odid": 0,
                    "flags": 0,
                    "data": ""
                }
                collection["cards"].append(card)
            
            # Create media info
            media = {}  # No media files for now
            
            # Create apkg file in memory
            apkg_buffer = io.BytesIO()
            
            with zipfile.ZipFile(apkg_buffer, 'w', zipfile.ZIP_DEFLATED) as apkg:
                # Add collection
                apkg.writestr("collection.anki2", json.dumps(collection))
                
                # Add media
                apkg.writestr("media", json.dumps(media))
                
                # Add basic metadata
                apkg.writestr("meta.json", json.dumps({
                    "name": deck_name,
                    "version": 2
                }))
            
            apkg_buffer.seek(0)
            return apkg_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Error exporting to Anki: {str(e)}")
            raise
            
    async def export_to_json(
        self,
        user_id: Optional[int] = None,
        difficulty_level: Optional[int] = None,
        limit: int = 1000
    ) -> bytes:
        """Export vocabulary to JSON format"""
        try:
            # Get vocabulary items
            items = await db_service.get_vocabulary_items(
                limit=limit,
                difficulty_level=difficulty_level,
                user_id=user_id
            )
            
            # Create export data
            export_data = {
                "export_date": datetime.utcnow().isoformat(),
                "total_items": len(items),
                "vocabulary": items
            }
            
            # Convert to JSON
            json_content = json.dumps(export_data, ensure_ascii=False, indent=2)
            return json_content.encode('utf-8')
            
        except Exception as e:
            logger.error(f"Error exporting to JSON: {str(e)}")
            raise


# Global export service instance
export_service = ExportService()