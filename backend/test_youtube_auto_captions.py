#!/usr/bin/env python
"""
YouTube自動生成字幕テストスクリプト
日本のVTuber動画で自動生成字幕の取得をテスト
"""
import asyncio
import sys
sys.path.append('.')

from app.services.youtube_service import YouTubeService
from app.services.nlp_vocabulary_extractor import nlp_extractor

# 日本のVTuber動画（自動生成字幕が期待できるもの）
TEST_VIDEOS = {
    # ホロライブ
    "5nQvHirtfBg": "ぺこら - マイクラ配信",
    "bKjmUvilMLE": "みこ - 雑談配信",
    "9s_TPebdIRU": "スバル - ゲーム実況",
    
    # にじさんじ
    "z5OGD5_9cA4": "葛葉 - Apex配信",
    "x1lGOgPkctc": "叶 - 雑談",
    
    # その他人気Vtuber
    "Lu5VCO-YdqI": "ころね - 英語勉強",
    "HKYkhkYGG7A": "ユーザー提供動画",
}

async def test_auto_captions():
    """自動生成字幕のテスト"""
    youtube_service = YouTubeService()
    successful_videos = []
    
    print("YouTube自動生成字幕テスト")
    print("=" * 60)
    
    for video_id, description in TEST_VIDEOS.items():
        print(f"\n動画: {video_id} ({description})")
        print("-" * 40)
        
        try:
            # 自動生成字幕を優先して取得
            print("1. 自動生成字幕を優先して取得...")
            transcript = await youtube_service.get_transcript(
                video_id, 
                languages=['ja', 'en'], 
                prefer_auto_generated=True
            )
            
            if transcript:
                print(f"✅ 字幕取得成功！ {len(transcript)}個のエントリ")
                
                # 最初の5つを表示
                print("\n字幕サンプル:")
                for i, entry in enumerate(transcript[:5]):
                    print(f"  [{entry['start']:.1f}s] {entry['text']}")
                
                # 全テキストを結合
                full_text = " ".join([entry['text'] for entry in transcript])
                print(f"\n総文字数: {len(full_text)}文字")
                
                # NLP語彙抽出
                print("\n2. NLP語彙抽出...")
                vocabulary = await nlp_extractor.extract_from_text_nlp(full_text[:3000], 'japanese')  # 最初の3000文字
                print(f"✅ {len(vocabulary)}個の語彙を抽出")
                
                if len(vocabulary) >= 30:
                    print("🎉 成功！30個以上の語彙を抽出できました！")
                    successful_videos.append({
                        'video_id': video_id,
                        'description': description,
                        'transcript_entries': len(transcript),
                        'vocabulary_count': len(vocabulary)
                    })
                else:
                    print(f"⚠️ 語彙数が少ない（{len(vocabulary)}個）")
                
                # 抽出された語彙の例
                print("\n抽出された語彙（上位5個）:")
                for i, vocab in enumerate(vocabulary[:5]):
                    print(f"  {i+1}. {vocab['expression']} (難易度: {vocab.get('difficulty', '?')})")
                
            else:
                print("❌ 字幕取得失敗")
                
        except Exception as e:
            print(f"❌ エラー: {str(e)}")
    
    # 結果サマリー
    print("\n" + "=" * 60)
    print("テスト結果サマリー")
    print("=" * 60)
    
    print(f"\nテスト動画数: {len(TEST_VIDEOS)}")
    print(f"成功: {len(successful_videos)}個")
    
    if successful_videos:
        print("\n✅ 成功した動画:")
        for video in successful_videos:
            print(f"  - {video['video_id']}: {video['description']}")
            print(f"    字幕: {video['transcript_entries']}エントリ, 語彙: {video['vocabulary_count']}個")
        
        print("\n推奨: これらの動画IDを使用してください！")
        print("動画ID:", ", ".join([v['video_id'] for v in successful_videos]))
    else:
        print("\n❌ すべての動画で失敗しました。")
        print("考えられる原因:")
        print("- ネットワーク/ファイアウォールの問題")
        print("- YouTube APIの制限")
        print("- 動画の地域制限")

async def test_specific_video(video_id: str):
    """特定の動画を詳細にテスト"""
    youtube_service = YouTubeService()
    
    print(f"\n特定動画の詳細テスト: {video_id}")
    print("=" * 60)
    
    # 動画情報を取得
    video_info = await youtube_service.get_video_info(video_id)
    if video_info:
        print(f"タイトル: {video_info.get('title', 'N/A')}")
        print(f"チャンネル: {video_info.get('channel_title', 'N/A')}")
        print(f"利用可能な字幕: {len(video_info.get('available_transcripts', []))}種類")
        
        for transcript in video_info.get('available_transcripts', []):
            print(f"  - {transcript['language_code']} ({transcript['language']}) {'[自動生成]' if transcript['is_generated'] else '[手動]'}")
    
    # 通常の方法で取得
    print("\n1. 通常の取得方法:")
    normal_transcript = await youtube_service.get_transcript(video_id)
    if normal_transcript:
        print(f"✅ 成功: {len(normal_transcript)}エントリ")
    else:
        print("❌ 失敗")
    
    # 自動生成優先で取得
    print("\n2. 自動生成優先:")
    auto_transcript = await youtube_service.get_transcript(video_id, prefer_auto_generated=True)
    if auto_transcript:
        print(f"✅ 成功: {len(auto_transcript)}エントリ")
    else:
        print("❌ 失敗")

if __name__ == "__main__":
    print("YouTube自動生成字幕とNLP語彙抽出テスト\n")
    
    # メインテスト
    asyncio.run(test_auto_captions())
    
    # 特定の動画を詳細テスト
    if len(sys.argv) > 1:
        video_id = sys.argv[1]
        asyncio.run(test_specific_video(video_id))