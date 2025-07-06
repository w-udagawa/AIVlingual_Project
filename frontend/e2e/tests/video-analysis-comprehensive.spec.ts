import { test, expect } from '../fixtures/test-base';
import { VideoAnalysisPage } from '../page-objects/VideoAnalysisPage';
import { BatchProcessorPage } from '../page-objects/BatchProcessorPage';
import { 
  TEST_VIDEOS, 
  TEST_BATCHES, 
  TEST_TIMEOUTS, 
  ERROR_MESSAGES,
  EXPECTED_API_RESPONSES 
} from '../fixtures/video-test-data';

test.describe('動画解析機能 - 包括的E2Eテスト', () => {
  let videoAnalysisPage: VideoAnalysisPage;
  let batchProcessorPage: BatchProcessorPage;

  test.beforeEach(async ({ page, loginPage }) => {
    // Login with test credentials
    await page.goto('/login');
    await loginPage.login('test', 'test0702');
    
    // Wait for login success toast
    await page.locator('[role="status"]:has-text("ログインしました")').waitFor({ 
      state: 'visible', 
      timeout: 10000 
    });
    
    // Wait for auth state to settle
    await page.waitForTimeout(2000);
    
    // Navigate to main page if still on login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await page.goto('/');
      await page.waitForTimeout(1000);
    }
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 5000 });
    
    // Initialize page objects
    videoAnalysisPage = new VideoAnalysisPage(page);
    batchProcessorPage = new BatchProcessorPage(page);
  });

  test.describe('単一動画解析', () => {
    test('正常な動画URLで解析を実行', async ({ page }) => {
      await videoAnalysisPage.goto();
      
      const testVideo = TEST_VIDEOS.valid[0];
      
      // Extract vocabulary from video
      await test.step('動画から語彙を抽出', async () => {
        await videoAnalysisPage.extractVocabulary(testVideo.url);
        await videoAnalysisPage.waitForExtractionComplete(TEST_TIMEOUTS.videoAnalysis);
      });

      // Verify video info
      await test.step('動画情報を確認', async () => {
        expect(await videoAnalysisPage.isVideoInfoVisible()).toBe(true);
        
        const title = await videoAnalysisPage.getVideoTitle();
        expect(title).toBeTruthy();
        
        const channel = await videoAnalysisPage.getChannelName();
        expect(channel).toBeTruthy();
        
        const viewCount = await videoAnalysisPage.getViewCount();
        expect(viewCount).toMatch(/\d+/);
        
        const duration = await videoAnalysisPage.getDuration();
        expect(duration).toMatch(/\d+:\d+/);
      });

      // Check expressions
      await test.step('抽出された表現を確認', async () => {
        const expressionCount = await videoAnalysisPage.getExpressionCount();
        console.log(`Extracted ${expressionCount} expressions`);
        
        if (expressionCount > 0) {
          const firstExpression = await videoAnalysisPage.getExpression(0);
          expect(firstExpression.japanese).toBeTruthy();
          expect(firstExpression.type).toBeTruthy();
          expect(firstExpression.timestamp).toBeTruthy();
        }
      });

      // Take screenshot
      await page.screenshot({ 
        path: 'test-screenshots/video-analysis-success.png',
        fullPage: true 
      });
    });

    test('タイムスタンプ付きで解析を実行', async ({ page }) => {
      await videoAnalysisPage.goto();
      
      const testVideo = TEST_VIDEOS.valid[0];
      const timestamp = '120'; // 2 minutes
      
      await test.step('タイムスタンプ付きで動画を解析', async () => {
        await videoAnalysisPage.analyzeVideo(testVideo.url, timestamp);
        await videoAnalysisPage.waitForAnalysisComplete(TEST_TIMEOUTS.videoAnalysis);
      });

      await test.step('動画情報が表示されることを確認', async () => {
        expect(await videoAnalysisPage.isVideoInfoVisible()).toBe(true);
      });
    });

    test('無効なURLでエラーハンドリングを確認', async ({ page }) => {
      await videoAnalysisPage.goto();
      
      const invalidVideo = TEST_VIDEOS.invalid[0];
      
      await test.step('無効なURLで解析を実行', async () => {
        await videoAnalysisPage.analyzeVideo(invalidVideo.url);
        
        // Wait for error message
        await page.waitForTimeout(TEST_TIMEOUTS.mediumWait);
      });

      await test.step('エラーメッセージを確認', async () => {
        const errorMessage = await videoAnalysisPage.getErrorMessage();
        expect(errorMessage).toBeTruthy();
        console.log('Error message:', errorMessage);
      });

      await page.screenshot({ 
        path: 'test-screenshots/video-analysis-error.png' 
      });
    });
  });

  test.describe('語彙抽出機能', () => {
    test('動画から語彙を抽出して保存', async ({ page }) => {
      await videoAnalysisPage.goto();
      
      const testVideo = TEST_VIDEOS.valid[0];
      
      // Extract vocabulary
      await test.step('語彙を抽出', async () => {
        await videoAnalysisPage.extractVocabulary(testVideo.url);
        await videoAnalysisPage.waitForExtractionComplete(TEST_TIMEOUTS.videoAnalysis);
      });

      // Verify extraction results
      await test.step('抽出結果を確認', async () => {
        expect(await videoAnalysisPage.isExtractionResultsVisible()).toBe(true);
        
        const stats = await videoAnalysisPage.getExtractionStats();
        expect(stats.itemsExtracted).toBeGreaterThanOrEqual(testVideo.minVocabularyCount);
        expect(stats.japaneseRatio).toBeGreaterThan(0);
        
        console.log('Extraction stats:', stats);
      });

      // Check vocabulary preview
      await test.step('語彙プレビューを確認', async () => {
        const previewCount = await videoAnalysisPage.getVocabularyPreviewCount();
        expect(previewCount).toBeGreaterThan(0);
        
        if (previewCount > 0) {
          const firstItem = await videoAnalysisPage.getVocabularyItem(0);
          expect(firstItem.japanese).toBeTruthy();
          expect(firstItem.english).toBeTruthy();
          expect(firstItem.difficulty).toMatch(/Lv\.\d/);
        }
      });

      // Save vocabulary items
      await test.step('語彙をデータベースに保存', async () => {
        await videoAnalysisPage.saveVocabularyItems();
        await videoAnalysisPage.waitForSaveComplete();
        
        const successMessage = await videoAnalysisPage.getSuccessMessage();
        expect(successMessage).toContain('Saved');
      });

      await page.screenshot({ 
        path: 'test-screenshots/vocabulary-extraction-success.png',
        fullPage: true 
      });
    });

    test('複数の動画URLを連続で処理', async ({ page }) => {
      await videoAnalysisPage.goto();
      
      for (let i = 0; i < 2; i++) {
        const testVideo = TEST_VIDEOS.valid[i];
        
        await test.step(`動画 ${i + 1} を処理`, async () => {
          await videoAnalysisPage.clearInput();
          await videoAnalysisPage.extractVocabulary(testVideo.url);
          await videoAnalysisPage.waitForExtractionComplete(TEST_TIMEOUTS.videoAnalysis);
          
          const stats = await videoAnalysisPage.getExtractionStats();
          expect(stats.itemsExtracted).toBeGreaterThan(0);
        });
        
        // Wait between videos
        await page.waitForTimeout(TEST_TIMEOUTS.shortWait);
      }
    });
  });

  test.describe('バッチ処理機能', () => {
    test('複数動画のバッチ処理を実行', async ({ page }) => {
      await batchProcessorPage.goto();
      
      const batch = TEST_BATCHES[0]; // Mixed batch
      
      // Start batch processing
      await test.step('バッチ処理を開始', async () => {
        await batchProcessorPage.enterUrls(batch.urls);
        await batchProcessorPage.startProcessing();
        await batchProcessorPage.waitForProcessingStart();
      });

      // Monitor progress
      await test.step('進捗を監視', async () => {
        // Initial progress check
        const initialProgress = await batchProcessorPage.getProgressPercentage();
        console.log('Initial progress:', initialProgress);
        
        // Wait a bit and check progress
        await page.waitForTimeout(TEST_TIMEOUTS.mediumWait);
        
        const progressStats = await batchProcessorPage.getProgressStats();
        expect(progressStats.total).toBe(batch.urls.length);
        
        // Check URL statuses
        const urlStatuses = await batchProcessorPage.getUrlStatuses();
        console.log('URL statuses:', urlStatuses);
      });

      // Wait for completion
      await test.step('処理完了を待つ', async () => {
        await batchProcessorPage.waitForProcessingComplete(TEST_TIMEOUTS.batchProcess);
      });

      // Verify results
      await test.step('結果を確認', async () => {
        const summary = await batchProcessorPage.getResultsSummary();
        expect(summary.successful).toBe(batch.expectedSuccessCount);
        expect(summary.failed).toBe(batch.expectedFailCount);
        
        console.log('Batch results summary:', summary);
        
        // Check successful results
        const successfulResults = await batchProcessorPage.getSuccessfulResults();
        expect(successfulResults.length).toBe(batch.expectedSuccessCount);
        
        // Check failed results
        const failedResults = await batchProcessorPage.getFailedResults();
        expect(failedResults.length).toBe(batch.expectedFailCount);
      });

      // Check vocabulary preview
      await test.step('語彙プレビューを確認', async () => {
        const previewCount = await batchProcessorPage.getVocabularyPreviewCount();
        if (previewCount > 0) {
          const firstPreview = await batchProcessorPage.getVocabularyPreviewItem(0);
          expect(firstPreview.japanese).toBeTruthy();
          expect(firstPreview.english).toBeTruthy();
        }
      });

      await page.screenshot({ 
        path: 'test-screenshots/batch-processing-complete.png',
        fullPage: true 
      });
    });

    test('失敗したURLの再試行', async ({ page }) => {
      await batchProcessorPage.goto();
      
      // Use a batch with invalid URLs
      const invalidUrls = TEST_VIDEOS.invalid.map(v => v.url);
      
      await test.step('無効なURLでバッチ処理を実行', async () => {
        await batchProcessorPage.enterUrls(invalidUrls);
        await batchProcessorPage.startProcessing();
        await batchProcessorPage.waitForProcessingComplete(TEST_TIMEOUTS.batchProcess);
      });

      await test.step('失敗したURLを再試行', async () => {
        const failedResults = await batchProcessorPage.getFailedResults();
        expect(failedResults.length).toBeGreaterThan(0);
        
        await batchProcessorPage.retryFailedUrls();
        
        // Check that URLs are populated in textarea
        const textarea = batchProcessorPage.urlTextarea;
        const value = await textarea.inputValue();
        expect(value).toContain(invalidUrls[0]);
      });
    });

    test('バッチ処理結果のダウンロード', async ({ page }) => {
      await batchProcessorPage.goto();
      
      const batch = TEST_BATCHES[1]; // All valid batch
      
      // Process batch
      await test.step('バッチ処理を実行', async () => {
        await batchProcessorPage.enterUrls(batch.urls);
        await batchProcessorPage.startProcessing();
        await batchProcessorPage.waitForProcessingComplete(TEST_TIMEOUTS.batchProcess);
      });

      // Download results
      await test.step('結果をダウンロード', async () => {
        const download = await batchProcessorPage.downloadResults();
        
        // Verify download
        expect(download.suggestedFilename()).toMatch(/batch_results_.*\.json/);
        
        // Save to test results
        await download.saveAs('test-results/batch-results.json');
      });
    });

    test('処理履歴の表示', async ({ page }) => {
      await batchProcessorPage.goto();
      
      await test.step('処理履歴を表示', async () => {
        await batchProcessorPage.toggleHistory();
        
        const isHistoryVisible = await batchProcessorPage.isHistoryVisible();
        
        if (isHistoryVisible) {
          const historyCount = await batchProcessorPage.getHistoryItemCount();
          console.log(`Found ${historyCount} history items`);
          
          if (historyCount > 0) {
            const firstHistory = await batchProcessorPage.getHistoryItem(0);
            expect(firstHistory.date).toBeTruthy();
            expect(firstHistory.status).toBeTruthy();
          }
        }
      });
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('大量語彙の表示パフォーマンス', async ({ page }) => {
      await videoAnalysisPage.goto();
      
      const testVideo = TEST_VIDEOS.valid[0];
      
      const startTime = Date.now();
      
      await test.step('語彙を抽出', async () => {
        await videoAnalysisPage.extractVocabulary(testVideo.url);
        await videoAnalysisPage.waitForExtractionComplete(TEST_TIMEOUTS.videoAnalysis);
      });
      
      const extractionTime = Date.now() - startTime;
      
      await test.step('パフォーマンスメトリクスを記録', async () => {
        const stats = await videoAnalysisPage.getExtractionStats();
        
        console.log('Performance metrics:', {
          extractionTime: `${extractionTime}ms`,
          itemsExtracted: stats.itemsExtracted,
          itemsPerSecond: (stats.itemsExtracted / (extractionTime / 1000)).toFixed(2)
        });
        
        // Performance assertions
        expect(extractionTime).toBeLessThan(TEST_TIMEOUTS.videoAnalysis);
      });
    });

    test('バッチ処理の並列実行パフォーマンス', async ({ page }) => {
      await batchProcessorPage.goto();
      
      const largeBatch = TEST_BATCHES[2]; // 10 URLs
      
      const startTime = Date.now();
      
      await test.step('大規模バッチを処理', async () => {
        await batchProcessorPage.enterUrls(largeBatch.urls);
        await batchProcessorPage.startProcessing();
        await batchProcessorPage.waitForProcessingComplete(TEST_TIMEOUTS.batchProcess * 2);
      });
      
      const processingTime = Date.now() - startTime;
      
      await test.step('パフォーマンスメトリクスを記録', async () => {
        const summary = await batchProcessorPage.getResultsSummary();
        
        console.log('Batch performance:', {
          totalTime: `${processingTime}ms`,
          videosProcessed: summary.successful,
          averageTimePerVideo: `${(processingTime / summary.successful).toFixed(0)}ms`,
          totalVocabulary: summary.totalVocabulary
        });
      });
    });
  });

  test.describe('統合テスト', () => {
    test('動画解析から単語帳表示までの完全なフロー', async ({ page }) => {
      // Step 1: Extract vocabulary
      await test.step('動画から語彙を抽出', async () => {
        await videoAnalysisPage.goto();
        const testVideo = TEST_VIDEOS.valid[0];
        
        await videoAnalysisPage.extractVocabulary(testVideo.url);
        await videoAnalysisPage.waitForExtractionComplete(TEST_TIMEOUTS.videoAnalysis);
        
        await videoAnalysisPage.saveVocabularyItems();
        await videoAnalysisPage.waitForSaveComplete();
      });

      // Step 2: Navigate to vocabulary page
      await test.step('単語帳ページへ移動', async () => {
        await page.getByRole('button', { name: /単語帳|📚/i }).click();
        await page.waitForTimeout(TEST_TIMEOUTS.shortWait);
      });

      // Step 3: Verify vocabulary items appear
      await test.step('保存された語彙を確認', async () => {
        const vocabularyPanel = page.locator('.vocabulary-panel');
        await expect(vocabularyPanel).toBeVisible();
        
        // Look for vocabulary items
        const vocabItems = page.locator('.vocabulary-card, [data-testid="vocabulary-item"]');
        const count = await vocabItems.count();
        expect(count).toBeGreaterThan(0);
        
        console.log(`Found ${count} vocabulary items in the vocabulary panel`);
      });

      await page.screenshot({ 
        path: 'test-screenshots/integration-flow-complete.png',
        fullPage: true 
      });
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Capture screenshot on failure
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-screenshots/failure-${testInfo.title.replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
    }
  });
});