import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly toggleModeButton: Locator;
  readonly errorMessage: Locator;
  readonly authForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('[data-testid="username-input"]');
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.confirmPasswordInput = page.locator('[data-testid="confirm-password-input"]');
    this.submitButton = page.locator('[data-testid="submit-button"]');
    this.toggleModeButton = page.locator('[data-testid="toggle-mode-button"]');
    this.errorMessage = page.locator('.text-red-600');
    this.authForm = page.locator('[data-testid="auth-form"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    // Ensure we're in login mode
    const buttonText = await this.submitButton.textContent();
    if (buttonText?.includes('アカウント作成')) {
      await this.toggleModeButton.click();
      await this.page.waitForTimeout(500); // Wait for form transition
    }
    
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async register(username: string, email: string, password: string) {
    // Switch to register mode if needed
    const buttonText = await this.submitButton.textContent();
    if (!buttonText?.includes('アカウント作成')) {
      await this.toggleModeButton.click();
      await this.page.waitForTimeout(500); // Wait for form transition
    }
    
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForLoginSuccess() {
    // Wait for redirect or success indication
    await this.page.waitForURL('/', { timeout: 10000 });
  }

  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible' });
    return await this.errorMessage.textContent() || '';
  }
}