#!/usr/bin/env python
"""
NLPの完全なテスト - より長いテキストで
"""
import asyncio
import sys
sys.path.append('.')

from app.services.nlp_vocabulary_extractor import nlp_extractor

# より長い日本語テキスト（Vtuberの配信でよくある内容）
LONG_JAPANESE_TEXT = """
みなさん、こんばんは！今日も配信を見に来てくれてありがとうございます。
今日はマインクラフトをやっていきたいと思います。
最近ハマってるんですよね、建築が楽しくて。

あ、スーパーチャットありがとうございます！嬉しいです！
えーっと、今日は大きな家を作ろうかなと思ってます。
前回の配信で作った家がちょっと小さかったので。

コメントで「頑張って」って言ってくれてる人、ありがとう！
みんなの応援が本当に励みになります。

あ、そうそう、来週コラボ配信があるんです。
先輩と一緒にホラーゲームをやる予定です。
怖いの苦手なんですけど、頑張ります！

チャンネル登録まだの人は、ぜひ登録お願いします！
通知もオンにしてもらえると嬉しいです。

じゃあ、今日も楽しく遊んでいきましょう！
"""

# より長い英語テキスト
LONG_ENGLISH_TEXT = """
Hey guys! Welcome back to my stream! How's everyone doing today?
I'm super excited because we're gonna play some Minecraft!
I've been working on this huge project and I can't wait to show you.

Oh wow, thanks for the super chat! You guys are amazing!
Let me check out what we need to build today.
I'm thinking we should work on the castle walls first.

Someone in chat asked about my schedule. 
I usually stream three times a week, but next week might be different.
We're planning a big collab stream with some other VTubers!

Don't forget to hit that like button if you're enjoying the stream!
And if you're new here, please consider subscribing.
It really helps out the channel!

Alright, let's get started! Today's gonna be epic!
I'm gonna need your help to figure out the best design.
What do you think, chat? Should we go with stone or wood?
"""

async def test_long_text_extraction():
    """長いテキストでNLP抽出をテスト"""
    print("=== 長いテキストでのNLP抽出テスト ===\n")
    
    # 日本語テスト
    print("【日本語テキスト】")
    print(f"テキスト長: {len(LONG_JAPANESE_TEXT)}文字\n")
    
    jp_results = await nlp_extractor.extract_from_text_nlp(LONG_JAPANESE_TEXT, "japanese")
    print(f"✅ 抽出された語彙数: {len(jp_results)}個\n")
    
    # カテゴリ別に集計
    categories = {}
    for item in jp_results:
        cat = item.get('category', 'unknown')
        categories[cat] = categories.get(cat, 0) + 1
    
    print("カテゴリ別内訳:")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {cat}: {count}個")
    
    print("\n抽出された語彙の例（上位10個）:")
    for i, item in enumerate(jp_results[:10], 1):
        print(f"{i:2d}. {item['expression']:<20} (難易度: {item.get('difficulty', '?')}, 優先度: {item.get('priority', '?')})")
        if 'meaning' in item:
            print(f"    → {item['meaning']}")
    
    # 英語テスト
    print("\n\n【英語テキスト】")
    print(f"テキスト長: {len(LONG_ENGLISH_TEXT)}文字\n")
    
    en_results = await nlp_extractor.extract_from_text_nlp(LONG_ENGLISH_TEXT, "english")
    print(f"✅ 抽出された語彙数: {len(en_results)}個\n")
    
    # タイプ別に集計
    types = {}
    for item in en_results:
        typ = item.get('type', 'unknown')
        types[typ] = types.get(typ, 0) + 1
    
    print("タイプ別内訳:")
    for typ, count in sorted(types.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {typ}: {count}個")
    
    print("\n抽出された語彙の例（上位10個）:")
    for i, item in enumerate(en_results[:10], 1):
        print(f"{i:2d}. {item['expression']:<30} (難易度: {item.get('difficulty', '?')}, タイプ: {item.get('type', '?')})")
        if 'meaning' in item:
            print(f"    → {item['meaning']}")

async def test_combined_extraction():
    """パターンベースとNLPの比較"""
    print("\n\n=== パターンベース vs NLP抽出の比較 ===\n")
    
    test_text = "今日の配信は本当に楽しかったです！みんなありがとう！また明日も頑張ります。"
    
    # パターンベース
    from app.services.vocabulary_extractor import VocabularyExtractor
    base_extractor = VocabularyExtractor()
    pattern_results = base_extractor.extract_from_text(test_text, "japanese")
    
    print(f"パターンベース: {len(pattern_results)}個")
    for item in pattern_results:
        print(f"  - {item['expression']}")
    
    # NLP
    nlp_results = await nlp_extractor.extract_from_text_nlp(test_text, "japanese")
    
    print(f"\nNLP抽出: {len(nlp_results)}個")
    for item in nlp_results:
        print(f"  - {item['expression']} ({item.get('type', 'unknown')})")

if __name__ == "__main__":
    print("NLP完全テスト - より長いテキストで実力を確認\n")
    asyncio.run(test_long_text_extraction())
    asyncio.run(test_combined_extraction())