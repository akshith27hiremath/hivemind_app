import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the hero section with main headline", async ({ page }) => {
    // Check hero headline
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Portfolio");

    // Check CTA buttons exist
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
  });

  test("should display navigation with sign in link", async ({ page }) => {
    // Check header navigation
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Check sign in link
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("should display features section", async ({ page }) => {
    // Scroll to features section
    const featuresSection = page.getByText("Everything you need to track your investments");
    await expect(featuresSection).toBeVisible();
  });

  test("should display pricing section with Free and Pro plans", async ({ page }) => {
    // Check pricing section exists
    await expect(page.getByText("Simple, Transparent Pricing")).toBeVisible();

    // Check both plans are displayed
    await expect(page.getByText("Free").first()).toBeVisible();
    await expect(page.getByText("Pro").first()).toBeVisible();

    // Check Pro price
    await expect(page.getByText("$5")).toBeVisible();
  });

  test("should display footer with copyright", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("HiveMind");
  });

  test("should navigate to sign-up when clicking Get Started", async ({ page }) => {
    // Wait for Clerk auth to load (replaces loading placeholder with actual buttons)
    await page.waitForLoadState("networkidle");

    // Click the Get Started button in header (wait for it to be visible)
    const getStartedButton = page.getByRole("link", { name: /get started/i }).first();
    await expect(getStartedButton).toBeVisible({ timeout: 10000 });
    await getStartedButton.click();

    // Should redirect to sign-up page (Clerk hosted or local)
    await expect(page).toHaveURL(/sign-up/, { timeout: 10000 });
  });

  test("should navigate to sign-in when clicking Sign In", async ({ page }) => {
    // Wait for Clerk auth to load
    await page.waitForLoadState("networkidle");

    // Click the Sign In button (wait for it to be visible)
    const signInButton = page.getByRole("link", { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
  });
});

test.describe("Landing Page - Responsive", () => {
  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Hero should still be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // CTA should be visible
    await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();
  });
});
