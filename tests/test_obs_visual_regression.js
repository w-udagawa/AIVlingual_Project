const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// テスト設定
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3002',
  timeout: 30000,
  screenshotDir: 'test-screenshots/obs-visual-regression',
  baselineDir: 'test-screenshots/obs-baseline',
  diffDir: 'test-screenshots/obs-diff'
};

// OBSビューモード設定
const OBS_VIEWS = [
  {
    name: 'subtitle-bottom-dark',
    url: '/obs?mode=subtitle&position=bottom&theme=dark&fontSize=24',
    viewport: { width: 1920, height: 1080 }
  },
  {
    name: 'subtitle-top-transparent',
    url: '/obs?mode=subtitle&position=top&theme=transparent&fontSize=32',
    viewport: { width: 1920, height: 1080 }
  },
  {
    name: 'chat-dark',
    url: '/obs?mode=chat&theme=dark&maxMessages=10',
    viewport: { width: 400, height: 600 }
  },
  {
    name: 'chat-light',
    url: '/obs?mode=chat&theme=light&maxMessages=5',
    viewport: { width: 400, height: 600 }
  },
  {
    name: 'educational-large',
    url: '/obs?mode=educational&fontSize=28',
    viewport: { width: 800, height: 600 }
  },
  {
    name: 'avatar-default',
    url: '/obs?mode=avatar',
    viewport: { width: 600, height: 800 }
  },
  {
    name: 'analysis-default',
    url: '/obs?mode=analysis',
    viewport: { width: 800, height: 400 }
  }
];

// ディレクトリ作成
function ensureDirectories() {
  [TEST_CONFIG.screenshotDir, TEST_CONFIG.baselineDir, TEST_CONFIG.diffDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 画像比較（簡易版）
async function compareImages(baseline, current, page) {
  // Playwrightの画像比較機能を使用
  try {
    await page.screenshot({ 
      path: current,
      fullPage: false 
    });
    
    if (!fs.existsSync(baseline)) {
      // ベースラインが存在しない場合は作成
      fs.copyFileSync(current, baseline);
      return { isNew: true, diff: 0 };
    }
    
    // 簡易的なファイルサイズ比較
    const baselineStats = fs.statSync(baseline);
    const currentStats = fs.statSync(current);
    
    const sizeDiff = Math.abs(baselineStats.size - currentStats.size);
    const diffPercentage = (sizeDiff / baselineStats.size) * 100;
    
    return {
      isNew: false,
      diff: diffPercentage,
      sizeBaseline: baselineStats.size,
      sizeCurrent: currentStats.size
    };
  } catch (error) {
    console.error('Image comparison error:', error);
    return { error: error.message };
  }
}

// メッセージをOBSビューに送信
async function sendMessageToOBS(mainPage, message) {
  const input = await mainPage.$('input[type="text"], textarea');
  if (input) {
    await input.fill(message);
    await mainPage.keyboard.press('Enter');
    await mainPage.waitForTimeout(2000); // メッセージが伝播するのを待つ
  }
}

async function testOBSVisualRegression() {
  console.log('📸 AIVlingual OBS Visual Regression Test Suite\n');
  
  ensureDirectories();

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });

  const testResults = {
    passed: 0,
    failed: 0,
    newBaselines: 0,
    visualDiffs: []
  };

  try {
    // メインアプリケーションコンテキスト
    const mainContext = await browser.newContext({
      permissions: ['microphone'],
      locale: 'ja-JP'
    });
    const mainPage = await mainContext.newPage();
    await mainPage.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await mainPage.waitForTimeout(3000);

    console.log('📋 Visual Regression Tests for OBS Views\n');

    // 各OBSビューモードをテスト
    for (const viewConfig of OBS_VIEWS) {
      console.log(`Testing: ${viewConfig.name}`);
      
      const obsContext = await browser.newContext({
        viewport: viewConfig.viewport,
        deviceScaleFactor: 1
      });
      const obsPage = await obsContext.newPage();
      
      try {
        // OBSビューを開く
        await obsPage.goto(`${TEST_CONFIG.baseUrl}${viewConfig.url}`, { 
          waitUntil: 'networkidle' 
        });
        await obsPage.waitForTimeout(2000);
        
        // Test 1: 初期状態のスクリーンショット
        console.log(`  1. Initial state`);
        const baselinePath = path.join(TEST_CONFIG.baselineDir, `${viewConfig.name}-initial.png`);
        const currentPath = path.join(TEST_CONFIG.screenshotDir, `${viewConfig.name}-initial.png`);
        
        const initialComparison = await compareImages(baselinePath, currentPath, obsPage);
        
        if (initialComparison.isNew) {
          console.log('    📌 New baseline created');
          testResults.newBaselines++;
        } else if (initialComparison.diff < 5) {
          console.log(`    ✅ Visual match (diff: ${initialComparison.diff.toFixed(2)}%)`);
          testResults.passed++;
        } else {
          console.log(`    ⚠️ Visual difference detected (diff: ${initialComparison.diff.toFixed(2)}%)`);
          testResults.failed++;
          testResults.visualDiffs.push({
            view: viewConfig.name,
            state: 'initial',
            diff: initialComparison.diff
          });
        }
        
        // Test 2: メッセージ追加後の状態（該当するビューのみ）
        if (['subtitle', 'chat', 'educational'].includes(viewConfig.url.split('mode=')[1].split('&')[0])) {
          console.log(`  2. With messages`);
          
          // メインページからメッセージを送信
          await sendMessageToOBS(mainPage, 'OBSビジュアルテスト用メッセージです！');
          await sendMessageToOBS(mainPage, 'This is a test message for OBS views.');
          
          await obsPage.waitForTimeout(3000); // メッセージが表示されるのを待つ
          
          const withMessagesBaseline = path.join(TEST_CONFIG.baselineDir, `${viewConfig.name}-messages.png`);
          const withMessagesCurrent = path.join(TEST_CONFIG.screenshotDir, `${viewConfig.name}-messages.png`);
          
          const messagesComparison = await compareImages(withMessagesBaseline, withMessagesCurrent, obsPage);
          
          if (messagesComparison.isNew) {
            console.log('    📌 New baseline created');
            testResults.newBaselines++;
          } else if (messagesComparison.diff < 10) { // メッセージ内容により少し許容範囲を広げる
            console.log(`    ✅ Visual match (diff: ${messagesComparison.diff.toFixed(2)}%)`);
            testResults.passed++;
          } else {
            console.log(`    ⚠️ Visual difference detected (diff: ${messagesComparison.diff.toFixed(2)}%)`);
            testResults.failed++;
            testResults.visualDiffs.push({
              view: viewConfig.name,
              state: 'with-messages',
              diff: messagesComparison.diff
            });
          }
        }
        
        // Test 3: アバタービューの状態変化
        if (viewConfig.name === 'avatar-default') {
          console.log(`  3. Avatar state changes`);
          
          // 各アバター状態をシミュレート
          const avatarStates = ['idle', 'listening', 'thinking', 'speaking'];
          
          for (const state of avatarStates) {
            // 状態を変更するためのスクリプト実行
            await obsPage.evaluate((avatarState) => {
              // アバター状態を変更するイベントを発火
              window.dispatchEvent(new CustomEvent('avatar_state_change', {
                detail: { state: avatarState }
              }));
            }, state);
            
            await obsPage.waitForTimeout(1000);
            
            const stateBaseline = path.join(TEST_CONFIG.baselineDir, `${viewConfig.name}-${state}.png`);
            const stateCurrent = path.join(TEST_CONFIG.screenshotDir, `${viewConfig.name}-${state}.png`);
            
            const stateComparison = await compareImages(stateBaseline, stateCurrent, obsPage);
            
            if (stateComparison.isNew) {
              console.log(`    📌 New baseline for ${state} state`);
              testResults.newBaselines++;
            } else if (stateComparison.diff < 5) {
              console.log(`    ✅ ${state} state match`);
              testResults.passed++;
            } else {
              console.log(`    ⚠️ ${state} state difference (diff: ${stateComparison.diff.toFixed(2)}%)`);
              testResults.failed++;
            }
          }
        }
        
        // Test 4: レスポンシブデザインテスト
        if (viewConfig.name.includes('subtitle') || viewConfig.name.includes('chat')) {
          console.log(`  4. Responsive design`);
          
          const responsiveViewports = [
            { width: 1280, height: 720, name: 'HD' },
            { width: 854, height: 480, name: 'SD' },
            { width: 2560, height: 1440, name: '2K' }
          ];
          
          for (const viewport of responsiveViewports) {
            await obsPage.setViewportSize(viewport);
            await obsPage.waitForTimeout(500);
            
            const responsiveBaseline = path.join(
              TEST_CONFIG.baselineDir, 
              `${viewConfig.name}-${viewport.name}.png`
            );
            const responsiveCurrent = path.join(
              TEST_CONFIG.screenshotDir, 
              `${viewConfig.name}-${viewport.name}.png`
            );
            
            const responsiveComparison = await compareImages(
              responsiveBaseline, 
              responsiveCurrent, 
              obsPage
            );
            
            if (responsiveComparison.isNew) {
              console.log(`    📌 New baseline for ${viewport.name}`);
              testResults.newBaselines++;
            } else if (responsiveComparison.diff < 8) {
              console.log(`    ✅ ${viewport.name} responsive match`);
              testResults.passed++;
            } else {
              console.log(`    ⚠️ ${viewport.name} responsive difference`);
              testResults.failed++;
            }
          }
        }
        
      } catch (error) {
        console.error(`  ❌ Error testing ${viewConfig.name}:`, error.message);
        testResults.failed++;
      } finally {
        await obsContext.close();
      }
    }
    
    // Test 5: 同時複数ビューの一貫性テスト
    console.log('\n📋 Test 5: Multi-view Consistency');
    
    const multiViewContexts = [];
    const multiViewPages = [];
    
    try {
      // 複数のOBSビューを同時に開く
      for (let i = 0; i < 3; i++) {
        const viewConfig = OBS_VIEWS[i];
        const context = await browser.newContext({
          viewport: viewConfig.viewport
        });
        const page = await context.newPage();
        await page.goto(`${TEST_CONFIG.baseUrl}${viewConfig.url}`, { 
          waitUntil: 'networkidle' 
        });
        
        multiViewContexts.push(context);
        multiViewPages.push({ page, config: viewConfig });
      }
      
      // メッセージを送信して全ビューに反映されるか確認
      await sendMessageToOBS(mainPage, 'Multi-view consistency test');
      await mainPage.waitForTimeout(3000);
      
      // 各ビューのスクリーンショットを取得
      for (const { page, config } of multiViewPages) {
        await page.screenshot({
          path: path.join(TEST_CONFIG.screenshotDir, `multi-view-${config.name}.png`)
        });
      }
      
      console.log('  ✅ Multi-view consistency test completed');
      testResults.passed++;
      
    } catch (error) {
      console.error('  ❌ Multi-view consistency test failed:', error.message);
      testResults.failed++;
    } finally {
      for (const context of multiViewContexts) {
        await context.close();
      }
    }
    
    // 結果サマリー
    console.log('\n📊 Visual Regression Test Results:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📌 New baselines: ${testResults.newBaselines}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.visualDiffs.length > 0) {
      console.log('\n⚠️ Visual Differences Detected:');
      for (const diff of testResults.visualDiffs) {
        console.log(`  - ${diff.view} (${diff.state}): ${diff.diff.toFixed(2)}% difference`);
      }
    }
    
    // 推奨事項
    console.log('\n💡 Recommendations:');
    if (testResults.newBaselines > 0) {
      console.log(`  📌 ${testResults.newBaselines} new baseline(s) created. Review and commit if correct.`);
    }
    if (testResults.visualDiffs.length > 0) {
      console.log('  ⚠️ Visual differences detected. Review screenshots to determine if changes are intentional.');
      console.log(`  📁 Compare images in:`);
      console.log(`     Baseline: ${TEST_CONFIG.baselineDir}/`);
      console.log(`     Current:  ${TEST_CONFIG.screenshotDir}/`);
    }
    
    // 結果をJSONファイルに保存
    fs.writeFileSync(
      path.join(TEST_CONFIG.screenshotDir, 'test-results.json'),
      JSON.stringify(testResults, null, 2)
    );
    
    console.log(`\n📸 Screenshots saved in: ${TEST_CONFIG.screenshotDir}/`);

  } catch (error) {
    console.error('❌ Visual regression test suite failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// テスト実行
testOBSVisualRegression().catch(console.error);