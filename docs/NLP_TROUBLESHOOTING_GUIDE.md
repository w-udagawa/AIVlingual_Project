# NLP Troubleshooting Guide

このガイドは、AIVlingual ProjectのNLP機能に関する一般的な問題と解決策をまとめたものです。

## 目次
1. [NLP語彙抽出が少ない（3-5個のみ）](#1-nlp語彙抽出が少ない3-5個のみ)
2. [語彙抽出の品質が低い](#2-語彙抽出の品質が低い)
3. [環境関連の問題](#3-環境関連の問題)
4. [デバッグ方法](#4-デバッグ方法)

## 1. NLP語彙抽出が少ない（3-5個のみ）

### 症状
- YouTube動画から3-5個の語彙しか抽出されない
- NLPが有効になっているのに結果が少ない

### 原因
uvicornがWSL2のvenv環境で実行されており、Conda環境のspaCyモデルにアクセスできていない。

### 確認方法
```bash
# ブラウザで環境を確認
http://localhost:8000/api/v1/youtube/debug-env
```

以下を確認：
- `python.executable`が`/mnt/c/.../venv/bin/python`を指していないか
- `spacy.available`が`false`になっていないか

### 解決方法

**正しい起動方法（Windowsコマンドプロンプトで実行）：**
```cmd
cd C:\ClaudeWork\AIVlingual_Project\backend
conda activate aivlingual_py311
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**重要**: 
- WSL2ターミナルではなく、Windowsコマンドプロンプトを使用
- `python -m uvicorn`形式で起動（現在のPython環境を使用）

## 2. 語彙抽出の品質が低い

### 症状
- "know", "come", "look"などの基本的すぎる単語が多い
- "weat us", "gr hoodie"などの無意味な断片が含まれる
- VTuber/ゲーム実況特有の表現が抽出されない

### 原因
- A1/A2レベルの基本単語がフィルタリングされていない
- コロケーション抽出の品質チェックが不十分
- ドメイン特有の表現パターンが定義されていない

### 解決済みの改善
1. **基本単語のフィルタリング**
   - A1レベルの頻出単語リストを追加
   - CEFRレベルでA1/A2を除外

2. **コロケーション品質向上**
   - 最小長さ（2単語以上、5文字以上）
   - 冠詞等の不要部分を除去
   - 意味のある単語の存在をチェック

3. **VTuber/ゲーミング表現の追加**
   - rage quit, clutch play, poggers等
   - ビジネス表現（quit my job, open a franchise）

### さらなる改善が必要な場合
`/backend/app/services/nlp_vocabulary_extractor.py`の以下を調整：
- `skip_words`セットに基本単語を追加
- `idiom_patterns`にドメイン特有の表現を追加
- `_calculate_priority()`で優先度を調整

## 3. 環境関連の問題

### ポートの競合
```cmd
# ポート8000の使用状況を確認
netstat -an | findstr :8000

# プロセスIDを確認
netstat -ano | findstr :8000

# プロセスを終了
taskkill /PID [プロセスID] /F
```

### 複数のPython環境
1. **WSL2 venv** - 使用しない（削除推奨）
2. **Windows Conda (aivlingual_py311)** - 正しい環境

### ログインできない問題
**原因**: バックエンドが停止している
**解決**: バックエンドを再起動

## 4. デバッグ方法

### 有用なエンドポイント
1. **環境確認**
   ```
   http://localhost:8000/api/v1/youtube/debug-env
   ```

2. **NLPテスト**
   ```
   http://localhost:8000/api/v1/youtube/test-nlp
   ```

3. **APIドキュメント**
   ```
   http://localhost:8000/docs
   ```

### ログ確認
```python
# nlp_vocabulary_extractor.pyでのデバッグ
print(f"[DEBUG] Message", flush=True)
logger.info(f"Log message")
```

### 段階的テスト
1. `/test-nlp`で簡単なテキストをテスト
2. 実際のYouTube URLでテスト
3. 結果の品質を確認

## 推奨開発フロー

1. **環境準備**
   ```cmd
   conda activate aivlingual_py311
   cd C:\ClaudeWork\AIVlingual_Project\backend
   ```

2. **起動と確認**
   ```cmd
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   起動後、`/debug-env`で環境を確認

3. **フロントエンド起動**（別ターミナル）
   ```cmd
   cd C:\ClaudeWork\AIVlingual_Project\frontend
   npm run dev
   ```

4. **動作確認**
   - http://localhost:3003 でログイン
   - Video Analyzerで語彙抽出をテスト

## トラブルシューティングチェックリスト

- [ ] Windowsコマンドプロンプトを使用しているか？
- [ ] Conda環境（aivlingual_py311）がアクティブか？
- [ ] `python -m uvicorn`で起動しているか？
- [ ] ポート8000が他のプロセスで使用されていないか？
- [ ] `/debug-env`でspaCyが利用可能になっているか？
- [ ] 起動ログにspaCyモデルのロードメッセージがあるか？

---
作成日: 2025年1月10日
最終更新: 2025年1月10日