import { test, expect } from '../fixtures/test-base';

test.describe('動画解析と語彙抽出', () => {
  // 実際のVtuber動画URLを使用
  const TEST_VIDEOS = [
    {
      url: 'https://youtu.be/fH52x36P-L4',
      title: /.*/, // 実際のタイトルパターン
      expectedVocabularyMin: 3
    },
    {
      url: 'https://youtu.be/-OtrDCWy9Co',
      title: /.*/,
      expectedVocabularyMin: 3
    }
  ];

  test.beforeEach(async ({ authenticatedUser, homePage }) => {
    // 認証済みユーザーでホームページにアクセス
    await homePage.goto();
  });

  test('YouTube動画を解析して語彙を抽出できる', async ({ videoAnalysisPage }) => {
    await videoAnalysisPage.goto();
    
    const testVideo = TEST_VIDEOS[0];
    
    // 動画URLを入力して解析
    await videoAnalysisPage.analyzeVideo(testVideo.url);
    
    // 解析完了を待つ
    await videoAnalysisPage.waitForAnalysisComplete();
    
    // 動画情報が表示される
    const videoTitle = await videoAnalysisPage.getVideoTitle();
    expect(videoTitle).toBeTruthy();
    
    // 語彙が抽出される
    const vocabularyCount = await videoAnalysisPage.getVocabularyCount();
    expect(vocabularyCount).toBeGreaterThanOrEqual(testVideo.expectedVocabularyMin);
    
    // 最初の語彙アイテムを確認
    const firstItem = await videoAnalysisPage.getVocabularyItem(0);
    expect(firstItem.japanese).toBeTruthy();
    expect(firstItem.english).toBeTruthy();
    expect(firstItem.context).toBeTruthy();
  });

  test('複数の動画を連続して解析できる', async ({ videoAnalysisPage }) => {
    await videoAnalysisPage.goto();
    
    for (const testVideo of TEST_VIDEOS) {
      // 動画を解析
      await videoAnalysisPage.analyzeVideo(testVideo.url);
      await videoAnalysisPage.waitForAnalysisComplete();
      
      // 語彙が抽出されることを確認
      const vocabularyCount = await videoAnalysisPage.getVocabularyCount();
      expect(vocabularyCount).toBeGreaterThanOrEqual(testVideo.expectedVocabularyMin);
      
      // 次の動画のために入力をクリア
      await videoAnalysisPage.videoUrlInput.clear();
    }
  });

  test('無効なURLでエラーメッセージが表示される', async ({ videoAnalysisPage }) => {
    await videoAnalysisPage.goto();
    
    // 無効なURLを入力
    await videoAnalysisPage.analyzeVideo('https://invalid-url.com/video');
    
    // エラーメッセージが表示される
    await expect(videoAnalysisPage.errorMessage).toBeVisible();
    const errorText = await videoAnalysisPage.errorMessage.textContent();
    expect(errorText).toContain('Invalid YouTube URL');
  });

  test('解析中はローディング状態が表示される', async ({ videoAnalysisPage }) => {
    await videoAnalysisPage.goto();
    
    // 動画URLを入力して解析開始
    const testVideo = TEST_VIDEOS[0];
    await videoAnalysisPage.analyzeVideo(testVideo.url);
    
    // ローディングスピナーが表示される
    await expect(videoAnalysisPage.loadingSpinner).toBeVisible();
    
    // 解析完了後、ローディングスピナーが消える
    await videoAnalysisPage.waitForAnalysisComplete();
    await expect(videoAnalysisPage.loadingSpinner).not.toBeVisible();
  });

  test('語彙をエクスポートできる', async ({ page, videoAnalysisPage }) => {
    await videoAnalysisPage.goto();
    
    // 動画を解析
    const testVideo = TEST_VIDEOS[0];
    await videoAnalysisPage.analyzeVideo(testVideo.url);
    await videoAnalysisPage.waitForAnalysisComplete();
    
    // ダウンロードイベントを監視
    const downloadPromise = page.waitForEvent('download');
    
    // CSVエクスポート
    await videoAnalysisPage.exportVocabulary('csv');
    
    // ダウンロードが開始される
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
    
    // ダウンロードファイルを保存（オプション）
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});