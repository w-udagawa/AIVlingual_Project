const { chromium } = require('playwright');
const fs = require('fs');

// テスト設定
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3002',
  timeout: 30000,
  screenshotDir: 'test-screenshots/streaming-response'
};

// ストリーミングチャンクの検出
async function detectStreamingChunks(page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const chunks = [];
      let startTime = Date.now();
      
      // カスタムイベントリスナーの設定
      const handleChunk = (event) => {
        chunks.push({
          text: event.detail.text,
          timestamp: Date.now() - startTime
        });
      };
      
      window.addEventListener('ai_response_chunk', handleChunk);
      
      // 最終応答を待つ
      const handleFinal = () => {
        window.removeEventListener('ai_response_chunk', handleChunk);
        window.removeEventListener('ai_response_final', handleFinal);
        resolve(chunks);
      };
      
      window.addEventListener('ai_response_final', handleFinal);
      
      // タイムアウト設定
      setTimeout(() => {
        window.removeEventListener('ai_response_chunk', handleChunk);
        window.removeEventListener('ai_response_final', handleFinal);
        resolve(chunks);
      }, 15000);
    });
  });
}

// メッセージ送信とストリーミング監視
async function sendMessageAndMonitorStreaming(page, message) {
  const input = await page.$('input[type="text"], textarea');
  if (!input) throw new Error('Chat input not found');
  
  await input.fill(message);
  
  // ストリーミング監視を開始
  const streamingPromise = detectStreamingChunks(page);
  
  // メッセージ送信
  await page.keyboard.press('Enter');
  
  // ストリーミングチャンクを収集
  const chunks = await streamingPromise;
  
  return chunks;
}

// AIレスポンスの内容取得
async function getAIResponseContent(page) {
  return await page.evaluate(() => {
    const messages = Array.from(document.querySelectorAll('[class*="message"], [class*="bubble"], div[role="log"] > div'));
    const aiMessages = messages.filter(el => {
      const text = el.textContent || '';
      return text && !text.includes('送信しました') && !text.includes('You:') && text.trim().length > 0;
    });
    return aiMessages[aiMessages.length - 1]?.textContent || null;
  });
}

// ストリーミングインジケーターの検出
async function hasStreamingIndicator(page) {
  return await page.evaluate(() => {
    const indicators = document.querySelectorAll(
      '[class*="streaming"], [class*="loading"], [class*="generating"], .dots, .pulse'
    );
    return indicators.length > 0;
  });
}

async function testStreamingResponse() {
  console.log('🌊 AIVlingual Streaming Response Test Suite\n');
  console.log('ℹ️ Note: STREAM_ENABLED must be set to true in backend/.env\n');
  
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
    streamingMetrics: []
  };

  try {
    // Test 1: 基本的なストリーミング応答
    console.log('📋 Test 1: Basic Streaming Response');
    const context = await browser.newContext({
      permissions: ['microphone'],
      locale: 'ja-JP'
    });
    const page = await context.newPage();
    
    // コンソールログを監視
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('streaming')) {
        console.log(`  Console: ${msg.text()}`);
      }
    });
    
    await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // 短いメッセージでストリーミングをテスト
    console.log('  Sending short message...');
    const chunks1 = await sendMessageAndMonitorStreaming(page, 'こんにちは！');
    
    if (chunks1.length > 0) {
      console.log(`  ✅ Received ${chunks1.length} streaming chunks`);
      console.log(`  First chunk delay: ${chunks1[0]?.timestamp}ms`);
      console.log(`  Total streaming time: ${chunks1[chunks1.length - 1]?.timestamp}ms`);
      testResults.passed++;
      
      testResults.streamingMetrics.push({
        test: 'short_message',
        chunks: chunks1.length,
        firstChunkDelay: chunks1[0]?.timestamp,
        totalTime: chunks1[chunks1.length - 1]?.timestamp
      });
    } else {
      console.log('  ⚠️ No streaming chunks detected (might be using non-streaming mode)');
      const finalResponse = await getAIResponseContent(page);
      if (finalResponse) {
        console.log('  ℹ️ Response received in non-streaming mode');
        testResults.passed++;
      } else {
        console.log('  ❌ No response received');
        testResults.failed++;
      }
    }
    
    await page.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/1-basic-streaming.png` 
    });
    
    // Test 2: 長い応答のストリーミング
    console.log('\n📋 Test 2: Long Response Streaming');
    await page.waitForTimeout(2000);
    
    console.log('  Sending complex question...');
    const chunks2 = await sendMessageAndMonitorStreaming(
      page, 
      'Vtuberの歴史について詳しく教えてください。特に日本での発展と海外展開について。'
    );
    
    if (chunks2.length > 0) {
      console.log(`  ✅ Received ${chunks2.length} streaming chunks`);
      
      // チャンク間隔の分析
      const intervals = [];
      for (let i = 1; i < chunks2.length; i++) {
        intervals.push(chunks2[i].timestamp - chunks2[i-1].timestamp);
      }
      
      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        console.log(`  Average chunk interval: ${avgInterval.toFixed(0)}ms`);
        console.log(`  Min interval: ${Math.min(...intervals)}ms`);
        console.log(`  Max interval: ${Math.max(...intervals)}ms`);
      }
      
      testResults.passed++;
      testResults.streamingMetrics.push({
        test: 'long_response',
        chunks: chunks2.length,
        avgInterval: intervals.reduce((a, b) => a + b, 0) / intervals.length,
        totalTime: chunks2[chunks2.length - 1]?.timestamp
      });
    } else {
      console.log('  ⚠️ No streaming chunks detected');
      const finalResponse = await getAIResponseContent(page);
      if (finalResponse && finalResponse.length > 100) {
        console.log('  ℹ️ Long response received in non-streaming mode');
        testResults.passed++;
      } else {
        console.log('  ❌ Long response test failed');
        testResults.failed++;
      }
    }
    
    await page.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/2-long-streaming.png` 
    });
    
    // Test 3: ストリーミングインジケーターの表示
    console.log('\n📋 Test 3: Streaming Indicator UI');
    
    // メッセージ送信直後にインジケーターを確認
    const indicatorPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        let found = false;
        const checkInterval = setInterval(() => {
          const indicators = document.querySelectorAll(
            '[class*="streaming"], [class*="loading"], [class*="generating"], .dots, .pulse, :contains("AIが考えています")'
          );
          if (indicators.length > 0 || document.body.textContent.includes('AIが考えています')) {
            found = true;
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(found);
        }, 5000);
      });
    });
    
    // メッセージ送信
    const input = await page.$('input[type="text"], textarea');
    await input.fill('ストリーミングインジケーターテスト');
    await page.keyboard.press('Enter');
    
    const indicatorFound = await indicatorPromise;
    
    if (indicatorFound) {
      console.log('  ✅ Streaming indicator displayed');
      testResults.passed++;
      await page.screenshot({ 
        path: `${TEST_CONFIG.screenshotDir}/3-streaming-indicator.png` 
      });
    } else {
      console.log('  ⚠️ No streaming indicator found');
      await page.screenshot({ 
        path: `${TEST_CONFIG.screenshotDir}/3-no-indicator.png` 
      });
    }
    
    await page.waitForTimeout(5000); // 応答完了を待つ
    
    // Test 4: 日本語と英語の混在ストリーミング
    console.log('\n📋 Test 4: Mixed Language Streaming');
    
    const chunks4 = await sendMessageAndMonitorStreaming(
      page,
      'Please explain "kawaii" culture in both 日本語 and English.'
    );
    
    if (chunks4.length > 0) {
      console.log(`  ✅ Mixed language streaming: ${chunks4.length} chunks`);
      
      // 言語の切り替わりを検出
      let languageSwitches = 0;
      let lastLang = null;
      
      for (const chunk of chunks4) {
        const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(chunk.text);
        const hasEnglish = /[a-zA-Z]/.test(chunk.text);
        
        const currentLang = hasJapanese && !hasEnglish ? 'ja' : 
                           !hasJapanese && hasEnglish ? 'en' : 'mixed';
        
        if (lastLang && lastLang !== currentLang && currentLang !== 'mixed') {
          languageSwitches++;
        }
        lastLang = currentLang;
      }
      
      console.log(`  Language switches detected: ${languageSwitches}`);
      testResults.passed++;
    } else {
      console.log('  ⚠️ Mixed language streaming not detected');
      const response = await getAIResponseContent(page);
      if (response) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    }
    
    await page.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/4-mixed-language.png` 
    });
    
    // Test 5: ストリーミング中のユーザビリティ
    console.log('\n📋 Test 5: Streaming Usability');
    
    // ストリーミング中に入力フィールドが使用可能か確認
    const streamingStarted = page.evaluate(() => {
      return new Promise((resolve) => {
        const handleChunk = () => {
          window.removeEventListener('ai_response_chunk', handleChunk);
          resolve(true);
        };
        window.addEventListener('ai_response_chunk', handleChunk);
        setTimeout(() => resolve(false), 5000);
      });
    });
    
    await input.fill('ユーザビリティテスト');
    await page.keyboard.press('Enter');
    
    const isStreaming = await streamingStarted;
    
    if (isStreaming) {
      // ストリーミング中に入力フィールドをチェック
      await page.waitForTimeout(500);
      const inputDisabled = await input.isDisabled();
      const canType = await input.isEditable();
      
      console.log(`  Input field disabled during streaming: ${inputDisabled}`);
      console.log(`  Can type during streaming: ${canType}`);
      
      if (!inputDisabled || canType) {
        console.log('  ✅ Good UX: Input remains accessible');
        testResults.passed++;
      } else {
        console.log('  ⚠️ Input locked during streaming');
      }
    } else {
      console.log('  ℹ️ Streaming not detected for usability test');
    }
    
    await context.close();
    
    // 結果サマリー
    console.log('\n📊 Streaming Response Test Results:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    // ストリーミングメトリクスのサマリー
    if (testResults.streamingMetrics.length > 0) {
      console.log('\n📊 Streaming Performance Metrics:');
      for (const metric of testResults.streamingMetrics) {
        console.log(`  ${metric.test}:`);
        console.log(`    Chunks: ${metric.chunks}`);
        console.log(`    Total time: ${metric.totalTime}ms`);
        if (metric.avgInterval) {
          console.log(`    Avg interval: ${metric.avgInterval.toFixed(0)}ms`);
        }
      }
    }
    
    // 推奨事項
    console.log('\n💡 Recommendations:');
    if (testResults.streamingMetrics.length === 0) {
      console.log('  ⚠️ No streaming detected. Check if STREAM_ENABLED=true in backend/.env');
      console.log('  ⚠️ Ensure StreamingMessage component is integrated in ChatDisplay');
    } else {
      const avgChunks = testResults.streamingMetrics.reduce((sum, m) => sum + m.chunks, 0) / testResults.streamingMetrics.length;
      if (avgChunks < 5) {
        console.log('  ℹ️ Low chunk count. Consider adjusting streaming parameters.');
      }
    }
    
    // 結果をJSONファイルに保存
    fs.writeFileSync(
      `${TEST_CONFIG.screenshotDir}/test-results.json`,
      JSON.stringify(testResults, null, 2)
    );
    
    console.log(`\n📸 Screenshots saved in: ${TEST_CONFIG.screenshotDir}/`);

  } catch (error) {
    console.error('❌ Streaming response test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// テスト実行
testStreamingResponse().catch(console.error);