#!/usr/bin/env python3
"""
エクスポート機能のテスト
"""

import asyncio
import sys
from pathlib import Path
import aiohttp
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from app.services.export_service import export_service
from app.services.database_service import db_service

async def test_export_functions():
    """エクスポート機能をテスト"""
    print("=" * 60)
    print("AIVlingual - エクスポート機能テスト")
    print("=" * 60)
    
    # データベースの初期化
    await db_service.init_db()
    
    # 1. CSV エクスポート
    print("\n1️⃣ CSVエクスポートをテスト中...")
    try:
        csv_data = await export_service.export_to_csv(limit=10)
        
        # CSVファイルとして保存
        csv_path = Path("test_export.csv")
        csv_path.write_bytes(csv_data)
        
        print(f"   ✅ CSVファイルを保存しました: {csv_path}")
        print(f"   ファイルサイズ: {len(csv_data)} bytes")
        
        # 内容の確認（最初の数行）
        lines = csv_data.decode('utf-8-sig').split('\n')[:5]
        print("\n   CSVサンプル:")
        for line in lines:
            print(f"   {line}")
    except Exception as e:
        print(f"   ❌ CSVエクスポートエラー: {str(e)}")
    
    # 2. JSON エクスポート
    print("\n2️⃣ JSONエクスポートをテスト中...")
    try:
        json_data = await export_service.export_to_json(limit=10)
        
        # JSONファイルとして保存
        json_path = Path("test_export.json")
        json_path.write_bytes(json_data)
        
        print(f"   ✅ JSONファイルを保存しました: {json_path}")
        print(f"   ファイルサイズ: {len(json_data)} bytes")
        
        # 内容の確認
        data = json.loads(json_data)
        print(f"\n   語彙アイテム数: {data['total_items']}")
        print(f"   エクスポート日時: {data['export_date']}")
    except Exception as e:
        print(f"   ❌ JSONエクスポートエラー: {str(e)}")
    
    # 3. Anki エクスポート
    print("\n3️⃣ Ankiデッキエクスポートをテスト中...")
    try:
        anki_data = await export_service.export_to_anki(
            limit=10,
            deck_name="AIVlingual Test Deck"
        )
        
        # Ankiファイルとして保存
        anki_path = Path("test_export.apkg")
        anki_path.write_bytes(anki_data)
        
        print(f"   ✅ Ankiデッキを保存しました: {anki_path}")
        print(f"   ファイルサイズ: {len(anki_data)} bytes")
        print(f"   ℹ️ このファイルをAnkiで直接インポートできます")
    except Exception as e:
        print(f"   ❌ Ankiエクスポートエラー: {str(e)}")
    
    # 4. API経由でのエクスポート
    print("\n4️⃣ API経由でエクスポートをテスト中...")
    
    # 簡易的なユーザー作成とログイン
    async with aiohttp.ClientSession() as session:
        # ユーザー作成
        user_data = {
            "username": f"export_test_{int(asyncio.get_event_loop().time())}",
            "email": f"export_{int(asyncio.get_event_loop().time())}@test.com",
            "password": "test123"
        }
        
        async with session.post(
            "http://localhost:8000/api/v1/auth/register",
            json=user_data
        ) as resp:
            if resp.status == 200:
                auth_data = await resp.json()
                token = auth_data.get("access_token")
                print(f"   ✅ テストユーザーを作成しました")
                
                # CSVダウンロード
                headers = {"Authorization": f"Bearer {token}"}
                async with session.get(
                    "http://localhost:8000/api/v1/vocabulary/export/csv",
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        print(f"   ✅ API経由でCSVエクスポート成功")
                    else:
                        print(f"   ❌ CSVエクスポート失敗: {resp.status}")
            else:
                print(f"   ❌ ユーザー作成失敗: {resp.status}")
    
    print("\n" + "=" * 60)
    print("エクスポートテスト完了！")
    print("作成されたファイル:")
    print("  - test_export.csv")
    print("  - test_export.json")
    print("  - test_export.apkg")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_export_functions())