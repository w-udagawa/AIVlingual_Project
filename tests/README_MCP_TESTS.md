# AIVlingual Playwright MCP テストスイート

このドキュメントは、Playwright MCPを使用して作成された包括的なE2Eテストスイートの説明です。

## 🎯 作成されたテスト

### 1. AI会話フローテスト (`test_ai_conversation_flow.js`)
**目的**: AI会話システムの完全な動作確認
- 日本語・英語での自己紹介
- Vtuberスラングの理解
- 複数ターンの会話
- エラー処理とリカバリー
- パフォーマンス測定

### 2. 言語切り替えテスト (`test_language_switching.js`)
**目的**: 70/30言語ルールの検証
- 日本語入力 → 日本語主体の応答
- 英語入力 → 英語主体の応答
- 混在言語の適切な処理
- 言語切り替えの流暢性

### 3. WebSocket再接続テスト (`test_websocket_reconnection.js`)
**目的**: ネットワーク障害時の回復力確認
- 初期接続の確認
- メッセージ送信中の切断処理
- 長時間切断からの回復
- 複数回の切断・再接続サイクル

### 4. ストリーミング応答テスト (`test_streaming_response.js`)
**目的**: リアルタイムストリーミング機能の検証
- ストリーミングチャンクの検出
- 長文応答のストリーミング
- インジケーターUI表示
- 混在言語でのストリーミング

### 5. OBS視覚的回帰テスト (`test_obs_visual_regression.js`)
**目的**: OBSビューモードのUI一貫性確認
- 5つのビューモードの検証
- ベースライン画像との比較
- レスポンシブデザインテスト
- 複数ビューの同時実行

### 6. 高度なパフォーマンステスト (`test_performance_advanced.js`)
**目的**: 詳細なパフォーマンスメトリクス収集
- コールド/ウォームスタート比較
- 負荷シナリオテスト（軽量/中量/重量）
- 長時間実行安定性テスト
- メモリリーク検出

## 🚀 テストの実行方法

### 前提条件
1. バックエンドサーバーが起動していること（ポート8000）
2. フロントエンドサーバーが起動していること（ポート3002）
3. `STREAM_ENABLED=true` が設定されていること（ストリーミングテスト用）

### 個別テストの実行

```bash
# AI会話フローテスト
node tests/test_ai_conversation_flow.js

# 言語切り替えテスト
node tests/test_language_switching.js

# WebSocket再接続テスト
node tests/test_websocket_reconnection.js

# ストリーミング応答テスト
node tests/test_streaming_response.js

# OBS視覚的回帰テスト
node tests/test_obs_visual_regression.js

# 高度なパフォーマンステスト
node tests/test_performance_advanced.js
```

### 一括実行スクリプト

```bash
# Linux/Mac
./tests/run_comprehensive_tests.sh

# Windows
# PowerShellまたはGit Bashで実行
bash tests/run_comprehensive_tests.sh
```

## 📊 テスト結果の確認

### スクリーンショット
各テストは以下のディレクトリにスクリーンショットを保存します：
- `test-screenshots/ai-conversation/`
- `test-screenshots/language-switching/`
- `test-screenshots/websocket-reconnection/`
- `test-screenshots/streaming-response/`
- `test-screenshots/obs-visual-regression/`
- `test-screenshots/obs-baseline/` （ベースライン画像）

### JSONレポート
各テストディレクトリに `test-results.json` が生成されます。

### パフォーマンスレポート
- `test-results/performance/performance-advanced.json`
- `test-results/performance/performance-metrics.csv`
- `performance-report.html` （視覚的なレポート）

## 🔧 トラブルシューティング

### WebSocket接続エラー
- バックエンドサーバーが起動しているか確認
- `http://localhost:8000/health` にアクセスして確認

### AI応答タイムアウト
- Gemini APIキーが正しく設定されているか確認
- `.env` ファイルの `GEMINI_API_KEY` を確認

### ストリーミングが動作しない
- `backend/.env` で `STREAM_ENABLED=true` を確認
- StreamingMessage.tsxがChatDisplayに統合されているか確認

### 画像比較エラー
- 初回実行時はベースライン画像が作成されます
- 意図的なUI変更の場合は、ベースライン画像を更新してください

## 💡 推奨事項

### CI/CD統合
1. GitHub Actionsやその他のCIツールでテストを自動実行
2. PRごとにテストを実行して品質を保証
3. 定期的な負荷テストでパフォーマンス劣化を検出

### テストの拡張
1. 新機能追加時は対応するテストを作成
2. バグ修正時は回帰テストを追加
3. ユーザーシナリオベースのテストを充実

### パフォーマンス目標
- ページ読み込み: < 3秒
- AI応答時間: < 2秒（P95）
- メモリ使用量: < 100MB（平均）
- WebSocket再接続: < 5秒

## 📝 メンテナンス

### 定期的な実行
- 日次: 基本的なE2Eテスト
- 週次: 全テストスイート実行
- リリース前: パフォーマンステスト重点実行

### ベースライン更新
UIの意図的な変更時は、以下のコマンドでベースラインを更新：
```bash
cp test-screenshots/obs-visual-regression/*.png test-screenshots/obs-baseline/
```

---

これらのテストにより、AIVlingualの品質と性能を継続的に監視・改善できます。