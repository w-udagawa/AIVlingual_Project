const { chromium } = require('playwright');

async function showAPIDocs() {
    console.log('📚 AIVlingual API ドキュメントを表示します...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
        viewport: null,
        locale: 'ja-JP'
    });
    
    const page = await context.newPage();
    
    // FastAPI の Swagger UI ドキュメントを開く
    console.log('📍 API ドキュメントページを開いています...');
    await page.goto('http://localhost:8000/docs', { waitUntil: 'networkidle' });
    
    console.log('⏳ ページの読み込みを待っています...');
    await page.waitForTimeout(2000);
    
    // スクリーンショットを撮影
    await page.screenshot({ path: 'api_docs.png', fullPage: true });
    console.log('📸 スクリーンショットを保存しました: api_docs.png');
    
    console.log('\n✅ API ドキュメントが開きました。');
    console.log('\n📝 手動でテストする手順:');
    console.log('1. /api/v1/auth/register で新規ユーザー登録');
    console.log('2. /api/v1/auth/login でログイン');
    console.log('3. 取得したトークンを "Authorize" ボタンから設定');
    console.log('4. /api/v1/youtube/extract-vocabulary で動画から語彙抽出');
    console.log('   テスト動画URL: https://youtu.be/fH52x36P-L4');
    console.log('5. /api/v1/vocabulary/export/* でエクスポート機能をテスト\n');
    
    console.log('ℹ️ テストが完了したら、ブラウザを閉じてください。\n');
    
    // ブラウザが閉じられるまで待機
    await page.waitForEvent('close', { timeout: 0 });
    
    await browser.close();
    console.log('👋 ブラウザを閉じました。');
}

showAPIDocs().catch(console.error);