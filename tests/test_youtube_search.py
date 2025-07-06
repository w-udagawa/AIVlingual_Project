#!/usr/bin/env python3
"""
YouTube検索機能のテスト
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from app.services.youtube_service import YouTubeService

async def test_youtube_search():
    """YouTube検索機能をテスト"""
    print("=" * 60)
    print("YouTube検索テスト")
    print("=" * 60)
    
    youtube_service = YouTubeService()
    
    # Vtuber関連の動画を検索
    queries = [
        "ホロライブ 日本語勉強",
        "にじさんじ 英語",
        "Vtuber 日本語レッスン"
    ]
    
    for query in queries:
        print(f"\n🔍 検索クエリ: {query}")
        
        videos = await youtube_service.search_videos(query, max_results=5, vtuber_filter=True)
        
        if videos:
            print(f"   ✅ {len(videos)}件の動画が見つかりました\n")
            
            for i, video in enumerate(videos, 1):
                print(f"   {i}. {video['title'][:50]}...")
                print(f"      チャンネル: {video['channel_title']}")
                print(f"      公開日: {video['published_at'][:10]}")
                print(f"      URL: {video['url']}")
                
                # この動画の字幕が利用可能か確認
                video_id = video['video_id']
                video_info = await youtube_service.get_video_info(video_id)
                if video_info and video_info.get('available_transcripts'):
                    transcripts = video_info['available_transcripts']
                    languages = [t['language_code'] for t in transcripts]
                    print(f"      利用可能な字幕: {', '.join(languages)}")
                print()
        else:
            print("   ❌ 動画が見つかりませんでした")
    
    print("=" * 60)
    print("テスト完了！")

if __name__ == "__main__":
    asyncio.run(test_youtube_search())