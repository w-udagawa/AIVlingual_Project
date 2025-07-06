import { test, expect } from '@playwright/test';

test.describe('語彙抽出システムの教育価値テスト', () => {
  // E2Eテストで使用されている動画（にじさんじEN切り抜き）
  const testVideoUrl = 'https://youtu.be/HKYkhkYGG7A';
  const apiEndpoint = 'http://localhost:8000/api/v1/youtube/extract-vocabulary';

  test.beforeEach(async ({ page }) => {
    // ログインしてアプリケーションにアクセス
    await page.goto('http://localhost:3003/login');
    await page.fill('input[name="username"]', 'test');
    await page.fill('input[name="password"]', 'test0702');
    await page.click('button[type="submit"]');
    
    // ホームページに遷移を確認
    await expect(page).toHaveURL('http://localhost:3003/');
    
    // 動画解析タブに移動
    await page.click('button:has-text("🎥")');
  });

  test('教育価値の高い語彙が優先的に抽出されることを確認', async ({ page, request }) => {
    console.log('🔍 教育価値優先抽出テスト開始');
    
    // APIレスポンスをインターセプト
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/extract-vocabulary') && response.status() === 200
    );

    // 動画URL入力と解析実行
    await page.fill('input[placeholder*="YouTube"]', testVideoUrl);
    await page.click('button:has-text("Extract Vocabulary")');

    // レスポンスを待機
    const response = await responsePromise;
    const responseData = await response.json();
    
    console.log('📊 API Response received:', {
      vocabularyCount: responseData.vocabulary_count || responseData.data?.vocabulary_count,
      videoTitle: responseData.data?.video_info?.title || responseData.video_info?.title
    });

    // 語彙データの分析（ネストされた構造に対応）
    const vocabularyItems = responseData.data?.vocabulary_items || responseData.vocabulary_items || [];
    
    // カテゴリ別カウント
    const categoryCount = {};
    const difficultyCount = {};
    const priorityScores = [];
    
    vocabularyItems.forEach(item => {
      // カテゴリ集計
      const category = item.category || 'unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
      
      // 難易度集計
      const difficulty = item.difficulty || 'N3';
      difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
      
      // 優先度スコア計算（教育価値の指標）
      let priorityScore = 0;
      
      // 日常会話での使用頻度
      if (item.tags?.includes('daily') || item.category === 'essential_daily') {
        priorityScore += 10;
      }
      
      // JLPT出題レベル
      if (['N5', 'N4'].includes(item.difficulty)) {
        priorityScore += 8;
      } else if (['N3'].includes(item.difficulty)) {
        priorityScore += 6;
      }
      
      // 文法パターン
      if (item.tags?.includes('grammar') || item.category === 'common_grammar') {
        priorityScore += 7;
      }
      
      // ビジネス・丁寧表現
      if (item.tags?.includes('polite') || item.category === 'polite_expressions') {
        priorityScore += 6;
      }
      
      // Vtuber特有表現（低優先度）
      if (item.tags?.includes('vtuber') || item.category === 'vtuber_culture') {
        priorityScore += 3;
      }
      
      priorityScores.push({
        expression: item.japanese || item.japanese_text,
        score: priorityScore,
        category: category,
        difficulty: difficulty
      });
    });

    // 優先度でソート
    priorityScores.sort((a, b) => b.score - a.score);
    
    console.log('\n📈 教育価値分析結果:');
    console.log('カテゴリ分布:', categoryCount);
    console.log('難易度分布:', difficultyCount);
    console.log('\nTop 10 高優先度語彙:');
    priorityScores.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.expression} (スコア: ${item.score}, カテゴリ: ${item.category})`);
    });

    // アサーション：教育価値の高い語彙が優先されているか
    const topItems = priorityScores.slice(0, 10);
    const educationalCount = topItems.filter(item => 
      ['essential_daily', 'common_grammar', 'polite_expressions'].includes(item.category)
    ).length;
    
    expect(educationalCount).toBeGreaterThanOrEqual(5);
    console.log(`✅ Top 10のうち${educationalCount}個が教育価値の高い語彙`);
    
    // 実際の使用文脈が保存されているか確認
    const itemsWithContext = vocabularyItems.filter(item => 
      item.actual_usage || item.example_sentence
    );
    
    const contextRatio = itemsWithContext.length / vocabularyItems.length;
    expect(contextRatio).toBeGreaterThan(0.7);
    console.log(`✅ ${Math.round(contextRatio * 100)}%の語彙に実使用文脈が含まれている`);
    
    // スクリーンショット保存
    await page.screenshot({ path: 'vocabulary-extraction-result.png', fullPage: true });
  });

  test('複数カテゴリの語彙がバランスよく抽出されることを確認', async ({ page }) => {
    console.log('🔄 カテゴリバランステスト開始');
    
    // 短い日本語動画で解析（ホロライブショート）
    const shortVideoUrl = 'https://youtu.be/5hEh9LiSzow'; // 日本語コンテンツ
    
    await page.fill('input[placeholder*="YouTube"]', shortVideoUrl);
    await page.click('button:has-text("Extract Vocabulary")');
    
    // 結果待機（タイムアウトを考慮）
    await page.waitForSelector('[data-testid="vocabulary-results"]', { 
      timeout: 60000,
      state: 'visible' 
    }).catch(() => {
      console.log('⚠️ 語彙結果の表示タイムアウト');
    });
    
    // 表示された語彙を収集
    const vocabularyElements = await page.$$('[data-testid="vocabulary-item"]');
    console.log(`📝 表示された語彙数: ${vocabularyElements.length}`);
    
    // カテゴリの多様性を確認
    const categories = new Set();
    for (const element of vocabularyElements) {
      const category = await element.getAttribute('data-category');
      if (category) categories.add(category);
    }
    
    console.log('📊 抽出されたカテゴリ:', Array.from(categories));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });

  test('APIレスポンスとフロントエンド表示の整合性確認', async ({ page, request }) => {
    console.log('🔗 データ整合性テスト開始');
    
    // APIレスポンスを直接取得
    const apiResponse = await request.get(`${apiEndpoint}?url=${encodeURIComponent(testVideoUrl)}`);
    const apiData = await apiResponse.json();
    
    console.log('📡 Direct API Response:', {
      status: apiResponse.status(),
      vocabularyCount: apiData.vocabulary_count || apiData.data?.vocabulary_count,
      firstItem: apiData.data?.vocabulary_items?.[0] || apiData.vocabulary_items?.[0]
    });
    
    // フロントエンドで同じ動画を解析
    await page.fill('input[placeholder*="YouTube"]', testVideoUrl);
    await page.click('button:has-text("Extract Vocabulary")');
    
    // 結果表示を待機（data-testidがない場合はクラスやテキストで検索）
    await page.waitForSelector('.vocabulary-results, [data-testid="vocabulary-count"], text=/extracted/i', { 
      timeout: 60000,
      state: 'visible'
    }).catch(async () => {
      console.log('⚠️ 標準セレクタが見つからないため、代替方法で結果を確認');
      // 結果が表示されるまで待機
      await page.waitForTimeout(5000);
    });
    
    // 表示された語彙数を取得（フォールバック付き）
    const displayedCount = await page.textContent('[data-testid="vocabulary-count"], .vocabulary-count, text=/vocabulary items/i');
    const displayedNumber = parseInt(displayedCount?.match(/\d+/)?.[0] || '0');
    
    console.log(`🔢 API語彙数: ${apiData.vocabulary_count || apiData.data?.vocabulary_count}, 表示語彙数: ${displayedNumber}`);
    
    // データマッピングの確認
    const firstVocabElement = await page.$('[data-testid="vocabulary-item"]:first-child');
    if (firstVocabElement && apiData.vocabulary_items?.[0]) {
      const displayedJapanese = await firstVocabElement.$eval('[data-testid="japanese-text"]', el => el.textContent);
      const apiJapanese = apiData.vocabulary_items[0].japanese || apiData.vocabulary_items[0].japanese_text;
      
      console.log(`📝 データマッピング確認:`);
      console.log(`  API: ${apiJapanese}`);
      console.log(`  表示: ${displayedJapanese}`);
      
      // フィールドマッピングの問題を検出
      if (apiJapanese !== displayedJapanese) {
        console.log('⚠️ データマッピングの不一致を検出');
        const items = apiData.data?.vocabulary_items || apiData.vocabulary_items;
        if (items?.[0]) {
          console.log('APIフィールド構造:', Object.keys(items[0]));
        }
      }
    }
  });

  test('エラーハンドリングとユーザーフィードバック', async ({ page }) => {
    console.log('❌ エラーハンドリングテスト開始');
    
    // 無効なURL入力
    await page.fill('input[placeholder*="YouTube"]', 'invalid-url');
    await page.click('button:has-text("Extract Vocabulary")');
    
    // エラーメッセージ表示確認
    const errorMessage = await page.waitForSelector('[role="alert"], .error-message', {
      timeout: 10000
    });
    
    const errorText = await errorMessage.textContent();
    console.log('🚨 エラーメッセージ:', errorText);
    
    expect(errorText).toBeTruthy();
    
    // エラー状態のスクリーンショット
    await page.screenshot({ path: 'error-handling.png' });
  });
});

// パフォーマンステスト
test.describe('語彙抽出パフォーマンステスト', () => {
  test('大量語彙抽出時のパフォーマンス測定', async ({ page }) => {
    console.log('⚡ パフォーマンステスト開始');
    
    await page.goto('http://localhost:3003/login');
    await page.fill('input[name="username"]', 'test');
    await page.fill('input[name="password"]', 'test0702');
    await page.click('button[type="submit"]');
    await page.click('button:has-text("🎥")');
    
    // パフォーマンス計測開始
    const startTime = Date.now();
    
    await page.fill('input[placeholder*="YouTube"]', 'https://youtu.be/HKYkhkYGG7A');
    await page.click('button:has-text("Extract Vocabulary")');
    
    // 結果表示までの時間計測
    await page.waitForSelector('[data-testid="vocabulary-results"]', { 
      timeout: 120000 
    }).catch(() => {});
    
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`⏱️ 処理時間: ${processingTime}秒`);
    
    // メモリ使用量確認
    const metrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576),
          totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576)
        };
      }
      return null;
    });
    
    if (metrics) {
      console.log(`💾 メモリ使用量: ${metrics.usedJSHeapSize}MB / ${metrics.totalJSHeapSize}MB`);
    }
    
    // パフォーマンス基準
    expect(processingTime).toBeLessThan(90); // 90秒以内
  });
});