import { test, expect } from '../fixtures/test-base';
import { VideoAnalysisPage } from '../page-objects/VideoAnalysisPage';

test.describe('Video Analysis Debug', () => {
  test('debug video extraction process', async ({ page, loginPage }) => {
    // Login
    await page.goto('/login');
    await loginPage.login('test', 'test0702');
    
    // Wait for login success
    await page.locator('[role="status"]:has-text("ログインしました")').waitFor({ 
      state: 'visible', 
      timeout: 10000 
    });
    
    // Wait for auth state to settle
    await page.waitForTimeout(2000);
    
    // Navigate to main page if needed
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await page.goto('/');
      await page.waitForTimeout(1000);
    }
    
    // Initialize page object
    const videoAnalysisPage = new VideoAnalysisPage(page);
    
    // Navigate to video analysis tab
    await videoAnalysisPage.goto();
    
    // Take screenshot before extraction
    await page.screenshot({ path: 'test-screenshots/before-extraction.png', fullPage: true });
    
    // Fill in URL
    const testUrl = 'https://youtu.be/knbMyna6DGs';
    await videoAnalysisPage.videoUrlInput.fill(testUrl);
    
    // Log console messages with more details
    page.on('console', async msg => {
      const values = [];
      for (const arg of msg.args()) {
        values.push(await arg.jsonValue().catch(() => 'unable to serialize'));
      }
      console.log(`Browser console [${msg.type()}]:`, msg.text(), values.length > 0 ? values : '');
    });
    
    // Log network requests and responses
    page.on('response', async response => {
      if (response.url().includes('youtube') || response.url().includes('vocabulary')) {
        console.log('API Response:', response.url(), response.status());
        try {
          const body = await response.json();
          console.log('Response body:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('Could not parse response body');
        }
      }
    });
    
    // Catch page errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
      console.log('Stack:', error.stack);
    });
    
    // Click extract button
    await videoAnalysisPage.extractButton.click();
    
    // Wait a bit for processing
    await page.waitForTimeout(5000);
    
    // Take screenshot after extraction attempt
    await page.screenshot({ path: 'test-screenshots/after-extraction.png', fullPage: true });
    
    // Check for any error messages
    const errorVisible = await videoAnalysisPage.errorMessage.isVisible();
    if (errorVisible) {
      const errorText = await videoAnalysisPage.errorMessage.textContent();
      console.log('Error message found:', errorText);
    }
    
    // Check for extraction results
    const resultsVisible = await videoAnalysisPage.extractionResults.isVisible();
    console.log('Extraction results visible:', resultsVisible);
    
    // Check page content
    const pageContent = await page.content();
    
    // Look for specific elements
    const elements = [
      '.extraction-results',
      '.loading-spinner',
      '.error-container',
      '.video-info-card',
      '.stats-grid'
    ];
    
    for (const selector of elements) {
      const element = page.locator(selector);
      const count = await element.count();
      const visible = count > 0 ? await element.first().isVisible() : false;
      console.log(`Element ${selector}: count=${count}, visible=${visible}`);
    }
    
    // Check if there are any vocabulary items
    const vocabItems = await page.locator('.vocab-item').count();
    console.log('Vocabulary items found:', vocabItems);
  });
});