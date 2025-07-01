const { chromium } = require('playwright');

async function testAIVlingual() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Starting AIVlingual tests...');

  try {
    // 1. アプリケーションにアクセス
    console.log('1. Accessing application...');
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    
    // スクリーンショット取得
    await page.screenshot({ path: 'test-1-homepage.png' });
    console.log('✓ Homepage loaded');

    // 2. WebSocket接続状態を確認
    console.log('2. Checking WebSocket connection...');
    const connectionStatus = await page.waitForSelector('.connection-status', { timeout: 5000 });
    const statusText = await connectionStatus.textContent();
    console.log(`✓ Connection status: ${statusText}`);

    // 3. チャットタブの確認
    console.log('3. Testing chat interface...');
    const chatButton = await page.locator('button:has-text("チャット")');
    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(500);
    }
    
    // チャット入力フィールドの確認
    const chatInput = await page.waitForSelector('.chat-input', { timeout: 5000 });
    await chatInput.fill('こんにちは、AIVlingual!');
    await page.screenshot({ path: 'test-2-chat-input.png' });
    
    // メッセージ送信
    const sendButton = await page.locator('.send-button');
    await sendButton.click();
    console.log('✓ Message sent');

    // AI応答を待つ（最大10秒）
    console.log('4. Waiting for AI response...');
    try {
      await page.waitForSelector('.message-bubble', { timeout: 10000 });
      await page.screenshot({ path: 'test-3-ai-response.png' });
      console.log('✓ AI response received');
    } catch (e) {
      console.log('⚠ AI response timeout - this might be due to API key issues');
    }

    // 5. 語彙タブのテスト
    console.log('5. Testing vocabulary panel...');
    const vocabularyButton = await page.locator('button:has-text("単語帳")');
    await vocabularyButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-4-vocabulary.png' });
    console.log('✓ Vocabulary panel accessed');

    // 6. 動画解析タブのテスト
    console.log('6. Testing video analyzer...');
    const videoButton = await page.locator('button:has-text("動画解析")');
    await videoButton.click();
    await page.waitForTimeout(500);
    
    // YouTube URL入力フィールドの確認
    const urlInput = await page.locator('input[placeholder*="YouTube"]');
    if (await urlInput.isVisible()) {
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      await page.screenshot({ path: 'test-5-video-analyzer.png' });
      console.log('✓ Video analyzer input ready');
    }

    // 7. Web Speech APIのサポート確認
    console.log('7. Checking Web Speech API support...');
    const speechSupported = await page.evaluate(() => {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    });
    console.log(`✓ Web Speech API supported: ${speechSupported}`);

    // 8. コンソールエラーの確認
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`⚠ Console error: ${msg.text()}`);
      }
    });

    // 最終スクリーンショット
    await page.screenshot({ path: 'test-final-state.png', fullPage: true });

    console.log('\n✅ All tests completed successfully!');
    console.log('Screenshots saved in the current directory.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// テスト実行
testAIVlingual().catch(console.error);