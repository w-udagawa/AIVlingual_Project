#!/usr/bin/env python
"""
ローカルのVtuber配信テキストでNLP抽出をテスト
YouTubeの問題を回避して、純粋にNLP機能をテスト
"""
import asyncio
import sys
sys.path.append('.')

from app.services.nlp_vocabulary_extractor import nlp_extractor
from app.services.vocabulary_extractor import VocabularyExtractor

# 実際のVtuber配信でよくある字幕テキスト（長めのサンプル）
VTUBER_TRANSCRIPT = """
みなさん、こんにちは！今日も配信見に来てくれてありがとうございます！
えーっと、今日は何をやろうかな。あ、そうだ！マイクラやりましょう！
最近ハマってるんですよね、建築が楽しくて。

コメント見てますよー。「こんにちは」ありがとう！
「今日も可愛い」って、照れちゃうじゃないですか！
みんな優しいなぁ。

あ、スーパーチャットありがとうございます！
「頑張って」って、嬉しい！みんなの応援が励みになります。

じゃあ、マイクラ始めていきましょうか。
今日は大きなお城を作ろうと思ってます。
前回の配信で作った家がちょっと小さかったので、今度はもっと大きいのを！

えーっと、まず材料集めからですね。
木を切って、石を掘って...あ、ダイヤ見つけた！やったー！
これはラッキーですね。

あ、クリーパーだ！危ない危ない。
爆発されたら今までの作業が台無しになっちゃう。
慎重に行きましょう。

みんなはマイクラやったことありますか？
コメントで教えてください。
一緒にマルチプレイとかもやってみたいですね。

今日の目標は、お城の土台を完成させることです。
時間内にできるかな？みんなで応援してください！

あ、そうそう、来週コラボ配信があるんです。
先輩Vtuberさんと一緒にホラーゲームをやる予定です。
私、ホラー苦手なんですけど、頑張ります！

チャンネル登録まだの方は、ぜひ登録お願いします！
通知もオンにしてもらえると、配信の時にすぐ来れますよ。
高評価も押してもらえると嬉しいです！

さて、建築に集中しましょう。
この石レンガをこう配置して...あ、間違えた！
やり直しですね。こういうところが建築の難しいところ。

みんなのアドバイスも聞きたいです。
「こうした方がいいよ」とか「ここはこうすると綺麗」とか。
一緒に作っている感じがして楽しいです。

今日もありがとうございました！
また次の配信でお会いしましょう！
バイバイ！
"""

# 英語Vtuberの配信サンプル
EN_VTUBER_TRANSCRIPT = """
Hey guys! Welcome back to my stream! How's everyone doing today?
Oh wow, already so many people in chat! You guys are amazing!

Today we're gonna play some Minecraft! I've been working on this huge castle project.
Let me show you what I've built so far. 

Oh, thanks for the super chat! You're too kind!
"Good luck with the build" - Thank you! I'm gonna need it!

Alright, let's get started. First, I need to gather some materials.
We're gonna need a lot of stone bricks for this build.
Let me check my inventory... Oh no, I'm out of wood!

Someone in chat asked about my streaming schedule.
I usually stream three times a week - Monday, Wednesday, and Friday.
But next week might be a bit different because of the collab!

Speaking of which, I'm super excited about the horror game collab!
I'm gonna be playing with my senpai. I'm actually really scared of horror games,
but I'll try my best! It's gonna be so much fun!

Oh! A creeper! Get away from my build!
That was close. Imagine if it blew up all my hard work.
I need to be more careful.

For those of you who are new here, don't forget to subscribe!
Hit that notification bell so you never miss a stream.
And if you're enjoying today's content, please give it a thumbs up!

Let me read some more comments... 
"Your builds are always so creative" - Aww, thank you!
"Can we play together sometime?" - Maybe we can do a viewer game sometime!

I'm thinking about doing a building tutorial series.
Would you guys be interested in that? Let me know in the comments!

Alright, back to building. I think I'll start with the main tower.
We need to make it really tall and impressive.
What do you think, chat? Should we add some flags on top?

Oh my gosh, look at the time! We've been streaming for two hours already!
Time flies when you're having fun with you guys.

Before we end, let me show you the progress we made today.
We got the foundation done and started on the walls.
Not bad for today's work!

Thank you so much for hanging out with me today!
I'll see you all in the next stream! Take care everyone!
Bye bye!
"""

async def test_vtuber_text():
    """実際のVtuber配信テキストでNLPをテスト"""
    print("=== Vtuber配信テキストでのNLP語彙抽出テスト ===\n")
    
    # 日本語配信のテスト
    print("【日本語Vtuber配信】")
    print(f"テキスト長: {len(VTUBER_TRANSCRIPT)}文字")
    print("配信内容: マインクラフト実況\n")
    
    # パターンベース抽出
    base_extractor = VocabularyExtractor()
    pattern_results = base_extractor.extract_from_text(VTUBER_TRANSCRIPT, "japanese")
    print(f"パターンベース抽出: {len(pattern_results)}個")
    
    # NLP抽出
    nlp_results = await nlp_extractor.extract_from_text_nlp(VTUBER_TRANSCRIPT, "japanese")
    print(f"NLP抽出: {len(nlp_results)}個")
    
    if len(nlp_results) >= 30:
        print("✅ NLPが正常に動作しています！30個以上の語彙を抽出しました。")
    else:
        print(f"⚠️ 抽出数が少ないです（{len(nlp_results)}個）。期待値は30個以上です。")
    
    # カテゴリ別集計
    print("\nカテゴリ別内訳:")
    categories = {}
    for item in nlp_results:
        cat = item.get('category', 'unknown')
        categories[cat] = categories.get(cat, 0) + 1
    
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {cat}: {count}個")
    
    # 上位10個を表示
    print("\n抽出された語彙（上位10個）:")
    for i, item in enumerate(nlp_results[:10], 1):
        print(f"{i:2d}. {item['expression']:<20} (難易度: {item.get('difficulty', '?')}, タイプ: {item.get('type', '?')})")
        if 'meaning' in item:
            print(f"    意味: {item['meaning']}")
        if 'sentence' in item and item['sentence']:
            print(f"    例文: {item['sentence'][:50]}...")
    
    # 英語配信のテスト
    print("\n\n【英語Vtuber配信】")
    print(f"テキスト長: {len(EN_VTUBER_TRANSCRIPT)}文字")
    print("配信内容: Minecraft stream\n")
    
    # パターンベース抽出
    en_pattern_results = base_extractor.extract_from_text(EN_VTUBER_TRANSCRIPT, "english")
    print(f"パターンベース抽出: {len(en_pattern_results)}個")
    
    # NLP抽出
    en_nlp_results = await nlp_extractor.extract_from_text_nlp(EN_VTUBER_TRANSCRIPT, "english")
    print(f"NLP抽出: {len(en_nlp_results)}個")
    
    if len(en_nlp_results) >= 30:
        print("✅ 英語NLPも正常に動作しています！30個以上の語彙を抽出しました。")
    else:
        print(f"⚠️ 英語の抽出数が少ないです（{len(en_nlp_results)}個）。")
    
    # タイプ別集計
    print("\nタイプ別内訳:")
    types = {}
    for item in en_nlp_results:
        typ = item.get('type', 'unknown')
        types[typ] = types.get(typ, 0) + 1
    
    for typ, count in sorted(types.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {typ}: {count}個")
    
    # 上位10個を表示
    print("\n抽出された語彙（上位10個）:")
    for i, item in enumerate(en_nlp_results[:10], 1):
        print(f"{i:2d}. {item['expression']:<30} (難易度: {item.get('difficulty', '?')}, タイプ: {item.get('type', '?')})")
        if 'meaning' in item:
            print(f"    意味: {item['meaning']}")
    
    # 総合結果
    print("\n" + "="*60)
    print("【総合結果】")
    print(f"日本語: パターン {len(pattern_results)}個 → NLP {len(nlp_results)}個 ({len(nlp_results)/len(pattern_results) if pattern_results else 0:.1f}倍)")
    print(f"英語: パターン {len(en_pattern_results)}個 → NLP {len(en_nlp_results)}個 ({len(en_nlp_results)/len(en_pattern_results) if en_pattern_results else 0:.1f}倍)")
    
    if len(nlp_results) >= 30 and len(en_nlp_results) >= 30:
        print("\n✅ NLP語彙抽出は正常に動作しています！")
        print("YouTubeの問題はAPI接続の問題で、NLP自体は問題ありません。")
    else:
        print("\n⚠️ NLP抽出が期待通りに動作していない可能性があります。")

if __name__ == "__main__":
    print("Vtuber配信テキストを使用したNLPテスト\n")
    print("このテストはYouTube APIを使用せず、ローカルテキストで実行します。")
    print("="*60 + "\n")
    
    asyncio.run(test_vtuber_text())