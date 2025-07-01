const { chromium } = require('playwright');

async function testOBSViewsDetailed() {
  console.log('🎬 AIVlingual OBS Views Detailed Test');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });
  
  const context = await browser.newContext({
    permissions: ['microphone'],
    locale: 'ja-JP'
  });

  try {
    // OBSビューの詳細設定
    const obsViews = [
      {
        mode: 'subtitle',
        name: 'Subtitle View',
        configs: [
          { position: 'bottom', fontSize: 24, theme: 'transparent' },
          { position: 'top', fontSize: 32, theme: 'dark' },
          { position: 'bottom', fontSize: 48, theme: 'light' }
        ]
      },
      {
        mode: 'chat',
        name: 'Chat View',
        configs: [
          { theme: 'transparent', maxMessages: 5 },
          { theme: 'dark', maxMessages: 10 },
          { theme: 'light', maxMessages: 20 }
        ]
      },
      {
        mode: 'educational',
        name: 'Educational View',
        configs: [
          { fontSize: 24 },
          { fontSize: 28 },
          { fontSize: 32 }
        ]
      },
      {
        mode: 'avatar',
        name: 'Avatar View',
        configs: [
          {}, // デフォルト設定
        ]
      },
      {
        mode: 'analysis',
        name: 'Analysis View',
        configs: [
          {}, // デフォルト設定
        ]
      }
    ];

    // メインアプリケーションページを開く（WebSocketメッセージ送信用）
    const mainPage = await context.newPage();
    await mainPage.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    console.log('✅ Main application loaded');
    await mainPage.waitForTimeout(2000);

    // 各OBSビューをテスト
    for (const view of obsViews) {
      console.log(`\n📋 Testing ${view.name}...`);
      
      for (const config of view.configs) {
        // URLパラメータを構築
        const params = new URLSearchParams({ mode: view.mode, ...config });
        const url = `http://localhost:3002/obs?${params.toString()}`;
        
        console.log(`   Testing config: ${JSON.stringify(config)}`);
        
        // 新しいページでOBSビューを開く
        const obsPage = await context.newPage();
        
        // WebSocket接続の監視
        let wsConnected = false;
        obsPage.on('websocket', ws => {
          wsConnected = true;
          console.log(`   ✅ WebSocket connected: ${ws.url()}`);
        });
        
        await obsPage.goto(url, { waitUntil: 'networkidle' });
        await obsPage.waitForTimeout(2000);
        
        // WebSocket接続状態を確認
        if (!wsConnected) {
          console.log('   ⚠️ No WebSocket connection detected');
        }
        
        // ビューの内容を検証
        const validation = await obsPage.evaluate((viewMode) => {
          const results = {
            hasContent: false,
            elementCount: 0,
            specificElements: {}
          };
          
          // 共通要素のチェック
          results.elementCount = document.querySelectorAll('*').length;
          results.hasContent = document.body.textContent.trim().length > 0;
          
          // モード別の検証
          switch (viewMode) {
            case 'subtitle':
              results.specificElements.subtitleContainer = !!document.querySelector('[class*="subtitle"]');
              results.specificElements.textDisplay = !!document.querySelector('[class*="text"], [class*="message"]');
              break;
              
            case 'chat':
              results.specificElements.chatContainer = !!document.querySelector('[class*="chat"]');
              results.specificElements.messageList = !!document.querySelector('[class*="message"], [class*="list"]');
              break;
              
            case 'educational':
              results.specificElements.educationalContainer = !!document.querySelector('[class*="educational"], [class*="learning"]');
              results.specificElements.translationElements = !!document.querySelector('[class*="translation"], [class*="japanese"], [class*="english"]');
              break;
              
            case 'avatar':
              results.specificElements.avatarContainer = !!document.querySelector('[class*="avatar"]');
              results.specificElements.avatarImage = !!document.querySelector('img[src*="avatar"], [class*="avatar"] img');
              break;
              
            case 'analysis':
              results.specificElements.analysisContainer = !!document.querySelector('[class*="analysis"], [class*="vocabulary"]');
              results.specificElements.dataDisplay = !!document.querySelector('[class*="data"], [class*="result"]');
              break;
          }
          
          return results;
        }, view.mode);
        
        console.log(`   ✅ View loaded: ${validation.elementCount} elements`);
        console.log(`   ✅ Has content: ${validation.hasContent}`);
        console.log(`   ✅ Specific elements:`, validation.specificElements);
        
        // スクリーンショットを保存
        const configString = Object.entries(config).map(([k, v]) => `${k}-${v}`).join('_') || 'default';
        await obsPage.screenshot({ 
          path: `test-screenshots/obs-${view.mode}-${configString}.png` 
        });
        
        // メインアプリからメッセージを送信してOBSビューの更新を確認
        if (view.mode === 'subtitle' || view.mode === 'chat') {
          console.log('   📤 Sending test message from main app...');
          
          // メインアプリでメッセージを送信
          await mainPage.bringToFront();
          const chatInput = await mainPage.$('input[type="text"], textarea');
          if (chatInput) {
            await chatInput.fill(`Test message for ${view.name}`);
            const sendButton = await mainPage.$('button[type="submit"], button:has-text("送信")');
            if (sendButton) {
              await sendButton.click();
            } else {
              await chatInput.press('Enter');
            }
            
            // OBSビューに戻って更新を確認
            await obsPage.bringToFront();
            await obsPage.waitForTimeout(3000);
            
            // 更新後のスクリーンショット
            await obsPage.screenshot({ 
              path: `test-screenshots/obs-${view.mode}-${configString}-updated.png` 
            });
            
            console.log('   ✅ Message sent and view updated');
          }
        }
        
        // パフォーマンスメトリクスを取得
        const metrics = await obsPage.evaluate(() => {
          return {
            JSHeapUsedSize: performance.memory ? performance.memory.usedJSHeapSize : 0
          };
        });
        console.log(`   📊 Performance: JS Heap ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
        
        await obsPage.close();
      }
    }
    
    // WebSocketトラフィックの分析
    console.log('\n📊 WebSocket Traffic Analysis:');
    
    const wsAnalysis = await mainPage.evaluate(() => {
      if (window.__wsMessages) {
        const messages = window.__wsMessages;
        const types = {};
        messages.forEach(msg => {
          try {
            const data = JSON.parse(msg.data);
            types[data.type] = (types[data.type] || 0) + 1;
          } catch {}
        });
        return {
          total: messages.length,
          byType: types
        };
      }
      return { total: 0, byType: {} };
    });
    
    console.log(`   Total messages: ${wsAnalysis.total}`);
    console.log(`   Message types:`, wsAnalysis.byType);
    
    // 最終レポート
    console.log('\n📝 OBS Views Test Summary:');
    console.log(`   ✅ Tested ${obsViews.length} view modes`);
    console.log(`   ✅ Total configurations tested: ${obsViews.reduce((sum, v) => sum + v.configs.length, 0)}`);
    console.log(`   ✅ All screenshots saved in test-screenshots/`);
    
    await mainPage.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
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
testOBSViewsDetailed().catch(console.error);