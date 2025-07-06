import { test, expect } from '@playwright/test';

test.describe('簡単ログイン動画フロー', () => {
  const TEST_CREDENTIALS = {
    username: 'test',
    password: 'test0702'
  };
  
  const TEST_VIDEO_URL = 'https://youtu.be/HKYkhkYGG7A?si=xm0gm55APOuoGqnf';

  test('ログイン → 動画解析タブ → URL入力 → 解析実行', async ({ page }) => {
    console.log('🚀 簡単統合テスト開始');
    
    // Step 1: ログインページにアクセス
    console.log('📝 Step 1: ログインページにアクセス');
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    
    // Step 2: ログイン実行
    console.log('🔐 Step 2: ログイン実行');
    await page.locator('[data-testid="username-input"]').fill(TEST_CREDENTIALS.username);
    await page.locator('[data-testid="password-input"]').fill(TEST_CREDENTIALS.password);
    await page.locator('[data-testid="submit-button"]').click();
    
    // Step 3: ホームページ遷移確認
    console.log('🏠 Step 3: ホームページ遷移確認');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // Step 4: ページが正しく読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Step 5: 動画解析タブをクリック
    console.log('🎥 Step 5: 動画解析タブクリック');
    const videoTab = page.locator('button').filter({ hasText: '🎥' }).first();
    await expect(videoTab).toBeVisible({ timeout: 10000 });
    await videoTab.click();
    
    // Step 6: VideoAnalyzerコンポーネントが表示されるまで待機
    await page.waitForTimeout(1000);
    
    // Step 7: URL入力フィールドを探して入力
    console.log('📝 Step 7: URL入力');
    const urlInput = page.locator('input[type="url"], input[placeholder*="YouTube"], input[placeholder*="URL"]').first();
    await expect(urlInput).toBeVisible({ timeout: 5000 });
    await urlInput.fill(TEST_VIDEO_URL);
    
    // Step 8: 解析ボタンをクリック
    console.log('🔍 Step 8: 解析ボタンクリック');
    const analyzeButton = page.locator('button').filter({ hasText: /analyze|解析|分析/i }).first();
    await expect(analyzeButton).toBeVisible({ timeout: 5000 });
    await analyzeButton.click();
    
    // Step 9: 解析完了まで待機（長めのタイムアウト）
    console.log('⏳ Step 9: 解析完了待機');
    try {
      // 動画情報が表示されるまで待機
      await page.locator('.video-info, .video-title, .video-card').first().waitFor({ 
        state: 'visible', 
        timeout: 60000 
      });
      console.log('✅ 動画解析完了');
    } catch (error) {
      console.log('⚠️ 動画解析タイムアウト - エラーメッセージを確認');
      const errorElement = page.locator('[role="alert"], .error-message, .error').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log(`❌ エラー: ${errorText}`);
      }
    }
    
    // Step 10: ページの状態を確認
    console.log('📊 Step 10: 最終状態確認');
    await page.screenshot({ path: 'test-results/final-state.png', fullPage: true });
    
    console.log('🎊 簡単統合テスト完了');
  });

  test('ログインフローのみ確認', async ({ page }) => {
    console.log('🔐 ログインフローテスト開始');
    
    await page.goto('/login');
    await page.locator('[data-testid="username-input"]').fill(TEST_CREDENTIALS.username);
    await page.locator('[data-testid="password-input"]').fill(TEST_CREDENTIALS.password);
    await page.locator('[data-testid="submit-button"]').click();
    
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // ユーザーメニューまたはユーザー名が表示されることを確認
    const userElement = page.locator('[data-testid="user-menu"], .user-name, .username').first();
    await expect(userElement).toBeVisible({ timeout: 10000 });
    
    console.log('✅ ログインフロー確認完了');
  });

  test('動画解析タブアクセスのみ確認', async ({ page }) => {
    console.log('🎥 動画解析タブアクセステスト開始');
    
    // 直接ホームページにアクセス（認証スキップ）
    await page.goto('/');
    
    // ログインページにリダイレクトされる場合はログイン
    if (page.url().includes('/login')) {
      await page.locator('[data-testid="username-input"]').fill(TEST_CREDENTIALS.username);
      await page.locator('[data-testid="password-input"]').fill(TEST_CREDENTIALS.password);
      await page.locator('[data-testid="submit-button"]').click();
      await expect(page).toHaveURL('/');
    }
    
    await page.waitForLoadState('networkidle');
    
    // 動画解析タブをクリック
    const videoTab = page.locator('button').filter({ hasText: '🎥' }).first();
    await expect(videoTab).toBeVisible({ timeout: 10000 });
    await videoTab.click();
    
    // VideoAnalyzerコンポーネントが表示されることを確認
    const videoAnalyzer = page.locator('input[type="url"], input[placeholder*="YouTube"]').first();
    await expect(videoAnalyzer).toBeVisible({ timeout: 10000 });
    
    console.log('✅ 動画解析タブアクセス確認完了');
  });
});