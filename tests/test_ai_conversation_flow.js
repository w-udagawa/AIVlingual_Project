const { chromium } = require('playwright');
const fs = require('fs');
const { 
  waitForWebSocketConnection, 
  monitorWebSocketMessages, 
  sendMessageWithRetry,
  getWebSocketStats 
} = require('./utils/websocket_helper');

// テスト設定
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3002',
  timeout: 30000,
  retryCount: 3,
  screenshotDir: 'test-screenshots/ai-conversation'
};

// ユーティリティ関数
async function waitForAIResponse(page, timeout = 15000) {
  try {
    await page.waitForFunction(
      () => {
        const messages = Array.from(document.querySelectorAll('[class*="message"], [class*="bubble"], div[role="log"] > div'));
        return messages.some(el => el.textContent && !el.textContent.includes('送信しました'));
      },
      { timeout }
    );
    return true;
  } catch (e) {
    console.log('⚠️ AI response timeout');
    return false;
  }
}

async function sendMessage(page, message) {
  // Use the helper with retry logic
  const result = await sendMessageWithRetry(page, message);
  if (!result.success) {
    throw new Error(`Failed to send message: ${result.error}`);
  }
  return result;
}

async function getLastAIResponse(page) {
  return await page.evaluate(() => {
    const messages = Array.from(document.querySelectorAll('[class*="message"], [class*="bubble"], div[role="log"] > div'));
    const aiMessages = messages.filter(el => {
      const text = el.textContent || '';
      return text && !text.includes('送信しました') && !text.includes('You:');
    });
    return aiMessages[aiMessages.length - 1]?.textContent || null;
  });
}

async function testAIConversationFlow() {
  console.log('🚀 AIVlingual AI Conversation Flow - Comprehensive E2E Test\n');
  
  // スクリーンショットディレクトリ作成
  if (!fs.existsSync(TEST_CONFIG.screenshotDir)) {
    fs.mkdirSync(TEST_CONFIG.screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });

  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // 1. 日本語会話テスト
    console.log('📋 Test Suite 1: Japanese Conversation Flow');
    const contextJP = await browser.newContext({
      permissions: ['microphone'],
      locale: 'ja-JP'
    });
    const pageJP = await contextJP.newPage();
    
    // Set up WebSocket monitoring
    await monitorWebSocketMessages(pageJP);
    
    await pageJP.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    
    // Wait for WebSocket connection with optimized timing
    console.log('  Waiting for WebSocket connection...');
    const connectionResult = await waitForWebSocketConnection(pageJP);
    console.log(`  WebSocket connected: ${connectionResult.connected} (${connectionResult.time}ms)`);
    
    if (!connectionResult.connected) {
      throw new Error('WebSocket connection failed');
    }

    // Test 1.1: 自己紹介
    console.log('  Test 1.1: AI Self Introduction in Japanese');
    await sendMessage(pageJP, 'こんにちは！自己紹介してください。');
    const hasResponse1 = await waitForAIResponse(pageJP);
    const response1 = await getLastAIResponse(pageJP);
    
    if (hasResponse1 && response1 && response1.includes('りん')) {
      console.log('  ✅ AI introduced herself as Rin (りん)');
      testResults.passed++;
    } else {
      console.log('  ❌ AI self introduction failed');
      testResults.failed++;
    }
    
    await pageJP.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/1-1-japanese-intro.png` 
    });

    // Test 1.2: Vtuberスラング理解
    console.log('  Test 1.2: Vtuber Slang Understanding');
    await sendMessage(pageJP, 'てぇてぇってどういう意味？');
    const hasResponse2 = await waitForAIResponse(pageJP);
    const response2 = await getLastAIResponse(pageJP);
    
    if (hasResponse2 && response2 && (response2.includes('尊い') || response2.includes('precious'))) {
      console.log('  ✅ AI correctly explained Vtuber slang');
      testResults.passed++;
    } else {
      console.log('  ❌ Vtuber slang explanation failed');
      testResults.failed++;
    }
    
    await pageJP.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/1-2-vtuber-slang.png` 
    });

    // Test 1.3: 複数ターン会話
    console.log('  Test 1.3: Multi-turn Conversation');
    const conversationFlow = [
      '好きなVtuberは誰ですか？',
      'その理由を教えてください。',
      '他におすすめのVtuberはいますか？'
    ];
    
    let multiTurnSuccess = true;
    for (let i = 0; i < conversationFlow.length; i++) {
      await sendMessage(pageJP, conversationFlow[i]);
      const hasResponse = await waitForAIResponse(pageJP);
      if (!hasResponse) {
        multiTurnSuccess = false;
        break;
      }
      await pageJP.screenshot({ 
        path: `${TEST_CONFIG.screenshotDir}/1-3-multi-turn-${i + 1}.png` 
      });
    }
    
    if (multiTurnSuccess) {
      console.log('  ✅ Multi-turn conversation successful');
      testResults.passed++;
    } else {
      console.log('  ❌ Multi-turn conversation failed');
      testResults.failed++;
    }

    await contextJP.close();

    // 2. 英語会話テスト
    console.log('\n📋 Test Suite 2: English Conversation Flow');
    const contextEN = await browser.newContext({
      permissions: ['microphone'],
      locale: 'en-US'
    });
    const pageEN = await contextEN.newPage();
    
    await pageEN.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await pageEN.waitForTimeout(3000);

    // Test 2.1: 英語での自己紹介
    console.log('  Test 2.1: AI Self Introduction in English');
    await sendMessage(pageEN, 'Hello! Please introduce yourself.');
    const hasResponseEN1 = await waitForAIResponse(pageEN);
    const responseEN1 = await getLastAIResponse(pageEN);
    
    if (hasResponseEN1 && responseEN1 && responseEN1.includes('Rin')) {
      console.log('  ✅ AI introduced herself in English');
      testResults.passed++;
    } else {
      console.log('  ❌ English self introduction failed');
      testResults.failed++;
    }
    
    await pageEN.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/2-1-english-intro.png` 
    });

    // Test 2.2: 日本語学習サポート
    console.log('  Test 2.2: Japanese Learning Support');
    await sendMessage(pageEN, 'How do you say "hello" in Japanese?');
    const hasResponseEN2 = await waitForAIResponse(pageEN);
    const responseEN2 = await getLastAIResponse(pageEN);
    
    if (hasResponseEN2 && responseEN2 && (responseEN2.includes('こんにちは') || responseEN2.includes('konnichiwa'))) {
      console.log('  ✅ AI provided Japanese learning support');
      testResults.passed++;
    } else {
      console.log('  ❌ Japanese learning support failed');
      testResults.failed++;
    }
    
    await pageEN.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/2-2-learning-support.png` 
    });

    await contextEN.close();

    // 3. 言語混在テスト
    console.log('\n📋 Test Suite 3: Mixed Language Conversation');
    const contextMixed = await browser.newContext({
      permissions: ['microphone'],
      locale: 'ja-JP'
    });
    const pageMixed = await contextMixed.newPage();
    
    await pageMixed.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await pageMixed.waitForTimeout(3000);

    // Test 3.1: 日本語から英語への切り替え
    console.log('  Test 3.1: Language Switching - JP to EN');
    await sendMessage(pageMixed, 'こんにちは！How are you doing today?');
    const hasResponseMixed1 = await waitForAIResponse(pageMixed);
    const responseMixed1 = await getLastAIResponse(pageMixed);
    
    if (hasResponseMixed1 && responseMixed1) {
      console.log('  ✅ AI handled language switching');
      testResults.passed++;
    } else {
      console.log('  ❌ Language switching failed');
      testResults.failed++;
    }
    
    await pageMixed.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/3-1-language-switch.png` 
    });

    await contextMixed.close();

    // 4. エラー処理とリカバリーテスト
    console.log('\n📋 Test Suite 4: Error Handling and Recovery');
    const contextError = await browser.newContext({
      permissions: ['microphone'],
      locale: 'ja-JP'
    });
    const pageError = await contextError.newPage();
    
    await pageError.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await pageError.waitForTimeout(3000);

    // Test 4.1: 長文入力テスト
    console.log('  Test 4.1: Long Message Handling');
    const longMessage = 'これは非常に長いメッセージです。'.repeat(50);
    await sendMessage(pageError, longMessage);
    const hasResponseLong = await waitForAIResponse(pageError, 20000);
    
    if (hasResponseLong) {
      console.log('  ✅ AI handled long message');
      testResults.passed++;
    } else {
      console.log('  ❌ Long message handling failed');
      testResults.failed++;
    }
    
    await pageError.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/4-1-long-message.png` 
    });

    // Test 4.2: 特殊文字テスト
    console.log('  Test 4.2: Special Characters Handling');
    await sendMessage(pageError, '🎮🎯💡 絵文字や特殊文字 ♪♫♬');
    const hasResponseSpecial = await waitForAIResponse(pageError);
    
    if (hasResponseSpecial) {
      console.log('  ✅ AI handled special characters');
      testResults.passed++;
    } else {
      console.log('  ❌ Special characters handling failed');
      testResults.failed++;
    }
    
    await pageError.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/4-2-special-chars.png` 
    });

    await contextError.close();

    // 5. パフォーマンステスト
    console.log('\n📋 Test Suite 5: Performance Testing');
    const contextPerf = await browser.newContext({
      permissions: ['microphone'],
      locale: 'ja-JP'
    });
    const pagePerf = await contextPerf.newPage();
    
    await pagePerf.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await pagePerf.waitForTimeout(3000);

    // Test 5.1: 応答時間測定
    console.log('  Test 5.1: Response Time Measurement');
    const startTime = Date.now();
    await sendMessage(pagePerf, 'こんにちは！');
    const hasResponseTime = await waitForAIResponse(pagePerf);
    const responseTime = Date.now() - startTime;
    
    if (hasResponseTime && responseTime < 5000) {
      console.log(`  ✅ AI responded in ${responseTime}ms (< 5s)`);
      testResults.passed++;
    } else {
      console.log(`  ❌ Response time too slow: ${responseTime}ms`);
      testResults.failed++;
    }

    // Test 5.2: メモリ使用量測定
    console.log('  Test 5.2: Memory Usage Measurement');
    const memoryData = await pagePerf.evaluate(() => {
      return {
        heapUsed: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0,
        domNodes: document.querySelectorAll('*').length
      };
    });
    
    if (memoryData.heapUsed < 50) {
      console.log(`  ✅ Memory usage: ${memoryData.heapUsed.toFixed(2)}MB (< 50MB)`);
      testResults.passed++;
    } else {
      console.log(`  ❌ High memory usage: ${memoryData.heapUsed.toFixed(2)}MB`);
      testResults.failed++;
    }
    
    console.log(`  ℹ️ DOM nodes: ${memoryData.domNodes}`);

    await contextPerf.close();

    // テスト結果サマリー
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    console.log(`📸 Screenshots saved in: ${TEST_CONFIG.screenshotDir}/`);

    // 結果をJSONファイルに保存
    fs.writeFileSync(
      `${TEST_CONFIG.screenshotDir}/test-results.json`,
      JSON.stringify(testResults, null, 2)
    );

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// テスト実行
testAIConversationFlow().catch(console.error);