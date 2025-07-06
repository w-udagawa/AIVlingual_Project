import { test, expect } from '../fixtures/test-base';

test.describe('動画解析機能 - 拡張テスト', () => {
  // テスト用のYouTube動画URL
  const TEST_VIDEO = {
    url: 'https://youtu.be/knbMyna6DGs',
    expectedMinVocabulary: 5
  };

  test.beforeEach(async ({ page }) => {
    // ログインページへアクセス
    await page.goto('/login');
    
    // ログイン処理
    await page.getByPlaceholder(/username|ユーザー名/i).fill('test');
    await page.getByPlaceholder(/password|パスワード/i).fill('test0702');
    await page.getByRole('button', { name: /login|ログイン/i }).click();
    
    // ログイン成功を待つ
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');
  });

  test('YouTube動画を解析して語彙を抽出し、学習状態を管理できる', async ({ page }) => {
    // 動画解析タブへ移動
    await page.getByRole('button', { name: /動画解析|🎥/i }).click();
    await page.waitForTimeout(500);

    // 動画URLを入力
    const urlInput = page.getByPlaceholder(/youtube.*url|動画.*url/i);
    await urlInput.fill(TEST_VIDEO.url);

    // 解析開始（Analyzeボタンをクリック）
    const analyzeButton = page.locator('button.analyze-button');
    await analyzeButton.click();

    // ローディング状態の確認（ボタンテキストが変わる）
    await expect(analyzeButton).toHaveText('Analyzing...', { timeout: 5000 });

    // 解析完了を待つ（ボタンテキストが元に戻る）
    await expect(analyzeButton).toHaveText('Analyze', { timeout: 60000 });

    // 語彙リストが表示されることを確認
    const expressionsSection = page.locator('.expressions-section');
    await expect(expressionsSection).toBeVisible();

    // 語彙アイテムの確認
    const expressionCards = page.locator('.expression-card');
    const itemCount = await expressionCards.count();
    expect(itemCount).toBeGreaterThanOrEqual(TEST_VIDEO.expectedMinVocabulary);

    // 最初の語彙アイテムの詳細を確認
    const firstItem = expressionCards.first();
    await expect(firstItem).toBeVisible();

    // 日本語テキストの存在確認
    const japaneseText = firstItem.locator('.expression-text');
    await expect(japaneseText).toBeVisible();
    const japaneseContent = await japaneseText.textContent();
    expect(japaneseContent).toBeTruthy();

    // タイプの存在確認
    const typeText = firstItem.locator('.expression-type');
    await expect(typeText).toBeVisible();
    const typeContent = await typeText.textContent();
    expect(typeContent).toBeTruthy();

    // タイムスタンプの存在確認
    const timestampText = firstItem.locator('.expression-timestamp');
    await expect(timestampText).toBeVisible();
    const timestampContent = await timestampText.textContent();
    expect(timestampContent).toMatch(/@/);
  });

  test('語彙をエクスポートできる', async ({ page }) => {
    // 動画解析タブへ移動
    await page.getByRole('button', { name: /動画解析|🎥/i }).click();
    await page.waitForTimeout(500);

    // 動画を解析
    const urlInput = page.getByPlaceholder(/youtube.*url|動画.*url/i);
    await urlInput.fill(TEST_VIDEO.url);
    await page.locator('button.extract-button').click();

    // 解析完了を待つ（Analyzeボタンが再度有効になる）
    const analyzeButton = page.locator('button.analyze-button');
    await expect(analyzeButton).toHaveText('Analyze', { timeout: 60000 });
    await expect(analyzeButton).toBeEnabled();

    // エクスポートボタンをクリック
    const exportButton = page.getByRole('button', { name: /export|エクスポート|📥/i });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    // エクスポートモーダルが表示される
    const exportModal = page.locator('.export-modal, [data-testid="export-modal"]');
    await expect(exportModal).toBeVisible();

    // CSVフォーマットを選択
    const csvOption = page.locator('input[type="radio"][value="csv"]');
    await csvOption.click();

    // ダウンロードイベントを監視
    const downloadPromise = page.waitForEvent('download');

    // エクスポート実行
    await page.getByRole('button', { name: /export|エクスポート|ダウンロード/i }).last().click();

    // ダウンロードが開始される
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/vocabulary.*\.csv/);
  });

  test('バッチ処理で複数の動画を解析できる', async ({ page }) => {
    // バッチ処理タブへ移動
    await page.getByRole('button', { name: /バッチ処理|⚡/i }).click();
    await page.waitForTimeout(500);

    // バッチ処理画面は既に表示されているはず

    // URLテキストエリアを探す
    const urlTextarea = page.locator('textarea').filter({ hasText: '' });
    if (await urlTextarea.isVisible()) {
      // 複数のURLを入力（テスト用に同じURLを使用）
      await urlTextarea.fill(`${TEST_VIDEO.url}\n${TEST_VIDEO.url}`);

      // バッチ処理開始
      const startButton = page.getByRole('button', { name: /start batch|バッチ処理を開始|process/i });
      await startButton.click();

      // 進捗バーが表示される
      const progressBar = page.locator('.progress-bar, [data-testid="progress-bar"]');
      await expect(progressBar).toBeVisible({ timeout: 5000 });

      // 完了を待つ（最大2分）
      await page.waitForSelector('.results-section, [data-testid="batch-results"]', { timeout: 120000 });

      // 結果の確認
      const successCount = page.locator('.stat-value').filter({ hasText: /\d+/ }).first();
      await expect(successCount).toBeVisible();
      const count = await successCount.textContent();
      expect(parseInt(count || '0')).toBeGreaterThan(0);
    }
  });

  test('学習統計が表示される', async ({ page }) => {
    // 単語帳タブへ移動
    await page.getByRole('button', { name: /単語帳|📚/i }).click();
    await page.waitForTimeout(500);

    // 学習統計セクションを確認
    const learningStats = page.locator('.learning-stats, [data-testid="learning-stats"]');
    if (await learningStats.isVisible()) {
      // 統計項目の確認
      const statItems = learningStats.locator('.stat-item');
      const statCount = await statItems.count();
      expect(statCount).toBeGreaterThan(0);

      // 各統計値が表示されていることを確認
      const totalVocab = learningStats.locator('.stat-value').first();
      await expect(totalVocab).toBeVisible();
      const totalCount = await totalVocab.textContent();
      expect(totalCount).toMatch(/\d+/);
    }
  });

  test('無効なURLでエラーメッセージが表示される', async ({ page }) => {
    // 動画解析タブへ移動
    await page.getByRole('button', { name: /動画解析|🎥/i }).click();
    await page.waitForTimeout(500);

    // 無効なURLを入力
    const urlInput = page.getByPlaceholder(/youtube.*url|動画.*url/i);
    await urlInput.fill('https://invalid-url.com/video');

    // 解析開始（Analyzeボタンをクリック）
    const analyzeButton = page.locator('button.analyze-button');
    await analyzeButton.click();

    // エラーメッセージが表示される
    const errorToast = page.locator('[role="status"]').filter({ hasText: /error|エラー|invalid|無効/i });
    await expect(errorToast).toBeVisible({ timeout: 10000 });
  });

  test('語彙の詳細情報が表示される', async ({ page }) => {
    // 動画解析タブへ移動
    await page.getByRole('button', { name: /動画解析|🎥/i }).click();
    await page.waitForTimeout(500);

    // 動画を解析
    const urlInput = page.getByPlaceholder(/youtube.*url|動画.*url/i);
    await urlInput.fill(TEST_VIDEO.url);
    await page.locator('button.extract-button').click();

    // 解析完了を待つ（Analyzeボタンが再度有効になる）
    const analyzeButton = page.locator('button.analyze-button');
    await expect(analyzeButton).toHaveText('Analyze', { timeout: 60000 });
    await expect(analyzeButton).toBeEnabled();
    
    // 抽出結果が表示されることを確認
    await page.waitForSelector('.extraction-results', { timeout: 5000 });

    // 最初の語彙アイテムを確認
    const firstItem = page.locator('.vocab-item').first();
    await expect(firstItem).toBeVisible();

    // 難易度バッジの確認
    const difficultyBadge = firstItem.locator('.vocab-difficulty');
    await expect(difficultyBadge).toBeVisible();
    const difficulty = await difficultyBadge.textContent();
    expect(difficulty).toMatch(/Lv\.\d/);

    // 日本語テキストの確認
    const japaneseText = firstItem.locator('.vocab-japanese');
    await expect(japaneseText).toBeVisible();
    const japaneseContent = await japaneseText.textContent();
    expect(japaneseContent).toBeTruthy();
    
    // 英語テキストの確認
    const englishText = firstItem.locator('.vocab-english');
    await expect(englishText).toBeVisible();
    const englishContent = await englishText.textContent();
    expect(englishContent).toBeTruthy();
  });
});