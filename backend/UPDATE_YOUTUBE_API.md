# YouTube API 更新手順

## 1. パッケージの更新

```bash
cd backend
conda activate aivlingual_py311
pip install --upgrade youtube-transcript-api
```

## 2. テストの実行順序

### ステップ1: ローカルテキストでNLPをテスト
```bash
python test_local_vtuber_text.py
```
これでNLP自体が正常に動作することを確認（30個以上の語彙抽出）

### ステップ2: YouTube APIのデバッグ
```bash
python debug_youtube_api.py
```
これで動画の字幕が取得できるか確認

### ステップ3: 完全なNLPテスト
```bash
python test_nlp_improved.py
```
または VSCode で F5キー

## 3. トラブルシューティング

### 「no element found」エラーが続く場合
1. ファイアウォール/プロキシの確認
2. VPNを使用している場合は無効化
3. 別のネットワークで試す

### 字幕が見つからない場合
1. 動画に字幕があることを確認（YouTubeで直接確認）
2. 自動生成字幕でも可
3. 地域制限がないか確認

## 4. 期待される結果

- **test_local_vtuber_text.py**: 
  - 日本語: 30個以上の語彙
  - 英語: 30個以上の語彙
  
- **debug_youtube_api.py**:
  - 少なくとも1つの動画で字幕取得成功
  
- **test_nlp_improved.py**:
  - YouTube動画から30個以上の語彙抽出