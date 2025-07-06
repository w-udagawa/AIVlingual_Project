#!/usr/bin/env python3
"""
Test script for NLP-enhanced vocabulary extraction
Demonstrates the improvements over pattern-based extraction
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Try to import NLP extractor
try:
    from backend.app.services.nlp_vocabulary_extractor import nlp_extractor, SPACY_AVAILABLE
    NLP_AVAILABLE = True
except ImportError:
    NLP_AVAILABLE = False
    print("⚠️ NLP extractor not available. Falling back to basic extractor.")
    from backend.app.services.vocabulary_extractor import VocabularyExtractor
    extractor = VocabularyExtractor()


async def test_nlp_extraction():
    """Test NLP extraction with realistic Vtuber content"""
    print("\n🔬 Testing NLP-Enhanced Vocabulary Extraction")
    print("=" * 70)
    
    # Test text with various expression types
    test_text = """
    Hey guys, welcome back to another stream! I hope you're all doing well today.
    Let's dive into this horror game - I've been putting it off for weeks because 
    I'm such a scaredy-cat! 
    
    Oh my god, did you hear that sound? That gave me goosebumps! 
    I'm gonna check out this dark corridor... wish me luck!
    
    Wait, I need to figure out the controls first. Let me look up the keybindings.
    Okay, so WASD to move, shift to run... pretty standard stuff.
    
    AHHH! That jump scare got me good! My heart is racing! 
    I literally jumped out of my chair! This game is absolutely insane!
    
    Alright chat, should we call it a day or keep going? 
    I know we've been at this for hours, but I'm determined to beat this level.
    Thanks for hanging out with me today - you guys are the best!
    """
    
    if NLP_AVAILABLE:
        print("✅ Using NLP-enhanced extraction (spaCy + CEFR datasets)")
        
        # Test NLP extraction
        start_time = datetime.now()
        expressions = await nlp_extractor.extract_from_text_nlp(test_text, target_language='english')
        elapsed = (datetime.now() - start_time).total_seconds()
        
        print(f"\n📊 Extraction completed in {elapsed:.2f} seconds")
        print(f"📚 Found {len(expressions)} expressions")
        
        # Group by type
        types_count = {}
        for expr in expressions:
            expr_type = expr.get('type', 'unknown')
            types_count[expr_type] = types_count.get(expr_type, 0) + 1
        
        print("\n📈 Expression Types:")
        for expr_type, count in sorted(types_count.items(), key=lambda x: x[1], reverse=True):
            print(f"  - {expr_type}: {count}")
        
        # Show top expressions by priority
        print("\n🎯 Top 20 Expressions by Educational Priority:")
        print("-" * 70)
        
        for i, expr in enumerate(expressions[:20], 1):
            print(f"\n{i}. [{expr.get('priority', 5)}/10] \"{expr['expression']}\"")
            
            # Type and category
            print(f"   Type: {expr.get('type', 'unknown')} | Category: {expr.get('category', 'general')}")
            
            # CEFR level if available
            if expr.get('cefr_level'):
                confidence = expr.get('cefr_confidence', 0) * 100
                print(f"   CEFR: {expr['cefr_level']} ({expr.get('cefr_source', 'unknown')} - {confidence:.0f}% confidence)")
            
            # Meaning if available
            if expr.get('meaning'):
                print(f"   Meaning: {expr['meaning']}")
            
            # Context
            if expr.get('sentence'):
                print(f"   Example: \"{expr['sentence'][:80]}...\"" if len(expr['sentence']) > 80 else f"   Example: \"{expr['sentence']}\"")
        
        # Show some interesting multi-word expressions
        print("\n🔤 Multi-word Expressions Found:")
        print("-" * 70)
        
        multi_word = [e for e in expressions if e.get('type') in ['phrasal_verb', 'collocation', 'idiom']]
        for expr in multi_word[:10]:
            print(f"- \"{expr['expression']}\" ({expr['type']})")
            if expr.get('sentence'):
                print(f"  → {expr['sentence']}")
        
    else:
        print("⚠️ Using basic pattern extraction (install spaCy for enhanced features)")
        expressions = extractor.extract_from_text(test_text, target_language='english')
        print(f"\n📚 Found {len(expressions)} expressions using patterns")
        
        for i, expr in enumerate(expressions[:10], 1):
            print(f"{i}. \"{expr['expression']}\" = {expr.get('meaning', 'N/A')}")


async def compare_extraction_methods():
    """Compare pattern-based vs NLP extraction"""
    print("\n\n🔬 Comparing Extraction Methods")
    print("=" * 70)
    
    # Sample text with complex expressions
    test_text = """
    I've been working on this project all day, and I'm about to give up.
    But you know what? I'll hang in there and figure it out eventually.
    Sometimes you just need to take a break and come back with fresh eyes.
    This debugging process is driving me up the wall!
    """
    
    if NLP_AVAILABLE:
        # Pattern-based extraction
        from backend.app.services.vocabulary_extractor import VocabularyExtractor
        basic_extractor = VocabularyExtractor()
        pattern_expressions = basic_extractor.extract_from_text(test_text, target_language='english')
        
        # NLP extraction
        nlp_expressions = await nlp_extractor.extract_from_text_nlp(test_text, target_language='english')
        
        print(f"\n📊 Pattern-based: {len(pattern_expressions)} expressions")
        print(f"📊 NLP-enhanced: {len(nlp_expressions)} expressions")
        
        # Show what NLP found that patterns missed
        pattern_texts = {e['expression'].lower() for e in pattern_expressions}
        nlp_only = [e for e in nlp_expressions if e['expression'].lower() not in pattern_texts]
        
        if nlp_only:
            print(f"\n✨ NLP found {len(nlp_only)} additional expressions:")
            for expr in nlp_only[:10]:
                print(f"  - \"{expr['expression']}\" ({expr.get('type', 'unknown')})")
    else:
        print("⚠️ NLP comparison not available without spaCy")


async def test_cefr_levels():
    """Test CEFR level assignment"""
    print("\n\n🎓 Testing CEFR Level Assignment")
    print("=" * 70)
    
    if NLP_AVAILABLE:
        # Test words of different difficulty levels
        test_words = [
            "hello", "thanks", "please",  # A1
            "understand", "problem", "actually",  # A2
            "amazing", "definitely", "basically",  # B1
            "absolutely", "literally", "ridiculous",  # B2
            "anticipate", "adequate", "ambiguous"  # C1/C2
        ]
        
        print("Word → CEFR Level (Source)")
        print("-" * 40)
        
        for word in test_words:
            cefr_info = nlp_extractor.cefr_loader.get_cefr_level(word)
            print(f"{word:15} → {cefr_info['level']} ({cefr_info['source']})")
    else:
        print("⚠️ CEFR testing not available without NLP module")


async def main():
    """Run all tests"""
    print("🚀 NLP Vocabulary Extraction Test Suite")
    print("=" * 70)
    
    if not NLP_AVAILABLE:
        print("\n⚠️ To enable NLP features, install dependencies:")
        print("   cd backend")
        print("   pip install -r requirements-nlp.txt")
        print("   python -m spacy download en_core_web_lg")
        print("\n")
    
    # Run tests
    await test_nlp_extraction()
    await compare_extraction_methods()
    await test_cefr_levels()
    
    print("\n\n✅ All tests completed!")
    
    if not NLP_AVAILABLE:
        print("\n💡 Tip: Install NLP dependencies to unlock:")
        print("   - Multi-word expression detection (phrasal verbs, idioms)")
        print("   - Automatic CEFR level assignment")
        print("   - Context-aware extraction")
        print("   - Intelligent caching")


if __name__ == "__main__":
    asyncio.run(main())