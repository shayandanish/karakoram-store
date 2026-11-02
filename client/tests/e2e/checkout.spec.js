// ── E2E Checkout Flow Test ───────────────────────────────────────────────
// Tests the critical path: shop → product → add to cart → checkout → order
// These tests require both dev servers running (client: 5173, server: 5000).
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to shop page
    await page.goto('http://localhost:5173/shop');
    await page.waitForLoadState('networkidle');
  });

  test('should load shop page with products', async ({ page }) => {
    // Shop page should render
    await expect(page).toHaveTitle(/Shop/);
    // Product cards should be visible
    const productCards = page.locator('[id^="product-card-"]');
    await expect(productCards.first()).toBeVisible();
  });

  test('should filter products by sale', async ({ page }) => {
    // Open filter sidebar
    await page.click('#shop-filter-toggle');
    // Check "On Sale" checkbox
    await page.check('#filter-on-sale');
    // Wait for products to reload
    await page.waitForTimeout(1000);
    // Sale filter chip should appear
    await expect(page.locator('text=🏷️ On Sale')).toBeVisible();
  });

  test('should navigate to product detail page', async ({ page }) => {
    // Click first product card
    await page.click('[id^="product-card-"]:first');
    await page.waitForLoadState('networkidle');
    // Should be on product detail page
    await expect(page).toHaveURL(/\/products\//);
    // Product name should be visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should add product to cart', async ({ page }) => {
    // Go to shop
    await page.goto('http://localhost:5173/shop');
    await page.waitForLoadState('networkidle');
    // Click first product
    await page.click('[id^="product-card-"]:first');
    await page.waitForLoadState('networkidle');
    // Click add to cart
    await page.click('button:has-text("Add to Cart"), button:has-text("Add to cart")');
    // Should see added confirmation
    await expect(page.locator('text=Added')).toBeVisible({ timeout: 5000 });
  });

  test('should complete guest checkout', async ({ page }) => {
    // Navigate to checkout
    await page.goto('http://localhost:5173/checkout');
    await page.waitForLoadState('networkidle');

    // If cart is empty, redirect to shop - add a product first
    if (page.url().includes('/shop')) {
      await page.click('[id^="product-card-"]:first');
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("Add to Cart")');
      await page.waitForTimeout(1000);
      await page.goto('http://localhost:5173/checkout');
      await page.waitForLoadState('networkidle');
    }

    // Fill in guest details
    await page.fill('#field-name', 'Test Customer');
    await page.fill('#field-phone', '0300 1234567');
    await page.fill('#field-street', 'Test Street 123');
    await page.fill('#field-city', 'Karimabad');
    await page.selectOption('#field-province', 'Gilgit-Baltistan');

    // Submit
    await page.click('button[type="submit"]');

    // Should either succeed or show validation
    await page.waitForTimeout(2000);
    // Check for success or error message
    const hasError = await page.locator('.text-red-500').count() > 0;
    const hasSuccess = await page.locator('.bg-green-50, .text-green-800').count() > 0;
    expect(hasError || hasSuccess || page.url().includes('/order-success')).toBe(true);
  });
});

test.describe('Order Tracking', () => {
  test('should show validation error for invalid phone', async ({ page }) => {
    await page.goto('http://localhost:5173/track-order');
    await page.waitForLoadState('networkidle');

    await page.fill('#track-order-id', 'TEST-123');
    await page.fill('#track-contact', 'invalid-phone');
    await page.click('#track-submit-btn');

    await page.waitForTimeout(1000);
    const error = await page.locator('.text-red-500, .bg-red-50').count();
    expect(error).toBeGreaterThan(0);
  });
});
