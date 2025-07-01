"""
Notion API integration for vocabulary database
"""

import os
from typing import Dict, List, Optional
import logging
from datetime import datetime

from notion_client import Client
from app.core.config import settings
from app.models.vocabulary import VocabularyModel

logger = logging.getLogger(__name__)


class NotionService:
    """Manages Notion database integration"""
    
    def __init__(self):
        self.client = Client(auth=settings.NOTION_TOKEN)
        self.database_id = settings.NOTION_DATABASE_ID
        
    async def sync_vocabulary_entry(self, entry: VocabularyModel) -> Optional[str]:
        """Sync vocabulary entry to Notion database"""
        try:
            properties = {
                "日本語": {
                    "title": [
                        {
                            "text": {
                                "content": entry.japanese_text
                            }
                        }
                    ]
                },
                "English": {
                    "rich_text": [
                        {
                            "text": {
                                "content": entry.english_text
                            }
                        }
                    ]
                },
                "文脈 (Context)": {
                    "rich_text": [
                        {
                            "text": {
                                "content": entry.context[:2000] if entry.context else ""  # Notion has a 2000 char limit
                            }
                        }
                    ]
                },
                "難易度": {
                    "select": {
                        "name": f"レベル{entry.difficulty_level}"
                    }
                },
                "動画元": {
                    "url": f"https://youtube.com/watch?v={entry.source_video_id}&t={int(entry.video_timestamp)}s" if entry.source_video_id and entry.video_timestamp else None
                },
                "作成日": {
                    "date": {
                        "start": entry.created_at.isoformat() if entry.created_at else datetime.utcnow().isoformat()
                    }
                }
            }
            
            # Add tags if present
            if entry.tags:
                properties["タグ"] = {
                    "multi_select": [
                        {"name": tag} for tag in entry.tags[:5]  # Limit to 5 tags
                    ]
                }
                
            # Add notes/example sentence if present
            if entry.notes:
                properties["例文"] = {
                    "rich_text": [
                        {
                            "text": {
                                "content": entry.notes[:2000]  # Limit to 2000 chars
                            }
                        }
                    ]
                }
                
            # Create or update page
            if entry.notion_id:
                # Update existing page
                response = self.client.pages.update(
                    page_id=entry.notion_id,
                    properties=properties
                )
            else:
                # Create new page
                response = self.client.pages.create(
                    parent={"database_id": self.database_id},
                    properties=properties
                )
                
            return response["id"]
            
        except Exception as e:
            logger.error(f"Failed to sync to Notion: {str(e)}")
            return None
            
    async def get_vocabulary_from_notion(
        self,
        limit: int = 100,
        filter_dict: Optional[Dict] = None
    ) -> List[Dict]:
        """Retrieve vocabulary entries from Notion"""
        try:
            query_params = {
                "database_id": self.database_id,
                "page_size": min(limit, 100)  # Notion API limit
            }
            
            if filter_dict:
                query_params["filter"] = filter_dict
            else:
                # Default filter: show only public entries
                query_params["filter"] = {
                    "property": "公開",
                    "checkbox": {
                        "equals": True
                    }
                }
                
            # Sort by creation date (newest first)
            query_params["sorts"] = [
                {
                    "property": "作成日",
                    "direction": "descending"
                }
            ]
            
            response = self.client.databases.query(**query_params)
            
            # Parse results
            entries = []
            for page in response["results"]:
                entry = self._parse_notion_page(page)
                if entry:
                    entries.append(entry)
                    
            return entries
            
        except Exception as e:
            logger.error(f"Failed to retrieve from Notion: {str(e)}")
            return []
            
    def _parse_notion_page(self, page: Dict) -> Optional[Dict]:
        """Parse Notion page into vocabulary entry"""
        try:
            properties = page["properties"]
            
            # Extract text from Notion property format
            def get_text(prop):
                if prop.get("title"):
                    return "".join([t["plain_text"] for t in prop["title"]])
                elif prop.get("rich_text"):
                    return "".join([t["plain_text"] for t in prop["rich_text"]])
                return ""
                
            def get_url(prop):
                return prop.get("url", "")
                
            def get_select(prop):
                return prop.get("select", {}).get("name", "")
                
            def get_multi_select(prop):
                return [option["name"] for option in prop.get("multi_select", [])]
                
            def get_date(prop):
                date_val = prop.get("date", {})
                if date_val and date_val.get("start"):
                    return datetime.fromisoformat(date_val["start"].replace("Z", "+00:00"))
                return None
                
            entry = {
                "notion_id": page["id"],
                "japanese_text": get_text(properties.get("日本語", {})),
                "english_text": get_text(properties.get("English", {})),
                "context": get_text(properties.get("文脈 (Context)", {})),
                "difficulty_level": get_select(properties.get("難易度", {})),
                "video_url": get_url(properties.get("動画元", {})),
                "tags": get_multi_select(properties.get("タグ", {})),
                "examples": get_text(properties.get("例文", {})),
                "created_at": get_date(properties.get("作成日", {}))
            }
            
            return entry
            
        except Exception as e:
            logger.error(f"Failed to parse Notion page: {str(e)}")
            return None
            
    async def create_database_view(self, view_name: str, filter_config: Dict) -> bool:
        """Create a filtered view in Notion database"""
        # Note: Notion API doesn't support creating views programmatically yet
        # This is a placeholder for future functionality
        logger.info(f"Database view creation requested: {view_name}")
        return True