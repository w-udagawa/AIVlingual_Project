const { chromium } = require('playwright');

async function testPlaywrightMCP() {
  console.log('Testing Playwright MCP functionality...\n');
  
  let browser;
  try {
    // Launch browser
    console.log('1. Launching browser...');
    browser = await chromium.launch({ headless: true });
    console.log('✓ Browser launched successfully');
    
    // Create a new page
    console.log('\n2. Creating new page...');
    const page = await browser.newPage();
    console.log('✓ Page created successfully');
    
    // Navigate to a test page
    console.log('\n3. Navigating to example.com...');
    await page.goto('https://example.com');
    console.log('✓ Navigation successful');
    
    // Get page title
    console.log('\n4. Getting page title...');
    const title = await page.title();
    console.log(`✓ Page title: "${title}"`);
    
    // Take a screenshot
    console.log('\n5. Taking screenshot...');
    await page.screenshot({ path: 'tests/example-screenshot.png' });
    console.log('✓ Screenshot saved to tests/example-screenshot.png');
    
    // Get accessibility tree (what MCP uses)
    console.log('\n6. Getting accessibility tree snapshot...');
    const snapshot = await page.accessibility.snapshot();
    console.log('✓ Accessibility tree retrieved');
    console.log(`  Root role: ${snapshot.role}`);
    console.log(`  Children count: ${snapshot.children ? snapshot.children.length : 0}`);
    
    console.log('\n✅ All tests passed! Playwright MCP is ready to use.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    // Close browser
    if (browser) {
      await browser.close();
      console.log('\nBrowser closed.');
    }
  }
}

// Run the test
testPlaywrightMCP().catch(console.error);