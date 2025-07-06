const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// テスト設定
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3002',
  timeout: 30000,
  resultDir: 'test-results/performance',
  scenarios: {
    light: { messages: 10, users: 1 },
    medium: { messages: 50, users: 3 },
    heavy: { messages: 100, users: 5 }
  }
};

// パフォーマンスメトリクス収集
class PerformanceCollector {
  constructor() {
    this.metrics = {
      pageLoad: [],
      wsConnection: [],
      aiResponse: [],
      memory: [],
      cpu: [],
      rendering: []
    };
  }

  addMetric(type, value) {
    if (this.metrics[type]) {
      this.metrics[type].push(value);
    }
  }

  getStats(type) {
    const values = this.metrics[type];
    if (!values || values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  getAllStats() {
    const stats = {};
    for (const type in this.metrics) {
      stats[type] = this.getStats(type);
    }
    return stats;
  }
}

// パフォーマンス監視の設定
async function setupPerformanceMonitoring(page) {
  await page.evaluateOnNewDocument(() => {
    window.__performance = {
      marks: {},
      measures: [],
      resources: []
    };

    // パフォーマンスマークの記録
    const originalMark = performance.mark.bind(performance);
    performance.mark = function(name) {
      window.__performance.marks[name] = performance.now();
      return originalMark(name);
    };

    // リソースタイミングの監視
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__performance.resources.push({
          name: entry.name,
          type: entry.entryType,
          duration: entry.duration,
          size: entry.transferSize || 0
        });
      }
    });
    observer.observe({ entryTypes: ['resource', 'navigation', 'paint'] });

    // メモリ監視
    if (performance.memory) {
      setInterval(() => {
        window.__performance.currentMemory = {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }, 1000);
    }
  });
}

// CPU使用率の推定（レンダリング時間から）
async function estimateCPUUsage(page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const measurements = [];
      let frameCount = 0;
      const startTime = performance.now();
      
      function measureFrame() {
        const frameStart = performance.now();
        
        requestAnimationFrame(() => {
          const frameDuration = performance.now() - frameStart;
          measurements.push(frameDuration);
          frameCount++;
          
          if (frameCount < 60) { // 60フレーム測定
            measureFrame();
          } else {
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const avgFrameTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
            const targetFrameTime = 16.67; // 60 FPS
            const cpuUsage = Math.min(100, (avgFrameTime / targetFrameTime) * 100);
            
            resolve({
              cpuUsage: cpuUsage.toFixed(2),
              avgFrameTime: avgFrameTime.toFixed(2),
              fps: (1000 / avgFrameTime).toFixed(2)
            });
          }
        });
      }
      
      measureFrame();
    });
  });
}

// 長時間実行テスト
async function longRunningTest(page, durationMinutes) {
  const startTime = Date.now();
  const endTime = startTime + (durationMinutes * 60 * 1000);
  const measurements = [];
  
  while (Date.now() < endTime) {
    // メモリ測定
    const memory = await page.evaluate(() => {
      return performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      } : null;
    });
    
    // CPU推定
    const cpu = await estimateCPUUsage(page);
    
    measurements.push({
      timestamp: Date.now() - startTime,
      memory,
      cpu
    });
    
    // 30秒ごとに測定
    await page.waitForTimeout(30000);
  }
  
  return measurements;
}

async function testPerformanceAdvanced() {
  console.log('🚀 AIVlingual Advanced Performance Test Suite\n');
  
  // 結果ディレクトリ作成
  if (!fs.existsSync(TEST_CONFIG.resultDir)) {
    fs.mkdirSync(TEST_CONFIG.resultDir, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--enable-precise-memory-info'
    ]
  });

  const collector = new PerformanceCollector();
  const testResults = {
    timestamp: new Date().toISOString(),
    environment: {
      url: TEST_CONFIG.baseUrl,
      userAgent: '',
      viewport: {}
    },
    scenarios: {},
    longRunning: null,
    recommendations: []
  };

  try {
    // Test 1: コールドスタート vs ウォームスタート
    console.log('📋 Test 1: Cold Start vs Warm Start Performance');
    
    // コールドスタート
    const coldContext = await browser.newContext();
    const coldPage = await coldContext.newPage();
    await setupPerformanceMonitoring(coldPage);
    
    const coldStartTime = Date.now();
    await coldPage.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    const coldLoadTime = Date.now() - coldStartTime;
    collector.addMetric('pageLoad', coldLoadTime);
    console.log(`  Cold start: ${coldLoadTime}ms`);
    
    // ウォームスタート（リロード）
    const warmStartTime = Date.now();
    await coldPage.reload({ waitUntil: 'networkidle' });
    const warmLoadTime = Date.now() - warmStartTime;
    collector.addMetric('pageLoad', warmLoadTime);
    console.log(`  Warm start: ${warmLoadTime}ms`);
    console.log(`  Cache benefit: ${((1 - warmLoadTime/coldLoadTime) * 100).toFixed(1)}%`);
    
    testResults.environment.userAgent = await coldPage.evaluate(() => navigator.userAgent);
    testResults.environment.viewport = coldPage.viewportSize();
    
    await coldContext.close();

    // Test 2: 各シナリオでの負荷テスト
    for (const [scenarioName, config] of Object.entries(TEST_CONFIG.scenarios)) {
      console.log(`\n📋 Test 2.${scenarioName}: ${scenarioName.toUpperCase()} Load Scenario`);
      console.log(`  Messages: ${config.messages}, Concurrent users: ${config.users}`);
      
      const contexts = [];
      const pages = [];
      
      // 複数ユーザーをシミュレート
      for (let i = 0; i < config.users; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await setupPerformanceMonitoring(page);
        await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
        
        contexts.push(context);
        pages.push(page);
      }
      
      // WebSocket接続時間測定
      const wsConnectionTimes = await Promise.all(pages.map(async (page) => {
        const startTime = Date.now();
        await page.waitForFunction(() => {
          const statusElements = document.querySelectorAll('[class*="connection"], [class*="status"]');
          return statusElements.length > 0;
        }, { timeout: 5000 }).catch(() => {});
        return Date.now() - startTime;
      }));
      
      wsConnectionTimes.forEach(time => collector.addMetric('wsConnection', time));
      console.log(`  Avg WebSocket connection: ${(wsConnectionTimes.reduce((a, b) => a + b, 0) / wsConnectionTimes.length).toFixed(0)}ms`);
      
      // メッセージ送信とレスポンス測定
      const messagePromises = [];
      const messagesPerUser = Math.floor(config.messages / config.users);
      
      for (let userIdx = 0; userIdx < pages.length; userIdx++) {
        const page = pages[userIdx];
        
        for (let msgIdx = 0; msgIdx < messagesPerUser; msgIdx++) {
          messagePromises.push((async () => {
            const input = await page.$('input[type="text"], textarea');
            if (!input) return null;
            
            const message = `User ${userIdx + 1} - Message ${msgIdx + 1}`;
            await input.fill(message);
            
            const startTime = Date.now();
            await page.keyboard.press('Enter');
            
            // AI応答を待つ
            try {
              await page.waitForFunction(() => {
                const messages = Array.from(document.querySelectorAll('[class*="message"]'));
                return messages.some(msg => msg.textContent && !msg.textContent.includes('送信しました'));
              }, { timeout: 10000 });
              
              const responseTime = Date.now() - startTime;
              return responseTime;
            } catch (e) {
              return null;
            }
          })());
          
          // 負荷分散のため少し待つ
          await page.waitForTimeout(Math.random() * 1000);
        }
      }
      
      const responseTimes = (await Promise.all(messagePromises)).filter(t => t !== null);
      responseTimes.forEach(time => collector.addMetric('aiResponse', time));
      
      // メモリとCPU測定
      for (const page of pages) {
        const memory = await page.evaluate(() => {
          return performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
        });
        collector.addMetric('memory', memory);
        
        const cpu = await estimateCPUUsage(page);
        collector.addMetric('cpu', parseFloat(cpu.cpuUsage));
      }
      
      // リソース使用状況
      const resourceStats = await pages[0].evaluate(() => {
        return window.__performance.resources.reduce((acc, resource) => {
          const type = resource.name.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)?.[1] || 'other';
          if (!acc[type]) acc[type] = { count: 0, size: 0 };
          acc[type].count++;
          acc[type].size += resource.size;
          return acc;
        }, {});
      });
      
      testResults.scenarios[scenarioName] = {
        config,
        metrics: {
          aiResponse: collector.getStats('aiResponse'),
          memory: collector.getStats('memory'),
          cpu: collector.getStats('cpu')
        },
        resources: resourceStats
      };
      
      console.log(`  Completed: ${responseTimes.length}/${config.messages} messages`);
      console.log(`  Avg response time: ${(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(0)}ms`);
      
      // クリーンアップ
      for (const context of contexts) {
        await context.close();
      }
    }

    // Test 3: 長時間実行テスト（2分間）
    console.log('\n📋 Test 3: Long Running Stability Test (2 minutes)');
    const stabilityContext = await browser.newContext();
    const stabilityPage = await stabilityContext.newPage();
    await stabilityPage.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    
    console.log('  Running stability test...');
    const longRunningResults = await longRunningTest(stabilityPage, 2);
    testResults.longRunning = longRunningResults;
    
    // メモリリークチェック
    const memoryGrowth = longRunningResults[longRunningResults.length - 1].memory.used - 
                        longRunningResults[0].memory.used;
    const memoryGrowthRate = (memoryGrowth / longRunningResults[0].memory.used) * 100;
    
    console.log(`  Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB (${memoryGrowthRate.toFixed(1)}%)`);
    
    if (memoryGrowthRate > 20) {
      testResults.recommendations.push('⚠️ Potential memory leak detected - memory grew by more than 20%');
    }
    
    await stabilityContext.close();

    // Test 4: 同時複数ビューのパフォーマンス
    console.log('\n📋 Test 4: Multiple OBS Views Performance');
    const obsContexts = [];
    const obsPages = [];
    const obsModes = ['subtitle', 'chat', 'educational', 'avatar', 'analysis'];
    
    const obsStartTime = Date.now();
    for (const mode of obsModes) {
      const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
      const page = await context.newPage();
      await page.goto(`${TEST_CONFIG.baseUrl}/obs?mode=${mode}`, { waitUntil: 'networkidle' });
      
      obsContexts.push(context);
      obsPages.push(page);
    }
    const obsLoadTime = Date.now() - obsStartTime;
    
    // 各ビューのメモリ使用量
    const obsMemory = await Promise.all(obsPages.map(async (page) => {
      return await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
      });
    }));
    
    console.log(`  Loaded ${obsModes.length} views in ${obsLoadTime}ms`);
    console.log(`  Total memory: ${obsMemory.reduce((a, b) => a + b, 0).toFixed(2)}MB`);
    console.log(`  Avg memory per view: ${(obsMemory.reduce((a, b) => a + b, 0) / obsMemory.length).toFixed(2)}MB`);
    
    // クリーンアップ
    for (const context of obsContexts) {
      await context.close();
    }

    // 統計サマリー
    const allStats = collector.getAllStats();
    
    // 推奨事項の生成
    if (allStats.aiResponse?.p95 > 3000) {
      testResults.recommendations.push('⚠️ AI response time P95 exceeds 3 seconds - consider optimization');
    }
    if (allStats.memory?.avg > 100) {
      testResults.recommendations.push('⚠️ Average memory usage exceeds 100MB - review memory management');
    }
    if (allStats.cpu?.avg > 80) {
      testResults.recommendations.push('⚠️ High CPU usage detected - optimize rendering and computations');
    }
    if (allStats.pageLoad?.avg > 3000) {
      testResults.recommendations.push('⚠️ Page load time exceeds 3 seconds - optimize initial load');
    }

    // 結果の保存
    testResults.summary = allStats;
    
    // JSONレポート保存
    fs.writeFileSync(
      path.join(TEST_CONFIG.resultDir, 'performance-advanced.json'),
      JSON.stringify(testResults, null, 2)
    );
    
    // CSVレポート生成
    generateCSVReport(testResults);
    
    // コンソールサマリー
    console.log('\n📊 Performance Test Summary:');
    console.log('\n🎯 Key Metrics (averages):');
    console.log(`  Page Load: ${allStats.pageLoad?.avg?.toFixed(0)}ms`);
    console.log(`  WebSocket: ${allStats.wsConnection?.avg?.toFixed(0)}ms`);
    console.log(`  AI Response: ${allStats.aiResponse?.avg?.toFixed(0)}ms`);
    console.log(`  Memory Usage: ${allStats.memory?.avg?.toFixed(2)}MB`);
    console.log(`  CPU Usage: ${allStats.cpu?.avg?.toFixed(2)}%`);
    
    console.log('\n📈 95th Percentile:');
    console.log(`  AI Response P95: ${allStats.aiResponse?.p95?.toFixed(0)}ms`);
    console.log(`  Memory P95: ${allStats.memory?.p95?.toFixed(2)}MB`);
    
    if (testResults.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      testResults.recommendations.forEach(rec => console.log(`  ${rec}`));
    } else {
      console.log('\n✅ All performance metrics are within acceptable ranges!');
    }
    
    console.log(`\n📁 Detailed results saved to: ${TEST_CONFIG.resultDir}/`);

  } catch (error) {
    console.error('❌ Advanced performance test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// CSV レポート生成
function generateCSVReport(results) {
  const csvLines = ['Metric,Min,Max,Average,Median,P95,P99'];
  
  for (const [metric, stats] of Object.entries(results.summary)) {
    if (stats) {
      csvLines.push(
        `${metric},${stats.min?.toFixed(2)},${stats.max?.toFixed(2)},` +
        `${stats.avg?.toFixed(2)},${stats.median?.toFixed(2)},` +
        `${stats.p95?.toFixed(2)},${stats.p99?.toFixed(2)}`
      );
    }
  }
  
  fs.writeFileSync(
    path.join(TEST_CONFIG.resultDir, 'performance-metrics.csv'),
    csvLines.join('\n')
  );
}

// テスト実行
testPerformanceAdvanced().catch(console.error);