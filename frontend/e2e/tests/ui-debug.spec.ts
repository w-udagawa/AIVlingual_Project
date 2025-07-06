import { test, expect } from '../fixtures/test-base';

test.describe('UI Debug', () => {
  test('take screenshot of main page after login', async ({ page, loginPage }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Perform login
    await loginPage.login('test', 'test0702');
    
    // Wait for login success
    await page.locator('[role="status"]:has-text("ログインしました")').waitFor({ 
      state: 'visible', 
      timeout: 10000 
    });
    
    // Wait for auth state to settle
    await page.waitForTimeout(2000);
    
    // Navigate to main page
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await page.goto('/');
      await page.waitForTimeout(1000);
    }
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/main-page-ui.png', fullPage: true });
    
    // Get page content for analysis
    const content = await page.content();
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Check what navigation elements are visible
    const navButtons = await page.locator('nav button, .nav-tab').all();
    console.log('Navigation buttons found:', navButtons.length);
    
    for (let i = 0; i < navButtons.length; i++) {
      const button = navButtons[i];
      const text = await button.textContent();
      const visible = await button.isVisible();
      console.log(`Button ${i}: "${text?.trim()}" - Visible: ${visible}`);
    }
  });
});