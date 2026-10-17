import { test, expect } from '@playwright/test';

const vehicles = [
    {
        id: 201,
        make: 'Toyota',
        model: 'Corolla',
        manufacturingYear: 2022,
        registrationNumber: 'WP-ABC-1234',
        vin: 'TOYOTA-VIN-001',
        ownerName: 'Nimal Perera',
        ownerEmail: 'nimal@example.com',
        ownerPhone: '0771112222',
        transactionId: 'TXN-TEST-001',
        assignedAt: '2026-01-15T00:00:00.000Z',
        fuelType: 'Petrol',
    },
    {
        id: 202,
        make: 'Honda',
        model: 'Civic',
        manufacturingYear: 2021,
        registrationNumber: 'WP-XYZ-5678',
        vin: 'HONDA-VIN-002',
        ownerName: 'Kamal Silva',
        ownerEmail: 'kamal@example.com',
        ownerPhone: '0773334444',
        transactionId: 'TXN-TEST-002',
        assignedAt: '2026-02-10T00:00:00.000Z',
        fuelType: 'Petrol',
    },
];

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('token', 'playwright-test-token');
        localStorage.setItem('user', JSON.stringify({
            id: 1,
            fullName: 'Test Administrator',
            email: 'admin@example.com',
            role: 'Administrator',
            isActive: true,
        }));
    });

    await page.route('**/Admin/registrations/pending', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
        });
    });

    await page.route('**/Admin/registrations/all', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
        });
    });

    await page.route('**/Admin/assigned-vehicles', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(vehicles),
        });
    });

    await page.goto('/admin/dashboard');

    await expect(
        page.getByRole('heading', { name: 'User Assigned Vehicles' })
    ).toBeVisible();

    await expect(page.getByText('WP-ABC-1234')).toBeVisible();
    await expect(page.getByText('WP-XYZ-5678')).toBeVisible();
});

test('E2E-VS-001: Search vehicles by registration number', async ({ page }) => {
    const search = page.getByPlaceholder(
        'Search by Reg No, VIN, Make or Owner...'
    );

    await search.fill('WP-ABC-1234');

    await expect(page.getByText('WP-ABC-1234')).toBeVisible();
    await expect(page.getByText('WP-XYZ-5678')).not.toBeVisible();
});

test('E2E-VS-002: Search vehicles by VIN, make, and owner', async ({ page }) => {
    const search = page.getByPlaceholder(
        'Search by Reg No, VIN, Make or Owner...'
    );

    await search.fill('HONDA-VIN-002');
    await expect(page.getByText('WP-XYZ-5678')).toBeVisible();
    await expect(page.getByText('WP-ABC-1234')).not.toBeVisible();

    await search.fill('Toyota');
    await expect(page.getByText('WP-ABC-1234')).toBeVisible();
    await expect(page.getByText('WP-XYZ-5678')).not.toBeVisible();

    await search.fill('Kamal Silva');
    await expect(page.getByText('WP-XYZ-5678')).toBeVisible();
    await expect(page.getByText('WP-ABC-1234')).not.toBeVisible();
});

test('E2E-VS-003: Unmatched search displays an empty state', async ({ page }) => {
    await page.getByPlaceholder(
        'Search by Reg No, VIN, Make or Owner...'
    ).fill('NO-MATCHING-VEHICLE');

    await expect(
        page.getByText('No assigned vehicles found')
    ).toBeVisible();

    await expect(page.getByText('WP-ABC-1234')).not.toBeVisible();
    await expect(page.getByText('WP-XYZ-5678')).not.toBeVisible();
});

test('E2E-VS-004: Administrator can inspect a vehicle record', async ({ page }) => {
    const vehicleRow = page.locator('tr').filter({
        hasText: 'WP-ABC-1234',
    });

    await vehicleRow.getByRole('button', {
        name: 'Inspect Record',
    }).click();

    await expect(
        page.getByRole('heading', { name: 'Vehicle Assignment Details' })
    ).toBeVisible();

    await expect(page.getByText('TOYOTA-VIN-001').last()).toBeVisible();
    await expect(page.getByText('nimal@example.com').last()).toBeVisible();
    await expect(page.getByText('Petrol').last()).toBeVisible();
});
