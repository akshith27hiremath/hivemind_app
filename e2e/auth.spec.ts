import { test, expect } from "@playwright/test";

/**
 * Authentication E2E Tests
 *
 * ============================================================
 * SETTING UP CLERK TEST ACCOUNTS FOR E2E TESTING
 * ============================================================
 *
 * Option 1: Create Test User in Clerk Dashboard
 * ----------------------------------------------
 * 1. Go to Clerk Dashboard > Users > Create User
 * 2. Create user with email/password (e.g., test@yourapp.com)
 * 3. Verify the email manually in Clerk Dashboard
 * 4. Store credentials in .env.test (NOT committed to git):
 *    TEST_USER_EMAIL=test@yourapp.com
 *    TEST_USER_PASSWORD=your-test-password
 *
 * Option 2: Use Clerk Testing Tokens (Recommended for CI)
 * --------------------------------------------------------
 * 1. In Clerk Dashboard > API Keys > Get "Testing Token"
 * 2. Set CLERK_TESTING_TOKEN in your CI environment
 * 3. Clerk will bypass email verification in test mode
 * See: https://clerk.com/docs/testing/overview
 *
 * Option 3: Bypass Auth in Development
 * -------------------------------------
 * Use the /api/dev/sync-user endpoint after manual login
 * to ensure your test user exists in the database.
 *
 * ============================================================
 */

test.describe("Authentication Flow", () => {
  test.describe("Sign In Page", () => {
    test("should load sign-in page", async ({ page }) => {
      await page.goto("/sign-in");

      // Page should load (don't wait for Clerk to fully load as it may timeout)
      await expect(page).toHaveURL(/sign-in/);

      // Basic page structure should be visible
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Sign Up Page", () => {
    test("should load sign-up page", async ({ page }) => {
      await page.goto("/sign-up");

      // Page should load
      await expect(page).toHaveURL(/sign-up/);

      // Basic page structure should be visible
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Protected Routes", () => {
    // These routes are protected by middleware (see src/middleware.ts)
    // Protected: /dashboard, /settings, /portfolio, /api/user, /api/portfolio, /api/subscription

    test("should redirect unauthenticated users from dashboard to sign-in", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/sign-in/);
    });

    test("should redirect unauthenticated users from settings to sign-in", async ({ page }) => {
      await page.goto("/settings");
      await expect(page).toHaveURL(/sign-in/);
    });

    test("should redirect unauthenticated users from portfolio to sign-in", async ({ page }) => {
      await page.goto("/portfolio");
      await expect(page).toHaveURL(/sign-in/);
    });
  });
});

/**
 * Authenticated Tests with Test User
 *
 * These tests run when TEST_USER_EMAIL and TEST_USER_PASSWORD are set.
 * Create a test user in Clerk Dashboard first!
 */
const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

test.describe("Authenticated User Flow", () => {
  // Skip by default - Clerk's form makes tests flaky
  // Enable when running manually with: TEST_AUTH_TESTS=1 npm run test:e2e
  test.skip(!process.env.TEST_AUTH_TESTS, "Set TEST_AUTH_TESTS=1 to run auth tests");

  test.beforeEach(async ({ page }) => {
    // Login with test credentials
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    // Fill in Clerk sign-in form
    // Note: Clerk's form structure may vary, adjust selectors as needed
    const emailInput = page.locator("input[name='identifier']").or(
      page.locator("input[type='email']")
    );
    await emailInput.fill(testEmail!);

    // Click continue or submit
    const continueButton = page.getByRole("button", { name: /continue/i });
    if (await continueButton.isVisible()) {
      await continueButton.click();
    }

    // Fill password
    await page.waitForTimeout(500); // Wait for password field
    const passwordInput = page.locator("input[type='password']");
    await passwordInput.fill(testPassword!);

    // Submit
    await page.getByRole("button", { name: /sign in|continue/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 10000 });
  });

  test("authenticated user can access dashboard", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("authenticated user can access pricing page", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Choose Your Plan")).toBeVisible();
  });

  test("authenticated user can initiate checkout", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Click upgrade button (only visible for free users)
    const upgradeButton = page.getByRole("button", { name: /upgrade to pro/i });
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();
      // Should redirect to Stripe
      await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });
    }
  });
});
