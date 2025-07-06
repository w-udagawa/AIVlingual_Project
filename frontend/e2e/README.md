# AIVlingual E2Eテスト

このディレクトリには、AIVlingual フロントエンドのEnd-to-End (E2E) テストが含まれています。

## セットアップ

1. **依存関係のインストール**
   ```bash
   cd frontend
   npm install
   npx playwright install --with-deps
   ```

2. **環境の準備**
   - バックエンドサーバーが起動していることを確認
   - フロントエンド開発サーバーが起動していることを確認

## テストの実行

### 基本的な実行
```bash
npm run test:e2e
```

### UIモードで実行（推奨）
```bash
npm run test:e2e:ui
```

### ヘッドフルモード（ブラウザを表示）
```bash
npm run test:e2e:headed
```

### デバッグモード
```bash
npm run test:e2e:debug
```

### 便利なスクリプト
```bash
# 自動的に環境をチェックして実行
./e2e/run-tests.sh

# オプション付き実行
./e2e/run-tests.sh --headed
./e2e/run-tests.sh --ui
./e2e/run-tests.sh --debug
./e2e/run-tests.sh --test auth.spec.ts
```

## テスト構成

### ディレクトリ構造
```
e2e/
├── fixtures/          # テストフィクスチャとヘルパー
│   ├── test-base.ts  # カスタムフィクスチャ
│   └── websocket-helper.ts
├── page-objects/      # Page Object Model
│   ├── HomePage.ts
│   ├── LoginPage.ts
│   ├── VideoAnalysisPage.ts
│   └── VocabularyPage.ts
├── tests/            # テストファイル
│   ├── auth.spec.ts
│   ├── video-analysis.spec.ts
│   ├── websocket.spec.ts
│   └── export.spec.ts
└── run-tests.sh      # テスト実行スクリプト
```

### テストカテゴリ

1. **認証テスト** (`auth.spec.ts`)
   - ユーザー登録
   - ログイン/ログアウト
   - 認証エラーハンドリング

2. **動画解析テスト** (`video-analysis.spec.ts`)
   - YouTube動画の解析
   - 語彙抽出
   - エラーハンドリング

3. **WebSocketテスト** (`websocket.spec.ts`)
   - リアルタイム接続
   - 再接続機能
   - エラーハンドリング

4. **エクスポートテスト** (`export.spec.ts`)
   - CSV/JSON/Ankiエクスポート
   - ダウンロード機能
   - エラーハンドリング

## カスタムフィクスチャ

### Page Objects
各ページのUI要素と操作をカプセル化：
- `homePage`: ホームページの要素と操作
- `loginPage`: ログインページの要素と操作
- `videoAnalysisPage`: 動画解析ページの要素と操作
- `vocabularyPage`: 語彙管理ページの要素と操作

### 認証フィクスチャ
`authenticatedUser`: テスト用の認証済みユーザーを自動的に作成

## ベストプラクティス

1. **Page Object Modelの使用**
   - UI要素のセレクタはPage Objectに集約
   - テストロジックとUI操作を分離

2. **データ属性の使用**
   - `data-testid`属性を使用して安定したセレクタを作成
   - 例: `data-testid="submit-button"`

3. **適切な待機処理**
   - `waitFor`メソッドを使用して要素の出現を待つ
   - 固定の`waitForTimeout`は避ける

4. **テストの独立性**
   - 各テストは独立して実行可能
   - テスト間の依存関係を作らない

5. **クリーンアップ**
   - テスト後は作成したデータをクリーンアップ
   - `beforeEach`/`afterEach`フックを活用

## トラブルシューティング

### テストが失敗する場合

1. **環境を確認**
   ```bash
   # バックエンドの状態確認
   curl http://localhost:8000/health
   
   # フロントエンドの状態確認
   curl http://localhost:3003
   ```

2. **スクリーンショットを確認**
   - 失敗時のスクリーンショットは`test-results/`に保存される

3. **トレースを確認**
   ```bash
   npx playwright show-trace test-results/[test-name]/trace.zip
   ```

4. **デバッグモードで実行**
   ```bash
   npm run test:e2e:debug
   ```

### よくある問題

- **WebSocket接続エラー**: バックエンドが正しく起動しているか確認
- **タイムアウトエラー**: ネットワーク遅延を考慮してタイムアウトを調整
- **要素が見つからない**: data-testid属性が正しく設定されているか確認

## CI/CD統合

GitHub Actionsでの自動実行が設定されています：
- プルリクエスト時に自動実行
- テスト結果とレポートをアーティファクトとして保存

詳細は `.github/workflows/e2e-tests.yml` を参照してください。