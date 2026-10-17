import { test, expect } from '@playwright/test';

const verificationUrl = '/verify/test-certificate-123';

test('E2E-PV-001: Verification page displays its header', async ({ page }) => {
    await page.route('**/workflows/verify/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                valid: false,
                message: 'Invalid or pending certificate.',
            }),
        });
    });

    await page.goto(verificationUrl);

    await expect(
        page.getByRole('heading', { name: 'V-Sense' })
    ).toBeVisible();

    await expect(
        page.getByText('Digital Twin Verification')
    ).toBeVisible();
});

test('E2E-PV-002: Invalid certificate displays verification failure', async ({ page }) => {
    await page.route('**/workflows/verify/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                valid: false,
                message: 'Invalid certificate.',
            }),
        });
    });

    await page.goto(verificationUrl);

    await expect(
        page.getByRole('heading', { name: 'Verification Failed' })
    ).toBeVisible();

    await expect(page.getByText('Invalid certificate.')).toBeVisible();
});

test('E2E-PV-003: Network failure displays connection error', async ({ page }) => {
    await page.route('**/workflows/verify/**', async (route) => {
        await route.abort('failed');
    });

    await page.goto(verificationUrl);

    await expect(
        page.getByRole('heading', { name: 'Connection Error' })
    ).toBeVisible();

    await expect(
        page.getByText(/Network error while verifying the certificate/i)
    ).toBeVisible();
});

test('E2E-PV-004: Valid certificate displays vehicle details', async ({ page }) => {
    await page.route('**/workflows/verify/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                valid: true,
                workflowId: 'workflow-test-001',
                vehicle: {
                    make: 'Toyota',
                    model: 'Corolla',
                    year: 2022,
                    registrationNumber: 'TEST-1234',
                    vin: 'TESTVIN1234567890',
                },
                aiInsight: 'Vehicle condition checked.\n- No major issues reported.',
                records: [
                    {
                        createdAt: '2026-01-15T00:00:00.000Z',
                        title: 'Routine maintenance',
                        description: 'Oil and filter changed.',
                        garageName: 'Test Garage',
                        garageVerified: true,
                        odometerReading: 25000,
                    },
                ],
            }),
        });
    });

    await page.goto(verificationUrl);

    await expect(
        page.getByRole('heading', { name: 'Authentic Certificate' })
    ).toBeVisible();

    await expect(page.getByText('Toyota Corolla')).toBeVisible();
    await expect(page.getByText('TEST-1234')).toBeVisible();
    await expect(page.getByText('TESTVIN1234567890')).toBeVisible();

    await expect(
        page.getByText('Routine maintenance')
    ).toBeVisible();

    await expect(page.getByText('Test Garage (Verified)')).toBeVisible();
});

test('E2E-PV-005: User can return to the home page', async ({ page }) => {
    await page.route('**/workflows/verify/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                valid: false,
                message: 'Invalid certificate.',
            }),
        });
    });

    await page.goto(verificationUrl);

    await page.getByRole('link', { name: 'Return to V-Sense Home' }).click();

    await expect(page).toHaveURL('/');
});
