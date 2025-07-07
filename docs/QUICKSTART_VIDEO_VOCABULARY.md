# AIVlingual 動画解析・語彙データベース クイックスタートガイド

## セットアップ

### 1. 環境変数の設定

`.env` ファイルに以下を追加：

```bash
# YouTube Data API Key (必須)
YOUTUBE_API_KEY=your_youtube_api_key_here

# 既存の設定も確認
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=sqlite:///./aivlingual.db
SECRET_KEY=your_secret_key_for_jwt
```

### 2. サーバー起動

**重要: NLP機能を使用する場合は、Windowsコマンドプロンプトで実行**

```cmd
# Windowsコマンドプロンプトで実行（WSL2ではない）
cd C:\ClaudeWork\AIVlingual_Project\backend
conda activate aivlingual_py311
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

フロントエンド（別ターミナル）:
```cmd
cd C:\ClaudeWork\AIVlingual_Project\frontend
npm run dev
```

## 基本的な使い方

### 1. ユーザー登録

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "password123"
  }'
```

### 2. ログイン

```bash
# username_or_email フィールドを使用（usernameではない）
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email": "test",
    "password": "test0702"
  }'

# レスポンスから access_token を取得
```

### 3. YouTube動画から語彙を抽出

```bash
# 認証トークンを使用
TOKEN="your_auth_token"

curl -X GET "http://localhost:8000/api/v1/youtube/extract-vocabulary?url=https://www.youtube.com/watch?v=VIDEO_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**注意**: `/api/v1/youtube/analyze` エンドポイントは存在しません。`/extract-vocabulary` を使用してください。

### 4. 語彙をエクスポート

#### Ankiデッキとして
```bash
curl -X GET "http://localhost:8000/api/v1/vocabulary/export/anki?limit=100" \
  -H "Authorization: Bearer $TOKEN" \
  -o my_vocabulary.apkg
```

#### CSVとして
```bash
curl -X GET "http://localhost:8000/api/v1/vocabulary/export/csv?difficulty_level=3" \
  -H "Authorization: Bearer $TOKEN" \
  -o vocabulary.csv
```

## Python SDK 使用例

```python
import aiohttp
import asyncio

class AIVlingualClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None
    
    async def login(self, username, password):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/api/v1/auth/login",
                json={"username_or_email": username, "password": password}
            ) as resp:
                data = await resp.json()
                self.token = data["access_token"]
                return data
    
    async def extract_vocabulary(self, youtube_url):
        headers = {"Authorization": f"Bearer {self.token}"}
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/api/v1/youtube/extract-vocabulary",
                params={"url": youtube_url},
                headers=headers
            ) as resp:
                return await resp.json()

# 使用例
async def main():
    client = AIVlingualClient()
    await client.login("testuser", "password123")
    
    # Vtuber動画から語彙を抽出
    result = await client.extract_vocabulary(
        "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
    )
    print(f"Extracted {result['vocabulary_count']} vocabulary items!")

asyncio.run(main())
```

## よくある使用例

### 1. 特定のVtuberチャンネルの動画を一括処理

```python
# チャンネルの動画一覧を取得
videos = await client.get_channel_videos("CHANNEL_ID")

# 各動画から語彙を抽出
for video in videos["videos"]:
    result = await client.extract_vocabulary(video["url"])
    print(f"{video['title']}: {result['vocabulary_count']} items")
```

### 2. 難易度別に語彙を学習

```python
# N5レベルの語彙のみ取得
easy_vocab = await client.get_vocabulary(difficulty_level=1, limit=20)

# 学習進捗を記録
await client.update_progress(vocabulary_id, status="learning")
```

### 3. 毎日の学習目標設定

```python
# ユーザー設定を更新
await client.update_preferences({
    "daily_goal": 30,
    "difficulty_preference": 3,
    "language_preference": "ja-JP"
})
```

## トラブルシューティング

### YouTube APIエラー
- API Keyが正しく設定されているか確認
- 日次のAPIクォータを超えていないか確認
- YouTube Data API v3が有効になっているか確認

### 語彙抽出が失敗する
- 動画に日本語字幕があるか確認
- Gemini APIキーが有効か確認
- ネットワーク接続を確認

### NLP機能で語彙が3-5個しか抽出されない
- **最も一般的な問題**: WSL2環境でバックエンドを実行している
- **解決方法**: Windowsコマンドプロンプトで再起動
- **確認方法**: `http://localhost:8000/api/v1/youtube/debug-env` で環境を確認
- 詳細は `/docs/NLP_TROUBLESHOOTING_GUIDE.md` を参照

### データベースエラー
- マイグレーションが実行されているか確認
- SQLiteファイルの権限を確認
- ディスク容量を確認

## 詳細ドキュメント

完全なAPIドキュメント: http://localhost:8000/docs