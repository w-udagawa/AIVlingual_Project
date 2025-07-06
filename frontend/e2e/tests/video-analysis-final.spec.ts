import { test, expect } from '../fixtures/test-base';

test.describe('動画解析機能 - 実装確認テスト', () => {
  const TEST_VIDEO = {
    url: 'https://youtu.be/knbMyna6DGs?si=3KwqVMe_ZiSHwvGA',
    expectedMinVocabulary: 5
  };

  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.getByPlaceholder(/username|ユーザー名/i).fill('test');
    await page.getByPlaceholder(/password|パスワード/i).fill('test0702');
    await page.getByRole('button', { name: /login|ログイン/i }).click();
    await page.waitForURL('/');
  });

  test('動画解析機能の基本動作確認', async ({ page }) => {
    // 動画解析タブへ移動
    await page.getByRole('button', { name: /動画解析|🎥/i }).click();
    await page.waitForTimeout(1000);

    // VideoAnalyzerコンポーネントが表示されることを確認
    const videoAnalyzer = page.locator('.video-analyzer');
    await expect(videoAnalyzer).toBeVisible();

    // URL入力フィールドの確認
    const urlInput = page.locator('input.url-input');
    await expect(urlInput).toBeVisible();
    await urlInput.fill(TEST_VIDEO.url);

    // Extract Vocabularyボタンの確認
    const extractButton = page.locator('button.extract-button');
    await expect(extractButton).toBeVisible();
    await expect(extractButton).toHaveText('Extract Vocabulary');
    
    test.info().annotations.push({
      type: 'note',
      description: 'Extract Vocabulary機能は実際のYouTube APIを使用するため、E2Eテストでは動作確認のみ実施'
    });
  });

  test('単語帳画面の表示確認', async ({ page }) => {
    // 単語帳タブへ移動
    await page.getByRole('button', { name: /単語帳|📚/i }).click();
    await page.waitForTimeout(1000);

    // VocabularyPanelが表示されることを確認
    const vocabularyPanel = page.locator('.vocabulary-panel');
    await expect(vocabularyPanel).toBeVisible();

    // エクスポートボタンの存在確認
    const exportButton = page.locator('button:has-text("Export"), button:has-text("エクスポート")');
    const exportButtonCount = await exportButton.count();
    
    if (exportButtonCount > 0) {
      await expect(exportButton.first()).toBeVisible();
      test.info().annotations.push({
        type: 'info',
        description: 'エクスポートボタンが表示されています'
      });
    }
  });

  test('バッチ処理画面の表示確認', async ({ page }) => {
    // バッチ処理タブへ移動
    await page.getByRole('button', { name: /バッチ処理|⚡/i }).click();
    await page.waitForTimeout(1000);

    // BatchProcessorコンポーネントが表示されることを確認
    const batchProcessor = page.locator('.batch-processor');
    await expect(batchProcessor).toBeVisible();

    // URLテキストエリアの確認
    const urlTextarea = page.locator('textarea.url-textarea');
    await expect(urlTextarea).toBeVisible();
    
    // 複数URLを入力
    await urlTextarea.fill(`${TEST_VIDEO.url}\nhttps://youtu.be/another-video`);
    
    // Start Batch Processingボタンの確認
    const processButton = page.locator('button.process-button');
    await expect(processButton).toBeVisible();
    await expect(processButton).toHaveText('Start Batch Processing');
    await expect(processButton).toBeEnabled();
  });

  test('ナビゲーションタブの動作確認', async ({ page }) => {
    // 各タブが正しく切り替わることを確認
    const tabs = [
      { name: /チャット|💬/i, content: '.chat-display' },
      { name: /動画解析|🎥/i, content: '.video-analyzer' },
      { name: /単語帳|📚/i, content: '.vocabulary-panel' },
      { name: /バッチ処理|⚡/i, content: '.batch-processor' }
    ];

    for (const tab of tabs) {
      await page.getByRole('button', { name: tab.name }).click();
      await page.waitForTimeout(500);
      
      const content = page.locator(tab.content);
      await expect(content).toBeVisible({ timeout: 5000 });
    }
    
    test.info().annotations.push({
      type: 'success',
      description: 'すべてのタブが正常に動作しています'
    });
  });
});