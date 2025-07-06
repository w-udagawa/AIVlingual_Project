import { Page, Locator } from '@playwright/test';

export class VocabularyPage {
  readonly page: Page;
  readonly vocabularyGrid: Locator;
  readonly vocabularyCards: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly sortButton: Locator;
  readonly exportButton: Locator;
  readonly deleteButton: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.vocabularyGrid = page.locator('[data-testid="vocabulary-grid"]');
    this.vocabularyCards = page.locator('[data-testid="vocabulary-card"]');
    this.searchInput = page.getByPlaceholder(/search|検索/i);
    this.filterButton = page.getByRole('button', { name: /filter|フィルター/i });
    this.sortButton = page.getByRole('button', { name: /sort|並び替え/i });
    this.exportButton = page.getByRole('button', { name: /export|エクスポート/i });
    this.deleteButton = page.getByRole('button', { name: /delete|削除/i });
    this.pagination = page.locator('[data-testid="pagination"]');
  }

  async goto() {
    // Navigate to vocabulary tab on main page
    await this.page.goto('/');
    await this.page.locator('button:has-text("📚単語帳")').click();
    await this.page.waitForTimeout(1000);
  }

  async searchVocabulary(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
  }

  async getVocabularyCount(): Promise<number> {
    await this.vocabularyCards.first().waitFor({ state: 'visible' });
    return await this.vocabularyCards.count();
  }

  async selectVocabularyItem(index: number) {
    const card = this.vocabularyCards.nth(index);
    const checkbox = card.locator('input[type="checkbox"]');
    await checkbox.check();
  }

  async deleteSelectedItems() {
    await this.deleteButton.click();
    // Confirm deletion in dialog
    const confirmButton = this.page.getByRole('button', { name: /confirm|確認/i });
    await confirmButton.click();
  }

  async exportSelected(format: 'csv' | 'json' | 'anki') {
    await this.exportButton.click();
    const formatButton = this.page.getByRole('menuitem', { name: new RegExp(format, 'i') });
    await formatButton.click();
  }

  async filterByDifficulty(level: 'beginner' | 'intermediate' | 'advanced') {
    await this.filterButton.click();
    const levelButton = this.page.getByRole('menuitem', { name: new RegExp(level, 'i') });
    await levelButton.click();
  }

  async sortBy(criteria: 'date' | 'difficulty' | 'alphabetical') {
    await this.sortButton.click();
    const sortOption = this.page.getByRole('menuitem', { name: new RegExp(criteria, 'i') });
    await sortOption.click();
  }

  async goToPage(pageNumber: number) {
    const pageButton = this.pagination.getByRole('button', { name: pageNumber.toString() });
    await pageButton.click();
  }
}