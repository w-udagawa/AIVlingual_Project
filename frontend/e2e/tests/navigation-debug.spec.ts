import { test, expect } from '../fixtures/test-base';

test.describe('Navigation Debug', () => {
  test('check navigation elements after login', async ({ page, loginPage }) => {
    // Login
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
    
    console.log('Current URL:', page.url());
    
    // Take screenshot before any interaction
    await page.screenshot({ path: 'test-screenshots/before-navigation.png', fullPage: true });
    
    // Check all possible selectors for the video analysis button
    const selectors = [
      'button:has-text("🎥動画解析")',
      'button:has-text("動画解析")',
      '.nav-tab:has-text("動画解析")',
      '[data-testid="video-analysis-tab"]',
      'button[aria-label*="動画解析"]',
      'nav button',
      '.nav-tabs button'
    ];
    
    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      console.log(`Selector "${selector}": found ${elements.length} elements`);
      
      for (let i = 0; i < elements.length; i++) {
        const text = await elements[i].textContent();
        const visible = await elements[i].isVisible();
        console.log(`  Element ${i}: "${text?.trim()}" - Visible: ${visible}`);
      }
    }
    
    // Try to get the nav content
    const navContent = await page.locator('nav').textContent();
    console.log('Nav content:', navContent);
    
    // Check if there are any navigation elements
    const navTabs = await page.locator('.nav-tab').all();
    console.log('Nav tabs found:', navTabs.length);
    
    for (let i = 0; i < navTabs.length; i++) {
      const tab = navTabs[i];
      const text = await tab.textContent();
      const classes = await tab.getAttribute('class');
      const visible = await tab.isVisible();
      console.log(`Tab ${i}: "${text?.trim()}" - Classes: ${classes} - Visible: ${visible}`);
    }
  });
});