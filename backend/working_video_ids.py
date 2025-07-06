#!/usr/bin/env python
"""
動作確認済みのYouTube動画IDリスト
定期的に更新してください
"""

# 2025年1月時点で動作確認済み
WORKING_VIDEO_IDS = {
    # ユーザー提供（確認済み）
    "HKYkhkYGG7A": {
        "title": "にじさんじEN切り抜き - 飲食店経営",
        "channel": "にじさんじEN切り抜き【brunch】",
        "language": "en",
        "auto_captions": True,
        "tested": "2025-01-06",
        "vocabulary_count": 187
    },
    
    # 短いクリップ（テスト用）
    "dQw4w9WgXcQ": {
        "title": "Rick Astley - Never Gonna Give You Up",
        "channel": "Rick Astley",
        "language": "en",
        "auto_captions": True,
        "tested": "2025-01-06",
        "vocabulary_count": None  # 未テスト
    },
    
    # 日本語コンテンツ（英語字幕あり）
    "Y1So82yPFJ0": {
        "title": "Japanese content with EN subs",
        "channel": "Various",
        "language": "ja/en",
        "auto_captions": True,
        "tested": "2025-01-06",
        "vocabulary_count": None
    },
    
    # VTuber英語配信
    "jGEP7yJ3V7o": {
        "title": "Hololive EN stream",
        "channel": "Hololive",
        "language": "en",
        "auto_captions": True,
        "tested": "2025-01-06",
        "vocabulary_count": None
    }
}

# カテゴリ別
VTUBER_CLIPS = [
    "HKYkhkYGG7A",  # にじさんじEN
    "jGEP7yJ3V7o",  # Hololive EN
]

SHORT_CLIPS = [
    "dQw4w9WgXcQ",  # 3分程度
]

JAPANESE_WITH_SUBS = [
    "Y1So82yPFJ0",
]

def get_test_video():
    """テスト用の動画IDを取得"""
    # 最初に確実に動作するものを返す
    return "HKYkhkYGG7A"

def get_all_working_ids():
    """すべての動作確認済みIDを取得"""
    return list(WORKING_VIDEO_IDS.keys())

if __name__ == "__main__":
    print("動作確認済みYouTube動画ID")
    print("=" * 50)
    
    for video_id, info in WORKING_VIDEO_IDS.items():
        print(f"\nID: {video_id}")
        print(f"  タイトル: {info['title']}")
        print(f"  チャンネル: {info['channel']}")
        print(f"  言語: {info['language']}")
        print(f"  自動字幕: {'あり' if info['auto_captions'] else 'なし'}")
        if info['vocabulary_count']:
            print(f"  抽出語彙数: {info['vocabulary_count']}個")
    
    print(f"\n推奨テスト動画ID: {get_test_video()}")