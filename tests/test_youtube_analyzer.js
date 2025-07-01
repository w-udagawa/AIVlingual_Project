const { chromium } = require('playwright');

async function testYouTubeAnalyzer() {
  console.log('🎥 AIVlingual YouTube Analyzer Test');
  
  const browser = await chromium.launch({ 
    headless: false 
  });
  
  const context = await browser.newContext({
    locale: 'ja-JP'
  });
  
  const page = await context.newPage();

  // APIレスポンスの監視
  const apiResponses = [];
  page.on('response', response => {
    if (response.url().includes('/api/') && response.url().includes('youtube')) {
      apiResponses.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    }
  });

  try {
    // アプリケーションを開く
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    console.log('✅ Application loaded');

    // 動画解析タブを探してクリック
    console.log('\n📋 Testing YouTube Video Analyzer...');
    
    const videoTab = await page.$('button:has-text("動画解析"), button:has-text("Video"), [role="tab"]:has-text("動画"), button:has-text("YouTube")');
    if (videoTab) {
      await videoTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Clicked video analyzer tab');
    } else {
      console.log('❌ Video analyzer tab not found');
      return;
    }

    // テスト用のYouTube URL
    const testVideos = [
      {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Test video 1',
        hasTranscript: true
      },
      {
        url: 'https://youtu.be/dQw4w9WgXcQ',
        title: 'Test video 2 (short URL)',
        hasTranscript: true
      },
      {
        url: 'https://www.youtube.com/watch?v=invalid_id',
        title: 'Invalid video',
        hasTranscript: false,
        expectError: true
      }
    ];

    for (const video of testVideos) {
      console.log(`\n🎬 Testing: ${video.title}`);
      
      // URL入力フィールドを探す
      const urlInput = await page.$('input[placeholder*="YouTube"], input[placeholder*="URL"], input[type="url"]');
      if (!urlInput) {
        console.log('❌ URL input field not found');
        continue;
      }

      // URLを入力
      await urlInput.fill('');
      await urlInput.type(video.url);
      console.log(`✅ Entered URL: ${video.url}`);

      // スクリーンショット
      await page.screenshot({ 
        path: `test-screenshots/youtube-input-${video.title.replace(/\s+/g, '-')}.png` 
      });

      // 解析ボタンを探す
      const analyzeButton = await page.$('button:has-text("解析"), button:has-text("Extract"), button:has-text("分析"), button[type="submit"]');
      if (!analyzeButton) {
        console.log('❌ Analyze button not found');
        continue;
      }

      // APIレスポンスを記録
      const responsesBefore = apiResponses.length;

      // 解析を実行
      await analyzeButton.click();
      console.log('✅ Clicked analyze button');

      // 処理の完了を待つ
      try {
        if (video.expectError) {
          // エラーメッセージを待つ
          await page.waitForSelector('[class*="error"], [class*="alert"], [role="alert"]', { 
            timeout: 10000 
          });
          console.log('✅ Error message displayed as expected');
        } else {
          // 結果の表示を待つ
          await page.waitForSelector('[class*="result"], [class*="vocabulary"], [class*="extracted"]', { 
            timeout: 15000 
          });
          console.log('✅ Analysis results displayed');
        }
      } catch (e) {
        console.log('⚠️ Timeout waiting for results');
      }

      // APIレスポンスを確認
      const newResponses = apiResponses.slice(responsesBefore);
      if (newResponses.length > 0) {
        console.log('📡 API calls made:');
        newResponses.forEach(resp => {
          console.log(`   ${resp.method} ${resp.url} - Status: ${resp.status}`);
        });
      }

      // 結果のスクリーンショット
      await page.screenshot({ 
        path: `test-screenshots/youtube-result-${video.title.replace(/\s+/g, '-')}.png` 
      });

      // 抽出された語彙を確認
      if (!video.expectError) {
        const vocabularyItems = await page.$$('[class*="vocabulary-item"], [class*="word"], [class*="expression"]');
        console.log(`✅ Extracted vocabulary items: ${vocabularyItems.length}`);

        // 最初の数個の語彙を表示
        for (let i = 0; i < Math.min(3, vocabularyItems.length); i++) {
          const text = await vocabularyItems[i].textContent();
          console.log(`   - ${text}`);
        }
      }

      await page.waitForTimeout(2000);
    }

    // バッチ処理のテスト
    console.log('\n📋 Testing Batch Processing...');
    
    // バッチ処理のUIを探す
    const batchButton = await page.$('button:has-text("バッチ"), button:has-text("Batch"), button:has-text("複数")');
    if (batchButton) {
      await batchButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Opened batch processing');

      // 複数URLの入力フィールドを探す
      const batchInput = await page.$('textarea[placeholder*="URL"], textarea[placeholder*="複数"]');
      if (batchInput) {
        const batchUrls = [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://www.youtube.com/watch?v=oHg5SJYRHA0',
          'https://www.youtube.com/watch?v=9bZkp7q19f0'
        ].join('\n');

        await batchInput.fill(batchUrls);
        console.log('✅ Entered multiple URLs');

        // バッチ処理を開始
        const startBatchButton = await page.$('button:has-text("開始"), button:has-text("Start"), button:has-text("処理")');
        if (startBatchButton) {
          await startBatchButton.click();
          console.log('✅ Started batch processing');

          // プログレスバーまたは状態表示を待つ
          try {
            await page.waitForSelector('[class*="progress"], [class*="status"], [class*="processing"]', { 
              timeout: 5000 
            });
            console.log('✅ Batch processing in progress');
          } catch (e) {
            console.log('⚠️ Progress indicator not found');
          }

          await page.screenshot({ 
            path: 'test-screenshots/youtube-batch-processing.png' 
          });
        }
      }
    } else {
      console.log('⚠️ Batch processing not found');
    }

    // Notion同期機能のテスト
    console.log('\n📋 Testing Notion Sync...');
    
    const notionButton = await page.$('button:has-text("Notion"), button:has-text("同期"), button:has-text("Sync")');
    if (notionButton) {
      const isDisabled = await notionButton.isDisabled();
      console.log(`✅ Notion sync button found (${isDisabled ? 'disabled' : 'enabled'})`);
      
      if (!isDisabled) {
        await notionButton.click();
        console.log('✅ Triggered Notion sync');
        
        // 同期結果を待つ
        try {
          await page.waitForSelector('[class*="success"], [class*="synced"], [class*="完了"]', { 
            timeout: 10000 
          });
          console.log('✅ Notion sync completed');
        } catch (e) {
          console.log('⚠️ Notion sync result not displayed');
        }
      }
    }

    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-screenshots/youtube-final.png',
      fullPage: true 
    });

    // API統計
    console.log('\n📊 API Call Statistics:');
    const apiStats = {};
    apiResponses.forEach(resp => {
      const endpoint = resp.url.split('?')[0].split('/').pop();
      apiStats[endpoint] = (apiStats[endpoint] || 0) + 1;
    });
    Object.entries(apiStats).forEach(([endpoint, count]) => {
      console.log(`   ${endpoint}: ${count} calls`);
    });

    console.log('\n✅ YouTube Analyzer tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ 
      path: 'test-screenshots/youtube-error.png',
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
testYouTubeAnalyzer().catch(console.error);