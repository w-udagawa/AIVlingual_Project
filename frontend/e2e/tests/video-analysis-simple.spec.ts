import { test, expect } from '../fixtures/test-base';

test.describe('Video Analysis - Simple Test', () => {
  test('should login and navigate to video analysis page', async ({ page, loginPage }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Page error:', err));
    
    // Enable request/response logging
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log('Request:', request.method(), request.url());
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        console.log('Response:', response.status(), response.url());
        if (response.status() !== 200) {
          try {
            const body = await response.text();
            console.log('Response body:', body);
          } catch (e) {
            console.log('Could not read response body');
          }
        }
      }
    });
    
    // Login
    await page.goto('/login');
    await loginPage.login('test', 'test0702');
    
    // Wait for login to complete - look for success toast
    await page.locator('[role="status"]:has-text("ログインしました")').waitFor({ 
      state: 'visible', 
      timeout: 10000 
    });
    
    // Login successful, navigate manually since there's no auto-redirect
    await page.goto('/');
    
    // Navigate to video analysis
    await page.goto('/video-analysis');
    
    // Verify page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /動画解析|Video Analysis/i })).toBeVisible({ timeout: 10000 });
    
    // Check if URL input is visible
    const urlInput = page.locator('input[placeholder*="YouTube"], input[placeholder*="動画"]').first();
    await expect(urlInput).toBeVisible({ timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/video-analysis-page.png' });
  });
  
  test('should show error for invalid URL', async ({ page, loginPage }) => {
    // Login
    await page.goto('/login');
    await loginPage.login('test', 'test0702');
    
    // Wait for login to complete - look for success toast
    await page.locator('[role="status"]:has-text("ログインしました")').waitFor({ 
      state: 'visible', 
      timeout: 10000 
    });
    
    // Login successful, navigate manually
    await page.goto('/');
    
    // Navigate to video analysis
    await page.goto('/video-analysis');
    
    // Enter invalid URL
    const urlInput = page.locator('input[placeholder*="YouTube"], input[placeholder*="動画"]').first();
    await urlInput.fill('invalid-url');
    
    // Click analyze button
    const analyzeButton = page.locator('button').filter({ hasText: /解析|Analyze/i }).first();
    await analyzeButton.click();
    
    // Wait for error message
    const errorMessage = page.locator('[role="alert"], .error-message, .text-red-500');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: 'test-screenshots/video-analysis-error.png' });
  });
});