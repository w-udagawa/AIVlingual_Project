#!/usr/bin/env python3
"""
実際のVtuber動画でのテスト
動画URL: https://youtu.be/fH52x36P-L4
"""

import asyncio
import sys
from pathlib import Path
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from app.services.youtube_service import YouTubeService
from app.services.vocabulary_extractor import VocabularyExtractor
from app.services.database_service import db_service

async def test_vtuber_video():
    """実際のVtuber動画でテスト"""
    print("=" * 60)
    print("AIVlingual - Vtuber動画解析テスト")
    print("=" * 60)
    
    # テスト動画（ユーザー提供のVtuber動画）
    video_url = "https://youtu.be/knbMyna6DGs?si=L4hloZ-fwh0qWBfq"
    print(f"\n🎬 テスト動画: {video_url}")
    
    # サービスの初期化
    youtube_service = YouTubeService()
    vocabulary_extractor = VocabularyExtractor()
    
    # 1. 動画情報の取得
    print("\n1️⃣ 動画情報を取得中...")
    video_id = youtube_service.extract_video_id(video_url)
    print(f"   Video ID: {video_id}")
    
    video_info = await youtube_service.get_video_info(video_id)
    if video_info:
        print(f"   ✅ タイトル: {video_info.get('title', 'N/A')}")
        print(f"   チャンネル: {video_info.get('channel_title', 'N/A')}")
        print(f"   再生時間: {video_info.get('duration', 0)}秒")
        print(f"   視聴回数: {video_info.get('view_count', 0):,}")
        print(f"   いいね数: {video_info.get('like_count', 0):,}")
        
        # タグがあれば表示
        tags = video_info.get('tags', [])
        if tags:
            print(f"   タグ: {', '.join(tags[:5])}")
    else:
        print("   ❌ 動画情報の取得に失敗しました")
        return
    
    # 2. 字幕（トランスクリプト）の取得
    print("\n2️⃣ 字幕データを取得中...")
    transcript = await youtube_service.get_transcript(video_id)
    if transcript:
        print(f"   ✅ {len(transcript)}個のセグメントを取得")
        
        # 最初の5つのセグメントを表示
        print("\n   字幕サンプル:")
        for i, segment in enumerate(transcript[:5]):
            text = segment['text']
            start = segment['start']
            print(f"   [{start:.1f}s] {text}")
    else:
        print("   ❌ 字幕データの取得に失敗しました")
        return
    
    # 3. 語彙の抽出
    print("\n3️⃣ 語彙を抽出中...")
    result = await vocabulary_extractor.extract_from_video(video_url)
    
    if "error" not in result:
        vocab_count = result.get('vocabulary_extracted', 0)
        print(f"   ✅ {vocab_count}個の語彙を抽出しました")
        
        # 抽出された語彙を表示
        vocab_items = result.get('vocabulary_items', [])
        if vocab_items:
            print("\n   抽出された語彙サンプル:")
            for item in vocab_items[:10]:  # 最初の10個
                japanese = item.get('japanese_text', '')
                english = item.get('english_text', '')
                difficulty = item.get('difficulty_level', 'N/A')
                context = item.get('context', '')[:50] + '...' if item.get('context') else ''
                
                print(f"\n   📝 {japanese}")
                print(f"      英訳: {english}")
                print(f"      難易度: N{difficulty}")
                print(f"      文脈: {context}")
        
        # 言語統計
        lang_stats = result.get('language_stats', {})
        if lang_stats:
            print("\n   言語統計:")
            print(f"   - 日本語セグメント: {lang_stats.get('japanese_segments', 0)}")
            print(f"   - 英語セグメント: {lang_stats.get('english_segments', 0)}")
            print(f"   - 混在セグメント: {lang_stats.get('mixed_segments', 0)}")
    else:
        print(f"   ❌ 語彙抽出エラー: {result['error']}")
    
    # 4. パターンベースの表現検出
    print("\n4️⃣ Vtuberスラング・表現を検出中...")
    
    # トランスクリプト全体からテキストを結合
    full_text = " ".join([seg['text'] for seg in transcript]) if transcript else ""
    
    if full_text:
        expressions = youtube_service._extract_expressions_from_transcript(transcript)
        
        if expressions:
            print(f"   ✅ {len(expressions)}個の表現を検出")
            
            # 表現タイプ別に集計
            type_counts = {}
            for expr in expressions:
                expr_type = expr.get('type', 'unknown')
                type_counts[expr_type] = type_counts.get(expr_type, 0) + 1
            
            print("\n   表現タイプ別集計:")
            for expr_type, count in type_counts.items():
                print(f"   - {expr_type}: {count}個")
            
            # サンプル表示
            print("\n   検出された表現サンプル:")
            for expr in expressions[:10]:
                japanese = expr.get('japanese', '')
                english = expr.get('english', '')
                expr_type = expr.get('type', '')
                timestamp = expr.get('timestamp', 0)
                
                print(f"   [{timestamp:.1f}s] {japanese} → {english} ({expr_type})")
    
    print("\n" + "=" * 60)
    print("テスト完了！")
    print("=" * 60)

async def main():
    """メイン関数"""
    # データベースの初期化
    await db_service.init_db()
    
    # テスト実行
    await test_vtuber_video()

if __name__ == "__main__":
    asyncio.run(main())