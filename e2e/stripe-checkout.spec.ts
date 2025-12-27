import { test, expect } from "@playwright/test";

/**
 * Stripe Checkout E2E Tests - Critical Money Path
 *
 * These tests verify the subscription upgrade flow works correctly.
 * They test up to the point of Stripe redirect (we don't complete payment
 * in E2E as that requires Stripe test card handling).
 *
 * For full payment flow testing:
 * 1. Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
 * 2. Use test card: 4242 4242 4242 4242
 * 3. Verify webhook creates subscription in database
 */

test.describe("Stripe Checkout Flow", () => {
  test.describe("Landing Page Pricing CTA", () => {
    test("pricing section should display correct Pro price", async ({ page }) => {
      await page.goto("/");

      // Scroll to pricing
      await page.getByText("Simple, Transparent Pricing").scrollIntoViewIfNeeded();

      // Verify Pro plan price
      await expect(page.getByText("$5")).toBeVisible();
      await expect(page.getByText("/month")).toBeVisible();
    });

    test("clicking Get Started on Pro plan should redirect to sign-up", async ({ page }) => {
      await page.goto("/");

      // Scroll to pricing section
      await page.getByText("Simple, Transparent Pricing").scrollIntoViewIfNeeded();

      // Find the Pro plan card and click Get Started
      // The Pro card contains $5/month
      const proCard = page.locator("div").filter({ hasText: /\$5.*\/month/ }).first();
      const getStartedButton = proCard.getByRole("link", { name: /get started/i });

      // If there's no button in the Pro card specifically, use the first one
      if (await getStartedButton.count() > 0) {
        await getStartedButton.click();
      } else {
        // Click any Get Started button
        await page.getByRole("link", { name: /get started/i }).first().click();
      }

      // Should redirect to sign-up (unauthenticated users)
      await expect(page).toHaveURL(/sign-up|sign-in/);
    });
  });
});

/**
 * Authenticated Checkout Tests
 *
 * These tests require authentication to be set up.
 * They verify the critical path: Pricing -> Checkout -> Stripe
 */
test.describe.skip("Authenticated Checkout Flow", () => {
  // Skip by default - requires auth setup
  // See auth.spec.ts for auth setup instructions

  test("pricing page should show Free and Pro plans", async ({ page }) => {
    // TODO: Inject authentication
    await page.goto("/pricing");

    // Wait for subscription status to load
    await page.waitForLoadState("networkidle");

    // Should show both plans
    await expect(page.getByText("Choose Your Plan")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
  });

  test("free user clicking Upgrade should redirect to Stripe checkout", async ({ page }) => {
    // TODO: Inject authentication for a FREE tier user
    await page.goto("/pricing");

    // Click Upgrade to Pro
    await page.getByRole("button", { name: /upgrade to pro/i }).click();

    // Should redirect to Stripe checkout
    // Stripe checkout URL starts with checkout.stripe.com
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 10000 });
  });

  test("pro user should see Active badge on Pro plan", async ({ page }) => {
    // TODO: Inject authentication for a PRO tier user
    await page.goto("/pricing");

    // Wait for subscription status to load
    await page.waitForLoadState("networkidle");

    // Should show Active badge on Pro
    await expect(page.getByText("Active")).toBeVisible();
  });

  test("pro user should see Manage Subscription button", async ({ page }) => {
    // TODO: Inject authentication for a PRO tier user
    await page.goto("/pricing");

    // Wait for subscription status to load
    await page.waitForLoadState("networkidle");

    // Should show manage subscription button
    await expect(page.getByRole("button", { name: /manage subscription/i })).toBeVisible();
  });

  test("clicking Manage Subscription should redirect to Stripe portal", async ({ page }) => {
    // TODO: Inject authentication for a PRO tier user
    await page.goto("/pricing");

    await page.getByRole("button", { name: /manage subscription/i }).click();

    // Should redirect to Stripe billing portal
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 10000 });
  });
});

/**
 * API Route Tests - SKIPPED
 *
 * These require auth which cannot be easily tested in E2E.
 * See integration tests in src/lib for API logic testing.
 */
test.describe.skip("Checkout API Routes", () => {
  // Skipped - use integration tests with mocked auth instead
  test("checkout endpoint should require authentication", async () => {});
  test("subscription status endpoint should require authentication", async () => {});
  test("customer portal endpoint should require authentication", async () => {});
});

/**
 * ==========================================================
 * MANUAL E2E TESTING GUIDE FOR STRIPE PAYMENTS
 * ==========================================================
 *
 * Since Clerk auth cannot be automated without test accounts,
 * use this guide for manual E2E testing of the payment flow.
 *
 * PREREQUISITES:
 * 1. Docker running with database
 * 2. Stripe CLI installed: https://stripe.com/docs/stripe-cli
 * 3. A test user account created in Clerk
 *
 * SETUP:
 * 1. Start the app: docker compose -f docker-compose.dev.yml up -d
 * 2. Start Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *    (Save the webhook secret, it's stable for the CLI)
 * 3. Sync your user to DB: POST /api/dev/sync-user (after logging in)
 *
 * STRIPE TEST CARDS:
 * ┌────────────────────┬──────────────────────────────────┐
 * │ Card Number        │ Description                      │
 * ├────────────────────┼──────────────────────────────────┤
 * │ 4242424242424242   │ Succeeds and processes payment   │
 * │ 4000000000000002   │ Card declined                    │
 * │ 4000000000009995   │ Insufficient funds               │
 * │ 4000000000000069   │ Expired card                     │
 * │ 4000000000000127   │ Incorrect CVC                    │
 * │ 4000002500003155   │ Requires 3D Secure auth          │
 * └────────────────────┴──────────────────────────────────┘
 * Use any future date for expiry, any 3 digits for CVC.
 *
 * MANUAL TEST FLOW:
 * 1. Sign in to your app at http://localhost:3000/sign-in
 * 2. Go to http://localhost:3000/pricing
 * 3. Click "Upgrade to Pro"
 * 4. On Stripe checkout, use test card 4242 4242 4242 4242
 * 5. Complete payment
 * 6. Verify redirect back to /settings?success=true
 * 7. Check subscription status at /pricing (should show "Active")
 *
 * VERIFY IN DATABASE:
 * docker exec hivemind-postgres-1 psql -U postgres -d hivemind_dev \
 *   -c "SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1;"
 *
 * TEST IDEMPOTENCY:
 * 1. Click "Upgrade to Pro" rapidly multiple times
 * 2. Verify only ONE Stripe customer is created
 * 3. Only one subscription should exist after completing payment
 *
 * TEST CANCELLATION:
 * 1. After subscribing, click "Manage Subscription"
 * 2. In Stripe portal, click "Cancel subscription"
 * 3. Verify subscription shows "cancelAtPeriodEnd: true"
 *
 * WEBHOOK EVENTS TO VERIFY:
 * - checkout.session.completed → Creates subscription
 * - customer.subscription.updated → Updates subscription status
 * - customer.subscription.deleted → Marks subscription inactive
 */
