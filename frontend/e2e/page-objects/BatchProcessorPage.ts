import { Page, Locator } from '@playwright/test';
import { SELECTORS } from '../fixtures/video-test-data';

export class BatchProcessorPage {
  readonly page: Page;
  readonly urlTextarea: Locator;
  readonly processButton: Locator;
  readonly progressSection: Locator;
  readonly progressBar: Locator;
  readonly progressText: Locator;
  readonly progressStats: Locator;
  readonly currentProcessing: Locator;
  readonly resultsSection: Locator;
  readonly resultsSummary: Locator;
  readonly successfulResults: Locator;
  readonly errorResults: Locator;
  readonly retryButton: Locator;
  readonly downloadButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  
  // URL status tracking
  readonly urlStatusList: Locator;
  readonly urlStatusItems: Locator;
  
  // Vocabulary preview
  readonly vocabularyPreview: Locator;
  readonly previewItems: Locator;
  
  // Batch history
  readonly historyToggle: Locator;
  readonly batchHistory: Locator;
  readonly historyItems: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Input elements
    this.urlTextarea = page.locator(SELECTORS.batchProcessor.urlTextarea);
    this.processButton = page.locator(SELECTORS.batchProcessor.processButton);
    
    // Progress tracking
    this.progressSection = page.locator(SELECTORS.batchProcessor.progressSection);
    this.progressBar = page.locator(SELECTORS.batchProcessor.progressBar);
    this.progressText = page.locator('.progress-text');
    this.progressStats = page.locator('.progress-stats');
    this.currentProcessing = page.locator('.current-processing');
    
    // Results section
    this.resultsSection = page.locator(SELECTORS.batchProcessor.resultsSection);
    this.resultsSummary = page.locator('.results-summary');
    this.successfulResults = page.locator('.successful-results');
    this.errorResults = page.locator('.error-results');
    this.retryButton = page.locator(SELECTORS.batchProcessor.retryButton);
    this.downloadButton = page.locator(SELECTORS.batchProcessor.downloadButton);
    
    // Messages
    this.errorMessage = page.locator(SELECTORS.common.errorMessage);
    this.successMessage = page.locator(SELECTORS.common.successMessage);
    
    // URL status tracking
    this.urlStatusList = page.locator(SELECTORS.batchProcessor.urlStatusList);
    this.urlStatusItems = page.locator('.url-status-item');
    
    // Vocabulary preview
    this.vocabularyPreview = page.locator('.vocabulary-preview');
    this.previewItems = page.locator('.preview-item');
    
    // Batch history
    this.historyToggle = page.locator('.history-toggle');
    this.batchHistory = page.locator('.batch-history');
    this.historyItems = page.locator('.history-item');
  }

  async goto() {
    // Navigate to the batch processing tab
    await this.page.goto('/');
    await this.page.locator('button:has-text("⚡バッチ処理")').click();
    await this.page.waitForTimeout(1000);
  }

  async enterUrls(urls: string[]) {
    await this.urlTextarea.fill(urls.join('\n'));
  }

  async startProcessing() {
    await this.processButton.click();
  }

  async waitForProcessingStart(timeout: number = 5000) {
    await this.progressSection.waitFor({ state: 'visible', timeout });
  }

  async waitForProcessingComplete(timeout: number = 120000) {
    try {
      // Wait for results section to appear
      await this.resultsSection.waitFor({ state: 'visible', timeout });
    } catch (error) {
      // Check if error occurred
      if (await this.errorMessage.isVisible()) {
        throw new Error(await this.errorMessage.textContent() || 'Batch processing failed');
      }
      throw error;
    }
  }

  async getProgressPercentage(): Promise<string> {
    if (await this.progressText.isVisible()) {
      return await this.progressText.textContent() || '0%';
    }
    return '0%';
  }

  async getProgressStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
  }> {
    const statValues = await this.progressStats.locator('.stat-value').allTextContents();
    return {
      total: parseInt(statValues[0] || '0'),
      completed: parseInt(statValues[1] || '0'),
      failed: parseInt(statValues[2] || '0')
    };
  }

  async getCurrentProcessingUrl(): Promise<string> {
    if (await this.currentProcessing.isVisible()) {
      const code = await this.currentProcessing.locator('code').textContent();
      return code || '';
    }
    return '';
  }

  async getUrlStatuses(): Promise<Array<{
    url: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    title?: string;
    vocabularyCount?: number;
    error?: string;
  }>> {
    const items = await this.urlStatusItems.all();
    const statuses = [];
    
    for (const item of items) {
      const classes = await item.getAttribute('class') || '';
      let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
      
      if (classes.includes('completed')) status = 'completed';
      else if (classes.includes('processing')) status = 'processing';
      else if (classes.includes('failed')) status = 'failed';
      
      const result: any = {
        url: await item.locator('.status-url').textContent() || '',
        status
      };
      
      // Optional fields
      const title = await item.locator('.status-title').textContent();
      if (title) result.title = title;
      
      const vocabCount = await item.locator('.status-vocab-count').textContent();
      if (vocabCount) {
        const match = vocabCount.match(/\d+/);
        if (match) result.vocabularyCount = parseInt(match[0]);
      }
      
      const error = await item.locator('.status-error').textContent();
      if (error) result.error = error;
      
      statuses.push(result);
    }
    
    return statuses;
  }

  async getResultsSummary(): Promise<{
    successful: number;
    totalVocabulary: number;
    failed: number;
  }> {
    const summaryStats = await this.resultsSummary.locator('.stat-value').allTextContents();
    return {
      successful: parseInt(summaryStats[0] || '0'),
      totalVocabulary: parseInt(summaryStats[1] || '0'),
      failed: parseInt(summaryStats[2] || '0')
    };
  }

  async getSuccessfulResults(): Promise<Array<{
    title: string;
    vocabularyCount: number;
    url: string;
  }>> {
    if (!await this.successfulResults.isVisible()) {
      return [];
    }
    
    const results = [];
    const items = await this.successfulResults.locator('.result-item').all();
    
    for (const item of items) {
      const title = await item.locator('.result-title').textContent() || '';
      const stats = await item.locator('.result-stats').textContent() || '';
      const vocabMatch = stats.match(/(\d+)/);
      const url = await item.locator('.result-link').getAttribute('href') || '';
      
      results.push({
        title,
        vocabularyCount: vocabMatch ? parseInt(vocabMatch[1]) : 0,
        url
      });
    }
    
    return results;
  }

  async getFailedResults(): Promise<Array<{
    url: string;
    error: string;
  }>> {
    if (!await this.errorResults.isVisible()) {
      return [];
    }
    
    const errors = [];
    const items = await this.errorResults.locator('.result-item').all();
    
    for (const item of items) {
      errors.push({
        url: await item.locator('.error-url').textContent() || '',
        error: await item.locator('.error-message').textContent() || ''
      });
    }
    
    return errors;
  }

  async getVocabularyPreviewCount(): Promise<number> {
    if (await this.vocabularyPreview.isVisible()) {
      return await this.previewItems.count();
    }
    return 0;
  }

  async getVocabularyPreviewItem(index: number): Promise<{
    japanese: string;
    english: string;
  }> {
    const item = this.previewItems.nth(index);
    return {
      japanese: await item.locator('.preview-japanese').textContent() || '',
      english: await item.locator('.preview-english').textContent() || ''
    };
  }

  async retryFailedUrls() {
    await this.retryButton.click();
  }

  async downloadResults() {
    // Set up download promise before clicking
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadButton.click();
    const download = await downloadPromise;
    return download;
  }

  async toggleHistory() {
    await this.historyToggle.click();
  }

  async isHistoryVisible(): Promise<boolean> {
    return await this.batchHistory.isVisible();
  }

  async getHistoryItemCount(): Promise<number> {
    if (await this.batchHistory.isVisible()) {
      return await this.historyItems.count();
    }
    return 0;
  }

  async getHistoryItem(index: number): Promise<{
    date: string;
    status: string;
    totalUrls: number;
    successful: number;
    failed: number;
  }> {
    const item = this.historyItems.nth(index);
    const stats = await item.locator('.history-stats span').allTextContents();
    
    return {
      date: await item.locator('.history-date').textContent() || '',
      status: await item.locator('.history-status').textContent() || '',
      totalUrls: parseInt(stats[0]?.match(/\d+/)?.[0] || '0'),
      successful: parseInt(stats[1]?.match(/\d+/)?.[0] || '0'),
      failed: parseInt(stats[2]?.match(/\d+/)?.[0] || '0')
    };
  }

  async isProcessing(): Promise<boolean> {
    return await this.processButton.isDisabled();
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

  async clearUrls() {
    await this.urlTextarea.clear();
  }
}