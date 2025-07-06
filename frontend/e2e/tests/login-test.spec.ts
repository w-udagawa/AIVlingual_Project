import { test, expect } from '../fixtures/test-base';

test.describe('Login Test', () => {
  test('should successfully login', async ({ page, loginPage }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Perform login
    await loginPage.login('test', 'test0702');
    
    // Wait for success toast
    await page.locator('[role="status"]:has-text("ログインしました")').waitFor({ 
      state: 'visible', 
      timeout: 10000 
    });
    
    console.log('Login successful!');
    
    // Wait for auth state to settle and navigation to complete
    await page.waitForTimeout(2000);
    
    // Check localStorage for token
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log('Auth token exists:', !!authToken);
    expect(authToken).toBeTruthy();
    
    // Wait for automatic redirect or manually navigate to main page
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await page.goto('/');
      await page.waitForTimeout(1000);
    }
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the main page (not redirected back to login)
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 5000 });
    expect(page.url()).not.toContain('/login');
    
    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/after-login.png' });
    
    // Look for any main page content
    const pageContent = await page.content();
    console.log('Main page loaded, checking for content...');
    
    // Check for any indication we're logged in
    const userMenuExists = await page.locator('[data-testid="user-menu"], .user-menu, button:has-text("ログアウト")').count() > 0;
    console.log('User menu exists:', userMenuExists);
    
    // Look for main content areas
    const mainContent = await page.locator('main, .main-content, [role="main"]').count() > 0;
    console.log('Main content exists:', mainContent);
  });
});