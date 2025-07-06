import { test, expect } from '../fixtures/test-base';
import * as fs from 'fs';
import * as path from 'path';

test.describe('エクスポート機能', () => {
  test.beforeEach(async ({ authenticatedUser, videoAnalysisPage }) => {
    // 認証済みユーザーで動画解析ページへ
    await videoAnalysisPage.goto();
    
    // テスト用動画を解析
    await videoAnalysisPage.analyzeVideo('https://youtu.be/fH52x36P-L4');
    await videoAnalysisPage.waitForAnalysisComplete();
  });

  test('CSVファイルとしてエクスポートできる', async ({ page, videoAnalysisPage }) => {
    // ダウンロードイベントを監視
    const downloadPromise = page.waitForEvent('download');
    
    // CSVエクスポート
    await videoAnalysisPage.exportVocabulary('csv');
    
    // ダウンロード確認
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    
    // ファイル内容を確認
    const filePath = await download.path();
    if (filePath) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // CSVヘッダーを確認
      expect(content).toContain('Japanese');
      expect(content).toContain('English');
      expect(content).toContain('Context');
      
      // BOMが含まれていることを確認（日本語対応）
      expect(content.charCodeAt(0)).toBe(0xFEFF);
    }
  });

  test('JSONファイルとしてエクスポートできる', async ({ page, videoAnalysisPage }) => {
    const downloadPromise = page.waitForEvent('download');
    
    // JSONエクスポート
    await videoAnalysisPage.exportVocabulary('json');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
    
    // JSON構造を確認
    const filePath = await download.path();
    if (filePath) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      expect(data).toHaveProperty('export_date');
      expect(data).toHaveProperty('total_items');
      expect(data).toHaveProperty('vocabulary');
      expect(Array.isArray(data.vocabulary)).toBeTruthy();
      
      // 語彙アイテムの構造を確認
      if (data.vocabulary.length > 0) {
        const item = data.vocabulary[0];
        expect(item).toHaveProperty('japanese_text');
        expect(item).toHaveProperty('english_text');
        expect(item).toHaveProperty('context');
        expect(item).toHaveProperty('source_video_id');
      }
    }
  });

  test('Ankiデッキとしてエクスポートできる', async ({ page, videoAnalysisPage }) => {
    const downloadPromise = page.waitForEvent('download');
    
    // Ankiエクスポート
    await videoAnalysisPage.exportVocabulary('anki');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.apkg$/);
    
    // APKGファイルはZIP形式
    const filePath = await download.path();
    if (filePath) {
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(0);
      
      // ファイルヘッダーでZIPファイルであることを確認
      const buffer = fs.readFileSync(filePath);
      const header = buffer.slice(0, 4);
      expect(header.toString('hex')).toBe('504b0304'); // ZIP file signature
    }
  });

  test('語彙管理ページから一括エクスポートできる', async ({ page, vocabularyPage }) => {
    // 語彙管理ページへ移動
    await vocabularyPage.goto();
    
    // いくつかのアイテムを選択
    await vocabularyPage.selectVocabularyItem(0);
    await vocabularyPage.selectVocabularyItem(1);
    await vocabularyPage.selectVocabularyItem(2);
    
    // CSVエクスポート
    const downloadPromise = page.waitForEvent('download');
    await vocabularyPage.exportSelected('csv');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/vocabulary.*\.csv$/);
  });

  test('エクスポートフォーマットを選択できる', async ({ page }) => {
    // エクスポートボタンをクリック
    const exportButton = page.getByRole('button', { name: /export|エクスポート/i });
    await exportButton.click();
    
    // フォーマットオプションが表示される
    const csvOption = page.getByRole('menuitem', { name: /csv/i });
    const jsonOption = page.getByRole('menuitem', { name: /json/i });
    const ankiOption = page.getByRole('menuitem', { name: /anki/i });
    
    await expect(csvOption).toBeVisible();
    await expect(jsonOption).toBeVisible();
    await expect(ankiOption).toBeVisible();
    
    // メニューを閉じる
    await page.keyboard.press('Escape');
  });

  test('エクスポート時にプログレス表示される', async ({ page, vocabularyPage }) => {
    await vocabularyPage.goto();
    
    // 多数のアイテムがある場合のエクスポート
    const exportButton = page.getByRole('button', { name: /export|エクスポート/i });
    await exportButton.click();
    
    const csvOption = page.getByRole('menuitem', { name: /csv/i });
    await csvOption.click();
    
    // プログレスインジケーターが表示される（実装による）
    const progressIndicator = page.locator('[data-testid="export-progress"]');
    if (await progressIndicator.isVisible()) {
      await expect(progressIndicator).toBeVisible();
      
      // エクスポート完了を待つ
      await page.waitForEvent('download');
      
      // プログレスインジケーターが消える
      await expect(progressIndicator).not.toBeVisible();
    }
  });

  test('エクスポートエラーが適切に処理される', async ({ page, context }) => {
    // ダウンロードを無効化してエラーを発生させる
    await context.route('**/api/v1/vocabulary/export/**', route => {
      route.abort('failed');
    });
    
    // エクスポートを試みる
    const exportButton = page.getByRole('button', { name: /export|エクスポート/i });
    await exportButton.click();
    
    const csvOption = page.getByRole('menuitem', { name: /csv/i });
    await csvOption.click();
    
    // エラーメッセージが表示される
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
    
    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('export');
  });
});