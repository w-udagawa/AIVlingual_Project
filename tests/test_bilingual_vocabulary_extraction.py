#!/usr/bin/env python3
"""
Test script for bilingual vocabulary extraction (English and Japanese)
Tests the new extraction logic that supports both languages
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


async def test_english_text_extraction():
    """Test English pattern-based extraction for Japanese learners"""
    print("\n🔍 Testing English Pattern Extraction")
    print("=" * 60)
    
    extractor = VocabularyExtractor()
    
    # Test text containing various English expressions
    test_text = """
    Hey guys, welcome back to my stream! Thanks so much for watching.
    Today we're gonna play some games and have fun. Let's go!
    I'm really sorry about the technical issues earlier. 
    No problem though, we figured it out together.
    Don't forget to hit the like button and subscribe!
    GG everyone, that was insane! See you next time.
    """
    
    expressions = extractor.extract_from_text(test_text, target_language='english')
    
    print(f"Found {len(expressions)} expressions\n")
    
    # Display top 10 by priority
    for i, expr in enumerate(expressions[:10], 1):
        print(f"{i}. [{expr['difficulty']}] {expr['expression']} = {expr['meaning']}")
        print(f"   Category: {expr['category']}, Priority: {expr['priority']}")
        print(f"   Language: {expr['language']}")
        print(f"   Usage: {expr['actual_usage']}")
        print()
    
    return expressions


async def test_japanese_text_extraction():
    """Test Japanese pattern-based extraction"""
    print("\n🔍 Testing Japanese Pattern Extraction")
    print("=" * 60)
    
    extractor = VocabularyExtractor()
    
    # Test text containing various Japanese expressions
    test_text = """
    みなさん、こんにちは！今日も配信を見てくれてありがとうございます。
    最近、日本語の勉強をしている人が多いと聞いて、すごく嬉しいです。
    今日は新しいゲームをやってみたいと思います。
    ちょっと難しいかもしれませんが、頑張ってクリアしたいです。
    """
    
    expressions = extractor.extract_from_text(test_text, target_language='japanese')
    
    print(f"Found {len(expressions)} expressions\n")
    
    # Display top 10 by priority
    for i, expr in enumerate(expressions[:10], 1):
        print(f"{i}. [{expr['difficulty']}] {expr['expression']} = {expr['meaning']}")
        print(f"   Category: {expr['category']}, Priority: {expr['priority']}")
        print(f"   Language: {expr['language']}")
        print(f"   Usage: {expr['actual_usage']}")
        print()
    
    return expressions


async def test_mixed_language_extraction():
    """Test extraction from mixed language content"""
    print("\n🔍 Testing Mixed Language Extraction")
    print("=" * 60)
    
    extractor = VocabularyExtractor()
    
    # Test text with both languages (common in Vtuber streams)
    test_text = """
    Hey guys! 今日はspecial streamです！
    Thanks for joining! みんな、ありがとう！
    Let's play some games together. 一緒にゲームしましょう！
    Oh no, I died! やられた！That was so close!
    GG everyone! お疲れ様でした！See you next time!
    """
    
    # Extract without specifying language (auto-detect)
    expressions = extractor.extract_from_text(test_text)
    
    print(f"Found {len(expressions)} expressions\n")
    
    # Group by language
    english_exprs = [e for e in expressions if e['language'] == 'english']
    japanese_exprs = [e for e in expressions if e['language'] == 'japanese']
    
    print(f"English expressions: {len(english_exprs)}")
    print(f"Japanese expressions: {len(japanese_exprs)}")
    print()
    
    # Display samples from each language
    print("English expressions:")
    for expr in english_exprs[:3]:
        print(f"  - {expr['expression']} = {expr['meaning']}")
    
    print("\nJapanese expressions:")
    for expr in japanese_exprs[:3]:
        print(f"  - {expr['expression']} = {expr['meaning']}")
    
    return expressions


async def test_language_detection():
    """Test language detection functionality"""
    print("\n🔍 Testing Language Detection")
    print("=" * 60)
    
    extractor = VocabularyExtractor()
    
    test_cases = [
        ("Hello everyone, welcome to my stream!", "english"),
        ("みなさん、こんにちは！配信へようこそ！", "japanese"),
        ("Hey guys! 今日も頑張りましょう！Let's go!", "mixed"),
        ("GG! That was amazing! すごかった！", "mixed"),
    ]
    
    for text, expected in test_cases:
        detected = extractor.detect_language(text)
        status = "✅" if detected == expected else "❌"
        print(f"{status} '{text[:30]}...' -> {detected} (expected: {expected})")


async def test_ai_extraction_english():
    """Test AI-based extraction for English content"""
    print("\n🤖 Testing AI-Based English Extraction")
    print("=" * 60)
    
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_key_here":
        print("⚠️ Skipping AI test (no Gemini API key configured)")
        return None
    
    extractor = VocabularyExtractor()
    
    # Sample English Vtuber transcript
    test_transcript = """
    Alright chat, let's dive into this horror game! 
    I'm already scared and we haven't even started yet.
    Oh my god, what was that sound? Did you guys hear that?
    This is giving me goosebumps! I can't handle jump scares!
    Wait, let me check the settings real quick.
    Okay, here we go... wish me luck everyone!
    """
    
    print("Extracting English vocabulary from transcript...")
    vocabulary_items = await extractor.extract_from_conversation(
        test_transcript, 
        context={'target_language': 'english'}
    )
    
    print(f"\n📚 Found {len(vocabulary_items)} vocabulary items\n")
    
    for i, item in enumerate(vocabulary_items[:5], 1):
        # Handle both attribute access and dict access
        if hasattr(item, 'english'):
            print(f"{i}. {item.english}")
            print(f"   Japanese: {item.japanese}")
            print(f"   Reading: {item.reading}")
            print(f"   Context: {item.context}")
        else:
            print(f"{i}. {item.get('english', 'N/A')}")
            print(f"   Japanese: {item.get('japanese', 'N/A')}")
        print()
    
    return vocabulary_items


async def main():
    """Run all tests"""
    print("🚀 Starting Bilingual Vocabulary Extraction Tests")
    print("=" * 60)
    
    # Test 1: Language detection
    await test_language_detection()
    
    # Test 2: English pattern extraction
    await test_english_text_extraction()
    
    # Test 3: Japanese pattern extraction
    await test_japanese_text_extraction()
    
    # Test 4: Mixed language extraction
    await test_mixed_language_extraction()
    
    # Test 5: AI-based English extraction
    await test_ai_extraction_english()
    
    print("\n✅ All tests completed!")


if __name__ == "__main__":
    asyncio.run(main())