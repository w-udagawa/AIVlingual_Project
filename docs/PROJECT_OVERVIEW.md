# AIVlingual プロジェクト概要

## 📁 プロジェクト構造（整理後）

```
AIVlingual_Project/
├── 📄 README.md                    # プロジェクト概要
├── 📄 USER_GUIDE.md               # 非エンジニア向け完全ガイド
├── 📄 CLAUDE.md                   # 開発者向けドキュメント
├── 📄 DEVELOPMENT_NOTES.md         # 開発環境と参考リポジトリ
├── 📄 .gitignore                  # Git除外設定
├── 🔧 start_aivlingual.bat        # Windows用簡単起動スクリプト
├── 🔧 start_aivlingual.sh         # Mac/Linux用簡単起動スクリプト
├── 🔧 setup.bat                   # Windows用セットアップ
├── 🔧 setup.sh                    # Mac/Linux用セットアップ
├── 🔧 cleanup.sh                  # プロジェクトクリーンアップ
│
├── 📁 backend/                    # バックエンドAPI (Python/FastAPI)
│   ├── 📄 requirements.txt        # Python依存関係
│   ├── 📄 .env.example           # 環境変数の例
│   ├── 📁 app/
│   │   ├── 📄 main.py            # FastAPIアプリケーションエントリポイント
│   │   ├── 📁 api/               # APIエンドポイント
│   │   │   ├── 📁 v1/            # APIバージョン1
│   │   │   └── 📁 websocket/     # WebSocketハンドラー
│   │   ├── 📁 core/              # コアビジネスロジック
│   │   ├── 📁 models/            # データモデル
│   │   └── 📁 services/          # 外部サービス統合
│   └── 📁 tests/                 # バックエンドテスト
│
├── 📁 frontend/                   # フロントエンド (React/TypeScript)
│   ├── 📄 package.json           # Node.js依存関係
│   ├── 📄 vite.config.ts         # Vite設定
│   ├── 📁 src/
│   │   ├── 📄 App.tsx            # メインアプリケーション
│   │   ├── 📄 main.tsx           # エントリポイント
│   │   ├── 📁 components/        # Reactコンポーネント
│   │   ├── 📁 contexts/          # React Context
│   │   ├── 📁 hooks/             # カスタムフック
│   │   ├── 📁 services/          # APIサービス
│   │   ├── 📁 obs/               # OBS関連機能
│   │   └── 📁 utils/             # ユーティリティ関数
│   └── 📁 public/                # 静的ファイル
│
├── 📁 tests/                      # E2Eテストスクリプト
├── 📁 reports/                    # テストレポート
└── 📁 docs/                       # 追加ドキュメント
```

## 🔑 主要ファイル説明

### 起動・セットアップ関連
- **start_aivlingual.bat/sh**: ワンクリックでアプリを起動
- **setup.bat/sh**: 初回セットアップ用スクリプト
- **cleanup.sh**: 不要ファイルの整理

### 設定ファイル
- **backend/.env**: APIキーなどの環境変数（要作成）
- **frontend/vite.config.ts**: フロントエンドビルド設定
- **backend/app/core/config.py**: バックエンド設定

### 主要コンポーネント
- **backend/app/main.py**: FastAPIサーバー
- **frontend/src/App.tsx**: Reactアプリケーション
- **frontend/src/components/**: UIコンポーネント群

## 🚀 クイックスタート

1. **セットアップ実行**
   ```bash
   # Windows
   setup.bat
   
   # Mac/Linux
   ./setup.sh
   ```

2. **環境変数設定**
   - `backend/.env`ファイルを作成
   - GEMINI_API_KEYを設定

3. **アプリ起動**
   ```bash
   # Windows
   start_aivlingual.bat
   
   # Mac/Linux
   ./start_aivlingual.sh
   ```

4. **ブラウザでアクセス**
   - http://localhost:3002

## 📚 ドキュメント

- **USER_GUIDE.md**: 初心者向けの詳細な使い方ガイド
- **CLAUDE.md**: 開発者向けの技術仕様
- **TESTING_GUIDE.md**: テスト実行ガイド

## 🧹 メンテナンス

定期的に以下を実行してプロジェクトをクリーンに保つ：
```bash
./cleanup.sh
```

## 🔗 関連リンク

- [Gemini API](https://makersuite.google.com/app/apikey)
- [FastAPI ドキュメント](https://fastapi.tiangolo.com/)
- [React ドキュメント](https://react.dev/)