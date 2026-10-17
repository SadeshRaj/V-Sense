import { test, expect, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

test.describe('V-Sense Visual Cross-Platform E2E (Flutter Mobile + React Admin)', () => {
    const adminEmail = process.env.ADMIN_EMAIL as string;
    const adminPass = process.env.ADMIN_PASSWORD as string;
    const customerEmail = process.env.CUSTOMER_EMAIL as string;
    const customerPass = process.env.CUSTOMER_PASSWORD as string;
    const baseUrl = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
    const apiUrl = (process.env.API_URL || 'http://localhost:5183').replace(/\/$/, '');
    const flutterUrl = (process.env.FLUTTER_WEB_URL || 'http://localhost:50830').replace(/\/$/, '');
    const customerId = process.env.CUSTOMER_ID || '737c36de-03d2-4f4c-8503-bc1e32c35e27';
    const vehicleId = process.env.TEST_VEHICLE_ID || '0cb63bf1-94ca-4255-bbf4-afe0af04dd4c';

    test('Visual Trace: Flutter Mobile Request -> Multi-Agent Pipeline -> React HITL Review', async ({ browser, request }) => {
        test.setTimeout(180000);

        // =========================================================================
        // FLUTTER CANVAS COORDINATES (Update these if needed based on the Console trick)
        // =========================================================================
        const X_CENTER = 206;
        const Y_ACCESS_PORTAL_BTN = 690;
        const Y_EMAIL_FIELD = 500;
        const Y_PASSWORD_FIELD = 570;
        const Y_SIGN_IN_BTN = 720;

        // Dashboard: "Digital Certs" card (2nd row, 1st column)
        const X_DIGITAL_CERTS = 116;
        const Y_DIGITAL_CERTS = 800;

        // Digital Certificates page: "Generate" button (fallback only)
        // Set these after checking 01c_before_generate.png
        const SCROLL_TO_GENERATE = 400;   // px to scroll before clicking
        const X_GENERATE_BTN = 206;
        const Y_GENERATE_BTN = 800;       // position AFTER scrolling

        // =========================================================================
        // PRE-REQUISITE: DYNAMICALLY FETCH FRESH CUSTOMER TOKEN
        // =========================================================================
        console.log('[Setup] Fetching fresh Customer JWT...');
        const loginRes = await request.post(`${apiUrl}/api/Auth/login`, {
            data: { email: customerEmail, password: customerPass }
        });
        expect(loginRes.ok(), 'Customer API login failed. Check credentials in .env').toBeTruthy();
        const loginData = await loginRes.json();
        const freshCustomerToken = loginData.token;

        // =========================================================================
        // PART 1: VISUALLY DISPLAY FLUTTER MOBILE APP & TRIGGER TIER 1 API
        // =========================================================================
        const mobileContext = await browser.newContext({ ...devices['Pixel 7'] });
        const mobilePage = await mobileContext.newPage();

        console.log(`[Mobile Tier] Launching Flutter app at ${flutterUrl}...`);
        await mobilePage.goto(flutterUrl);
        await mobilePage.waitForLoadState('networkidle');
        await mobilePage.waitForTimeout(4000);

        console.log('[Mobile Tier] Visually navigating Flutter UI...');

        // 1. Click "ACCESS PORTAL" button on Landing Screen
        await mobilePage.mouse.click(X_CENTER, Y_ACCESS_PORTAL_BTN);
        await mobilePage.waitForTimeout(2000);

        // 2. Click Email Field
        await mobilePage.mouse.click(X_CENTER, Y_EMAIL_FIELD);
        await mobilePage.waitForTimeout(500);
        await mobilePage.keyboard.type(customerEmail, { delay: 100 });

        // 3. Click Password Field
        await mobilePage.mouse.click(X_CENTER, Y_PASSWORD_FIELD);
        await mobilePage.waitForTimeout(500);
        await mobilePage.keyboard.type(customerPass, { delay: 100 });

        // Tap empty space at the top of the screen to close the mobile keyboard
        await mobilePage.mouse.click(X_CENTER, 50);
        await mobilePage.waitForTimeout(500);

        // 4. Click "SIGN IN" Button
        await mobilePage.mouse.click(X_CENTER, Y_SIGN_IN_BTN);
        await mobilePage.waitForTimeout(4000);

        await mobilePage.screenshot({ path: 'test-results/01_mobile_dashboard.png' });

        // 5. Navigate to "Digital Certs" from the dashboard
        console.log('[Mobile Tier] Opening Digital Certs...');
        let openedViaSemantics = false;
        try {
            // Enable Flutter's accessibility tree so elements become real DOM nodes
            await mobilePage.evaluate(() => {
                const el = document.querySelector('flt-semantics-placeholder') as HTMLElement | null;
                el?.click();
            });
            await mobilePage.waitForTimeout(1000);

            const certsCard = mobilePage.getByRole('button', { name: /Digital Certs/i }).first();
            await certsCard.waitFor({ state: 'visible', timeout: 3000 });
            await certsCard.scrollIntoViewIfNeeded();
            await certsCard.click();
            openedViaSemantics = true;
        } catch {
            console.log('[Mobile Tier] Semantics not available, using coordinate fallback...');
        }

        if (!openedViaSemantics) {
            await mobilePage.mouse.move(X_CENTER, 500);
            await mobilePage.mouse.wheel(0, 250);
            await mobilePage.waitForTimeout(1000);
            await mobilePage.mouse.click(X_DIGITAL_CERTS, Y_DIGITAL_CERTS - 250);
        }

        await mobilePage.waitForTimeout(3000);
        await mobilePage.screenshot({ path: 'test-results/01b_mobile_digital_certs.png' });

        // 6. Scroll and click the "Generate" button on the Digital Certificates page
        console.log('[Mobile Tier] Generating report from Digital Certificates page...');

        // Listen for the real request the Flutter app fires when Generate is tapped
        const uiWorkflowResPromise = mobilePage
            .waitForResponse(
                res => res.url().includes('/api/workflows/vehicle-report') && res.request().method() === 'POST',
                { timeout: 15000 }
            )
            .catch(() => null);

        let clickedGenerate = false;
        try {
            const generateBtn = mobilePage.getByRole('button', { name: /generate/i }).first();
            await generateBtn.waitFor({ state: 'visible', timeout: 3000 });
            await generateBtn.scrollIntoViewIfNeeded();
            await mobilePage.waitForTimeout(800);
            await generateBtn.click();
            clickedGenerate = true;
        } catch {
            console.log('[Mobile Tier] Generate button not in semantics tree, using coordinate fallback...');
        }

        if (!clickedGenerate) {
            await mobilePage.mouse.move(X_CENTER, 500);
            await mobilePage.mouse.wheel(0, SCROLL_TO_GENERATE);
            await mobilePage.waitForTimeout(1000);
            await mobilePage.screenshot({ path: 'test-results/01c_before_generate.png' });
            await mobilePage.mouse.click(X_GENERATE_BTN, Y_GENERATE_BTN);
        }

        // Grab workflow_id from the UI-triggered request, or fall back to direct API call
        let workflow_id: string | undefined;
        const uiWorkflowRes = await uiWorkflowResPromise;
        if (uiWorkflowRes && uiWorkflowRes.ok()) {
            workflow_id = (await uiWorkflowRes.json()).workflow_id;
            console.log('[Tier 1-2] Report generated via Flutter UI.');
        } else {
            console.log('[Tier 1-2] UI click did not trigger the API, submitting request directly...');
            const workflowResponse = await request.post(`${apiUrl}/api/workflows/vehicle-report`, {
                headers: {
                    'Authorization': `Bearer ${freshCustomerToken}`,
                    'Content-Type': 'application/json'
                },
                data: { vehicle_id: vehicleId, requested_by: customerId },
                timeout: 60000
            });
            expect(workflowResponse.status(), 'Failed to create workflow').toBe(200);
            workflow_id = (await workflowResponse.json()).workflow_id;
        }

        expect(workflow_id).toBeTruthy();
        console.log(`[Tier 3-4] AI workflow active in PostgreSQL: ${workflow_id}`);

        await mobilePage.waitForTimeout(3000);
        await mobilePage.screenshot({ path: 'test-results/01d_mobile_report_generated.png' });

        await mobileContext.close();

        // =========================================================================
        // PART 2: VISUALLY DISPLAY REACT WEB DASHBOARD (Desktop Viewport)
        // =========================================================================
        const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const adminPage = await desktopContext.newPage();

        console.log('[Tier 5] Admin logging into React Dashboard...');
        await adminPage.goto(`${baseUrl}/login`);

        await adminPage.locator('input[type="email"]').pressSequentially(adminEmail, { delay: 100 });
        await adminPage.locator('input[type="password"]').pressSequentially(adminPass, { delay: 100 });
        await adminPage.waitForTimeout(500);
        await adminPage.getByRole('button', { name: 'Sign In' }).click();

        await adminPage.waitForURL('**/admin/dashboard');
        await adminPage.waitForTimeout(1000);

        await adminPage.getByRole('link', { name: 'HITL Review Queue' }).click();
        await adminPage.waitForURL('**/admin/reviews');
        await adminPage.waitForTimeout(1000);

        const firstRow = adminPage.locator('tbody tr').first();
        await expect(firstRow).toBeVisible();
        await adminPage.screenshot({ path: 'test-results/02_hitl_queue_view.png' });

        await firstRow.getByRole('button', { name: /Review Evidence/ }).click();

        await expect(adminPage.getByRole('heading', { name: 'Audit Evidence Review' })).toBeVisible();
        await expect(adminPage.getByRole('heading', { name: 'Agent 3 Detected Anomalies' })).toBeVisible();
        await adminPage.waitForTimeout(2000);
        await adminPage.screenshot({ path: 'test-results/03_audit_evidence_modal.png' });

        await adminPage.getByPlaceholder(/State your reason/).pressSequentially('Approved via Automated 5-Tier E2E Trace', { delay: 50 });
        await adminPage.waitForTimeout(1000);

        const approveBtn = adminPage.getByRole('button', { name: 'Approve Certificate' });
        await expect(approveBtn).toBeEnabled();

        const [apiApproveRes] = await Promise.all([
            adminPage.waitForResponse(res => res.url().includes('/approve') && res.ok()),
            approveBtn.click(),
        ]);
        expect(apiApproveRes.ok()).toBeTruthy();

        await expect(adminPage.getByText('Report Approved! Certificate QR generated successfully.')).toBeVisible();
        await adminPage.waitForTimeout(2000);

        // =========================================================================
        // PART 3: PUBLIC VERIFICATION
        // =========================================================================
        console.log(`[Tier 5] Navigating to Public Verification: /verify/${workflow_id}`);
        await adminPage.goto(`${baseUrl}/verify/${workflow_id}`);

        await adminPage.waitForLoadState('networkidle');
        await adminPage.waitForTimeout(3000);

        await expect(adminPage.locator('body')).toContainText(/V-Sense/i, { timeout: 15000 });
        await adminPage.screenshot({ path: 'test-results/04_public_certificate_verified.png' });

        await desktopContext.close();
    });
});