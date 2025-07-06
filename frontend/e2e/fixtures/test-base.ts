import { test as base, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { LoginPage } from '../page-objects/LoginPage';
import { VideoAnalysisPage } from '../page-objects/VideoAnalysisPage';
import { VocabularyPage } from '../page-objects/VocabularyPage';

// Define custom fixtures
type MyFixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  videoAnalysisPage: VideoAnalysisPage;
  vocabularyPage: VocabularyPage;
  authenticatedUser: void;
};

// Extend base test with custom fixtures
export const test = base.extend<MyFixtures>({
  // Page object fixtures
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  videoAnalysisPage: async ({ page }, use) => {
    const videoAnalysisPage = new VideoAnalysisPage(page);
    await use(videoAnalysisPage);
  },

  vocabularyPage: async ({ page }, use) => {
    const vocabularyPage = new VocabularyPage(page);
    await use(vocabularyPage);
  },

  // Authenticated user fixture
  authenticatedUser: async ({ page, request }, use) => {
    // Register a test user
    const testUser = {
      username: `test_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'Test123!@#'
    };

    const response = await request.post('http://localhost:8000/api/v1/auth/register', {
      data: testUser
    });

    expect(response.ok()).toBeTruthy();
    const { access_token } = await response.json();

    // Store the token in localStorage or cookies as your app requires
    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token);
    }, access_token);

    await use();

    // Cleanup: Logout after test
    await request.post('http://localhost:8000/api/v1/auth/logout', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
  },
});

export { expect };