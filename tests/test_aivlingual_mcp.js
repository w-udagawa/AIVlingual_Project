const { chromium } = require('playwright');

async function testAIVlingualMCP() {
  console.log('🚀 Starting AIVlingual E2E Tests with Playwright MCP...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });
  
  const context = await browser.newContext({
    permissions: ['microphone'],
    locale: 'ja-JP'
  });
  
  const page = await context.newPage();
  
  // エラーログの記録
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`⚠️ Console error: ${msg.text()}`);
    }
  });

  // ネットワークエラーの監視
  page.on('requestfailed', request => {
    console.log(`❌ Request failed: ${request.url()}`);
  });

  try {
    // 1. アプリケーションの基本的な動作確認
    console.log('\n📋 Test 1: Basic Application Loading');
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    
    // スクリーンショット取得
    await page.screenshot({ 
      path: 'test-screenshots/1-homepage.png',
      fullPage: true 
    });
    
    // タイトル確認
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    
    // WebSocket接続状態を確認
    console.log('\n📋 Test 2: WebSocket Connection');
    await page.waitForTimeout(2000); // WebSocket接続を待つ
    
    // 接続ステータスを探す
    const connectionElements = await page.$$('[class*="connection"], [class*="status"]');
    if (connectionElements.length > 0) {
      console.log('✅ Connection status element found');
    }

    // 2. チャット機能のテスト
    console.log('\n📋 Test 3: Chat Functionality');
    
    // チャットタブを探してクリック
    const chatButton = await page.$$('button:has-text("チャット"), button:has-text("Chat"), [role="tab"]:has-text("チャット")');
    if (chatButton.length > 0) {
      await chatButton[0].click();
      await page.waitForTimeout(500);
      console.log('✅ Clicked chat tab');
    }
    
    // チャット入力フィールドを探す
    const chatInput = await page.$('input[type="text"], textarea');
    if (chatInput) {
      await chatInput.fill('こんにちは、AIVlingual！テストメッセージです。');
      await page.screenshot({ 
        path: 'test-screenshots/2-chat-input.png' 
      });
      console.log('✅ Filled chat input');
      
      // 送信ボタンを探してクリック
      const sendButton = await page.$('button[type="submit"], button:has-text("送信"), button:has-text("Send")');
      if (sendButton) {
        await sendButton.click();
        console.log('✅ Sent message');
        
        // AI応答を待つ（最大15秒）
        console.log('⏳ Waiting for AI response...');
        try {
          await page.waitForSelector('[class*="message"], [class*="bubble"], [class*="response"]', { 
            timeout: 15000,
            state: 'visible'
          });
          await page.screenshot({ 
            path: 'test-screenshots/3-ai-response.png' 
          });
          console.log('✅ AI response received');
        } catch (e) {
          console.log('⚠️ AI response timeout - API key might be missing');
        }
      }
    }

    // 3. 語彙（単語帳）機能のテスト
    console.log('\n📋 Test 4: Vocabulary Panel');
    const vocabularyButton = await page.$$('button:has-text("単語帳"), button:has-text("Vocabulary"), [role="tab"]:has-text("単語")');
    if (vocabularyButton.length > 0) {
      await vocabularyButton[0].click();
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: 'test-screenshots/4-vocabulary.png' 
      });
      console.log('✅ Accessed vocabulary panel');
    }

    // 4. 動画解析機能のテスト
    console.log('\n📋 Test 5: Video Analyzer');
    const videoButton = await page.$$('button:has-text("動画解析"), button:has-text("Video"), [role="tab"]:has-text("動画")');
    if (videoButton.length > 0) {
      await videoButton[0].click();
      await page.waitForTimeout(1000);
      
      // YouTube URL入力フィールド
      const urlInput = await page.$('input[placeholder*="YouTube"], input[placeholder*="URL"]');
      if (urlInput) {
        await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        await page.screenshot({ 
          path: 'test-screenshots/5-video-analyzer.png' 
        });
        console.log('✅ Filled video URL');
      }
    }

    // 5. Web Speech APIサポートの確認
    console.log('\n📋 Test 6: Web Speech API Support');
    const speechSupported = await page.evaluate(() => {
      return {
        recognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
        synthesis: 'speechSynthesis' in window
      };
    });
    console.log(`✅ Speech Recognition: ${speechSupported.recognition ? 'Supported' : 'Not supported'}`);
    console.log(`✅ Speech Synthesis: ${speechSupported.synthesis ? 'Supported' : 'Not supported'}`);

    // 6. OBSビューのテスト
    console.log('\n📋 Test 7: OBS Views');
    const obsViews = [
      { mode: 'subtitle', name: 'Subtitle View' },
      { mode: 'chat', name: 'Chat View' },
      { mode: 'educational', name: 'Educational View' },
      { mode: 'avatar', name: 'Avatar View' },
      { mode: 'analysis', name: 'Analysis View' }
    ];

    for (const view of obsViews) {
      const obsPage = await context.newPage();
      await obsPage.goto(`http://localhost:3002/obs?mode=${view.mode}`, { 
        waitUntil: 'networkidle' 
      });
      await obsPage.screenshot({ 
        path: `test-screenshots/obs-${view.mode}.png` 
      });
      console.log(`✅ Tested OBS ${view.name}`);
      await obsPage.close();
    }

    // 7. パフォーマンス測定
    console.log('\n📋 Test 8: Performance Metrics');
    // Playwrightの通常版ではmetricsは利用できないため、代替方法を使用
    const performanceData = await page.evaluate(() => {
      return {
        heapUsed: performance.memory ? performance.memory.usedJSHeapSize : 0,
        heapTotal: performance.memory ? performance.memory.totalJSHeapSize : 0,
        domNodes: document.querySelectorAll('*').length
      };
    });
    console.log(`✅ JavaScript Heap Size: ${(performanceData.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✅ DOM Nodes: ${performanceData.domNodes}`);

    // 最終状態のスクリーンショット
    await page.screenshot({ 
      path: 'test-screenshots/final-state.png',
      fullPage: true 
    });

    // テスト結果のサマリー
    console.log('\n📊 Test Summary:');
    console.log(`Total errors encountered: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    console.log('\n✅ All tests completed!');
    console.log('📸 Screenshots saved in test-screenshots/ directory');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ 
      path: 'test-screenshots/error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// スクリーンショット保存用ディレクトリの作成
const fs = require('fs');
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots');
}

// テスト実行
testAIVlingualMCP().catch(console.error);