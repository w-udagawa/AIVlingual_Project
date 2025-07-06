#!/usr/bin/env python
"""
シンプルなYouTubeテストスクリプト
最小限のコードで動作確認
"""
import asyncio
import sys
import re
import argparse
sys.path.append('.')

from youtube_transcript_api import YouTubeTranscriptApi
from app.services.nlp_vocabulary_extractor import nlp_extractor
from working_video_ids import get_test_video, WORKING_VIDEO_IDS

def detect_language_ratio(text):
    """テキストの言語比率を検出"""
    # 日本語文字（ひらがな、カタカナ、漢字）
    japanese_chars = len(re.findall(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', text))
    # 英語文字（アルファベット）
    english_chars = len(re.findall(r'[a-zA-Z]', text))
    
    total_chars = japanese_chars + english_chars
    if total_chars == 0:
        return 'unknown', 0, 0
    
    ja_ratio = japanese_chars / total_chars
    en_ratio = english_chars / total_chars
    
    # 70%以上を占める言語を主言語とする
    if ja_ratio >= 0.7:
        return 'japanese', ja_ratio, en_ratio
    elif en_ratio >= 0.7:
        return 'english', ja_ratio, en_ratio
    else:
        return 'mixed', ja_ratio, en_ratio

def test_youtube_direct(video_id, force_lang=None):
    """youtube-transcript-apiを直接使用してテスト"""
    print(f"\n動画ID: {video_id}")
    print("-" * 40)
    
    try:
        # 字幕リストを取得
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        print("利用可能な字幕:")
        available_langs = []
        for transcript in transcript_list:
            print(f"  - {transcript.language_code} ({transcript.language})")
            available_langs.append(transcript.language_code)
        
        # 言語を決定
        if force_lang:
            # ユーザー指定の言語
            target_lang = force_lang
            print(f"\nユーザー指定言語: {target_lang}")
        else:
            # 自動選択
            if 'ja' in available_langs:
                target_lang = 'ja'
            elif 'en' in available_langs:
                target_lang = 'en'
            else:
                target_lang = available_langs[0] if available_langs else None
            print(f"\n自動選択言語: {target_lang}")
        
        # 字幕を取得
        if target_lang:
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=[target_lang])
        else:
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id)
            
        print(f"✅ 字幕取得成功: {len(transcript_data)}エントリ")
        
        # 言語分析（最初の30エントリ）
        sample_text = " ".join([entry['text'] for entry in transcript_data[:30]])
        detected_lang, ja_ratio, en_ratio = detect_language_ratio(sample_text)
        
        print(f"\n言語分析結果:")
        print(f"  日本語: {ja_ratio:.1%}")
        print(f"  英語: {en_ratio:.1%}")
        print(f"  判定: {detected_lang}")
        
        # 最初の3つを表示
        print("\nサンプル:")
        for i, entry in enumerate(transcript_data[:3]):
            print(f"  [{entry['start']:.1f}s] {entry['text']}")
        
        return True, transcript_data, detected_lang
        
    except Exception as e:
        print(f"❌ エラー: {type(e).__name__}: {str(e)}")
        return False, None, None

async def test_nlp_extraction(transcript_data, detected_lang):
    """NLP語彙抽出をテスト"""
    if not transcript_data:
        return
    
    print("\nNLP語彙抽出テスト")
    print("-" * 40)
    
    # テキストを結合（最初の1000文字）
    text = " ".join([entry['text'] for entry in transcript_data])[:1000]
    print(f"テキスト長: {len(text)}文字")
    
    # 検出された言語に基づいてNLP抽出
    if detected_lang == 'japanese':
        print("日本語モードで抽出...")
        vocabulary = await nlp_extractor.extract_from_text_nlp(text, 'japanese')
    elif detected_lang == 'english':
        print("英語モードで抽出...")
        vocabulary = await nlp_extractor.extract_from_text_nlp(text, 'english')
    else:
        print("混在モードで抽出（両言語）...")
        # 日本語と英語の両方で抽出
        ja_vocab = await nlp_extractor.extract_from_text_nlp(text, 'japanese')
        en_vocab = await nlp_extractor.extract_from_text_nlp(text, 'english')
        vocabulary = ja_vocab + en_vocab
        print(f"  日本語: {len(ja_vocab)}個")
        print(f"  英語: {len(en_vocab)}個")
    
    print(f"✅ 合計 {len(vocabulary)}個の語彙を抽出")
    
    if len(vocabulary) >= 30:
        print("🎉 成功！30個以上の語彙を抽出しました！")
    
    # 上位5個を表示
    print("\n抽出された語彙（上位5個）:")
    for i, vocab in enumerate(vocabulary[:5]):
        expr = vocab.get('expression', '')
        meaning = vocab.get('meaning', '')
        vocab_type = vocab.get('type', '?')
        
        if meaning:
            print(f"  {i+1}. {expr} → {meaning} (タイプ: {vocab_type})")
        else:
            print(f"  {i+1}. {expr} (タイプ: {vocab_type})")

async def main():
    # 引数解析
    parser = argparse.ArgumentParser(description='YouTube字幕からNLP語彙抽出テスト')
    parser.add_argument('video_id', nargs='?', help='YouTube動画ID（省略時はデフォルト）')
    parser.add_argument('--lang', choices=['ja', 'en', 'auto'], default='auto',
                        help='言語指定: ja=日本語, en=英語, auto=自動判定（デフォルト）')
    args = parser.parse_args()
    
    print("シンプルYouTubeテスト")
    print("=" * 50)
    
    # 動画IDの決定
    if args.video_id:
        video_id = args.video_id
        print(f"指定動画ID: {video_id}")
    else:
        video_id = get_test_video()
        print(f"デフォルト動画: {WORKING_VIDEO_IDS[video_id]['title']}")
    
    # 言語設定
    force_lang = None if args.lang == 'auto' else args.lang
    if force_lang:
        print(f"言語モード: {force_lang}")
    else:
        print("言語モード: 自動判定")
    
    # YouTube字幕テスト
    success, transcript, detected_lang = test_youtube_direct(video_id, force_lang)
    
    if success:
        # NLP抽出テスト
        await test_nlp_extraction(transcript, detected_lang)

if __name__ == "__main__":
    print("使い方:")
    print("  python test_youtube_simple.py                      # デフォルト動画でテスト")
    print("  python test_youtube_simple.py VIDEO_ID             # 特定の動画でテスト")
    print("  python test_youtube_simple.py VIDEO_ID --lang=ja   # 日本語強制")
    print("  python test_youtube_simple.py VIDEO_ID --lang=en   # 英語強制")
    print("  python test_youtube_simple.py VIDEO_ID --lang=auto # 自動判定（デフォルト）")
    print()
    
    asyncio.run(main())