# AIVlingual Playwright MCP Testing Guide

## 概要

このガイドでは、Playwright MCPを使用したAIVlingualプロジェクトの包括的なE2Eテストの実行方法を説明します。

## 前提条件

### 必要な環境
- Node.js 18以上
- Playwright (`npm install @playwright/test`)
- 起動中のバックエンドサーバー (ポート8000)
- 起動中のフロントエンドサーバー (ポート3002)

### 環境変数の設定
バックエンドの`.env`ファイルに以下のキーが設定されていることを確認してください：
```bash
GEMINI_API_KEY=your_key_here  # AI応答に必須
```

## テストスクリプト一覧

### 1. 基本UIテスト (`test_aivlingual_mcp.js`)
- アプリケーションの基本的な動作確認
- 各タブ（チャット、単語帳、動画解析）の動作確認
- WebSocket接続状態の確認
- Web Speech APIサポートの確認

### 2. チャットE2Eテスト (`test_chat_e2e.js`)
- メッセージ送信機能
- AI応答の受信確認
- 日本語/英語/混合言語の処理
- WebSocketメッセージの詳細な監視
- ストリーミング応答の確認

### 3. Web Speech APIテスト (`test_web_speech.js`)
- 音声認識機能の確認
- 音声合成機能の確認
- 利用可能な音声の確認
- ブラウザ互換性の確認

### 4. OBSビューテスト (`test_obs_views_detailed.js`)
- 5つのOBSモードの動作確認
  - Subtitle View（字幕表示）
  - Chat View（チャット履歴）
  - Educational View（教育用オーバーレイ）
  - Avatar View（アバター表示）
  - Analysis View（解析結果表示）
- 各モードの設定オプション確認
- WebSocket同期の確認

### 5. YouTube解析テスト (`test_youtube_analyzer.js`)
- YouTube URL入力と検証
- 語彙抽出機能
- バッチ処理機能
- Notion同期機能
- エラーハンドリング

### 6. パフォーマンステスト (`test_performance_report.js`)
- 初期ロード時間の測定
- WebSocket接続時間の測定
- AI応答レイテンシーの測定
- メモリ使用量の測定
- 同時実行性能の測定
- HTMLレポートの生成

## テストの実行方法

### 個別テストの実行
```bash
# 基本UIテスト
node test_aivlingual_mcp.js

# チャットE2Eテスト
node test_chat_e2e.js

# Web Speech APIテスト
node test_web_speech.js

# OBSビューテスト
node test_obs_views_detailed.js

# YouTube解析テスト
node test_youtube_analyzer.js

# パフォーマンステスト
node test_performance_report.js
```

### すべてのテストを実行
```bash
node run_all_tests.js
```

## テスト結果の確認

### スクリーンショット
`test-screenshots/`ディレクトリに各テストのスクリーンショットが保存されます。

### パフォーマンスレポート
- `performance-report.html` - ブラウザで開いて確認できるHTMLレポート
- `performance-report.json` - 詳細なパフォーマンスデータ

### テストサマリー
`test-results-summary.json` - すべてのテストの実行結果サマリー

## トラブルシューティング

### バックエンドに接続できない
```bash
# バックエンドが起動しているか確認
curl http://localhost:8000/health

# バックエンドを起動
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### フロントエンドに接続できない
```bash
# フロントエンドが起動しているか確認
curl http://localhost:3002/

# フロントエンドを起動
cd frontend
npm run dev
```

### AI応答がタイムアウトする
- `GEMINI_API_KEY`が正しく設定されているか確認
- APIキーが有効であることを確認
- ネットワーク接続を確認

### WebSocket接続エラー
- CORS設定が正しいか確認
- バックエンドのログでエラーを確認
- ブラウザのコンソールでエラーを確認

## カスタマイズ

### テストパラメータの変更
各テストスクリプト内の設定を変更できます：

```javascript
// タイムアウトの変更
await page.waitForSelector('.selector', { timeout: 30000 });

// ヘッドレスモードで実行
const browser = await chromium.launch({ headless: true });

// ビューポートサイズの変更
await page.setViewportSize({ width: 1920, height: 1080 });
```

### 新しいテストケースの追加
既存のテストスクリプトをベースに新しいテストケースを追加できます。

## ベストプラクティス

1. **テスト前の準備**
   - すべての依存関係がインストールされていることを確認
   - バックエンドとフロントエンドが正常に起動していることを確認
   - 必要なAPIキーが設定されていることを確認

2. **テストの実行**
   - 最初は個別のテストを実行して動作を確認
   - すべてのテストを実行する前に、基本的なテストが成功することを確認
   - パフォーマンステストは最後に実行（システムへの負荷が高いため）

3. **結果の分析**
   - スクリーンショットで視覚的に確認
   - パフォーマンスレポートでボトルネックを特定
   - 失敗したテストのログを詳細に確認

4. **継続的改善**
   - テストケースを定期的に更新
   - 新機能に対応するテストを追加
   - パフォーマンス基準を定期的に見直し

## まとめ

これらのテストスクリプトを使用することで、AIVlingualプロジェクトの品質を継続的に監視し、改善することができます。定期的にテストを実行し、結果を分析することで、ユーザーに最高のエクスペリエンスを提供できます。