import { test, expect } from '@playwright/test';

const pendingPartner = {
    id: 101,
    businessName: 'Sunrise Auto Care',
    registrationNumber: 'BR-TEST-101',
    fullName: 'Test Partner',
    email: 'partner@example.com',
    phone: '0771234567',
    role: 'Garage',
    approvalStatus: 'Pending',
    isActive: false,
    address: 'Colombo, Sri Lanka',
    brDocumentUrl: null,
};

const activePartner = {
    id: 102,
    businessName: 'City Motor Service',
    registrationNumber: 'BR-TEST-102',
    fullName: 'Active Partner',
    email: 'active@example.com',
    role: 'ServiceCenter',
    approvalStatus: 'Active',
    isActive: true,
};

async function mockAdminApi(page) {
    let pendingPartners = [{ ...pendingPartner }];
    let allPartners = [
        { ...pendingPartner },
        { ...activePartner },
    ];

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
            body: JSON.stringify(pendingPartners),
        });
    });

    await page.route('**/Admin/registrations/all', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(allPartners),
        });
    });

    await page.route('**/Admin/assigned-vehicles', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
        });
    });

    await page.route('**/Admin/registrations/*/approve', async (route) => {
        const request = route.request();

        expect(request.method()).toBe('PUT');

        pendingPartners = pendingPartners.filter(
            (partner) => partner.id !== pendingPartner.id
        );

        allPartners = allPartners.map((partner) =>
            partner.id === pendingPartner.id
                ? {
                    ...partner,
                    approvalStatus: 'Active',
                    isActive: true,
                }
                : partner
        );

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Partner approved successfully.' }),
        });
    });
}

test.beforeEach(async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/admin/dashboard');
});

test('E2E-AW-001: Administrator can open the dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/dashboard\/?$/);

    await expect(
        page.getByRole('heading', { name: 'Partner Registration Requests' })
    ).toBeVisible();

    await expect(
        page.getByRole('heading', { name: 'User Assigned Vehicles' })
    ).toBeVisible();

    await expect(page.getByText('Sunrise Auto Care')).toBeVisible();
});

test('E2E-AW-002: Administrator can search for a partner', async ({ page }) => {
    await expect(page.getByText('Sunrise Auto Care')).toBeVisible();

    await page.getByPlaceholder('Search partner or BR...')
        .fill('Sunrise');

    await expect(page.getByText('Sunrise Auto Care')).toBeVisible();
    await expect(page.getByText('City Motor Service')).not.toBeVisible();

    await page.getByPlaceholder('Search partner or BR...')
        .fill('partner-that-does-not-exist');

    await expect(
        page.getByText('No pending applications')
    ).toBeVisible();
});

test('E2E-AW-003: Administrator can view partner details', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(
        page.getByText('Sunrise Auto Care').last()
    ).toBeVisible();

    await expect(
        page.getByText('BR-TEST-101').last()
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: 'Approve' })
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: 'Reject' })
    ).toBeVisible();
});

test('E2E-AW-004: Administrator can approve a pending partner', async ({ page }) => {
    page.on('dialog', async (dialog) => {
        await dialog.accept();
    });

    await page.getByRole('button', { name: 'View Details' }).first().click();

    await page.getByRole('button', { name: 'Approve' }).click();

    await expect(
        page.getByText(/Approved Sunrise Auto Care/i)
    ).toBeVisible();

    await expect(
        page.getByText('Sunrise Auto Care')
    ).not.toBeVisible();
});
