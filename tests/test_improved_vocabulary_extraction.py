#!/usr/bin/env python3
"""
Test script for improved vocabulary extraction with educational focus
Tests the new extraction logic that prioritizes practical daily expressions
"""

import asyncio
import json
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.app.services.vocabulary_extractor import VocabularyExtractor
from backend.app.core.config import settings


async def test_text_extraction():
    """Test pattern-based extraction with priority scoring"""
    print("\n🔍 Testing Pattern-Based Extraction with Priority Scoring")
    print("=" * 60)
    
    extractor = VocabularyExtractor()
    
    # Test text containing various expressions
    test_text = """
    今日は本当にありがとうございました！配信を見てくれて嬉しいです。
    みんなのコメントを読むのが楽しいと思います。
    次回の配信もよろしくお願いします。大丈夫だよ、心配しないで！
    今日はちょっと大変でしたが、すごく楽しかったです。
    失礼しますが、そろそろ終わりにしたいと思います。
    """
    
    expressions = extractor.extract_from_text(test_text)
    
    print(f"Found {len(expressions)} expressions\n")
    
    # Display top 10 by priority
    for i, expr in enumerate(expressions[:10], 1):
        print(f"{i}. [{expr['difficulty']}] {expr['expression']} = {expr['meaning']}")
        print(f"   Category: {expr['category']}, Priority: {expr['priority']}")
        print(f"   Usage: {expr['actual_usage']}")
        print()
    
    return expressions


async def test_ai_extraction():
    """Test AI-based extraction with educational focus"""
    print("\n🤖 Testing AI-Based Extraction with Educational Focus")
    print("=" * 60)
    
    extractor = VocabularyExtractor()
    
    # Sample transcript from a Vtuber stream
    test_transcript = """
    みなさん、こんにちは！今日も配信を見てくれてありがとうございます。
    最近、日本語の勉強をしている人が多いと聞いて、すごく嬉しいです。
    今日は新しいゲームをやってみたいと思います。
    ちょっと難しいかもしれませんが、頑張ってクリアしたいです。
    みんなも応援してくださいね。よろしくお願いします！
    あ、そうそう、昨日のコラボ配信は本当に楽しかったです。
    また機会があれば、一緒にやりたいと思います。
    それじゃあ、ゲームを始めましょうか。
    """
    
    print("Extracting vocabulary from transcript...")
    vocabulary_items = await extractor.extract_from_conversation(test_transcript)
    
    print(f"\n📚 Found {len(vocabulary_items)} vocabulary items\n")
    
    for i, item in enumerate(vocabulary_items[:5], 1):
        print(f"{i}. {item.japanese} ({item.reading})")
        print(f"   English: {item.english}")
        print(f"   Example: {item.example_sentence}")
        print(f"   Context: {item.context}")
        print(f"   Tags: {', '.join(item.tags)}")
        print()
    
    return vocabulary_items


async def test_video_extraction():
    """Test extraction from actual YouTube video"""
    print("\n🎥 Testing Video Extraction with New Logic")
    print("=" * 60)
    
    # Use the test video URL from the E2E test
    test_video_url = "https://youtu.be/HKYkhkYGG7A"
    
    extractor = VocabularyExtractor()
    
    try:
        print(f"Extracting vocabulary from: {test_video_url}")
        result = await extractor.extract_from_video(test_video_url)
        
        if "error" in result:
            print(f"❌ Error: {result['error']}")
            return None
        
        print(f"\n✅ Successfully extracted {result['vocabulary_extracted']} items")
        print(f"\n📊 Video Info:")
        print(f"   Title: {result['video_info'].get('title', 'N/A')}")
        print(f"   Channel: {result['video_info'].get('channel_title', 'N/A')}")
        
        print(f"\n📝 Sample Vocabulary Items:")
        for i, item in enumerate(result['vocabulary_items'][:5], 1):
            print(f"\n{i}. {item.get('japanese', 'N/A')} = {item.get('english', 'N/A')}")
            print(f"   Difficulty: {item.get('difficulty', 'N/A')}")
            print(f"   Context: {item.get('context', 'N/A')[:100]}...")
            if 'example_sentence' in item:
                print(f"   Example: {item['example_sentence']}")
        
        # Analyze educational value
        print("\n📈 Educational Value Analysis:")
        categories = {}
        difficulties = {}
        
        for item in result['vocabulary_items']:
            # Count by category
            for tag in item.get('tags', []):
                categories[tag] = categories.get(tag, 0) + 1
            
            # Count by difficulty
            diff = item.get('difficulty', 3)
            diff_label = f"N{6-diff}" if isinstance(diff, int) else str(diff)
            difficulties[diff_label] = difficulties.get(diff_label, 0) + 1
        
        print("\nCategories:")
        for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            print(f"  - {cat}: {count} items")
        
        print("\nDifficulty Distribution:")
        for diff, count in sorted(difficulties.items()):
            print(f"  - {diff}: {count} items")
        
        return result
        
    except Exception as e:
        print(f"❌ Error during video extraction: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


async def compare_extraction_methods():
    """Compare old vs new extraction approach"""
    print("\n🔄 Comparing Extraction Methods")
    print("=" * 60)
    
    test_text = "今日はありがとうございました！てぇてぇな配信でした。"
    
    extractor = VocabularyExtractor()
    pattern_results = extractor.extract_from_text(test_text)
    
    print("Pattern-based extraction results:")
    print(f"Total items: {len(pattern_results)}")
    
    # Show what was prioritized
    essential_count = sum(1 for r in pattern_results if r['category'] == 'essential_daily')
    vtuber_count = sum(1 for r in pattern_results if r['category'] == 'vtuber_culture')
    
    print(f"Essential daily expressions: {essential_count}")
    print(f"Vtuber culture expressions: {vtuber_count}")
    print(f"\nTop priority item: {pattern_results[0]['expression'] if pattern_results else 'None'}")


async def main():
    """Run all tests"""
    print("🚀 Starting Improved Vocabulary Extraction Tests")
    print("=" * 60)
    
    # Test 1: Pattern-based extraction
    await test_text_extraction()
    
    # Test 2: AI-based extraction
    await test_ai_extraction()
    
    # Test 3: Compare methods
    await compare_extraction_methods()
    
    # Test 4: Real video extraction (optional - requires API key)
    if settings.YOUTUBE_API_KEY and settings.YOUTUBE_API_KEY != "your_youtube_api_key_here":
        await test_video_extraction()
    else:
        print("\n⚠️ Skipping video extraction test (no YouTube API key configured)")
    
    print("\n✅ All tests completed!")


if __name__ == "__main__":
    asyncio.run(main())