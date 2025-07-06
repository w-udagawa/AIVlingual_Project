#!/usr/bin/env python
"""
YouTube APIを直接テストして問題を特定
"""
import asyncio
from youtube_transcript_api import YouTubeTranscriptApi

# テスト用の動画ID
TEST_VIDEOS = {
    "HKYkhkYGG7A": "User-provided video",
    "5KsXVs8Vg7U": "Gawr Gura - a",
    "Sm4XNYWeaJY": "Pekora clip with EN subs",
    "Lu5VCO-YdqI": "Korone English study",
    "BqWHj2VE2lg": "Short Hololive clip"
}

def test_transcript_availability():
    """各動画の字幕の利用可能性をチェック"""
    print("YouTube字幕の利用可能性チェック\n")
    
    for video_id, description in TEST_VIDEOS.items():
        print(f"動画ID: {video_id} ({description})")
        try:
            # 利用可能な字幕のリストを取得
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            print("  利用可能な字幕:")
            available_langs = []
            
            # 手動字幕
            for transcript in transcript_list._manually_created_transcripts.values():
                lang_code = transcript.language_code
                lang_name = transcript.language
                available_langs.append(lang_code)
                print(f"    - {lang_code} ({lang_name}) [手動]")
            
            # 自動生成字幕
            for transcript in transcript_list._generated_transcripts.values():
                lang_code = transcript.language_code
                lang_name = transcript.language
                available_langs.append(lang_code)
                print(f"    - {lang_code} ({lang_name}) [自動生成]")
            
            if not available_langs:
                print("    ❌ 字幕なし")
            else:
                # 実際に字幕を取得してみる
                try:
                    if 'ja' in available_langs:
                        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ja'])
                        print(f"    ✅ 日本語字幕を取得成功 ({len(transcript)}行)")
                    elif 'en' in available_langs:
                        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
                        print(f"    ✅ 英語字幕を取得成功 ({len(transcript)}行)")
                except Exception as e:
                    print(f"    ❌ 字幕取得エラー: {str(e)}")
                    
        except Exception as e:
            print(f"  ❌ エラー: {str(e)}")
        
        print()

def test_specific_video(video_id):
    """特定の動画の字幕を詳細にテスト"""
    print(f"\n動画 {video_id} の詳細テスト:")
    
    try:
        # まず利用可能な字幕をリスト
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # 日本語を優先的に取得
        try:
            transcript = transcript_list.find_transcript(['ja'])
            print("✅ 日本語字幕を発見")
            
            # 最初の5行を表示
            captions = transcript.fetch()
            print("\n最初の5行:")
            for i, caption in enumerate(captions[:5]):
                print(f"{i+1}. {caption['text']} (at {caption['start']:.1f}s)")
                
            return True
            
        except:
            # 英語を試す
            try:
                transcript = transcript_list.find_transcript(['en'])
                print("✅ 英語字幕を発見")
                
                # 最初の5行を表示
                captions = transcript.fetch()
                print("\n最初の5行:")
                for i, caption in enumerate(captions[:5]):
                    print(f"{i+1}. {caption['text']} (at {caption['start']:.1f}s)")
                    
                return True
                
            except:
                print("❌ 日本語・英語字幕が見つかりません")
                return False
                
    except Exception as e:
        print(f"❌ エラー: {str(e)}")
        return False

if __name__ == "__main__":
    print("=== YouTube Transcript API テスト ===\n")
    
    # すべての動画をチェック
    test_transcript_availability()
    
    # 動作する動画を見つけたら詳細テスト
    print("\n=== 詳細テスト ===")
    for video_id in TEST_VIDEOS.keys():
        if test_specific_video(video_id):
            print(f"\n✅ 使用可能な動画ID: {video_id}")
            break