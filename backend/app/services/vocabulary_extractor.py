"""
Vocabulary Extraction Service
Core business logic for converting conversations and videos into educational content
"""

import re
import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import hashlib

# Optional imports
try:
    from app.services.youtube_service import YouTubeService
except ImportError:
    YouTubeService = None
    
try:
    from app.services.notion_service import NotionService
except ImportError:
    NotionService = None
from app.services.database_service import db_service
from app.models.vocabulary import VocabularyModel
from app.core.config import settings

logger = logging.getLogger(__name__)


class VocabularyExtractor:
    """
    Extracts vocabulary and expressions from various sources
    and creates structured learning content
    """
    
    def __init__(self):
        self.youtube_service = YouTubeService() if YouTubeService else None
        self.notion_service = NotionService() if NotionService else None
        self.ai_responder = None  # Lazy initialization to avoid circular import
        
        # Expression patterns for extraction
        self.expression_patterns = {
            'vtuber_slang': [
                (r'(てぇてぇ|てえてえ)', 'precious/wholesome'),
                (r'(ぽんこつ|ポンコツ)', 'clumsy/airhead'),
                (r'(あせあせ|汗)', 'nervous/sweating'),
                (r'(おつかれ|お疲れ)', 'good work/bye'),
                (r'(スパチャ|スーパーチャット)', 'super chat donation'),
            ],
            'internet_slang': [
                (r'(草|くさ|ｗｗｗ|笑)', 'lol/laughing'),
                (r'(おｋ|おけ|OK)', 'okay'),
                (r'(りょ|了解)', 'roger/understood'),
                (r'(乙|おつ)', 'thanks for the work'),
            ],
            'grammar_patterns': [
                (r'[\u3041-\u3093]+なきゃ', 'must do'),
                (r'[\u3041-\u3093]+ちゃう', 'contraction'),
                (r'[\u3041-\u3093]+っぽい', 'seems like'),
                (r'[\u3041-\u3093]+かも', 'maybe'),
            ]
        }
    
    async def extract_from_conversation(
        self, 
        transcript: str, 
        context: Optional[Dict] = None
    ) -> List[VocabularyModel]:
        """
        Extract vocabulary from a conversation transcript
        
        Args:
            transcript: The conversation text
            context: Optional context (video info, timestamp, etc.)
            
        Returns:
            List of vocabulary items
        """
        try:
            # Lazy load AI responder to avoid circular import
            if self.ai_responder is None:
                from app.core.ai_responder import BilingualAIResponder
                self.ai_responder = BilingualAIResponder()
            
            # Use Gemini to analyze the transcript
            analysis_prompt = f"""
            この会話から言語学習に価値のある表現を抽出してください：

            {transcript}

            以下の形式でJSON配列として返してください：
            [
                {{
                    "japanese": "日本語表現",
                    "english": "English translation",
                    "reading": "ひらがな読み",
                    "context": "使用された文脈",
                    "difficulty": 1-5,
                    "type": "slang/grammar/vocabulary/phrase",
                    "notes": "使い方の説明"
                }}
            ]

            特に以下に注目してください：
            1. Vtuberスラングやネット用語
            2. 日常会話で使える表現
            3. 文法的に面白いパターン
            4. 文化的な背景がある表現
            """
            
            response = await self.ai_responder.model.generate_content(analysis_prompt)
            
            # Parse the response
            vocabulary_items = self._parse_ai_response(response.text)
            
            # Add context information
            for item in vocabulary_items:
                if context:
                    item.source = context.get('source', 'conversation')
                    item.video_id = context.get('video_id')
                    item.timestamp = context.get('timestamp')
                
                # Generate unique ID
                item.id = self._generate_vocabulary_id(item.japanese_text, item.english_text)
                item.created_at = datetime.utcnow()
            
            return vocabulary_items
            
        except Exception as e:
            logger.error(f"Error extracting vocabulary from conversation: {str(e)}")
            return []
    
    async def extract_from_video(self, video_url: str) -> Dict:
        """
        Extract vocabulary from a YouTube video
        
        Args:
            video_url: YouTube video URL
            
        Returns:
            Dictionary with extraction results
        """
        try:
            # Get video information and transcript
            video_data = await self.youtube_service.extract_vocabulary_from_video(video_url)
            
            if "error" in video_data:
                return video_data
            
            # Extract vocabulary from expressions found
            vocabulary_items = []
            
            # Convert expressions to vocabulary items
            for expr in video_data.get('expressions', []):
                vocab_item = VocabularyModel(
                    japanese_text=expr['japanese'],
                    english_text=expr.get('english', ''),  # Use provided translation or empty
                    reading='',  # Will be filled by AI
                    difficulty_level=3,  # Default difficulty
                    context=expr['context'],
                    tags=[expr['type'], 'vtuber'],
                    source='youtube',
                    source_video_id=video_data['video_info']['video_id'],
                    video_timestamp=expr['timestamp'],
                    created_at=datetime.utcnow()
                )
                vocabulary_items.append(vocab_item)
            
            # Use AI to enhance vocabulary items
            enhanced_items = await self._enhance_vocabulary_with_ai(vocabulary_items)
            
            # Save to database and Notion
            saved_items = []
            for item in enhanced_items:
                # Save to local database
                item_id = await db_service.save_vocabulary_item(item)
                
                # Sync to Notion
                if self.notion_service:
                    notion_id = await self.notion_service.sync_vocabulary_entry(item)
                    item.notion_id = notion_id
                item.synced_at = datetime.utcnow()
                
                # Update with Notion ID
                await db_service.save_vocabulary_item(item)
                
                saved_items.append(item)
            
            return {
                "video_info": video_data['video_info'],
                "vocabulary_extracted": len(saved_items),
                "vocabulary_items": [item.dict() for item in saved_items[:10]],  # First 10 items
                "language_stats": video_data.get('language_stats', {})
            }
            
        except Exception as e:
            logger.error(f"Error extracting vocabulary from video: {str(e)}")
            return {"error": str(e)}
    
    def _parse_ai_response(self, response_text: str) -> List[VocabularyModel]:
        """Parse AI response to extract vocabulary items"""
        try:
            # Try to extract JSON from response
            import json
            
            # Find JSON array in response
            json_match = re.search(r'\[\s*\{.*\}\s*\]', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                items_data = json.loads(json_str)
                
                vocabulary_items = []
                for item_data in items_data:
                    vocab_item = VocabularyModel(
                        japanese=item_data.get('japanese', ''),
                        english=item_data.get('english', ''),
                        reading=item_data.get('reading', ''),
                        difficulty=item_data.get('difficulty', 3),
                        context=item_data.get('context', ''),
                        example_sentence=item_data.get('context', ''),
                        tags=[item_data.get('type', 'general')],
                        notes=item_data.get('notes', ''),
                        created_at=datetime.utcnow()
                    )
                    vocabulary_items.append(vocab_item)
                
                return vocabulary_items
            
            return []
            
        except Exception as e:
            logger.error(f"Error parsing AI response: {str(e)}")
            return []
    
    async def _enhance_vocabulary_with_ai(
        self, 
        items: List[VocabularyModel]
    ) -> List[VocabularyModel]:
        """Enhance vocabulary items with AI-generated translations and readings"""
        try:
            # Batch process items with AI
            items_text = "\n".join([f"{i+1}. {item.japanese_text}" for i, item in enumerate(items)])
            
            enhancement_prompt = f"""
            以下の表現に対して、英訳と読み方を提供してください：

            {items_text}

            以下の形式で返してください：
            1. [日本語表現] - [English translation] - [ひらがな読み]
            2. [日本語表現] - [English translation] - [ひらがな読み]
            ...
            """
            
            response = await self.ai_responder.model.generate_content(enhancement_prompt)
            
            # Parse response and update items
            lines = response.text.strip().split('\n')
            for i, line in enumerate(lines):
                if i < len(items):
                    # Parse line format: "1. [japanese] - [english] - [reading]"
                    match = re.match(r'\d+\.\s*(.+?)\s*-\s*(.+?)\s*-\s*(.+?)$', line)
                    if match:
                        items[i].english_text = match.group(2).strip()
                        items[i].reading = match.group(3).strip()
            
            return items
            
        except Exception as e:
            logger.error(f"Error enhancing vocabulary with AI: {str(e)}")
            return items
    
    def _generate_vocabulary_id(self, japanese: str, english: str) -> str:
        """Generate unique ID for vocabulary item"""
        content = f"{japanese}:{english}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    async def process_batch_videos(self, video_urls: List[str]) -> Dict:
        """Process multiple videos for vocabulary extraction"""
        results = {
            "total_videos": len(video_urls),
            "successful": 0,
            "failed": 0,
            "total_vocabulary": 0,
            "errors": []
        }
        
        for url in video_urls:
            try:
                result = await self.extract_from_video(url)
                if "error" not in result:
                    results["successful"] += 1
                    results["total_vocabulary"] += result.get("vocabulary_extracted", 0)
                else:
                    results["failed"] += 1
                    results["errors"].append({
                        "url": url,
                        "error": result["error"]
                    })
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "url": url,
                    "error": str(e)
                })
        
        return results
    
    def extract_from_text(self, text: str) -> List[Dict]:
        """Quick extraction using pattern matching (no AI)"""
        expressions = []
        
        for category, patterns in self.expression_patterns.items():
            for pattern, meaning in patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    expressions.append({
                        "expression": match,
                        "category": category,
                        "meaning": meaning,
                        "context": text[:100]  # First 100 chars as context
                    })
        
        return expressions