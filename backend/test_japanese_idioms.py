#!/usr/bin/env python
"""
日本語慣用表現抽出のテストスクリプト
"""
import re

def test_japanese_idioms():
    """日本語慣用表現パターンのテスト"""
    
    # VTuberストリームからのサンプルテキスト
    test_texts = [
        "さあやっていきます！今日も配信頑張るぞー",
        "迷惑客が来たけど、まあいいか。さあ、ゲームをやっていきましょう",
        "やばいですね、この敵強すぎる！",
        "まじでか！すごいな、それは",
        "お疲れ様でした！今日も見てくれてありがとう",
        "よろしくお願いします。初見さんもいらっしゃいませ",
        "行くぞー！ナイスです！やったぜ",
        "どうしよう、困ったな。やっちゃった",
        "頑張ろう！ファイトだ！",
        "てぇてぇ、本当に草生える",
        "ぽんです、またやらかしました",
    ]
    
    # 慣用表現パターン（nlp_vocabulary_extractor.pyから）
    idiom_patterns = [
        # 「さあ」で始まる呼びかけ表現
        (r"(さあ[^。！、]*(?:ましょう|しよう|いこう|いきます))", "invitation/let's go"),
        (r"(さあ.*やっていきます)", "let's get started"),
        
        # 感嘆・驚き表現
        (r"(やばい(?:です)?(?:ね)?)", "oh no/amazing"),
        (r"(まじ(?:で)?(?:か)?)", "seriously/really"),
        (r"(すご[いく](?:ない)?)", "amazing/incredible"),
        
        # 配信でよく使う表現
        (r"(お疲れ様でした)", "good work/thank you"),
        (r"(よろしくお願いします)", "please/nice to meet you"),
        (r"(いらっしゃい(?:ませ)?)", "welcome"),
        
        # ゲーム実況でよく使う表現
        (r"(行く[ぞぜ]ー?)", "let's go"),
        (r"(やった[ぜぞ]?)", "yes!/did it!"),
        (r"(ナイス(?:です)?)", "nice!"),
        
        # 困った時の表現
        (r"(どうしよう)", "what should I do"),
        (r"(困った(?:な)?)", "I'm in trouble"),
        (r"(やっちゃった)", "oops/I messed up"),
        
        # 励まし・応援
        (r"(頑張[ろれ](?:う)?)", "do your best"),
        (r"(ファイト(?:だ)?)", "fight/you can do it"),
        
        # その他のVTuber特有表現
        (r"(てぇてぇ)", "precious/wholesome"),
        (r"(草(?:生える)?)", "lol/funny"),
        (r"(ぽん(?:です)?)", "silly/clumsy"),
    ]
    
    print("日本語慣用表現抽出テスト")
    print("=" * 60)
    
    all_found = []
    
    for text in test_texts:
        print(f"\nテスト文: {text}")
        print("-" * 40)
        
        found_expressions = []
        for pattern, meaning in idiom_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                found_expressions.append({
                    'expression': match,
                    'meaning': meaning,
                    'pattern': pattern
                })
                print(f"  ✓ 「{match}」 → {meaning}")
        
        if not found_expressions:
            print("  （慣用表現なし）")
        else:
            all_found.extend(found_expressions)
    
    # サマリー
    print("\n" + "=" * 60)
    print("結果サマリー")
    print("=" * 60)
    print(f"テストした文章数: {len(test_texts)}")
    print(f"抽出された慣用表現: {len(all_found)}個")
    
    # ユニークな表現をカウント
    unique_expressions = {}
    for expr in all_found:
        key = expr['expression']
        if key not in unique_expressions:
            unique_expressions[key] = {
                'count': 0,
                'meaning': expr['meaning']
            }
        unique_expressions[key]['count'] += 1
    
    print(f"ユニークな表現: {len(unique_expressions)}個")
    print("\n頻出表現:")
    for expr, info in sorted(unique_expressions.items(), key=lambda x: x[1]['count'], reverse=True):
        if info['count'] > 1:
            print(f"  「{expr}」: {info['count']}回")
    
    # 特定の表現が検出されたかチェック
    print("\n重要な表現の検出:")
    target_expressions = ["さあやっていきます", "迷惑客", "お疲れ様でした", "やばい"]
    for target in target_expressions:
        found = any(target in expr['expression'] for expr in all_found)
        status = "✓ 検出" if found else "✗ 未検出"
        print(f"  {target}: {status}")
    
    # 複合名詞のテスト
    print("\n複合名詞検出テスト:")
    compound_noun_test = [
        "迷惑客が来た",
        "配信者の皆さん",
        "ゲーム実況やってます",
        "日本語学習者向け",
        "初心者歓迎",
    ]
    
    # 簡易的な複合名詞パターン
    compound_pattern = r"([ぁ-んァ-ヶー一-龠]{2,}[客者向け況])"
    
    for text in compound_noun_test:
        matches = re.findall(compound_pattern, text)
        if matches:
            print(f"  {text} → {', '.join(matches)}")
        else:
            print(f"  {text} → （検出なし）")

if __name__ == "__main__":
    test_japanese_idioms()