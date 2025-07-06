import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly startButton: Locator;
  readonly loginButton: Locator;
  readonly videoUrlInput: Locator;
  readonly analyzeButton: Locator;
  readonly websocketStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('h1', { hasText: 'AIVlingual' });
    this.startButton = page.getByRole('button', { name: /start|始める/i });
    this.loginButton = page.getByRole('button', { name: /login|ログイン/i });
    this.videoUrlInput = page.getByPlaceholder(/youtube.*url/i);
    this.analyzeButton = page.getByRole('button', { name: /analyze|解析/i });
    this.websocketStatus = page.locator('[data-testid="websocket-status"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async analyzeVideo(videoUrl: string) {
    await this.videoUrlInput.fill(videoUrl);
    await this.analyzeButton.click();
  }

  async waitForWebSocketConnection() {
    await this.websocketStatus.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForFunction(
      () => {
        const status = document.querySelector('[data-testid="websocket-status"]');
        return status?.textContent?.includes('connected') || status?.classList.contains('connected');
      },
      { timeout: 30000 }
    );
  }

  async isLoggedIn(): Promise<boolean> {
    // Check if user menu or logout button is visible
    const userMenu = this.page.locator('[data-testid="user-menu"]');
    const logoutButton = this.page.getByRole('button', { name: /logout|ログアウト/i });
    
    return await userMenu.isVisible() || await logoutButton.isVisible();
  }
}