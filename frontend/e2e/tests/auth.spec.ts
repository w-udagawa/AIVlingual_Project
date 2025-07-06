import { test, expect } from '../fixtures/test-base';

test.describe('認証フロー', () => {
  test('新規ユーザー登録ができる', async ({ page, loginPage }) => {
    await loginPage.goto();
    
    const username = `test_user_${Date.now()}`;
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await loginPage.register(username, email, password);
    
    // 登録成功後、ホームページにリダイレクトされることを確認
    await expect(page).toHaveURL('/');
    
    // ユーザーメニューが表示されることを確認
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();
    
    // ユーザー名が表示されることを確認
    await expect(userMenu).toContainText(username);
  });

  test('既存ユーザーでログインできる', async ({ page, loginPage }) => {
    await loginPage.goto();
    
    // 登録済みのテストユーザーでログイン
    await loginPage.login('test', 'test0702');
    
    // ログイン成功後、ホームページにリダイレクト
    await expect(page).toHaveURL('/');
    
    // ユーザーメニューが表示される
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();
    await expect(userMenu).toContainText('test');
  });

  test('無効な認証情報でログインに失敗する', async ({ page, loginPage }) => {
    await loginPage.goto();
    
    await loginPage.login('invalid_user', 'wrong_password');
    
    // エラーメッセージが表示される（react-hot-toast）
    await expect(page.locator('[role="status"]').filter({ hasText: 'ログインに失敗しました' })).toBeVisible();
    
    // ログインページに留まる
    await expect(page).toHaveURL('/login');
  });

  test('ログアウトができる', async ({ page, loginPage }) => {
    // まずログイン
    await loginPage.goto();
    await loginPage.login('test', 'test0702');
    
    // ホームページに遷移を確認
    await expect(page).toHaveURL('/');
    
    // ユーザーメニューをクリック
    const userMenu = page.locator('[data-testid="user-menu"]');
    await userMenu.click();
    
    // ログアウトボタンをクリック
    const logoutButton = page.locator('[data-testid="logout-button"]');
    await logoutButton.click();
    
    // ログインページにリダイレクトされる
    await expect(page).toHaveURL('/login');
  });

  test('認証が必要なページは未ログイン時にリダイレクトされる', async ({ page }) => {
    // 直接ホームページにアクセス
    await page.goto('/');
    
    // ログインページにリダイレクトされる
    await expect(page).toHaveURL('/login');
  });

  test('パスワードのバリデーションが機能する', async ({ page, loginPage }) => {
    await loginPage.goto();
    
    // 登録モードに切り替え
    await loginPage.toggleModeButton.click();
    
    // 短いパスワードを入力
    await loginPage.passwordInput.fill('short');
    
    // フォーカスを外してバリデーションを発動
    await loginPage.confirmPasswordInput.focus();
    
    // エラーメッセージが即座に表示される
    const errorMessage = page.locator('.text-red-600');
    await expect(errorMessage).toContainText('パスワードは8文字以上');
  });

  test('メールアドレスのバリデーションが機能する', async ({ page, loginPage }) => {
    await loginPage.goto();
    
    // 登録モードに切り替え
    await loginPage.toggleModeButton.click();
    
    // 無効なメールアドレスを入力
    await loginPage.emailInput.fill('invalid-email');
    
    // フォーカスを外してバリデーションを発動
    await loginPage.passwordInput.focus();
    
    // エラーメッセージが即座に表示される
    const errorMessage = page.locator('.text-red-600');
    await expect(errorMessage).toContainText('有効なメールアドレス');
  });
});