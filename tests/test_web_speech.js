const { chromium } = require('playwright');

async function testWebSpeechAPI() {
  console.log('🎤 AIVlingual Web Speech API Test');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--allow-file-access',
      '--enable-features=WebSpeechAPI'
    ]
  });
  
  const context = await browser.newContext({
    permissions: ['microphone'],
    locale: 'ja-JP'
  });
  
  const page = await context.newPage();

  // コンソールメッセージの監視
  page.on('console', msg => {
    if (msg.text().includes('speech') || msg.text().includes('Speech')) {
      console.log(`📢 Console: ${msg.text()}`);
    }
  });

  try {
    // アプリケーションを開く
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    console.log('✅ Application loaded');

    // Web Speech APIのサポート状況を確認
    const speechSupport = await page.evaluate(() => {
      const recognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      const synthesis = 'speechSynthesis' in window;
      
      // 利用可能な音声を取得
      let voices = [];
      if (synthesis) {
        voices = window.speechSynthesis.getVoices();
        // 音声リストが非同期で読み込まれる場合があるため、再度取得
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
        };
      }
      
      return {
        recognition,
        synthesis,
        voiceCount: voices.length,
        japaneseVoices: voices.filter(v => v.lang.includes('ja')).length,
        englishVoices: voices.filter(v => v.lang.includes('en')).length
      };
    });

    console.log('\n📊 Web Speech API Support:');
    console.log(`   Speech Recognition: ${speechSupport.recognition ? '✅ Supported' : '❌ Not supported'}`);
    console.log(`   Speech Synthesis: ${speechSupport.synthesis ? '✅ Supported' : '❌ Not supported'}`);
    console.log(`   Total voices: ${speechSupport.voiceCount}`);
    console.log(`   Japanese voices: ${speechSupport.japaneseVoices}`);
    console.log(`   English voices: ${speechSupport.englishVoices}`);

    // Web Speech認識のインターフェースを探す
    console.log('\n🔍 Looking for speech recognition interface...');
    
    // マイクボタンまたは音声入力ボタンを探す
    const micButton = await page.$('button[aria-label*="mic"], button[aria-label*="音声"], button:has-text("🎤"), [class*="mic"], [class*="voice"]');
    
    if (micButton) {
      console.log('✅ Found microphone button');
      
      // スクリーンショット
      await page.screenshot({ 
        path: 'test-screenshots/speech-before-click.png' 
      });
      
      // マイクボタンをクリック
      await micButton.click();
      console.log('✅ Clicked microphone button');
      
      // 許可ダイアログやステート変更を待つ
      await page.waitForTimeout(2000);
      
      // ステータス変更を確認
      const isRecording = await page.evaluate(() => {
        // 録音中を示す要素を探す
        const recordingIndicators = document.querySelectorAll('[class*="recording"], [class*="listening"], [class*="active"]');
        return recordingIndicators.length > 0;
      });
      
      console.log(`✅ Recording status: ${isRecording ? 'Active' : 'Inactive'}`);
      
      if (isRecording) {
        await page.screenshot({ 
          path: 'test-screenshots/speech-recording.png' 
        });
      }
      
      // Web Speech APIを直接テスト
      console.log('\n🧪 Testing Web Speech API directly...');
      
      const speechTest = await page.evaluate(() => {
        return new Promise((resolve) => {
          const results = {
            recognitionCreated: false,
            recognitionStarted: false,
            recognitionError: null,
            recognitionResult: null
          };
          
          try {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            if (!SpeechRecognition) {
              resolve({ ...results, recognitionError: 'API not available' });
              return;
            }
            
            const recognition = new SpeechRecognition();
            results.recognitionCreated = true;
            
            // 設定
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'ja-JP';
            
            // イベントハンドラー
            recognition.onstart = () => {
              results.recognitionStarted = true;
            };
            
            recognition.onerror = (event) => {
              results.recognitionError = event.error;
              resolve(results);
            };
            
            recognition.onresult = (event) => {
              const result = event.results[0];
              results.recognitionResult = {
                transcript: result[0].transcript,
                confidence: result[0].confidence,
                isFinal: result.isFinal
              };
            };
            
            recognition.onend = () => {
              resolve(results);
            };
            
            // 認識開始
            recognition.start();
            
            // タイムアウト設定
            setTimeout(() => {
              recognition.stop();
              resolve(results);
            }, 5000);
            
          } catch (error) {
            results.recognitionError = error.message;
            resolve(results);
          }
        });
      });
      
      console.log('\n📊 Speech Recognition Test Results:');
      console.log(`   Recognition created: ${speechTest.recognitionCreated ? '✅' : '❌'}`);
      console.log(`   Recognition started: ${speechTest.recognitionStarted ? '✅' : '❌'}`);
      if (speechTest.recognitionError) {
        console.log(`   Error: ${speechTest.recognitionError}`);
      }
      if (speechTest.recognitionResult) {
        console.log(`   Result: "${speechTest.recognitionResult.transcript}"`);
        console.log(`   Confidence: ${speechTest.recognitionResult.confidence}`);
      }
      
    } else {
      console.log('⚠️ Microphone button not found');
      console.log('   The application might not have speech recognition UI implemented yet');
    }

    // Speech Synthesis（音声合成）のテスト
    console.log('\n🔊 Testing Speech Synthesis...');
    
    const synthTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (!window.speechSynthesis) {
          resolve({ supported: false });
          return;
        }
        
        const utterance = new SpeechSynthesisUtterance('こんにちは、AIVlingualです。');
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.5;
        
        let speaking = false;
        utterance.onstart = () => { speaking = true; };
        utterance.onend = () => {
          resolve({
            supported: true,
            speaking: speaking,
            voices: window.speechSynthesis.getVoices().length
          });
        };
        utterance.onerror = (e) => {
          resolve({
            supported: true,
            error: e.error
          });
        };
        
        window.speechSynthesis.speak(utterance);
        
        // タイムアウト
        setTimeout(() => {
          window.speechSynthesis.cancel();
          resolve({
            supported: true,
            timeout: true
          });
        }, 5000);
      });
    });
    
    console.log('📊 Speech Synthesis Test Results:');
    console.log(`   Supported: ${synthTest.supported ? '✅' : '❌'}`);
    if (synthTest.error) {
      console.log(`   Error: ${synthTest.error}`);
    } else if (synthTest.timeout) {
      console.log(`   Status: Timeout (synthesis might be disabled)`);
    } else if (synthTest.speaking) {
      console.log(`   Status: Successfully spoke Japanese text`);
    }

    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-screenshots/speech-final.png',
      fullPage: true 
    });

    console.log('\n✅ Web Speech API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ 
      path: 'test-screenshots/speech-error.png',
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
testWebSpeechAPI().catch(console.error);