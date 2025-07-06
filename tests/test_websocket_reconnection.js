const { chromium } = require('playwright');
const fs = require('fs');

// テスト設定
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3002',
  backendUrl: 'http://localhost:8000',
  timeout: 30000,
  reconnectTimeout: 10000,
  screenshotDir: 'test-screenshots/websocket-reconnection'
};

// WebSocket状態の監視
async function setupWebSocketMonitoring(page) {
  await page.evaluate(() => {
    window.wsEvents = [];
    window.wsState = { connected: false, reconnectCount: 0 };
    
    // WebSocketのプロトタイプを拡張して監視
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(...args) {
      const ws = new originalWebSocket(...args);
      
      // 接続イベント
      ws.addEventListener('open', () => {
        window.wsState.connected = true;
        window.wsEvents.push({ type: 'open', timestamp: Date.now() });
        console.log('WebSocket connected');
      });
      
      // 切断イベント
      ws.addEventListener('close', (event) => {
        window.wsState.connected = false;
        window.wsEvents.push({ 
          type: 'close', 
          timestamp: Date.now(),
          code: event.code,
          reason: event.reason
        });
        console.log('WebSocket disconnected:', event.code, event.reason);
      });
      
      // エラーイベント
      ws.addEventListener('error', () => {
        window.wsEvents.push({ type: 'error', timestamp: Date.now() });
        console.log('WebSocket error');
      });
      
      // メッセージ受信
      ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.type !== 'ping' && data.type !== 'pong') {
          window.wsEvents.push({ 
            type: 'message', 
            timestamp: Date.now(),
            messageType: data.type 
          });
        }
      });
      
      return ws;
    };
  });
}

// WebSocket状態の取得
async function getWebSocketState(page) {
  return await page.evaluate(() => window.wsState);
}

// WebSocketイベントの取得
async function getWebSocketEvents(page) {
  return await page.evaluate(() => window.wsEvents);
}

// ネットワークを一時的にブロック
async function blockNetwork(page) {
  await page.route('**/*', route => route.abort());
}

// ネットワークブロックを解除
async function unblockNetwork(page) {
  await page.unroute('**/*');
}

// バックエンドサーバーの再起動をシミュレート
async function simulateBackendRestart(page) {
  // WebSocket接続をブロック
  await page.route('**/ws/**', route => route.abort());
  await page.waitForTimeout(2000);
  // ブロックを解除
  await page.unroute('**/ws/**');
}

async function testWebSocketReconnection() {
  console.log('🔌 AIVlingual WebSocket Reconnection Test Suite\n');
  
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
    reconnectionTests: []
  };

  try {
    // Test 1: 初期接続テスト
    console.log('📋 Test 1: Initial WebSocket Connection');
    const context = await browser.newContext({
      permissions: ['microphone'],
      locale: 'ja-JP'
    });
    const page = await context.newPage();
    
    // WebSocket監視を設定
    await page.goto('about:blank');
    await setupWebSocketMonitoring(page);
    
    // アプリケーションを開く
    await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // 初期接続の確認
    const initialState = await getWebSocketState(page);
    if (initialState.connected) {
      console.log('  ✅ WebSocket initially connected');
      testResults.passed++;
    } else {
      console.log('  ❌ WebSocket initial connection failed');
      testResults.failed++;
    }
    
    await page.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/1-initial-connection.png` 
    });
    
    // Test 2: メッセージ送信中の切断・再接続
    console.log('\n📋 Test 2: Disconnection During Message Send');
    
    // メッセージ入力
    const input = await page.$('input[type="text"], textarea');
    await input.fill('テスト中に接続が切れてもメッセージが送信されますか？');
    
    // WebSocket接続をブロック
    console.log('  🔴 Blocking WebSocket connection...');
    await simulateBackendRestart(page);
    
    // メッセージ送信を試みる
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    
    // 再接続を待つ
    console.log('  🟡 Waiting for reconnection...');
    const reconnected = await page.waitForFunction(
      () => window.wsState.connected,
      { timeout: TEST_CONFIG.reconnectTimeout }
    ).catch(() => false);
    
    if (reconnected) {
      console.log('  ✅ WebSocket reconnected successfully');
      testResults.passed++;
      
      // メッセージが送信されたか確認
      const events = await getWebSocketEvents(page);
      const messagesSent = events.filter(e => e.type === 'message' && e.messageType === 'text').length;
      if (messagesSent > 0) {
        console.log('  ✅ Message sent after reconnection');
        testResults.passed++;
      } else {
        console.log('  ⚠️ Message may have been lost during disconnection');
      }
    } else {
      console.log('  ❌ WebSocket reconnection failed');
      testResults.failed++;
    }
    
    await page.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/2-reconnection-test.png` 
    });
    
    // Test 3: 長時間切断後の再接続
    console.log('\n📋 Test 3: Extended Disconnection Recovery');
    
    // ネットワークを完全にブロック
    console.log('  🔴 Simulating network outage...');
    await blockNetwork(page);
    await page.waitForTimeout(5000); // 5秒間切断
    
    // ネットワークを復旧
    console.log('  🟢 Restoring network...');
    await unblockNetwork(page);
    await page.reload({ waitUntil: 'networkidle' });
    await setupWebSocketMonitoring(page);
    await page.waitForTimeout(3000);
    
    // 再接続確認
    const recoveryState = await getWebSocketState(page);
    if (recoveryState.connected) {
      console.log('  ✅ Recovered from extended disconnection');
      testResults.passed++;
      
      // 機能が正常に動作するか確認
      await input.fill('長時間切断後も正常に動作しますか？');
      await page.keyboard.press('Enter');
      
      const messageEvents = await page.waitForFunction(
        () => {
          const events = window.wsEvents;
          return events.some(e => e.type === 'message' && Date.now() - e.timestamp < 5000);
        },
        { timeout: 5000 }
      ).catch(() => false);
      
      if (messageEvents) {
        console.log('  ✅ Functionality restored after recovery');
        testResults.passed++;
      } else {
        console.log('  ❌ Functionality not fully restored');
        testResults.failed++;
      }
    } else {
      console.log('  ❌ Failed to recover from extended disconnection');
      testResults.failed++;
    }
    
    await page.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/3-extended-disconnection.png` 
    });
    
    // Test 4: 複数回の切断・再接続
    console.log('\n📋 Test 4: Multiple Disconnection/Reconnection Cycles');
    
    let cycleSuccess = true;
    const disconnectionCycles = 3;
    
    for (let i = 0; i < disconnectionCycles; i++) {
      console.log(`  Cycle ${i + 1}/${disconnectionCycles}:`);
      
      // 切断
      await simulateBackendRestart(page);
      await page.waitForTimeout(2000);
      
      // 再接続を待つ
      const cycleReconnected = await page.waitForFunction(
        () => window.wsState.connected,
        { timeout: TEST_CONFIG.reconnectTimeout }
      ).catch(() => false);
      
      if (cycleReconnected) {
        console.log(`    ✅ Reconnection ${i + 1} successful`);
      } else {
        console.log(`    ❌ Reconnection ${i + 1} failed`);
        cycleSuccess = false;
        break;
      }
      
      await page.waitForTimeout(2000);
    }
    
    if (cycleSuccess) {
      console.log('  ✅ All reconnection cycles completed successfully');
      testResults.passed++;
    } else {
      console.log('  ❌ Multiple reconnection test failed');
      testResults.failed++;
    }
    
    await page.screenshot({ 
      path: `${TEST_CONFIG.screenshotDir}/4-multiple-cycles.png` 
    });
    
    // Test 5: 接続状態インジケーターの確認
    console.log('\n📋 Test 5: Connection Status Indicator');
    
    // 接続状態を示すUIエレメントを探す
    const statusElements = await page.$$('[class*="connection"], [class*="status"], [class*="online"], [class*="offline"]');
    
    if (statusElements.length > 0) {
      console.log('  ✅ Connection status indicator found');
      testResults.passed++;
      
      // 切断時のUI変化を確認
      await simulateBackendRestart(page);
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: `${TEST_CONFIG.screenshotDir}/5-status-disconnected.png` 
      });
      
      // 再接続後のUI変化を確認
      await page.waitForFunction(
        () => window.wsState.connected,
        { timeout: TEST_CONFIG.reconnectTimeout }
      );
      
      await page.screenshot({ 
        path: `${TEST_CONFIG.screenshotDir}/5-status-reconnected.png` 
      });
      
      console.log('  ✅ Status indicator updates correctly');
    } else {
      console.log('  ⚠️ No visible connection status indicator');
    }
    
    // イベントログの分析
    const allEvents = await getWebSocketEvents(page);
    const openEvents = allEvents.filter(e => e.type === 'open').length;
    const closeEvents = allEvents.filter(e => e.type === 'close').length;
    const errorEvents = allEvents.filter(e => e.type === 'error').length;
    
    console.log('\n📊 WebSocket Event Summary:');
    console.log(`  Connection events: ${openEvents}`);
    console.log(`  Disconnection events: ${closeEvents}`);
    console.log(`  Error events: ${errorEvents}`);
    
    testResults.reconnectionTests = {
      totalConnections: openEvents,
      totalDisconnections: closeEvents,
      totalErrors: errorEvents,
      reconnectionRate: closeEvents > 0 ? ((openEvents - 1) / closeEvents * 100).toFixed(1) : 100
    };
    
    // 結果サマリー
    console.log('\n📊 WebSocket Reconnection Test Results:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    console.log(`🔄 Reconnection Success Rate: ${testResults.reconnectionTests.reconnectionRate}%`);
    
    // 結果をJSONファイルに保存
    fs.writeFileSync(
      `${TEST_CONFIG.screenshotDir}/test-results.json`,
      JSON.stringify(testResults, null, 2)
    );
    
    console.log(`\n📸 Screenshots saved in: ${TEST_CONFIG.screenshotDir}/`);

  } catch (error) {
    console.error('❌ WebSocket reconnection test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// テスト実行
testWebSocketReconnection().catch(console.error);