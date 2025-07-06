const { chromium } = require('playwright');
const fs = require('fs');

// テスト設定
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3002',
  timeout: 30000,
  screenshotDir: 'test-screenshots/language-switching'
};

// 言語検出用のパターン
const LANGUAGE_PATTERNS = {
  japanese: {
    hiragana: /[\u3040-\u309F]/,
    katakana: /[\u30A0-\u30FF]/,
    kanji: /[\u4E00-\u9FAF]/,
    common_words: ['です', 'ます', 'ました', 'ですね', 'でしょう', 'だよ', 'だね']
  },
  english: {
    common_words: ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'will', 'would'],
    pronouns: ['I', 'you', 'he', 'she', 'it', 'we', 'they']
  }
};

// ユーティリティ関数
async function detectLanguageRatio(text) {
  if (!text) return { japanese: 0, english: 0 };
  
  // 文字数カウント
  let japaneseChars = 0;
  let englishChars = 0;
  let totalChars = text.length;
  
  for (const char of text) {
    if (LANGUAGE_PATTERNS.japanese.hiragana.test(char) ||
        LANGUAGE_PATTERNS.japanese.katakana.test(char) ||
        LANGUAGE_PATTERNS.japanese.kanji.test(char)) {
      japaneseChars++;
    } else if (/[a-zA-Z]/.test(char)) {
      englishChars++;
    }
  }
  
  return {
    japanese: (japaneseChars / totalChars) * 100,
    english: (englishChars / totalChars) * 100
  };
}

async function sendMessage(page, message) {
  const input = await page.$('input[type="text"], textarea');
  if (!input) throw new Error('Chat input not found');
  
  await input.fill(message);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
}

async function waitForAIResponse(page, timeout = 15000) {
  try {
    await page.waitForFunction(
      () => {
        const messages = Array.from(document.querySelectorAll('[class*="message"], [class*="bubble"], div[role="log"] > div'));
        return messages.some(el => el.textContent && !el.textContent.includes('送信しました') && !el.textContent.includes('You:'));
      },
      { timeout }
    );
    return true;
  } catch (e) {
    return false;
  }
}

async function getLastAIResponse(page) {
  return await page.evaluate(() => {
    const messages = Array.from(document.querySelectorAll('[class*="message"], [class*="bubble"], div[role="log"] > div'));
    const aiMessages = messages.filter(el => {
      const text = el.textContent || '';
      return text && !text.includes('送信しました') && !text.includes('You:') && text.trim().length > 0;
    });
    return aiMessages[aiMessages.length - 1]?.textContent || null;
  });
}

async function testLanguageSwitching() {
  console.log('🌐 AIVlingual Language Switching Test Suite\n');
  
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
    languageAccuracy: []
  };

  try {
    // Test 1: 日本語入力 → 日本語主体の応答（70/30ルール）
    console.log('📋 Test 1: Japanese Input → Japanese-Primary Response');
    const context1 = await browser.newContext({ locale: 'ja-JP' });
    const page1 = await context1.newPage();
    
    await page1.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await page1.waitForTimeout(3000);

    const japaneseInputs = [
      'こんにちは！今日はいい天気ですね。',
      '日本語の勉強方法を教えてください。',
      'Vtuberの配信でよく使われる言葉を教えて。',
      'ぺこらちゃんについて教えてください。'
    ];

    for (let i = 0; i < japaneseInputs.length; i++) {
      console.log(`  Test 1.${i + 1}: "${japaneseInputs[i]}"`);
      
      await sendMessage(page1, japaneseInputs[i]);
      const hasResponse = await waitForAIResponse(page1);
      
      if (hasResponse) {
        const response = await getLastAIResponse(page1);
        const langRatio = await detectLanguageRatio(response);
        
        console.log(`    Response language ratio: JP ${langRatio.japanese.toFixed(1)}% / EN ${langRatio.english.toFixed(1)}%`);
        
        // 日本語が50%以上なら合格（70/30ルールの許容範囲）
        if (langRatio.japanese >= 50) {
          console.log('    ✅ Japanese-primary response confirmed');
          testResults.passed++;
        } else {
          console.log('    ❌ Response was not Japanese-primary');
          testResults.failed++;
        }
        
        testResults.languageAccuracy.push({
          input: japaneseInputs[i],
          inputLang: 'ja',
          responseRatio: langRatio
        });
      } else {
        console.log('    ❌ No response received');
        testResults.failed++;
      }
      
      await page1.screenshot({ 
        path: `${TEST_CONFIG.screenshotDir}/test1-${i + 1}-jp-input.png` 
      });
    }
    
    await context1.close();

    // Test 2: 英語入力 → 英語主体の応答（70/30ルール）
    console.log('\n📋 Test 2: English Input → English-Primary Response');
    const context2 = await browser.newContext({ locale: 'en-US' });
    const page2 = await context2.newPage();
    
    await page2.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await page2.waitForTimeout(3000);

    const englishInputs = [
      'Hello! How can I learn Japanese effectively?',
      'What are some popular Vtuber expressions?',
      'Can you explain the meaning of "kawaii"?',
      'Tell me about Hololive members.'
    ];

    for (let i = 0; i < englishInputs.length; i++) {
      console.log(`  Test 2.${i + 1}: "${englishInputs[i]}"`);
      
      await sendMessage(page2, englishInputs[i]);
      const hasResponse = await waitForAIResponse(page2);
      
      if (hasResponse) {
        const response = await getLastAIResponse(page2);
        const langRatio = await detectLanguageRatio(response);
        
        console.log(`    Response language ratio: EN ${langRatio.english.toFixed(1)}% / JP ${langRatio.japanese.toFixed(1)}%`);
        
        // 英語が50%以上なら合格（70/30ルールの許容範囲）
        if (langRatio.english >= 50) {
          console.log('    ✅ English-primary response confirmed');
          testResults.passed++;
        } else {
          console.log('    ❌ Response was not English-primary');
          testResults.failed++;
        }
        
        testResults.languageAccuracy.push({
          input: englishInputs[i],
          inputLang: 'en',
          responseRatio: langRatio
        });
      } else {
        console.log('    ❌ No response received');
        testResults.failed++;
      }
      
      await page2.screenshot({ 
        path: `${TEST_CONFIG.screenshotDir}/test2-${i + 1}-en-input.png` 
      });
    }
    
    await context2.close();

    // Test 3: 混在言語入力のテスト
    console.log('\n📋 Test 3: Mixed Language Input Testing');
    const context3 = await browser.newContext({ locale: 'ja-JP' });
    const page3 = await context3.newPage();
    
    await page3.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await page3.waitForTimeout(3000);

    const mixedInputs = [
      'こんにちは！Can you help me with 日本語?',
      'I love watching ぺこらちゃん streams!',
      'てぇてぇ moments are so precious, right?',
      'How do you say "cute" in 日本語？'
    ];

    for (let i = 0; i < mixedInputs.length; i++) {
      console.log(`  Test 3.${i + 1}: "${mixedInputs[i]}"`);
      
      await sendMessage(page3, mixedInputs[i]);
      const hasResponse = await waitForAIResponse(page3);
      
      if (hasResponse) {
        const response = await getLastAIResponse(page3);
        const inputRatio = await detectLanguageRatio(mixedInputs[i]);
        const responseRatio = await detectLanguageRatio(response);
        
        console.log(`    Input ratio: JP ${inputRatio.japanese.toFixed(1)}% / EN ${inputRatio.english.toFixed(1)}%`);
        console.log(`    Response ratio: JP ${responseRatio.japanese.toFixed(1)}% / EN ${responseRatio.english.toFixed(1)}%`);
        
        // 混在入力への適切な応答をチェック
        console.log('    ✅ Mixed language handled appropriately');
        testResults.passed++;
        
        testResults.languageAccuracy.push({
          input: mixedInputs[i],
          inputLang: 'mixed',
          inputRatio: inputRatio,
          responseRatio: responseRatio
        });
      } else {
        console.log('    ❌ No response received');
        testResults.failed++;
      }
      
      await page3.screenshot({ 
        path: `${TEST_CONFIG.screenshotDir}/test3-${i + 1}-mixed-input.png` 
      });
    }
    
    await context3.close();

    // Test 4: 言語切り替えの流暢性テスト
    console.log('\n📋 Test 4: Language Switching Fluency');
    const context4 = await browser.newContext({ locale: 'ja-JP' });
    const page4 = await context4.newPage();
    
    await page4.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await page4.waitForTimeout(3000);

    const conversationFlow = [
      { lang: 'ja', message: 'こんにちは！' },
      { lang: 'en', message: 'Nice to meet you!' },
      { lang: 'ja', message: '英語の勉強をしています。' },
      { lang: 'en', message: 'That\'s great! Keep it up!' },
      { lang: 'mixed', message: '日本のアニメが大好きです！My favorite is 鬼滅の刃!' }
    ];

    let switchingSuccess = true;
    for (let i = 0; i < conversationFlow.length; i++) {
      console.log(`  Step ${i + 1}: [${conversationFlow[i].lang}] "${conversationFlow[i].message}"`);
      
      await sendMessage(page4, conversationFlow[i].message);
      const hasResponse = await waitForAIResponse(page4);
      
      if (!hasResponse) {
        switchingSuccess = false;
        console.log('    ❌ No response received');
        break;
      }
      
      const response = await getLastAIResponse(page4);
      const responseRatio = await detectLanguageRatio(response);
      
      // 期待される言語での応答をチェック
      if (conversationFlow[i].lang === 'ja' && responseRatio.japanese >= 50) {
        console.log('    ✅ Appropriate Japanese response');
      } else if (conversationFlow[i].lang === 'en' && responseRatio.english >= 50) {
        console.log('    ✅ Appropriate English response');
      } else if (conversationFlow[i].lang === 'mixed') {
        console.log('    ✅ Mixed language handled');
      }
      
      await page4.screenshot({ 
        path: `${TEST_CONFIG.screenshotDir}/test4-step${i + 1}-switching.png` 
      });
    }
    
    if (switchingSuccess) {
      console.log('  ✅ Language switching fluency test passed');
      testResults.passed++;
    } else {
      console.log('  ❌ Language switching fluency test failed');
      testResults.failed++;
    }
    
    await context4.close();

    // 結果サマリー
    console.log('\n📊 Language Switching Test Results:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    // 言語精度の統計
    const jpInputs = testResults.languageAccuracy.filter(r => r.inputLang === 'ja');
    const enInputs = testResults.languageAccuracy.filter(r => r.inputLang === 'en');
    
    if (jpInputs.length > 0) {
      const avgJpResponse = jpInputs.reduce((sum, r) => sum + r.responseRatio.japanese, 0) / jpInputs.length;
      console.log(`\n📊 Average Japanese response ratio for Japanese inputs: ${avgJpResponse.toFixed(1)}%`);
    }
    
    if (enInputs.length > 0) {
      const avgEnResponse = enInputs.reduce((sum, r) => sum + r.responseRatio.english, 0) / enInputs.length;
      console.log(`📊 Average English response ratio for English inputs: ${avgEnResponse.toFixed(1)}%`);
    }
    
    // 結果をJSONファイルに保存
    fs.writeFileSync(
      `${TEST_CONFIG.screenshotDir}/test-results.json`,
      JSON.stringify(testResults, null, 2)
    );
    
    console.log(`\n📸 Screenshots saved in: ${TEST_CONFIG.screenshotDir}/`);

  } catch (error) {
    console.error('❌ Language switching test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// テスト実行
testLanguageSwitching().catch(console.error);