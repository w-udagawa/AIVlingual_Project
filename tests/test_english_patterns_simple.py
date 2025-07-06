#!/usr/bin/env python3
"""
Simple test for English pattern extraction without dependencies
"""

import re

# English expression patterns for Japanese learners
english_patterns = {
    # Essential daily expressions
    'essential_daily': [
        (r'\b(thank you|thanks)(\s+(so much|a lot))?\b', 'ありがとう(ございます)', 'A1', 10),
        (r'\b(I\'m\s+)?sorry\b', 'すみません/ごめんなさい', 'A1', 10),
        (r'\bexcuse me\b', 'すみません', 'A1', 10),
        (r'\bplease\b', 'お願いします', 'A1', 10),
        (r'\b(you\'re\s+)?welcome\b', 'どういたしまして', 'A1', 10),
        (r'\b(I\s+)?don\'t know\b', 'わかりません', 'A1', 9),
        (r'\bof course\b', 'もちろん', 'A2', 9),
        (r'\bno problem\b', '問題ありません', 'A2', 9),
    ],
    
    # Gaming/streaming expressions 
    'gaming_expressions': [
        (r'\blet\'s\s+go!?\b', '行くぞ！/よし！', 'A2', 8),
        (r'\bgood\s+(game|job)\b|\bgg\b', 'お疲れ様/ナイスゲーム', 'A2', 8),
        (r'\b(that\'s\s+)?insane!?\b', 'やばい！/すごい！', 'B1', 7),
        (r'\bclutch\b', 'クラッチ(土壇場での活躍)', 'B2', 6),
        (r'\b(I\'m\s+)?dead\b', '死んだ/やられた', 'A2', 7),
        (r'\bone\s+more\s+(time|game)\b', 'もう一回', 'A2', 8),
        (r'\bnice\s+(play|shot|try)\b', 'ナイスプレイ', 'A2', 8),
    ],
    
    # Internet slang and colloquial
    'internet_slang': [
        (r'\blol\b|\blmao\b', '(笑)/www', 'A2', 6),
        (r'\bomg\b', 'まじで/やばい', 'A2', 7),
        (r'\bbruh\b', 'おいおい/まじかよ', 'B1', 5),
        (r'\bbased\b', 'いいね/正論/最高', 'B2', 5),
        (r'\bpog(gers)?\b', 'すごい！/最高！', 'B1', 6),
        (r'\bcringe\b', '痛い/恥ずかしい', 'B1', 6),
    ],
}

def test_english_extraction():
    """Test English pattern extraction"""
    print("🔍 Testing English Pattern Extraction")
    print("=" * 60)
    
    # Test text from a typical Vtuber stream
    test_text = """
    Hey guys, welcome back to my stream! Thanks so much for watching.
    Today we're gonna play some games and have fun. Let's go!
    I'm really sorry about the technical issues earlier. 
    No problem though, we figured it out together.
    Don't forget to hit the like button and subscribe!
    GG everyone, that was insane! See you next time.
    Oh my god, did you see that clutch play? That was poggers!
    Bruh, I can't believe I died there. One more game?
    """
    
    found_expressions = []
    
    for category, patterns in english_patterns.items():
        for pattern, meaning, difficulty, priority in patterns:
            matches = re.findall(pattern, test_text, re.IGNORECASE)
            for match in matches:
                # Extract the actual matched text
                if isinstance(match, tuple):
                    match_text = match[0]
                else:
                    match_text = match
                
                # Find the sentence containing this match
                sentences = test_text.split('.')
                actual_usage = ""
                for sentence in sentences:
                    if match_text.lower() in sentence.lower():
                        actual_usage = sentence.strip()
                        break
                
                found_expressions.append({
                    'expression': match_text,
                    'meaning': meaning,
                    'difficulty': difficulty,
                    'priority': priority,
                    'category': category,
                    'usage': actual_usage
                })
    
    # Sort by priority
    found_expressions.sort(key=lambda x: x['priority'], reverse=True)
    
    print(f"\n✅ Found {len(found_expressions)} expressions:\n")
    
    for i, expr in enumerate(found_expressions[:15], 1):
        print(f"{i}. [{expr['difficulty']}] \"{expr['expression']}\" → {expr['meaning']}")
        print(f"   Category: {expr['category']} | Priority: {expr['priority']}")
        print(f"   Usage: {expr['usage']}")
        print()
    
    # Summary
    print("\n📊 Summary by Category:")
    category_counts = {}
    for expr in found_expressions:
        cat = expr['category']
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    for cat, count in category_counts.items():
        print(f"  - {cat}: {count} expressions")

if __name__ == "__main__":
    test_english_extraction()