const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 AIVlingual Comprehensive Test Suite with Playwright MCP');
console.log('========================================================\n');

// テストスクリプトのリスト
const testScripts = [
  {
    name: 'Basic UI Test',
    file: 'test_aivlingual_mcp.js',
    description: 'Tests basic application functionality and UI elements'
  },
  {
    name: 'Chat E2E Test',
    file: 'test_chat_e2e.js',
    description: 'Tests chat functionality with WebSocket monitoring'
  },
  {
    name: 'Web Speech API Test',
    file: 'test_web_speech.js',
    description: 'Tests speech recognition and synthesis capabilities'
  },
  {
    name: 'OBS Views Test',
    file: 'test_obs_views_detailed.js',
    description: 'Tests all 5 OBS view modes with different configurations'
  },
  {
    name: 'YouTube Analyzer Test',
    file: 'test_youtube_analyzer.js',
    description: 'Tests video analysis and vocabulary extraction features'
  },
  {
    name: 'Performance Test',
    file: 'test_performance_report.js',
    description: 'Measures performance metrics and generates report'
  }
];

// スクリーンショットディレクトリの準備
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots');
}

// テスト結果の記録
const testResults = {
  total: testScripts.length,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

// 各テストを順番に実行
async function runTests() {
  for (const test of testScripts) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log(`   ${test.description}`);
    console.log('   ' + '-'.repeat(60));
    
    const startTime = Date.now();
    
    try {
      // Playwrightがインストールされているか確認
      try {
        execSync('npm list playwright', { stdio: 'ignore' });
      } catch {
        console.log('   ⚠️ Installing Playwright...');
        execSync('npm install playwright', { stdio: 'inherit' });
      }
      
      // テストを実行
      execSync(`node ${test.file}`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      
      const duration = Date.now() - startTime;
      console.log(`   ✅ ${test.name} completed in ${(duration / 1000).toFixed(1)}s`);
      
      testResults.passed++;
      testResults.details.push({
        name: test.name,
        status: 'passed',
        duration: duration
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ ${test.name} failed after ${(duration / 1000).toFixed(1)}s`);
      console.log(`   Error: ${error.message}`);
      
      testResults.failed++;
      testResults.details.push({
        name: test.name,
        status: 'failed',
        duration: duration,
        error: error.message
      });
    }
    
    // テスト間の待機
    console.log('   Waiting before next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// メイン実行
runTests().then(() => {
  // 最終レポート
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Suite Summary');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️ Skipped: ${testResults.skipped}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  // 詳細結果の表示
  console.log('\nDetailed Results:');
  testResults.details.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : '❌';
    const time = (result.duration / 1000).toFixed(1);
    console.log(`${icon} ${result.name.padEnd(30)} ${time}s`);
  });
  
  // 結果をJSONファイルに保存
  fs.writeFileSync(
    'test-results-summary.json', 
    JSON.stringify(testResults, null, 2)
  );
  
  console.log('\n📁 Test artifacts:');
  console.log('   - Screenshots: test-screenshots/');
  console.log('   - Performance report: performance-report.html');
  console.log('   - Test summary: test-results-summary.json');
  
  // 終了コード
  process.exit(testResults.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});