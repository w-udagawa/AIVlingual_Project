const { chromium } = require('playwright');

async function showLoginPage() {
    console.log('🌐 AIVlingual ログイン画面を表示します...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
        viewport: null,
        locale: 'ja-JP'
    });
    
    const page = await context.newPage();
    
    // フロントエンドのURLに移動
    console.log('📍 フロントエンドページを開いています...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    // ログイン画面が表示されるまで待機
    console.log('⏳ ページの読み込みを待っています...');
    await page.waitForTimeout(3000);
    
    // スクリーンショットを撮影
    await page.screenshot({ path: 'login_page.png' });
    console.log('📸 スクリーンショットを保存しました: login_page.png');
    
    console.log('\n✅ ブラウザウィンドウが開きました。');
    console.log('ℹ️ ログイン画面で手動でログインしてください。');
    console.log('ℹ️ 完了したら、ブラウザを閉じてください。\n');
    
    // ブラウザが閉じられるまで待機
    await page.waitForEvent('close', { timeout: 0 });
    
    await browser.close();
    console.log('👋 ブラウザを閉じました。');
}

showLoginPage().catch(console.error);