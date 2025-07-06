import { Page, Locator } from '@playwright/test';
import { SELECTORS } from '../fixtures/video-test-data';

export class VideoAnalysisPage {
  readonly page: Page;
  readonly videoUrlInput: Locator;
  readonly timestampInput: Locator;
  readonly analyzeButton: Locator;
  readonly extractButton: Locator;
  readonly loadingSpinner: Locator;
  readonly videoInfo: Locator;
  readonly videoTitle: Locator;
  readonly channelName: Locator;
  readonly viewCount: Locator;
  readonly duration: Locator;
  readonly vocabularyList: Locator;
  readonly vocabularyItems: Locator;
  readonly exportButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly saveButton: Locator;
  
  // Expression section elements
  readonly expressionsSection: Locator;
  readonly expressionCards: Locator;
  
  // Extraction results elements
  readonly extractionResults: Locator;
  readonly statsGrid: Locator;
  readonly vocabularyPreview: Locator;
  
  // Video thumbnail
  readonly videoThumbnail: Locator;
  readonly durationBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Basic elements using actual selectors from component
    this.videoUrlInput = page.locator('input.url-input');
    this.timestampInput = page.locator('input.timestamp-input');
    this.analyzeButton = page.locator('button.analyze-button');
    this.extractButton = page.locator('button.extract-button');
    this.loadingSpinner = page.locator('.loading-spinner');
    this.videoInfo = page.locator('.video-info-card');
    this.videoTitle = page.locator('.video-title');
    this.channelName = page.locator('.channel-name');
    this.viewCount = page.locator('.view-count');
    this.duration = page.locator('.duration-badge');
    this.vocabularyList = page.locator('.vocabulary-preview, .vocabulary-list');
    this.vocabularyItems = page.locator('.vocab-item');
    this.exportButton = page.getByRole('button', { name: /export|エクスポート/i });
    this.errorMessage = page.locator('[role="alert"]');
    this.successMessage = page.locator('[role="status"]');
    this.saveButton = page.locator('button.save-button');
    
    // Expression section
    this.expressionsSection = page.locator('.expressions-section');
    this.expressionCards = page.locator('.expression-card');
    
    // Extraction results
    this.extractionResults = page.locator('.extraction-results');
    this.statsGrid = page.locator('.stats-grid');
    this.vocabularyPreview = page.locator('.vocabulary-preview');
    
    // Video thumbnail elements
    this.videoThumbnail = page.locator('.video-thumbnail img');
    this.durationBadge = page.locator('.duration-badge');
  }

  async goto() {
    // Navigate to the video analysis tab
    const currentUrl = this.page.url();
    if (!currentUrl.includes('localhost:3004') || currentUrl.includes('/login')) {
      await this.page.goto('/');
      await this.page.waitForLoadState('networkidle');
    }
    
    // Wait for navigation buttons to be visible
    await this.page.locator('.nav-tab').first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Click the video analysis tab
    await this.page.locator('button:has-text("🎥動画解析")').click();
    await this.page.waitForTimeout(1000);
  }

  async analyzeVideo(videoUrl: string, timestamp?: string) {
    await this.videoUrlInput.fill(videoUrl);
    if (timestamp) {
      await this.timestampInput.fill(timestamp);
    }
    await this.analyzeButton.click();
  }

  async extractVocabulary(videoUrl: string) {
    await this.videoUrlInput.fill(videoUrl);
    await this.extractButton.click();
  }

  async waitForAnalysisComplete(timeout: number = 30000) {
    try {
      // Wait for loading to start (optional)
      await this.analyzeButton.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {});
      
      // Wait for video info to appear
      await this.videoInfo.waitFor({ state: 'visible', timeout });
      
      // Also check if expressions section appears
      await this.expressionsSection.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    } catch (error) {
      // Check if error message appeared instead
      if (await this.errorMessage.isVisible()) {
        throw new Error(await this.errorMessage.textContent() || 'Analysis failed');
      }
      throw error;
    }
  }

  async waitForExtractionComplete(timeout: number = 30000) {
    try {
      // Wait for extraction results to appear
      await this.extractionResults.waitFor({ state: 'visible', timeout });
      
      // Wait for stats to be populated
      await this.statsGrid.waitFor({ state: 'visible', timeout: 5000 });
    } catch (error) {
      // Check if error message appeared instead
      if (await this.errorMessage.isVisible()) {
        throw new Error(await this.errorMessage.textContent() || 'Extraction failed');
      }
      throw error;
    }
  }

  async getVideoTitle(): Promise<string> {
    await this.videoTitle.waitFor({ state: 'visible' });
    return await this.videoTitle.textContent() || '';
  }

  async getChannelName(): Promise<string> {
    await this.channelName.waitFor({ state: 'visible' });
    return await this.channelName.textContent() || '';
  }

  async getViewCount(): Promise<string> {
    await this.viewCount.waitFor({ state: 'visible' });
    return await this.viewCount.textContent() || '';
  }

  async getDuration(): Promise<string> {
    await this.durationBadge.waitFor({ state: 'visible' });
    return await this.durationBadge.textContent() || '';
  }

  async getExpressionCount(): Promise<number> {
    if (await this.expressionCards.first().isVisible({ timeout: 5000 })) {
      return await this.expressionCards.count();
    }
    return 0;
  }

  async getExpression(index: number): Promise<{
    japanese: string;
    type: string;
    timestamp: string;
  }> {
    const card = this.expressionCards.nth(index);
    return {
      japanese: await card.locator('.expression-text').textContent() || '',
      type: await card.locator('.expression-type').textContent() || '',
      timestamp: await card.locator('.expression-timestamp').textContent() || ''
    };
  }

  async getExtractionStats(): Promise<{
    itemsExtracted: number;
    japaneseRatio: number;
    englishRatio: number;
  }> {
    const statValues = await this.statsGrid.locator('.stat-value').allTextContents();
    return {
      itemsExtracted: parseInt(statValues[0] || '0'),
      japaneseRatio: parseInt(statValues[1]?.replace('%', '') || '0'),
      englishRatio: parseInt(statValues[2]?.replace('%', '') || '0')
    };
  }

  async getVocabularyPreviewCount(): Promise<number> {
    if (await this.vocabularyPreview.isVisible({ timeout: 5000 })) {
      return await this.vocabularyItems.count();
    }
    return 0;
  }

  async getVocabularyItem(index: number): Promise<{
    japanese: string;
    english: string;
    difficulty: string;
  }> {
    const item = this.vocabularyItems.nth(index);
    return {
      japanese: await item.locator('.vocab-japanese').textContent() || '',
      english: await item.locator('.vocab-english').textContent() || '',
      difficulty: await item.locator('.vocab-difficulty').textContent() || ''
    };
  }

  async saveVocabularyItems() {
    await this.saveButton.click();
  }

  async waitForSaveComplete() {
    // Wait for success message
    await this.successMessage.waitFor({ state: 'visible', timeout: 5000 });
  }

  async getErrorMessage(): Promise<string> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent() || '';
    }
    return '';
  }

  async getSuccessMessage(): Promise<string> {
    if (await this.successMessage.isVisible()) {
      return await this.successMessage.textContent() || '';
    }
    return '';
  }

  async isVideoInfoVisible(): Promise<boolean> {
    return await this.videoInfo.isVisible();
  }

  async isExtractionResultsVisible(): Promise<boolean> {
    return await this.extractionResults.isVisible();
  }

  async clearInput() {
    await this.videoUrlInput.clear();
    await this.timestampInput.clear();
  }
}