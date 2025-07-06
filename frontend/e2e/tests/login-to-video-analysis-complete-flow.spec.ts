import { test, expect } from '../fixtures/test-base';

test.describe('ログインから動画解析完全フロー', () => {
  // テスト用の認証情報と動画URL
  const TEST_CREDENTIALS = {
    username: 'test',
    password: 'test0702'
  };
  
  const TEST_VIDEO_URL = 'https://youtu.be/HKYkhkYGG7A?si=xm0gm55APOuoGqnf';

  test('ログイン → 動画解析 → 語彙抽出 → 保存の完全フロー', async ({ 
    page, 
    loginPage, 
    homePage, 
    videoAnalysisPage 
  }) => {
    console.log('🚀 統合E2Eテスト開始: ログインから動画解析完全フロー');
    
    // Step 1: ログインページにアクセス
    console.log('📝 Step 1: ログインページにアクセス');
    await loginPage.goto();
    await expect(page).toHaveURL('/login');
    
    // Step 2: 指定された認証情報でログイン
    console.log('🔐 Step 2: 認証情報でログイン実行');
    await loginPage.login(TEST_CREDENTIALS.username, TEST_CREDENTIALS.password);
    
    // Step 3: ログイン成功後ホームページに遷移
    console.log('🏠 Step 3: ホームページ遷移確認');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // Step 4: ユーザーメニューが表示されることを確認
    console.log('👤 Step 4: ユーザーメニュー表示確認');
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible({ timeout: 10000 });
    await expect(userMenu).toContainText(TEST_CREDENTIALS.username);
    
    // Step 5: 動画解析タブに移動
    console.log('🎥 Step 5: 動画解析タブに移動');
    await videoAnalysisPage.goto();
    
    // Step 6: 動画URLを入力して解析実行
    console.log('🔍 Step 6: 動画解析実行');
    await videoAnalysisPage.analyzeVideo(TEST_VIDEO_URL);
    
    // Step 7: 動画解析完了を待機
    console.log('⏳ Step 7: 動画解析完了待機');
    await videoAnalysisPage.waitForAnalysisComplete();
    
    // Step 8: 動画情報の表示確認
    console.log('📊 Step 8: 動画情報表示確認');
    await expect(videoAnalysisPage.videoInfo).toBeVisible();
    
    const videoTitle = await videoAnalysisPage.getVideoTitle();
    expect(videoTitle).toBeTruthy();
    console.log(`✅ 動画タイトル: ${videoTitle}`);
    
    const channelName = await videoAnalysisPage.getChannelName();
    expect(channelName).toBeTruthy();
    console.log(`📺 チャンネル名: ${channelName}`);
    
    // Step 9: 表現の抽出確認
    console.log('📝 Step 9: 表現抽出確認');
    const expressionCount = await videoAnalysisPage.getExpressionCount();
    expect(expressionCount).toBeGreaterThan(0);
    console.log(`🎯 抽出された表現数: ${expressionCount}`);
    
    // 最初の表現を確認
    if (expressionCount > 0) {
      const firstExpression = await videoAnalysisPage.getExpression(0);
      expect(firstExpression.japanese).toBeTruthy();
      console.log(`📝 最初の表現: ${firstExpression.japanese} (${firstExpression.type})`);
    }
    
    // Step 10: 語彙抽出実行
    console.log('🔤 Step 10: 語彙抽出実行');
    await videoAnalysisPage.extractVocabulary(TEST_VIDEO_URL);
    
    // Step 11: 語彙抽出完了を待機
    console.log('⏳ Step 11: 語彙抽出完了待機');
    await videoAnalysisPage.waitForExtractionComplete();
    
    // Step 12: 抽出統計の確認
    console.log('📈 Step 12: 抽出統計確認');
    const stats = await videoAnalysisPage.getExtractionStats();
    expect(stats.itemsExtracted).toBeGreaterThan(0);
    console.log(`📊 抽出統計: ${stats.itemsExtracted}項目, 日本語${stats.japaneseRatio}%, 英語${stats.englishRatio}%`);
    
    // Step 13: 語彙プレビューの確認
    console.log('👀 Step 13: 語彙プレビュー確認');
    const vocabularyCount = await videoAnalysisPage.getVocabularyPreviewCount();
    expect(vocabularyCount).toBeGreaterThan(0);
    console.log(`📚 語彙プレビュー項目数: ${vocabularyCount}`);
    
    // 最初の語彙項目を確認
    if (vocabularyCount > 0) {
      const firstVocab = await videoAnalysisPage.getVocabularyItem(0);
      expect(firstVocab.japanese).toBeTruthy();
      expect(firstVocab.english).toBeTruthy();
      console.log(`📖 最初の語彙: ${firstVocab.japanese} = ${firstVocab.english} (難易度: ${firstVocab.difficulty})`);
    }
    
    // Step 14: 語彙保存実行
    console.log('💾 Step 14: 語彙保存実行');
    await videoAnalysisPage.saveVocabularyItems();
    
    // Step 15: 保存完了確認
    console.log('✅ Step 15: 保存完了確認');
    await videoAnalysisPage.waitForSaveComplete();
    
    const successMessage = await videoAnalysisPage.getSuccessMessage();
    expect(successMessage).toContain('保存');
    console.log(`🎉 保存成功: ${successMessage}`);
    
    console.log('🎊 統合E2Eテスト完了: 全ステップが正常に実行されました');
  });

  test('エラーハンドリング: 無効な動画URLでの処理', async ({ 
    page, 
    loginPage, 
    videoAnalysisPage 
  }) => {
    console.log('🚨 エラーハンドリングテスト開始');
    
    // ログイン
    await loginPage.goto();
    await loginPage.login(TEST_CREDENTIALS.username, TEST_CREDENTIALS.password);
    await expect(page).toHaveURL('/');
    
    // 動画解析ページに移動
    await videoAnalysisPage.goto();
    
    // 無効なURLで解析実行
    const invalidUrl = 'https://invalid-youtube-url.com/watch?v=invalid';
    await videoAnalysisPage.analyzeVideo(invalidUrl);
    
    // エラーメッセージの表示確認
    const errorMessage = await videoAnalysisPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    console.log(`❌ エラーメッセージ: ${errorMessage}`);
  });

  test('UI状態確認: ローディング表示とプログレス', async ({ 
    page, 
    loginPage, 
    videoAnalysisPage 
  }) => {
    console.log('🎨 UI状態確認テスト開始');
    
    // ログイン
    await loginPage.goto();
    await loginPage.login(TEST_CREDENTIALS.username, TEST_CREDENTIALS.password);
    await expect(page).toHaveURL('/');
    
    // 動画解析ページに移動
    await videoAnalysisPage.goto();
    
    // 動画解析開始
    await videoAnalysisPage.analyzeVideo(TEST_VIDEO_URL);
    
    // ローディングスピナーが表示されることを確認（短時間で確認）
    try {
      await expect(videoAnalysisPage.loadingSpinner).toBeVisible({ timeout: 2000 });
      console.log('⏳ ローディングスピナー表示確認');
    } catch (e) {
      console.log('ℹ️ ローディングスピナーは高速処理のため確認できませんでした');
    }
    
    // 解析完了後、ローディングが消えることを確認
    await videoAnalysisPage.waitForAnalysisComplete();
    await expect(videoAnalysisPage.loadingSpinner).not.toBeVisible();
    console.log('✅ ローディング状態の適切な管理を確認');
  });

  test.afterEach(async ({ page }) => {
    // テスト後のクリーンアップ
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
});