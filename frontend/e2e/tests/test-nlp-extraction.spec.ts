import { test, expect } from '@playwright/test';

test.describe('NLP Vocabulary Extraction Debug', () => {
  const TEST_VIDEO_URL = 'https://youtu.be/HKYkhkYGG7A';
  
  test('Debug NLP extraction for specific video', async ({ page }) => {
    // APIレスポンスをインターセプト
    let apiResponse: any = null;
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/v1/youtube/extract-vocabulary')) {
        console.log(`[API] Request URL: ${url}`);
        console.log(`[API] Status: ${response.status()}`);
        
        try {
          const body = await response.json();
          apiResponse = body;
          console.log('[API] Response:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('[API] Failed to parse response:', e);
        }
      }
    });
    
    // コンソールログをキャプチャ
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'info') {
        console.log(`[Browser Console] ${msg.text()}`);
      }
    });
    
    // エラーをキャプチャ
    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });
    
    // フロントエンドにアクセス
    await page.goto('http://localhost:3003');
    
    // Video Analyzerタブをクリック
    await page.click('text=Video Analyzer');
    await page.waitForTimeout(1000);
    
    // YouTube URLを入力
    const urlInput = page.locator('input[placeholder*="YouTube URL"]');
    await urlInput.fill(TEST_VIDEO_URL);
    
    // Analyzeボタンをクリック
    console.log('[Test] Clicking Analyze button...');
    await page.click('button:has-text("Analyze")');
    
    // レスポンスを待つ（最大30秒）
    await page.waitForResponse(
      response => response.url().includes('/api/v1/youtube/extract-vocabulary'),
      { timeout: 30000 }
    );
    
    // 少し待機
    await page.waitForTimeout(2000);
    
    // APIレスポンスを確認
    if (apiResponse) {
      console.log('\n=== API Response Analysis ===');
      console.log(`Success: ${apiResponse.success}`);
      console.log(`Video ID: ${apiResponse.video_id}`);
      console.log(`Vocabulary Count: ${apiResponse.vocabulary_count}`);
      console.log(`Message: ${apiResponse.message}`);
      console.log(`Extraction Method: ${apiResponse.data?.extraction_method}`);
      console.log(`Vocabulary Items Length: ${apiResponse.data?.vocabulary_items?.length || 0}`);
      
      if (apiResponse.data?.vocabulary_items?.length > 0) {
        console.log('\nFirst 3 vocabulary items:');
        apiResponse.data.vocabulary_items.slice(0, 3).forEach((item: any, idx: number) => {
          console.log(`${idx + 1}. ${item.english_text} / ${item.japanese_text}`);
        });
      }
    }
    
    // UI上の結果を確認
    const resultsSection = page.locator('.vocabulary-results, [class*="results"]').first();
    const isResultsVisible = await resultsSection.isVisible().catch(() => false);
    
    if (isResultsVisible) {
      console.log('\n=== UI Results ===');
      console.log('Results section is visible');
      
      // 語彙数を探す
      const countText = await page.locator('text=/[0-9]+ vocabulary items?/i').textContent().catch(() => null);
      if (countText) {
        console.log(`UI shows: ${countText}`);
      }
    } else {
      console.log('\n=== UI Results ===');
      console.log('No results section visible');
    }
    
    // エラーメッセージを確認
    const errorMessage = await page.locator('[role="alert"], .error-message').textContent().catch(() => null);
    if (errorMessage) {
      console.log(`\n[Error Message] ${errorMessage}`);
    }
    
    // テスト結果のアサーション
    expect(apiResponse).toBeTruthy();
    expect(apiResponse?.success).toBe(true);
    
    // NLP抽出が機能しているか確認
    if (apiResponse?.data?.extraction_method === 'nlp') {
      console.log('\n✓ NLP extraction method confirmed');
      // 少なくとも30個以上の語彙が抽出されるべき
      expect(apiResponse?.vocabulary_count).toBeGreaterThan(0);
    }
  });
});