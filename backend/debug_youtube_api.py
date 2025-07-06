#!/usr/bin/env python
"""
YouTube API のデバッグスクリプト
youtube-transcript-api の動作を詳細に確認
"""
import sys
import os
sys.path.append('.')

# 環境変数の設定
os.environ['PYTHONIOENCODING'] = 'utf-8'

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled, 
        NoTranscriptFound,
        VideoUnavailable
    )
    print(f"✓ youtube-transcript-api loaded successfully")
    print(f"  Version info available in package")
except ImportError as e:
    print(f"✗ Failed to import youtube-transcript-api: {e}")
    sys.exit(1)

def test_single_video(video_id, description=""):
    """単一の動画をテスト"""
    print(f"\n{'='*60}")
    print(f"Testing: {video_id}")
    if description:
        print(f"Description: {description}")
    print(f"{'='*60}")
    
    try:
        # Step 1: List available transcripts
        print("\n1. Checking available transcripts...")
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        print("\n   Manual transcripts:")
        manual_count = 0
        for transcript in transcript_list._manually_created_transcripts.values():
            print(f"   - {transcript.language_code} ({transcript.language})")
            manual_count += 1
        
        if manual_count == 0:
            print("   - None found")
        
        print("\n   Auto-generated transcripts:")
        auto_count = 0
        for transcript in transcript_list._generated_transcripts.values():
            print(f"   - {transcript.language_code} ({transcript.language}) [AUTO]")
            auto_count += 1
            
        if auto_count == 0:
            print("   - None found")
        
        if manual_count == 0 and auto_count == 0:
            print("\n   ✗ No transcripts available for this video")
            return False
        
        # Step 2: Try to fetch a transcript
        print("\n2. Attempting to fetch transcript...")
        
        # Try different language codes
        language_variants = [
            (['ja', 'ja-JP'], 'Japanese'),
            (['en', 'en-US', 'en-GB'], 'English'),
        ]
        
        for lang_codes, lang_name in language_variants:
            for lang_code in lang_codes:
                # Try manual transcript
                try:
                    print(f"   Trying {lang_name} manual ({lang_code})...")
                    transcript = transcript_list.find_manually_created_transcript([lang_code])
                    fetched = transcript.fetch()
                    print(f"   ✓ {lang_name} manual transcript retrieved: {len(fetched)} entries")
                    
                    # Show sample
                    if fetched:
                        print("\n   Sample (first 3 entries):")
                        for i, entry in enumerate(fetched[:3]):
                            print(f"   [{entry['start']:.1f}s] {entry['text']}")
                    
                    return True
                    
                except NoTranscriptFound:
                    pass
                
                # Try auto-generated transcript
                try:
                    print(f"   Trying {lang_name} auto-generated ({lang_code})...")
                    transcript = transcript_list.find_generated_transcript([lang_code])
                    fetched = transcript.fetch()
                    print(f"   ✓ {lang_name} AUTO-GENERATED transcript retrieved: {len(fetched)} entries")
                    
                    # Show sample
                    if fetched:
                        print("\n   Sample (first 3 entries):")
                        for i, entry in enumerate(fetched[:3]):
                            print(f"   [{entry['start']:.1f}s] {entry['text']}")
                    
                    return True
                    
                except NoTranscriptFound:
                    pass
        
        # Try auto-translation
        print("\n   Trying auto-translation...")
        try:
            # Get any available transcript
            for transcript in transcript_list:
                try:
                    print(f"   Found {transcript.language} transcript, attempting translation to ja...")
                    translated = transcript.translate('ja')
                    fetched = translated.fetch()
                    print(f"   ✓ AUTO-TRANSLATED to Japanese: {len(fetched)} entries")
                    
                    if fetched:
                        print("\n   Sample (first 3 entries):")
                        for i, entry in enumerate(fetched[:3]):
                            print(f"   [{entry['start']:.1f}s] {entry['text']}")
                    
                    return True
                except:
                    continue
                    
        except Exception as e:
            print(f"   ✗ Auto-translation failed: {e}")
        
        print("   ✗ No transcripts could be fetched")
        return False
        
    except VideoUnavailable:
        print("\n✗ Video is unavailable (private, deleted, or region-locked)")
        return False
        
        
    except TranscriptsDisabled:
        print("\n✗ Transcripts are disabled for this video")
        return False
        
    except Exception as e:
        print(f"\n✗ Unexpected error: {type(e).__name__}: {e}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        return False

def main():
    """メイン処理"""
    print("YouTube Transcript API Debug Tool")
    print("=" * 60)
    
    # Test videos
    test_videos = [
        ("HKYkhkYGG7A", "User-provided video"),
        ("5KsXVs8Vg7U", "Gawr Gura - 'a'"),
        ("Lwd5Gqy5gcA", "Short clip with captions"),
        ("9Gj7mGXh9Vw", "Hololive clip"),
    ]
    
    success_count = 0
    
    for video_id, description in test_videos:
        if test_single_video(video_id, description):
            success_count += 1
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Tested: {len(test_videos)} videos")
    print(f"Success: {success_count} videos")
    print(f"Failed: {len(test_videos) - success_count} videos")
    
    if success_count > 0:
        print("\n✓ At least one video has working transcripts!")
        print("The youtube-transcript-api itself is working.")
        print("Failed videos may not have captions enabled.")
    else:
        print("\n✗ All videos failed.")
        print("Possible issues:")
        print("- Network/firewall blocking YouTube API")
        print("- All test videos lack captions")
        print("- API changes requiring library update")
    
    # Additional diagnostics
    print(f"\n{'='*60}")
    print("DIAGNOSTICS")
    print(f"{'='*60}")
    print(f"Python version: {sys.version}")
    print(f"Platform: {sys.platform}")
    
    # Check for proxy
    proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
    proxies_found = False
    for var in proxy_vars:
        if var in os.environ:
            print(f"Proxy detected: {var} = {os.environ[var]}")
            proxies_found = True
    
    if not proxies_found:
        print("No proxy settings detected")

if __name__ == "__main__":
    main()