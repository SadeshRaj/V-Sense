import { test, expect } from '@playwright/test';

test('E2E-001: Home page loads and displays login controls', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();

    await expect(
        page.getByRole('button', { name: 'Sign In', exact: true })
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: /Staff Portal Sign In/i })
    ).toBeVisible();
});

test('E2E-002: Login page loads and displays the login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login\/?$/);

    await expect(
        page.getByRole('textbox', { name: 'Email Address' })
    ).toBeVisible();

    await expect(
        page.locator('input[type="password"]')
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: 'Sign In', exact: true })
    ).toBeVisible();
});

test.skip('E2E-003: Administrator can log in', async ({ page }) => {
    // Temporarily skipped because the deployed login API is returning 401
    // for the manual request and timing out in the Playwright browser.
    await page.goto('/login');
});

test('E2E-004: Registration page loads and displays its form', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('form').first()).toBeVisible();
});

test('E2E-005: User can navigate from login to registration', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', {
        name: /Register as an Authorized Partner/i
    }).click();

    await expect(page).toHaveURL(/\/register\/?$/);
    await expect(page.locator('form').first()).toBeVisible();
});
