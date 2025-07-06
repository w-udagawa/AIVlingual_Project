"""
NLP機能のデバッグ用テストスクリプト
実行方法: python test_nlp_debug.py
"""
import asyncio
import sys
sys.path.append('.')

from app.services.nlp_vocabulary_extractor import nlp_extractor

async def test_nlp_extraction():
    print("=== NLP Debug Test ===")
    
    # 1. NLP状態確認
    print("\n[1] NLP Status Check:")
    print(f"Japanese model loaded: {nlp_extractor.nlp_ja is not None}")
    print(f"English model loaded: {nlp_extractor.nlp_en is not None}")
    
    # 2. テストテキスト
    test_text = "これはテストです。大丈夫ですか？配信を見ています。勉強しましょう。"
    print(f"\n[2] Test text: {test_text}")
    
    # 3. パターンベース抽出
    print("\n[3] Pattern-based extraction:")
    pattern_results = nlp_extractor.extract_from_text(test_text, "japanese")
    print(f"Found {len(pattern_results)} items")
    for i, item in enumerate(pattern_results[:3]):
        print(f"  {i+1}. {item['expression']} (difficulty: {item.get('difficulty')}, type: {type(item.get('difficulty'))})")
    
    # 4. NLP抽出（エラーを回避するため一時的にソートをスキップ）
    print("\n[4] NLP extraction (with sort bypass):")
    # ソート関数を一時的に置き換え
    original_sort = nlp_extractor._sort_by_priority
    nlp_extractor._sort_by_priority = lambda x: x  # ソートをスキップ
    
    try:
        nlp_results = await nlp_extractor.extract_from_text_nlp(test_text, "japanese")
        print(f"Found {len(nlp_results)} items")
        for i, item in enumerate(nlp_results[:5]):
            print(f"  {i+1}. {item['expression']} ({item.get('type', 'unknown')}) - {item.get('category', 'unknown')}")
            print(f"      difficulty: {item.get('difficulty')} (type: {type(item.get('difficulty'))})")
    except Exception as e:
        print(f"Error during NLP extraction: {e}")
    finally:
        # ソート関数を元に戻す
        nlp_extractor._sort_by_priority = original_sort
    
    # 5. YouTube動画のテスト
    print("\n[5] YouTube video extraction test:")
    try:
        result = await nlp_extractor.process_youtube_video("knbMyna6DGs")
        print(f"Extracted {result.get('vocabulary_count', 0)} items from YouTube video")
    except Exception as e:
        print(f"Error during YouTube extraction: {e}")

if __name__ == "__main__":
    asyncio.run(test_nlp_extraction())