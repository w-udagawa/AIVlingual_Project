#!/usr/bin/env python3
"""
Test script for video analysis and vocabulary extraction
"""

import asyncio
import sys
import os
from pathlib import Path
from typing import Dict, List

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

# Now we can import from backend
from backend.app.services.youtube_service import YouTubeService
from backend.app.services.vocabulary_extractor import VocabularyExtractor
from backend.app.services.database_service import db_service

# Test configuration
TEST_VIDEOS = [
    # Popular Vtuber clips with good vocabulary potential
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Example URL - replace with actual Vtuber videos
]

async def test_youtube_service():
    """Test YouTube service functionality"""
    print("\n🎬 Testing YouTube Service...\n")
    
    youtube_service = YouTubeService()
    
    # Test video ID extraction
    test_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "invalid_url"
    ]
    
    print("1. Testing video ID extraction:")
    for url in test_urls:
        video_id = youtube_service.extract_video_id(url)
        print(f"   URL: {url[:50]}... → Video ID: {video_id}")
    
    # Test video info retrieval
    print("\n2. Testing video info retrieval:")
    test_id = "dQw4w9WgXcQ"
    video_info = await youtube_service.get_video_info(test_id)
    if video_info:
        print(f"   ✅ Retrieved info for video {test_id}")
        print(f"   Available transcripts: {len(video_info.get('available_transcripts', []))}")
    else:
        print(f"   ❌ Failed to retrieve video info")
    
    # Test transcript retrieval
    print("\n3. Testing transcript retrieval:")
    transcript = await youtube_service.get_transcript(test_id)
    if transcript:
        print(f"   ✅ Retrieved {len(transcript)} transcript segments")
        print(f"   First segment: {transcript[0]['text'][:50]}..." if transcript else "")
    else:
        print(f"   ❌ Failed to retrieve transcript")
    
    return transcript is not None

async def test_vocabulary_extraction():
    """Test vocabulary extraction functionality"""
    print("\n📚 Testing Vocabulary Extraction...\n")
    
    vocabulary_extractor = VocabularyExtractor()
    
    # Test pattern-based extraction
    print("1. Testing pattern-based extraction:")
    test_text = "今日の配信もてぇてぇだった！草www みんなお疲れ〜 スパチャありがとう！"
    expressions = vocabulary_extractor.extract_from_text(test_text)
    print(f"   Found {len(expressions)} expressions from text")
    for expr in expressions[:3]:
        print(f"   - {expr['expression']} → {expr['meaning']} ({expr['category']})")
    
    # Test video processing
    print("\n2. Testing video vocabulary extraction:")
    test_video_id = "dQw4w9WgXcQ"
    result = await vocabulary_extractor.process_youtube_video(test_video_id)
    
    if result.get('success'):
        print(f"   ✅ Successfully processed video")
        print(f"   Vocabulary count: {result.get('vocabulary_count', 0)}")
        print(f"   Message: {result.get('message', '')}")
        
        # Show sample vocabulary items
        items = result.get('vocabulary_items', [])
        if items:
            print(f"\n   Sample vocabulary items:")
            for item in items[:3]:
                print(f"   - {item.get('japanese_text', '')} → {item.get('english_text', '')}")
    else:
        print(f"   ❌ Failed to process video: {result.get('error', 'Unknown error')}")
    
    return result.get('success', False)

async def test_database_integration():
    """Test database integration"""
    print("\n💾 Testing Database Integration...\n")
    
    # Initialize database
    await db_service.init_db()
    
    # Test saving vocabulary item
    test_item = {
        'japanese_text': 'てぇてぇ',
        'english_text': 'precious/wholesome',
        'reading': 'てぇてぇ',
        'difficulty_level': 2,
        'context': 'それはてぇてぇですね！',
        'tags': ['vtuber_slang', 'expression'],
        'source': 'test',
        'source_video_id': 'test123'
    }
    
    print("1. Testing vocabulary save:")
    try:
        from backend.app.models.vocabulary import VocabularyModel
        vocab_model = VocabularyModel(**test_item)
        item_id = await db_service.save_vocabulary_item(vocab_model)
        print(f"   ✅ Saved vocabulary item with ID: {item_id}")
        
        # Test retrieval
        print("\n2. Testing vocabulary retrieval:")
        items = await db_service.get_vocabulary_items(limit=5)
        print(f"   ✅ Retrieved {len(items)} vocabulary items")
        
        return True
    except Exception as e:
        print(f"   ❌ Database operation failed: {str(e)}")
        return False

async def run_integration_test():
    """Run full integration test"""
    print("\n🔄 Running Full Integration Test...\n")
    
    vocabulary_extractor = VocabularyExtractor()
    
    # Test with a real Vtuber video URL (replace with actual URL)
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    print(f"Processing video: {test_url}")
    result = await vocabulary_extractor.extract_from_video(test_url)
    
    if "error" not in result:
        print(f"\n✅ Integration test successful!")
        print(f"   Video: {result['video_info']['title'][:50]}...")
        print(f"   Vocabulary extracted: {result['vocabulary_extracted']}")
        print(f"   Language stats: {result.get('language_stats', {})}")
    else:
        print(f"\n❌ Integration test failed: {result['error']}")
    
    return "error" not in result

async def main():
    """Main test runner"""
    print("=" * 50)
    print("AIVlingual Video Analysis Test Suite")
    print("=" * 50)
    
    # Track test results
    results = {
        'youtube_service': False,
        'vocabulary_extraction': False,
        'database_integration': False,
        'integration_test': False
    }
    
    # Run tests
    try:
        results['youtube_service'] = await test_youtube_service()
    except Exception as e:
        print(f"\n❌ YouTube service test failed: {str(e)}")
    
    try:
        results['vocabulary_extraction'] = await test_vocabulary_extraction()
    except Exception as e:
        print(f"\n❌ Vocabulary extraction test failed: {str(e)}")
    
    try:
        results['database_integration'] = await test_database_integration()
    except Exception as e:
        print(f"\n❌ Database integration test failed: {str(e)}")
    
    try:
        results['integration_test'] = await run_integration_test()
    except Exception as e:
        print(f"\n❌ Integration test failed: {str(e)}")
    
    # Summary
    print("\n" + "=" * 50)
    print("Test Summary:")
    print("=" * 50)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    total_passed = sum(results.values())
    total_tests = len(results)
    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\nTotal: {total_passed}/{total_tests} tests passed ({success_rate:.1f}%)")
    
    if success_rate < 100:
        print("\n💡 Next steps:")
        print("   1. Check if all required API keys are configured")
        print("   2. Ensure the backend server is running")
        print("   3. Replace test URLs with actual Vtuber video URLs")
        print("   4. Check error logs for detailed information")

if __name__ == "__main__":
    asyncio.run(main())