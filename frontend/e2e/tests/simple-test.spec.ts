import { test, expect } from '@playwright/test';

test.describe('AIVlingual 基本機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('アプリケーションが正常に起動する', async ({ page }) => {
    // タイトルが表示される
    await expect(page.locator('h1')).toContainText('AIVlingual');
    
    // WebSocket接続ステータスが表示される
    const connectionStatus = page.locator('text=Connected').or(page.locator('.connection-status'));
    await expect(connectionStatus).toBeVisible({ timeout: 30000 });
  });

  test('タブ切り替えが機能する', async ({ page }) => {
    // 動画解析タブをクリック
    await page.click('text=動画解析');
    
    // 動画解析画面の要素が表示される
    const videoInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="YouTube"]'));
    await expect(videoInput).toBeVisible();
    
    // 単語帳タブをクリック
    await page.click('text=単語帳');
    
    // バッチ処理タブをクリック
    await page.click('text=バッチ処理');
    
    // チャットタブに戻る
    await page.click('text=チャット');
  });

  test('動画解析機能で動画URLを入力できる', async ({ page }) => {
    // 動画解析タブに移動
    await page.click('text=動画解析');
    await page.waitForTimeout(1000);
    
    // URL入力フィールドを探す
    const urlInput = page.locator('input[type="text"]').first();
    await expect(urlInput).toBeVisible();
    
    // テスト用URLを入力
    await urlInput.fill('https://youtu.be/fH52x36P-L4');
    await expect(urlInput).toHaveValue('https://youtu.be/fH52x36P-L4');
    
    // 解析ボタンを探す（存在する場合）
    const analyzeButton = page.locator('button', { hasText: /解析|分析|analyze/i });
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      
      // ローディング状態を待つ
      await page.waitForTimeout(2000);
    }
  });

  test('WebSocket接続が確立される', async ({ page }) => {
    // 接続ステータスを確認
    const connectedStatus = page.locator('text=Connected').or(page.locator('.connection-status:has-text("Connected")'));
    await expect(connectedStatus).toBeVisible({ timeout: 30000 });
    
    // コンソールエラーがないことを確認
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    // WebSocket関連のエラーがないことを確認
    const wsErrors = errors.filter(err => err.toLowerCase().includes('websocket'));
    expect(wsErrors).toHaveLength(0);
  });

  test('音声入力インターフェースが表示される', async ({ page }) => {
    // マイクボタンまたは音声入力UI要素を探す
    const voiceInterface = page.locator('.voice-input').or(page.locator('[data-testid="voice-input"]')).or(page.locator('.web-speech-interface'));
    
    // 音声入力関連の要素が存在することを確認
    const micButton = page.locator('button').filter({ hasText: /🎤|マイク|音声|voice/i });
    const inputField = page.locator('input[placeholder*="メッセージを入力"]');
    
    // いずれかの要素が表示されていることを確認
    const isVoiceUIVisible = await voiceInterface.isVisible() || await micButton.isVisible() || await inputField.isVisible();
    expect(isVoiceUIVisible).toBeTruthy();
  });
});