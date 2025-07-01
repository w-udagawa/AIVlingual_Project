const { chromium } = require('playwright');
const fs = require('fs');

async function testPerformanceAndReport() {
  console.log('📊 AIVlingual Performance Test & Report Generation');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });
  
  const context = await browser.newContext({
    permissions: ['microphone'],
    locale: 'ja-JP'
  });

  // テスト結果を記録
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    performance: {},
    summary: {}
  };

  try {
    // 1. 初期ロードパフォーマンス
    console.log('\n📏 Measuring Initial Load Performance...');
    const page = await context.newPage();
    
    const startTime = Date.now();
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    testResults.performance.initialLoad = {
      time: loadTime,
      status: loadTime < 3000 ? 'good' : loadTime < 5000 ? 'acceptable' : 'slow'
    };
    console.log(`✅ Initial load time: ${loadTime}ms`);

    // 2. WebSocket接続パフォーマンス
    console.log('\n📏 Measuring WebSocket Connection...');
    const wsStartTime = Date.now();
    
    // WebSocket接続を待つ
    await page.waitForFunction(() => {
      return window.__wsMessages && window.__wsMessages.length > 0;
    }, { timeout: 5000 }).catch(() => {});
    
    const wsConnectTime = Date.now() - wsStartTime;
    testResults.performance.websocketConnection = {
      time: wsConnectTime,
      status: wsConnectTime < 1000 ? 'good' : wsConnectTime < 3000 ? 'acceptable' : 'slow'
    };
    console.log(`✅ WebSocket connection time: ${wsConnectTime}ms`);

    // 3. AI応答レイテンシー測定
    console.log('\n📏 Measuring AI Response Latency...');
    
    const chatInput = await page.$('input[type="text"], textarea');
    const sendButton = await page.$('button[type="submit"], button:has-text("送信")');
    
    if (chatInput && sendButton) {
      await chatInput.fill('Hello!');
      
      const aiStartTime = Date.now();
      await sendButton.click();
      
      try {
        await page.waitForSelector('[class*="message"]:last-child', { 
          timeout: 15000,
          state: 'visible' 
        });
        const aiResponseTime = Date.now() - aiStartTime;
        
        testResults.performance.aiResponse = {
          time: aiResponseTime,
          status: aiResponseTime < 2000 ? 'good' : aiResponseTime < 5000 ? 'acceptable' : 'slow'
        };
        console.log(`✅ AI response time: ${aiResponseTime}ms`);
      } catch (e) {
        testResults.performance.aiResponse = {
          time: -1,
          status: 'failed',
          error: 'Timeout waiting for AI response'
        };
        console.log('❌ AI response timeout');
      }
    }

    // 4. メモリ使用量測定
    console.log('\n📏 Measuring Memory Usage...');
    const metrics = await page.evaluate(() => {
      return {
        JSHeapUsedSize: performance.memory ? performance.memory.usedJSHeapSize : 0,
        JSHeapTotalSize: performance.memory ? performance.memory.totalJSHeapSize : 0,
        Nodes: document.querySelectorAll('*').length
      };
    });
    
    testResults.performance.memory = {
      heapSize: metrics.JSHeapUsedSize,
      heapSizeMB: (metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2),
      status: metrics.JSHeapUsedSize < 50 * 1024 * 1024 ? 'good' : 
              metrics.JSHeapUsedSize < 100 * 1024 * 1024 ? 'acceptable' : 'high'
    };
    console.log(`✅ JS Heap Size: ${testResults.performance.memory.heapSizeMB} MB`);

    // 5. 複数タブ同時実行テスト
    console.log('\n📏 Testing Multiple Concurrent OBS Views...');
    const obsPages = [];
    const concurrentStartTime = Date.now();
    
    // 5つのOBSビューを同時に開く
    const obsModes = ['subtitle', 'chat', 'educational', 'avatar', 'analysis'];
    for (const mode of obsModes) {
      const obsPage = await context.newPage();
      await obsPage.goto(`http://localhost:3002/obs?mode=${mode}`, { 
        waitUntil: 'domcontentloaded' 
      });
      obsPages.push(obsPage);
    }
    
    const concurrentLoadTime = Date.now() - concurrentStartTime;
    testResults.performance.concurrentViews = {
      count: obsPages.length,
      totalTime: concurrentLoadTime,
      averageTime: concurrentLoadTime / obsPages.length,
      status: concurrentLoadTime < 5000 ? 'good' : concurrentLoadTime < 10000 ? 'acceptable' : 'slow'
    };
    console.log(`✅ Loaded ${obsPages.length} OBS views in ${concurrentLoadTime}ms`);
    
    // 各ページのメモリ使用量を測定
    for (let i = 0; i < obsPages.length; i++) {
      const pageMetrics = await obsPages[i].metrics();
      console.log(`   ${obsModes[i]} view: ${(pageMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // OBSページを閉じる
    for (const obsPage of obsPages) {
      await obsPage.close();
    }

    // 6. ストレステスト - 連続メッセージ送信
    console.log('\n📏 Stress Test - Rapid Message Sending...');
    const stressMessages = 10;
    const stressStartTime = Date.now();
    
    for (let i = 0; i < stressMessages; i++) {
      if (chatInput && sendButton) {
        await chatInput.fill(`Stress test message ${i + 1}`);
        await sendButton.click();
        await page.waitForTimeout(100); // 短い間隔で送信
      }
    }
    
    const stressTime = Date.now() - stressStartTime;
    testResults.performance.stressTest = {
      messageCount: stressMessages,
      totalTime: stressTime,
      averageTime: stressTime / stressMessages,
      status: stressTime / stressMessages < 500 ? 'good' : 'acceptable'
    };
    console.log(`✅ Sent ${stressMessages} messages in ${stressTime}ms`);

    // 7. ネットワーク統計
    console.log('\n📏 Network Statistics...');
    const requests = [];
    page.on('request', request => requests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType()
    }));
    
    await page.reload({ waitUntil: 'networkidle' });
    
    testResults.performance.network = {
      totalRequests: requests.length,
      byType: {}
    };
    
    requests.forEach(req => {
      testResults.performance.network.byType[req.resourceType] = 
        (testResults.performance.network.byType[req.resourceType] || 0) + 1;
    });
    
    console.log(`✅ Total network requests: ${requests.length}`);
    console.log('   By type:', testResults.performance.network.byType);

    // 8. 最終的なパフォーマンススコア計算
    const performanceScores = Object.values(testResults.performance)
      .filter(p => p.status)
      .map(p => p.status === 'good' ? 100 : p.status === 'acceptable' ? 70 : 40);
    
    const averageScore = performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length;
    
    testResults.summary = {
      totalTests: performanceScores.length,
      averageScore: averageScore.toFixed(1),
      grade: averageScore >= 85 ? 'A' : averageScore >= 70 ? 'B' : averageScore >= 55 ? 'C' : 'D',
      recommendation: averageScore >= 70 ? 
        'Performance is satisfactory for production use.' : 
        'Performance optimization recommended before production deployment.'
    };

    // HTMLレポート生成
    console.log('\n📝 Generating HTML Report...');
    const htmlReport = generateHTMLReport(testResults);
    fs.writeFileSync('performance-report.html', htmlReport);
    console.log('✅ Report saved as performance-report.html');

    // JSONレポートも保存
    fs.writeFileSync('performance-report.json', JSON.stringify(testResults, null, 2));
    console.log('✅ Raw data saved as performance-report.json');

    // コンソールサマリー
    console.log('\n📊 Performance Test Summary:');
    console.log(`   Overall Grade: ${testResults.summary.grade}`);
    console.log(`   Average Score: ${testResults.summary.averageScore}/100`);
    console.log(`   ${testResults.summary.recommendation}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    testResults.error = error.message;
  } finally {
    await browser.close();
  }
}

function generateHTMLReport(results) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIVlingual Performance Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #4ECDC4;
            padding-bottom: 10px;
        }
        .grade {
            font-size: 72px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            color: ${results.summary.grade === 'A' ? '#4CAF50' : 
                    results.summary.grade === 'B' ? '#8BC34A' : 
                    results.summary.grade === 'C' ? '#FFC107' : '#FF5722'};
        }
        .metric {
            background: #f8f9fa;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .metric-name {
            font-weight: 600;
        }
        .metric-value {
            font-size: 18px;
        }
        .status-good { color: #4CAF50; }
        .status-acceptable { color: #FFC107; }
        .status-slow { color: #FF5722; }
        .status-failed { color: #F44336; }
        .timestamp {
            color: #666;
            font-size: 14px;
            text-align: right;
            margin-top: 20px;
        }
        .recommendation {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #2196F3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 AIVlingual Performance Report</h1>
        
        <div class="grade">${results.summary.grade}</div>
        <p style="text-align: center; font-size: 24px; color: #666;">
            Score: ${results.summary.averageScore}/100
        </p>
        
        <div class="recommendation">
            <strong>Recommendation:</strong> ${results.summary.recommendation}
        </div>
        
        <h2>Performance Metrics</h2>
        
        <div class="metric">
            <span class="metric-name">Initial Load Time</span>
            <span class="metric-value status-${results.performance.initialLoad.status}">
                ${results.performance.initialLoad.time}ms
            </span>
        </div>
        
        <div class="metric">
            <span class="metric-name">WebSocket Connection</span>
            <span class="metric-value status-${results.performance.websocketConnection.status}">
                ${results.performance.websocketConnection.time}ms
            </span>
        </div>
        
        <div class="metric">
            <span class="metric-name">AI Response Time</span>
            <span class="metric-value status-${results.performance.aiResponse.status}">
                ${results.performance.aiResponse.time > 0 ? results.performance.aiResponse.time + 'ms' : 'Failed'}
            </span>
        </div>
        
        <div class="metric">
            <span class="metric-name">Memory Usage</span>
            <span class="metric-value status-${results.performance.memory.status}">
                ${results.performance.memory.heapSizeMB} MB
            </span>
        </div>
        
        <div class="metric">
            <span class="metric-name">Concurrent OBS Views</span>
            <span class="metric-value status-${results.performance.concurrentViews.status}">
                ${results.performance.concurrentViews.count} views in ${results.performance.concurrentViews.totalTime}ms
            </span>
        </div>
        
        <div class="metric">
            <span class="metric-name">Stress Test (${results.performance.stressTest.messageCount} messages)</span>
            <span class="metric-value status-${results.performance.stressTest.status}">
                ${results.performance.stressTest.averageTime.toFixed(0)}ms/msg
            </span>
        </div>
        
        <h2>Network Statistics</h2>
        <div class="metric">
            <span class="metric-name">Total Requests</span>
            <span class="metric-value">${results.performance.network.totalRequests}</span>
        </div>
        ${Object.entries(results.performance.network.byType).map(([type, count]) => `
        <div class="metric">
            <span class="metric-name">${type}</span>
            <span class="metric-value">${count}</span>
        </div>
        `).join('')}
        
        <div class="timestamp">
            Generated at: ${new Date(results.timestamp).toLocaleString('ja-JP')}
        </div>
    </div>
</body>
</html>
  `;
}

// スクリーンショット保存用ディレクトリの作成
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots');
}

// テスト実行
testPerformanceAndReport().catch(console.error);