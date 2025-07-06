import { test, expect } from '../fixtures/test-base'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page, loginPage }) => {
    // Login with test credentials
    await page.goto('/login')
    await loginPage.login('test', 'test0702')
    
    // Wait for navigation to complete
    await page.waitForURL('/')
    
    // Navigate to settings page
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
  })

  test('should display settings page with all sections', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toHaveText('設定')

    // Check all sections are present
    await expect(page.locator('h2:has-text("言語設定")')).toBeVisible()
    await expect(page.locator('h2:has-text("AI設定")')).toBeVisible()
    await expect(page.locator('h2:has-text("エクスポート設定")')).toBeVisible()
    await expect(page.locator('h2:has-text("外観設定")')).toBeVisible()
  })

  test('should navigate to settings from user menu', async ({ page }) => {
    // Go to main page first
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open user menu
    await page.click('[data-testid="user-menu"]')

    // Click settings button
    await page.click('[data-testid="settings-button"]')

    // Should navigate to settings page
    await expect(page).toHaveURL('/settings')
    await expect(page.locator('h1')).toHaveText('設定')
  })

  test('should save language settings', async ({ page }) => {
    // Change default language
    await page.selectOption('select:near(:text("デフォルト言語"))', 'ja')

    // Change response mix ratio
    const slider = page.locator('input[type="range"]:near(:text("言語混合比率"))')
    await slider.fill('80')

    // Save settings
    await page.click('button:has-text("保存")')

    // Check success toast
    await expect(page.locator('.toast-success')).toContainText('設定を保存しました')

    // Reload page and verify settings persisted
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check saved values
    await expect(page.locator('select:near(:text("デフォルト言語"))')).toHaveValue('ja')
    await expect(slider).toHaveValue('80')
  })

  test('should save AI settings', async ({ page }) => {
    // Change temperature
    const tempSlider = page.locator('input[type="range"]:near(:text("創造性レベル"))')
    await tempSlider.fill('0.5')

    // Change response style
    await page.selectOption('select:near(:text("応答スタイル"))', 'casual')

    // Enable streaming
    await page.check('#streamingEnabled')

    // Save settings
    await page.click('button:has-text("保存")')

    // Check success toast
    await expect(page.locator('.toast-success')).toContainText('設定を保存しました')

    // Verify values persisted
    await page.reload()
    await expect(tempSlider).toHaveValue('0.5')
    await expect(page.locator('select:near(:text("応答スタイル"))')).toHaveValue('casual')
    await expect(page.locator('#streamingEnabled')).toBeChecked()
  })

  test('should reset settings to default', async ({ page }) => {
    // Change some settings first
    await page.selectOption('select:near(:text("デフォルト言語"))', 'en')
    await page.click('button:has-text("保存")')

    // Click reset button
    page.on('dialog', dialog => dialog.accept())
    await page.click('button:has-text("デフォルトに戻す")')

    // Check settings are reset
    await expect(page.locator('select:near(:text("デフォルト言語"))')).toHaveValue('auto')
  })

  test('should disable save button when no changes', async ({ page }) => {
    // Initially save button should be disabled
    const saveButton = page.locator('button:has-text("保存")')
    await expect(saveButton).toBeDisabled()

    // Make a change
    await page.selectOption('select:near(:text("デフォルト言語"))', 'ja')

    // Save button should be enabled
    await expect(saveButton).toBeEnabled()

    // Save changes
    await saveButton.click()

    // Save button should be disabled again
    await expect(saveButton).toBeDisabled()
  })

  test('should navigate back to main page', async ({ page }) => {
    // Click cancel button
    await page.click('button:has-text("キャンセル")')

    // Should navigate to main page
    await expect(page).toHaveURL('/')
  })

  test('should apply theme changes immediately', async ({ page }) => {
    // Change to dark theme
    await page.selectOption('select:near(:text("テーマ"))', 'dark')

    // Save settings
    await page.click('button:has-text("保存")')

    // Check if dark class is applied
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)

    // Change back to light theme
    await page.selectOption('select:near(:text("テーマ"))', 'light')
    await page.click('button:has-text("保存")')

    // Check dark class is removed
    await expect(html).not.toHaveClass(/dark/)
  })

  test('should show available TTS voices', async ({ page }) => {
    // Check TTS voice dropdown has options
    const ttsSelect = page.locator('select:near(:text("音声合成の声"))')
    
    // Should have at least default option
    await expect(ttsSelect.locator('option')).toHaveCount({ min: 1 })
    
    // First option should be default
    const firstOption = ttsSelect.locator('option').first()
    await expect(firstOption).toHaveText('デフォルト')
  })
})