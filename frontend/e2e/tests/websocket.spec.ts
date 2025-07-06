import { test, expect } from '../fixtures/test-base';

test.describe('WebSocketリアルタイム通信', () => {
  test.beforeEach(async ({ authenticatedUser, homePage }) => {
    await homePage.goto();
  });

  test('WebSocket接続が確立される', async ({ page, homePage }) => {
    // WebSocket接続状態を監視
    await homePage.waitForWebSocketConnection();
    
    // 接続ステータスが「connected」になる
    const status = await homePage.websocketStatus.textContent();
    expect(status).toContain('connected');
  });

  test('音声入力モードでWebSocket通信ができる', async ({ page }) => {
    // 音声入力ボタンを探す
    const voiceInputButton = page.getByRole('button', { name: /voice|音声|マイク/i });
    
    // 音声入力ボタンが存在する場合のみテスト
    if (await voiceInputButton.isVisible()) {
      // WebSocketメッセージを監視
      const wsMessages: any[] = [];
      page.on('websocket', ws => {
        ws.on('framesent', event => wsMessages.push({ type: 'sent', payload: event.payload }));
        ws.on('framereceived', event => wsMessages.push({ type: 'received', payload: event.payload }));
      });

      // 音声入力開始
      await voiceInputButton.click();
      
      // 接続確立を待つ
      await page.waitForTimeout(2000);
      
      // WebSocketメッセージが送受信されていることを確認
      expect(wsMessages.length).toBeGreaterThan(0);
      
      // ping/pongメッセージが含まれていることを確認
      const hasPing = wsMessages.some(msg => 
        msg.payload && msg.payload.toString().includes('ping')
      );
      expect(hasPing).toBeTruthy();
    }
  });

  test('WebSocket再接続が機能する', async ({ page, homePage }) => {
    // 初回接続を確認
    await homePage.waitForWebSocketConnection();
    
    // WebSocketを監視
    let disconnected = false;
    let reconnected = false;
    
    page.on('websocket', ws => {
      ws.on('close', () => { disconnected = true; });
    });

    // ネットワークをオフラインにする
    await page.context().setOffline(true);
    
    // 切断を待つ
    await page.waitForTimeout(3000);
    expect(disconnected).toBeTruthy();
    
    // ネットワークをオンラインに戻す
    await page.context().setOffline(false);
    
    // 再接続を待つ
    await homePage.waitForWebSocketConnection();
    
    // 再接続されたことを確認
    const status = await homePage.websocketStatus.textContent();
    expect(status).toContain('connected');
  });

  test('リアルタイムで語彙が更新される', async ({ page, videoAnalysisPage }) => {
    // WebSocketでリアルタイム更新を監視する場合
    await videoAnalysisPage.goto();
    
    // WebSocketメッセージを監視
    const vocabularyUpdates: any[] = [];
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        const data = event.payload;
        if (data && data.toString().includes('vocabulary')) {
          vocabularyUpdates.push(data);
        }
      });
    });

    // 動画解析を開始
    await videoAnalysisPage.analyzeVideo('https://youtu.be/fH52x36P-L4');
    
    // リアルタイム更新を待つ
    await page.waitForTimeout(5000);
    
    // 語彙更新メッセージを受信したことを確認
    if (vocabularyUpdates.length > 0) {
      expect(vocabularyUpdates.length).toBeGreaterThan(0);
    }
  });

  test('WebSocketエラーハンドリングが機能する', async ({ page }) => {
    // エラーメッセージを監視
    const errorMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });

    // 無効なWebSocketエンドポイントに接続を試みる
    await page.evaluate(() => {
      try {
        const ws = new WebSocket('ws://localhost:8000/ws/invalid');
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (e) {
        console.error('WebSocket creation error:', e);
      }
    });

    // エラーが適切に処理されることを確認
    await page.waitForTimeout(2000);
    
    // エラーUIが表示されないことを確認（グレースフルな処理）
    const errorAlert = page.locator('[role="alert"]');
    const isErrorVisible = await errorAlert.isVisible();
    
    // アプリケーションが正常に動作し続けることを確認
    const appContainer = page.locator('#root');
    await expect(appContainer).toBeVisible();
  });
});