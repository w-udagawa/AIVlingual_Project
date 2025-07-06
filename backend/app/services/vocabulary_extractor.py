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
        
        # Expression patterns for extraction - Bilingual support
        self.japanese_patterns = {
            # 最優先：日常会話の必須表現
            'essential_daily': [
                (r'(ありがとう|ありがと)', 'thank you', 1, 10),  # N5 = 1
                (r'(すみません|すいません)', 'excuse me/sorry', 1, 10),  # N5 = 1
                (r'(お願いします|おねがいします)', 'please', 1, 10),  # N5 = 1
                (r'(大丈夫|だいじょうぶ)', 'okay/alright', 1, 10),  # N5 = 1
                (r'(わかりました|分かりました)', 'understood', 1, 10),  # N5 = 1
                (r'(いただきます)', 'let me receive (before eating)', 1, 9),  # N5 = 1
                (r'(ごちそうさま|ご馳走様)', 'thank you for the meal', 1, 9),  # N5 = 1
                (r'(失礼します|しつれいします)', 'excuse me (entering/leaving)', 2, 9),  # N4 = 2
            ],
            
            # 高優先：頻出文法パターン
            'common_grammar': [
                (r'と思う|と思います', 'I think that~', 2, 9),  # N4 = 2
                (r'かもしれない|かもしれません', 'might be~', 2, 9),  # N4 = 2
                (r'てください|て下さい', 'please do~', 1, 9),  # N5 = 1
                (r'ことができる|ことができます', 'can do~', 2, 8),  # N4 = 2
                (r'たいです|たい', 'want to~', 1, 8),  # N5 = 1
                (r'なければならない|なければなりません', 'must do~', 3, 8),  # N3 = 3
                (r'ようになる|ようになりました', 'come to be able to~', 3, 7),  # N3 = 3
                (r'ことがある|ことがあります', 'have done before', 2, 7),  # N4 = 2
            ],
            
            # 中優先：感情表現（実用的なもの）
            'emotion_expressions': [
                (r'(嬉しい|うれしい)', 'happy', 2, 8),  # N4 = 2
                (r'(楽しい|たのしい)', 'fun/enjoyable', 2, 8),  # N4 = 2
                (r'(すごい|凄い)', 'amazing', 2, 8),  # N4 = 2
                (r'(びっくり|ビックリ)', 'surprised', 2, 7),  # N4 = 2
                (r'(心配|しんぱい)', 'worried', 2, 7),  # N4 = 2
                (r'(大変|たいへん)', 'tough/difficult', 2, 7),  # N4 = 2
            ],
            
            # ビジネス・丁寧表現
            'polite_expressions': [
                (r'よろしくお願いします', 'please take care of this', 2, 8),  # N4 = 2
                (r'お世話になっております', 'thank you for your support', 4, 7),  # N2 = 4
                (r'申し訳ございません', 'I sincerely apologize', 3, 7),  # N3 = 3
                (r'恐れ入りますが', 'I\'m sorry to trouble you but', 4, 6),  # N2 = 4
                (r'いかがでしょうか', 'how about~?', 3, 6),  # N3 = 3
            ],
            
            # 補助：Vtuber文化表現（教育的価値があるもの）
            'vtuber_culture': [
                (r'(配信|はいしん)', 'stream/broadcast', 3, 5),  # N3 = 3
                (r'(視聴者|しちょうしゃ)', 'viewer', 3, 5),  # N3 = 3
                (r'(コメント)', 'comment', 2, 5),  # N4 = 2
                (r'(チャンネル)', 'channel', 2, 5),  # N4 = 2
                (r'(登録|とうろく)', 'subscription/registration', 3, 5),  # N3 = 3
            ]
        }
        
        # English expression patterns for Japanese learners
        self.english_patterns = {
            # Essential daily expressions
            'essential_daily': [
                (r'\b(thank you|thanks)(\s+(so much|a lot))?\b', 'ありがとう(ございます)', 1, 10),  # A1 = 1
                (r'\b(I\'m\s+)?sorry\b', 'すみません/ごめんなさい', 1, 10),  # A1 = 1
                (r'\bexcuse me\b', 'すみません', 1, 10),  # A1 = 1
                (r'\bplease\b', 'お願いします', 1, 10),  # A1 = 1
                (r'\b(you\'re\s+)?welcome\b', 'どういたしまして', 1, 10),  # A1 = 1
                (r'\b(I\s+)?don\'t know\b', 'わかりません', 1, 9),  # A1 = 1
                (r'\bof course\b', 'もちろん', 2, 9),  # A2 = 2
                (r'\bno problem\b', '問題ありません', 2, 9),  # A2 = 2
            ],
            
            # Gaming/streaming expressions 
            'gaming_expressions': [
                (r'\blet\'s\s+go!?\b', '行くぞ！/よし！', 2, 8),  # A2 = 2
                (r'\bgood\s+(game|job)\b|\bgg\b', 'お疲れ様/ナイスゲーム', 2, 8),  # A2 = 2
                (r'\b(that\'s\s+)?insane!?\b', 'やばい！/すごい！', 3, 7),  # B1 = 3
                (r'\bclutch\b', 'クラッチ(土壇場での活躍)', 4, 6),  # B2 = 4
                (r'\b(I\'m\s+)?dead\b', '死んだ/やられた', 2, 7),  # A2 = 2
                (r'\bone\s+more\s+(time|game)\b', 'もう一回', 2, 8),  # A2 = 2
                (r'\bnice\s+(play|shot|try)\b', 'ナイスプレイ', 2, 8),  # A2 = 2
            ],
            
            # Internet slang and colloquial
            'internet_slang': [
                (r'\blol\b|\blmao\b', '(笑)/www', 2, 6),  # A2 = 2
                (r'\bomg\b', 'まじで/やばい', 2, 7),  # A2 = 2
                (r'\bbruh\b', 'おいおい/まじかよ', 3, 5),  # B1 = 3
                (r'\bbased\b', 'いいね/正論/最高', 4, 5),  # B2 = 4
                (r'\bpog(gers)?\b', 'すごい！/最高！', 3, 6),  # B1 = 3
                (r'\bcringe\b', '痛い/恥ずかしい', 3, 6),  # B1 = 3
            ],
            
            # Common phrasal verbs
            'phrasal_verbs': [
                (r'\blook\s+up\b', '調べる', 2, 8),  # A2 = 2
                (r'\bgive\s+up\b', '諦める', 2, 8),  # A2 = 2
                (r'\bfigure\s+out\b', '理解する/解決する', 3, 7),  # B1 = 3
                (r'\bcheck\s+out\b', '見てみる/チェックする', 2, 8),  # A2 = 2
                (r'\bhang\s+out\b', '遊ぶ/過ごす', 3, 7),  # B1 = 3
                (r'\bcome\s+up\s+with\b', '思いつく', 3, 7),  # B1 = 3
            ],
            
            # Vtuber/content creator expressions
            'content_creator': [
                (r'\b(hey\s+)?(guys|everyone|y\'?all)\b', 'みなさん', 1, 8),  # A1 = 1
                (r'\bdon\'t\s+forget\s+to\s+(subscribe|follow)\b', 'チャンネル登録お願いします', 2, 7),  # A2 = 2
                (r'\bhit\s+the\s+like\s+button\b', 'いいねボタンを押してください', 2, 7),  # A2 = 2
                (r'\bsee\s+you\s+(next\s+time|later)\b', 'また今度/またね', 2, 8),  # A2 = 2
                (r'\bthanks\s+for\s+watching\b', 'ご視聴ありがとうございました', 2, 8),  # A2 = 2
            ]
        }
        
        # Initialize with default patterns based on expected primary usage
        self.expression_patterns = self.japanese_patterns
    
    async def extract_from_conversation(
        self, 
        transcript: str, 
        context: Optional[Dict] = None,
        user_id: Optional[int] = None
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
            
            # Detect language and create appropriate prompt
            detected_lang = self.detect_language(transcript)
            
            if detected_lang == 'english' or (context and context.get('target_language') == 'english'):
                # English extraction prompt for Japanese learners
                analysis_prompt = f"""
                Extract practical English expressions that would be valuable for Japanese learners from this video transcript:

                {transcript}

                Return as a JSON array in the following format:
                [
                    {{
                        "english": "English expression",
                        "japanese": "日本語訳",
                        "reading": "reading in katakana for English pronunciation",
                        "actual_usage": "Complete sentence as used in the video",
                        "context": "Context in which it was used",
                        "difficulty": "A1/A2/B1/B2/C1/C2",
                        "category": "daily/gaming/slang/phrasal_verb/idiom",
                        "frequency": "high/medium/low",
                        "emotion": "speaker's emotion (excited/calm/frustrated/happy etc)",
                        "notes": "Usage notes for Japanese learners"
                    }}
                ]

                Focus on:
                1. Common daily expressions and greetings
                2. Gaming/streaming terminology frequently used by Vtubers
                3. Internet slang and colloquial expressions
                4. Phrasal verbs and idioms
                5. Natural conversation patterns

                Prioritize expressions that are practical and frequently used in real conversations.
                """
            else:
                # Japanese extraction prompt (existing)
                analysis_prompt = f"""
                この動画字幕から、実用的な日本語学習に価値のある表現を抽出してください：

                {transcript}

                以下の形式でJSON配列として返してください：
                [
                    {{
                        "japanese": "日本語表現",
                        "english": "English translation",
                        "reading": "ひらがな読み",
                        "actual_usage": "動画内で実際に使われた完全な文章",
                        "context": "どんな状況で使われたか",
                        "difficulty": "N5/N4/N3/N2/N1",
                        "category": "daily/grammar/emotion/polite/culture",
                        "frequency": "high/medium/low",
                        "emotion": "話者の感情（happy/sad/surprised/neutral等）",
                        "notes": "学習者向けの使い方説明"
                }}
            ]

            優先的に抽出すべき語彙：
            1. 日常会話で使用頻度が高い表現（ありがとう、すみません等）
            2. JLPT N5-N1の出題範囲に含まれる重要語彙・文法
            3. ビジネスや学校で使える丁寧な表現
            4. 感情表現（喜怒哀楽）- Vtuberの感情豊かな表現を活用
            5. 文法パターン（〜と思う、〜かもしれない等）

            重要：各語彙について、実際に動画内で使われた完全な文章を "actual_usage" に保存してください。
            これが学習者にとって最も価値のある「生きた例文」になります。
            """
            
            # Ensure AI responder is initialized
            if self.ai_responder is None:
                from app.core.ai_responder import BilingualAIResponder
                self.ai_responder = BilingualAIResponder()
            
            response = await asyncio.to_thread(
                self.ai_responder.model.generate_content,
                analysis_prompt
            )
            
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
                    # Handle both Japanese (N1-N5) and English (A1-C2) difficulty formats
                    difficulty_str = item_data.get('difficulty', 'N3')
                    
                    # Convert difficulty to numeric
                    if difficulty_str.startswith('N'):
                        # Japanese JLPT levels
                        difficulty_map = {'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5}
                        difficulty_level = difficulty_map.get(difficulty_str, 3)
                    else:
                        # English CEFR levels
                        difficulty_map = {'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6}
                        difficulty_level = difficulty_map.get(difficulty_str, 3)
                    
                    # Determine which field contains the primary expression
                    if 'english' in item_data and 'japanese' in item_data:
                        # Both fields present - check which is primary
                        if item_data.get('english', '').strip() and not item_data.get('japanese', '').strip():
                            # English is primary
                            primary_text = item_data.get('english', '')
                            translation = item_data.get('japanese', '')
                            language = 'english'
                        else:
                            # Japanese is primary (default)
                            primary_text = item_data.get('japanese', '')
                            translation = item_data.get('english', '')
                            language = 'japanese'
                    else:
                        # Fallback
                        primary_text = item_data.get('japanese', '') or item_data.get('english', '')
                        translation = item_data.get('english', '') or item_data.get('japanese', '')
                        language = 'japanese' if item_data.get('japanese') else 'english'
                    
                    vocab_item = VocabularyModel(
                        japanese=primary_text if language == 'japanese' else translation,
                        english=primary_text if language == 'english' else translation,
                        reading=item_data.get('reading', ''),
                        difficulty=difficulty_level,
                        context=item_data.get('context', ''),
                        example_sentence=item_data.get('actual_usage', item_data.get('context', '')),
                        tags=[item_data.get('category', 'general')],
                        notes=item_data.get('notes', ''),
                        source_language=language,
                        created_at=datetime.utcnow()
                    )
                    
                    # Add additional metadata if available
                    if 'frequency' in item_data:
                        vocab_item.frequency = item_data['frequency']
                    if 'emotion' in item_data:
                        vocab_item.emotion = item_data['emotion']
                    
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
            
            # Ensure AI responder is initialized
            if self.ai_responder is None:
                from app.core.ai_responder import BilingualAIResponder
                self.ai_responder = BilingualAIResponder()
                
            response = await asyncio.to_thread(
                self.ai_responder.model.generate_content,
                enhancement_prompt
            )
            
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
    
    async def process_youtube_video(self, video_id: str) -> Dict:
        """
        Process a YouTube video for vocabulary extraction
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Dictionary with processing results
        """
        try:
            # Construct YouTube URL from video ID
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            
            # Use existing extract_from_video method
            result = await self.extract_from_video(video_url)
            
            # Format response for API compatibility
            if "error" in result:
                return {
                    'success': False,
                    'error': result['error'],
                    'vocabulary_count': 0
                }
            
            return {
                'success': True,
                'vocabulary_count': result.get('vocabulary_extracted', 0),
                'vocabulary_items': result.get('vocabulary_items', []),
                'video_info': result.get('video_info', {}),
                'language_stats': result.get('language_stats', {}),
                'message': f"Successfully extracted {result.get('vocabulary_extracted', 0)} vocabulary items"
            }
            
        except Exception as e:
            logger.error(f"Error processing YouTube video {video_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'vocabulary_count': 0,
                'message': f"Failed to process video: {str(e)}"
            }
    
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
    
    def detect_language(self, text: str) -> str:
        """Detect the primary language of the text"""
        # Count Japanese characters (Hiragana, Katakana, Kanji)
        japanese_chars = len(re.findall(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', text))
        # Count Latin alphabet characters
        english_chars = len(re.findall(r'[a-zA-Z]', text))
        total_chars = len(re.sub(r'\s', '', text))
        
        if total_chars == 0:
            return 'unknown'
        
        japanese_ratio = japanese_chars / total_chars
        english_ratio = english_chars / total_chars
        
        # Determine primary language
        if japanese_ratio > 0.3:
            return 'japanese'
        elif english_ratio > 0.5:
            return 'english'
        else:
            return 'mixed'
    
    def extract_from_text(self, text: str, target_language: Optional[str] = None) -> List[Dict]:
        """Quick extraction using pattern matching (no AI) with priority scoring"""
        expressions = []
        
        # Auto-detect language if not specified
        if target_language is None:
            detected_lang = self.detect_language(text)
            if detected_lang == 'japanese':
                pattern_sets = {'japanese': self.japanese_patterns}
            elif detected_lang == 'english':
                pattern_sets = {'english': self.english_patterns}
            else:  # mixed
                pattern_sets = {'japanese': self.japanese_patterns, 'english': self.english_patterns}
        else:
            if target_language == 'japanese':
                pattern_sets = {'japanese': self.japanese_patterns}
            elif target_language == 'english':
                pattern_sets = {'english': self.english_patterns}
            else:
                pattern_sets = {'japanese': self.japanese_patterns, 'english': self.english_patterns}
        
        # Extract from appropriate pattern sets
        for lang, patterns_dict in pattern_sets.items():
            for category, patterns in patterns_dict.items():
                for pattern_data in patterns:
                    # Handle new pattern format with priority
                    if len(pattern_data) == 4:
                        pattern, meaning, difficulty, priority = pattern_data
                    else:
                        pattern, meaning = pattern_data
                        difficulty = 3  # Numeric value for N3/B1 level
                        priority = 5
                    
                    # Use case-insensitive matching for English
                    if lang == 'english':
                        matches = re.findall(pattern, text, re.IGNORECASE)
                    else:
                        matches = re.findall(pattern, text)
                    
                    for match in matches:
                        # Find the full sentence containing this match
                        if lang == 'japanese':
                            sentences = re.split(r'[。！？\n]', text)
                        else:
                            sentences = re.split(r'[.!?\n]', text)
                        
                        actual_usage = ""
                        for sentence in sentences:
                            if isinstance(match, tuple):
                                match_text = match[0] if match else ''
                            else:
                                match_text = match
                            
                            if match_text.lower() in sentence.lower():
                                actual_usage = sentence.strip()
                                break
                        
                        expressions.append({
                            "expression": match if isinstance(match, str) else match[0],
                            "category": category,
                            "meaning": meaning,
                            "difficulty": difficulty,
                            "priority": priority,
                            "language": lang,
                            "context": text[:100],  # First 100 chars as context
                            "actual_usage": actual_usage,  # Full sentence where it was used
                        })
        
        # Sort by priority (higher priority first)
        expressions.sort(key=lambda x: x.get('priority', 0), reverse=True)
        
        return expressions