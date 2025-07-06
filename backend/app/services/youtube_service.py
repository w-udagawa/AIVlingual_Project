"""
YouTube integration service using youtube-transcript-api and YouTube Data API
"""

import re
from typing import Dict, List, Optional, Tuple
import logging
from urllib.parse import urlparse, parse_qs
import aiohttp
import json

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

from app.core.config import settings

logger = logging.getLogger(__name__)


class YouTubeService:
    """Service for extracting transcripts and metadata from YouTube videos"""
    
    def __init__(self):
        self.supported_languages = ['ja', 'en']
        
    def extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        # Handle different YouTube URL formats
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
            r'(?:embed\/)([0-9A-Za-z_-]{11})',
            r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
                
        # Try parsing as query parameter
        parsed_url = urlparse(url)
        if parsed_url.hostname in ['www.youtube.com', 'youtube.com']:
            query_params = parse_qs(parsed_url.query)
            if 'v' in query_params:
                return query_params['v'][0]
                
        return None
    
    async def get_video_info(self, video_id: str) -> Optional[Dict]:
        """Get video information using YouTube Data API if available"""
        try:
            # Try YouTube Data API first if API key is available
            if settings.YOUTUBE_API_KEY:
                video_data = await self._get_video_info_from_api(video_id)
                if video_data:
                    # Also get transcript info
                    try:
                        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                        available_languages = []
                        for transcript in transcript_list:
                            available_languages.append({
                                'language': transcript.language,
                                'language_code': transcript.language_code,
                                'is_generated': transcript.is_generated,
                                'is_translatable': transcript.is_translatable
                            })
                        video_data['available_transcripts'] = available_languages
                    except:
                        video_data['available_transcripts'] = []
                    
                    return video_data
            
            # Fallback to transcript-only info
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            # Get available languages
            available_languages = []
            for transcript in transcript_list:
                available_languages.append({
                    'language': transcript.language,
                    'language_code': transcript.language_code,
                    'is_generated': transcript.is_generated,
                    'is_translatable': transcript.is_translatable
                })
            
            return {
                'video_id': video_id,
                'title': f'Video {video_id}',  # Can't get title without API
                'description': '',
                'channel_title': '',
                'channel_id': '',
                'duration': 0,
                'view_count': 0,
                'like_count': 0,
                'published_at': '',
                'tags': [],
                'available_transcripts': available_languages,
                'url': f'https://www.youtube.com/watch?v={video_id}'
            }
            
        except Exception as e:
            logger.error(f"Error getting video info: {str(e)}")
            return None
    
    async def _get_video_info_from_api(self, video_id: str) -> Optional[Dict]:
        """Get video information from YouTube Data API"""
        try:
            url = "https://www.googleapis.com/youtube/v3/videos"
            params = {
                'id': video_id,
                'key': settings.YOUTUBE_API_KEY,
                'part': 'snippet,contentDetails,statistics'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"YouTube API error: {response.status}")
                        return None
                    
                    data = await response.json()
                    
                    if not data.get('items'):
                        logger.error(f"Video not found: {video_id}")
                        return None
                    
                    item = data['items'][0]
                    snippet = item['snippet']
                    stats = item.get('statistics', {})
                    details = item.get('contentDetails', {})
                    
                    # Parse duration from ISO 8601 format
                    duration_seconds = self._parse_duration(details.get('duration', 'PT0S'))
                    
                    return {
                        'video_id': video_id,
                        'title': snippet.get('title', ''),
                        'description': snippet.get('description', '')[:500],  # Limit description length
                        'channel_title': snippet.get('channelTitle', ''),
                        'channel_id': snippet.get('channelId', ''),
                        'duration': duration_seconds,
                        'view_count': int(stats.get('viewCount', 0)),
                        'like_count': int(stats.get('likeCount', 0)),
                        'comment_count': int(stats.get('commentCount', 0)),
                        'published_at': snippet.get('publishedAt', ''),
                        'tags': snippet.get('tags', [])[:10],  # Limit tags
                        'thumbnail_url': snippet.get('thumbnails', {}).get('high', {}).get('url', ''),
                        'url': f'https://www.youtube.com/watch?v={video_id}'
                    }
                    
        except Exception as e:
            logger.error(f"Error calling YouTube Data API: {str(e)}")
            return None
    
    def _parse_duration(self, duration_str: str) -> int:
        """Parse ISO 8601 duration to seconds"""
        # Example: PT4M13S -> 253 seconds
        import re
        
        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration_str)
        if not match:
            return 0
        
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return hours * 3600 + minutes * 60 + seconds
    
    async def get_transcript(self, video_id: str, languages: Optional[List[str]] = None, prefer_auto_generated: bool = False) -> Optional[List[Dict]]:
        """Get video transcript
        
        Args:
            video_id: YouTube video ID
            languages: Preferred languages (default: ['ja', 'en'])
            prefer_auto_generated: If True, try auto-generated captions first
        """
        try:
            if not languages:
                languages = self.supported_languages
                
            # Expand language codes to include variants
            expanded_languages = []
            for lang in languages:
                if lang == 'ja':
                    expanded_languages.extend(['ja', 'ja-JP'])
                elif lang == 'en':
                    expanded_languages.extend(['en', 'en-US', 'en-GB'])
                else:
                    expanded_languages.append(lang)
                    
            # Try to get transcript in preferred languages
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            transcript = None
            selected_language = None
            
            # If prefer_auto_generated, try generated ones first
            if prefer_auto_generated:
                for lang in expanded_languages:
                    try:
                        transcript = transcript_list.find_generated_transcript([lang])
                        selected_language = lang
                        logger.info(f"Found auto-generated transcript for {video_id} in {lang}")
                        break
                    except NoTranscriptFound:
                        continue
            
            # Try manual transcripts
            if not transcript:
                for lang in expanded_languages:
                    try:
                        transcript = transcript_list.find_manually_created_transcript([lang])
                        selected_language = lang
                        logger.info(f"Found manual transcript for {video_id} in {lang}")
                        break
                    except NoTranscriptFound:
                        continue
                        
            # If no manual transcript and not prefer_auto_generated, try generated ones
            if not transcript and not prefer_auto_generated:
                for lang in expanded_languages:
                    try:
                        transcript = transcript_list.find_generated_transcript([lang])
                        selected_language = lang
                        logger.info(f"Found auto-generated transcript for {video_id} in {lang}")
                        break
                    except NoTranscriptFound:
                        continue
            
            # Last resort: try auto-translation
            if not transcript:
                logger.info(f"Attempting auto-translation for video {video_id}")
                for available_transcript in transcript_list:
                    try:
                        # Translate to the first preferred language
                        target_lang = languages[0]
                        transcript = available_transcript.translate(target_lang)
                        selected_language = f"{available_transcript.language_code}->{target_lang}"
                        logger.info(f"Auto-translated from {available_transcript.language_code} to {target_lang}")
                        break
                    except Exception as e:
                        logger.debug(f"Translation failed: {e}")
                        continue
                        
            if not transcript:
                logger.warning(f"No transcript found for video {video_id} in languages {expanded_languages}")
                return None
                
            # Fetch the transcript
            transcript_data = transcript.fetch()
            
            # Format transcript data
            formatted_transcript = []
            for entry in transcript_data:
                # Handle the new API format
                if hasattr(entry, '__dict__'):
                    # New format with object attributes
                    formatted_transcript.append({
                        'text': entry.text,
                        'start': entry.start,
                        'duration': entry.duration,
                        'end': entry.start + entry.duration,
                        'language': selected_language
                    })
                else:
                    # Old format with dictionary
                    formatted_transcript.append({
                        'text': entry['text'],
                        'start': entry['start'],
                        'duration': entry['duration'],
                        'end': entry['start'] + entry['duration'],
                        'language': selected_language
                    })
                
            logger.info(f"Retrieved {len(formatted_transcript)} transcript entries for video {video_id}")
            return formatted_transcript
            
        except TranscriptsDisabled:
            logger.warning(f"Transcripts are disabled for video {video_id}")
            return None
        except NoTranscriptFound:
            logger.warning(f"No transcript found for video {video_id}")
            return None
        except Exception as e:
            logger.error(f"Error getting transcript for video {video_id}: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            if hasattr(e, '__traceback__'):
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    async def analyze_video(self, video_id: str) -> Dict:
        """Analyze video for language learning content"""
        result = {
            'video_id': video_id,
            'status': 'success',
            'video_info': None,
            'transcript': None,
            'analysis': None,
            'error': None
        }
        
        try:
            # Get video info
            video_info = await self.get_video_info(video_id)
            if not video_info:
                result['status'] = 'error'
                result['error'] = 'Could not retrieve video information'
                return result
                
            result['video_info'] = video_info
            
            # Get transcript
            transcript = await self.get_transcript(video_id)
            if not transcript:
                result['status'] = 'error'
                result['error'] = 'Could not retrieve video transcript'
                return result
                
            result['transcript'] = transcript
            
            # Analyze transcript
            analysis = self._analyze_transcript(transcript)
            result['analysis'] = analysis
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing video: {str(e)}")
            result['status'] = 'error'
            result['error'] = str(e)
            return result
    
    def _analyze_transcript(self, transcript: List[Dict]) -> Dict:
        """Analyze transcript for language learning features"""
        total_duration = 0
        total_words = 0
        japanese_segments = 0
        english_segments = 0
        mixed_segments = 0
        
        for entry in transcript:
            text = entry['text']
            total_duration = max(total_duration, entry['end'])
            total_words += len(text.split())
            
            # Simple language detection
            has_japanese = any('\u3000' <= c <= '\u9fff' or '\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff' for c in text)
            has_english = any('a' <= c.lower() <= 'z' for c in text)
            
            if has_japanese and has_english:
                mixed_segments += 1
            elif has_japanese:
                japanese_segments += 1
            elif has_english:
                english_segments += 1
                
        return {
            'total_duration': total_duration,
            'total_segments': len(transcript),
            'total_words': total_words,
            'japanese_segments': japanese_segments,
            'english_segments': english_segments,
            'mixed_segments': mixed_segments,
            'average_segment_duration': total_duration / len(transcript) if transcript else 0,
            'words_per_minute': (total_words / total_duration * 60) if total_duration > 0 else 0
        }
    
    def format_timestamp_link(self, video_id: str, timestamp: float) -> str:
        """Format a YouTube URL with timestamp"""
        return f"https://www.youtube.com/watch?v={video_id}&t={int(timestamp)}s"
    
    async def extract_vocabulary_from_video(self, url: str) -> Dict:
        """Extract vocabulary and expressions from a YouTube video"""
        try:
            # Extract video ID
            video_id = self.extract_video_id(url)
            if not video_id:
                return {"error": "Invalid YouTube URL"}
            
            # Get video analysis
            video_data = await self.analyze_video(video_id)
            if video_data['status'] == 'error':
                return video_data
            
            # Extract expressions from transcript
            expressions = []
            if video_data['transcript']:
                expressions = self._extract_expressions_from_transcript(video_data['transcript'])
            
            return {
                'video_info': video_data['video_info'],
                'expressions': expressions,
                'language_stats': video_data['analysis'],
                'total_expressions': len(expressions)
            }
            
        except Exception as e:
            logger.error(f"Error extracting vocabulary from video: {str(e)}")
            return {"error": str(e)}
    
    def _extract_expressions_from_transcript(self, transcript: List[Dict]) -> List[Dict]:
        """Extract interesting expressions from transcript"""
        expressions = []
        
        # Common Vtuber expressions patterns
        vtuber_patterns = [
            (r'(てぇてぇ|てえてえ)', 'precious/wholesome', 'vtuber_slang'),
            (r'(ぽんこつ|ポンコツ)', 'clumsy/airhead', 'vtuber_slang'),
            (r'(草|くさ|ｗｗｗ)', 'lol/laughing', 'internet_slang'),
            (r'(スパチャ|スーパーチャット)', 'super chat', 'vtuber_term'),
            (r'(配信|はいしん)', 'streaming', 'streaming_term'),
            (r'やば[いぁ]', 'amazing/terrible', 'casual'),
            (r'かわいい', 'cute', 'common'),
            # 一般的な日本語表現も追加
            (r'(すごい|スゴイ|凄い)', 'amazing', 'common'),
            (r'(ありがとう|ありがとうございます)', 'thank you', 'common'),
            (r'(大丈夫|だいじょうぶ)', 'it\'s okay/alright', 'common'),
            (r'(がんばる|頑張る)', 'do my best', 'common'),
            (r'(たのしい|楽しい)', 'fun/enjoyable', 'common'),
            (r'(うれしい|嬉しい)', 'happy', 'common'),
            (r'(ドラマ)', 'drama', 'media'),
        ]
        
        for segment in transcript:
            text = segment['text']
            
            # Check for patterns
            for pattern, meaning, expr_type in vtuber_patterns:
                matches = re.finditer(pattern, text)
                for match in matches:
                    expressions.append({
                        'japanese': match.group(),
                        'english': meaning,
                        'type': expr_type,
                        'context': text,
                        'timestamp': segment['start'],
                        'video_id': segment.get('video_id', '')
                    })
        
        # Remove duplicates while preserving order
        seen = set()
        unique_expressions = []
        for expr in expressions:
            key = (expr['japanese'], expr['english'])
            if key not in seen:
                seen.add(key)
                unique_expressions.append(expr)
        
        return unique_expressions[:50]  # Limit to top 50 expressions
    
    async def get_channel_videos(self, channel_id: str, max_results: int = 20) -> Optional[List[Dict]]:
        """Get recent videos from a YouTube channel"""
        if not settings.YOUTUBE_API_KEY:
            logger.warning("YouTube API key not configured")
            return None
        
        try:
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                'channelId': channel_id,
                'key': settings.YOUTUBE_API_KEY,
                'part': 'id,snippet',
                'order': 'date',
                'maxResults': max_results,
                'type': 'video'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"YouTube API error: {response.status}")
                        return None
                    
                    data = await response.json()
                    
                    videos = []
                    for item in data.get('items', []):
                        video = {
                            'video_id': item['id']['videoId'],
                            'title': item['snippet']['title'],
                            'description': item['snippet']['description'][:200],
                            'published_at': item['snippet']['publishedAt'],
                            'thumbnail_url': item['snippet']['thumbnails']['high']['url'],
                            'channel_title': item['snippet']['channelTitle'],
                            'url': f"https://www.youtube.com/watch?v={item['id']['videoId']}"
                        }
                        videos.append(video)
                    
                    return videos
                    
        except Exception as e:
            logger.error(f"Error getting channel videos: {str(e)}")
            return None
    
    async def search_videos(self, query: str, max_results: int = 10, vtuber_filter: bool = True) -> Optional[List[Dict]]:
        """Search for videos on YouTube"""
        if not settings.YOUTUBE_API_KEY:
            logger.warning("YouTube API key not configured")
            return None
        
        try:
            # Add Vtuber-related terms to search if filter is enabled
            if vtuber_filter:
                query = f"{query} (Vtuber OR VTuber OR バーチャルYouTuber)"
            
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                'q': query,
                'key': settings.YOUTUBE_API_KEY,
                'part': 'id,snippet',
                'maxResults': max_results,
                'type': 'video',
                'relevanceLanguage': 'ja'  # Prioritize Japanese content
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"YouTube API error: {response.status}")
                        return None
                    
                    data = await response.json()
                    
                    videos = []
                    for item in data.get('items', []):
                        video = {
                            'video_id': item['id']['videoId'],
                            'title': item['snippet']['title'],
                            'description': item['snippet']['description'][:200],
                            'published_at': item['snippet']['publishedAt'],
                            'thumbnail_url': item['snippet']['thumbnails']['high']['url'],
                            'channel_title': item['snippet']['channelTitle'],
                            'channel_id': item['snippet']['channelId'],
                            'url': f"https://www.youtube.com/watch?v={item['id']['videoId']}"
                        }
                        videos.append(video)
                    
                    return videos
                    
        except Exception as e:
            logger.error(f"Error searching videos: {str(e)}")
            return None