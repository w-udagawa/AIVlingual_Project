#!/usr/bin/env python
"""
NLP Vocabulary Extraction Test Suite
Run in VSCode: Right-click and select "Run Python File in Terminal"
Or use: python test_nlp_improved.py
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime

# Add project to path
sys.path.append(str(Path(__file__).parent))

from app.services.nlp_vocabulary_extractor import nlp_extractor
from app.services.vocabulary_extractor import VocabularyExtractor

# Test configuration
# Using popular Vtuber videos with confirmed subtitles
TEST_VIDEO_IDS = [
    "HKYkhkYGG7A",  # User-provided video
    "5KsXVs8Vg7U",  # Gawr Gura - "a" video (short, has captions)
    "jHibTDJlTJw",  # Pekora clip
    "0HIBDGni1-o",  # Korone English clip
]
TEST_VIDEO_ID = TEST_VIDEO_IDS[0]  # Default to first video
TEST_TEXTS = {
    "japanese": "これはテストです。大丈夫ですか？配信を見ています。勉強しましょう。楽しいですね。",
    "english": "Let's check out this amazing stream! I'm gonna figure out how to play this game. Don't forget to hit the like button!",
    "mixed": "今日のstreamは楽しかった！Let's play again tomorrow! みんなありがとう。"
}

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    """Print a formatted header"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{text:^60}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}\n")

def print_success(text):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")

def print_error(text):
    """Print error message"""
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")

def print_info(text):
    """Print info message"""
    print(f"{Colors.CYAN}ℹ {text}{Colors.RESET}")

def print_vocab_item(item, index):
    """Print a formatted vocabulary item"""
    print(f"\n{Colors.YELLOW}{index}. {item['expression']}{Colors.RESET}")
    
    if 'meaning' in item:
        print(f"   Meaning: {item['meaning']}")
    
    if 'difficulty' in item:
        diff_str = f"Difficulty: {item['difficulty']}"
        if isinstance(item['difficulty'], str):
            diff_str += f" {Colors.RED}(STRING - should be numeric!){Colors.RESET}"
        else:
            diff_str += f" {Colors.GREEN}(numeric){Colors.RESET}"
        print(f"   {diff_str}")
    
    if 'type' in item:
        print(f"   Type: {Colors.MAGENTA}{item['type']}{Colors.RESET}")
    
    if 'category' in item:
        print(f"   Category: {item['category']}")
    
    if 'priority' in item:
        print(f"   Priority: {item['priority']}")
    
    if 'actual_usage' in item and item['actual_usage']:
        print(f"   Usage: \"{item['actual_usage'][:80]}...\"" if len(item['actual_usage']) > 80 else f"   Usage: \"{item['actual_usage']}\"")

async def test_nlp_status():
    """Test 1: Check NLP model status"""
    print_header("Test 1: NLP Model Status")
    
    # Check spaCy availability
    try:
        import spacy
        print_success("spaCy is installed")
        print_info(f"spaCy version: {spacy.__version__}")
    except ImportError:
        print_error("spaCy is not installed!")
        return False
    
    # Check models
    print_info(f"Japanese model loaded: {nlp_extractor.nlp_ja is not None}")
    print_info(f"English model loaded: {nlp_extractor.nlp_en is not None}")
    
    if nlp_extractor.nlp_ja:
        print_success("Japanese NLP model is ready")
    else:
        print_error("Japanese NLP model is not loaded")
    
    if nlp_extractor.nlp_en:
        print_success("English NLP model is ready")
    else:
        print_error("English NLP model is not loaded")
    
    return True

async def test_pattern_extraction():
    """Test 2: Pattern-based extraction"""
    print_header("Test 2: Pattern-based Extraction")
    
    base_extractor = VocabularyExtractor()
    
    for lang, text in TEST_TEXTS.items():
        print(f"\n{Colors.CYAN}Testing {lang} text:{Colors.RESET}")
        results = base_extractor.extract_from_text(text, lang if lang != "mixed" else None)
        
        print_success(f"Found {len(results)} expressions")
        
        # Show first 3
        for i, item in enumerate(results[:3], 1):
            print_vocab_item(item, i)

async def test_nlp_extraction():
    """Test 3: NLP-enhanced extraction"""
    print_header("Test 3: NLP-enhanced Extraction")
    
    for lang, text in TEST_TEXTS.items():
        print(f"\n{Colors.CYAN}Testing {lang} text:{Colors.RESET}")
        
        try:
            results = await nlp_extractor.extract_from_text_nlp(
                text, 
                lang if lang != "mixed" else None
            )
            
            print_success(f"Found {len(results)} expressions with NLP")
            
            # Show first 5
            for i, item in enumerate(results[:5], 1):
                print_vocab_item(item, i)
                
        except Exception as e:
            print_error(f"NLP extraction failed: {str(e)}")

async def test_youtube_extraction():
    """Test 4: YouTube video extraction"""
    print_header("Test 4: YouTube Video Extraction")
    
    success = False
    for video_id in TEST_VIDEO_IDS:
        print_info(f"Testing video ID: {video_id}")
        
        try:
            print_info("Processing video (this may take a moment)...")
            result = await nlp_extractor.process_youtube_video(video_id)
            
            if result.get('success'):
                count = result.get('vocabulary_count', 0)
                print_success(f"Extracted {count} vocabulary items")
                
                if count < 10:
                    print_error(f"Only {count} items extracted - NLP may not be working properly!")
                elif count < 30:
                    print_info(f"Extracted {count} items - NLP is partially working")
                else:
                    print_success(f"Extracted {count} items - NLP is working well!")
                
                # Show first few items
                items = result.get('vocabulary_items', [])
                if items:
                    print(f"\n{Colors.YELLOW}Sample vocabulary items:{Colors.RESET}")
                    for i, item in enumerate(items[:3], 1):
                        print(f"\n{i}. {item.get('japanese_text', '')} / {item.get('english_text', '')}")
                        if 'difficulty_level' in item:
                            print(f"   Difficulty: {item['difficulty_level']}")
                        if 'tags' in item:
                            print(f"   Tags: {', '.join(item['tags'])}")
                
                success = True
                break  # Success, no need to try other videos
            else:
                print_error(f"Video extraction failed: {result.get('error', 'Unknown error')}")
                if video_id != TEST_VIDEO_IDS[-1]:
                    print_info("Trying another video...")
                
        except Exception as e:
            print_error(f"YouTube extraction error: {str(e)}")
            if video_id != TEST_VIDEO_IDS[-1]:
                print_info("Trying another video...")
    
    if not success:
        print_error("All test videos failed. Please check your YouTube API key or try different video IDs.")

async def test_sort_function():
    """Test 5: Sort function with mixed difficulty types"""
    print_header("Test 5: Sort Function Test")
    
    # Create test data with mixed difficulty types
    test_expressions = [
        {"expression": "hello", "difficulty": 1, "priority": 5},
        {"expression": "こんにちは", "difficulty": "N5", "priority": 8},  # String
        {"expression": "difficult", "difficulty": 4, "priority": 3},
        {"expression": "すみません", "difficulty": "N4", "priority": 9},  # String
        {"expression": "amazing", "difficulty": "B2", "priority": 6},  # String
    ]
    
    print_info("Testing sort with mixed numeric and string difficulties...")
    
    try:
        sorted_exprs = nlp_extractor._sort_by_priority(test_expressions)
        print_success("Sort function handled mixed types successfully!")
        
        print(f"\n{Colors.YELLOW}Sorted results:{Colors.RESET}")
        for i, expr in enumerate(sorted_exprs, 1):
            print(f"{i}. {expr['expression']} - Priority: {expr['priority']}, Difficulty: {expr['difficulty']}")
            
    except Exception as e:
        print_error(f"Sort function failed: {str(e)}")

async def main():
    """Run all tests"""
    print(f"\n{Colors.BOLD}AIVlingual NLP Vocabulary Extraction Test Suite{Colors.RESET}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run tests
    await test_nlp_status()
    await test_pattern_extraction()
    await test_nlp_extraction()
    await test_sort_function()
    await test_youtube_extraction()
    
    print_header("Test Summary")
    print_success("All tests completed!")
    print_info("If you see 30+ vocabulary items from YouTube, NLP is working correctly.")
    print_info("If you only see 3 items, check the error messages above.")

if __name__ == "__main__":
    # For Windows color support
    if sys.platform == "win32":
        import os
        os.system("color")
    
    asyncio.run(main())