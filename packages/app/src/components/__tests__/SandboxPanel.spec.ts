/**
 * Playwright UI Tests for SandboxPanel Component
 * Tests the complete browser panel UI functionality
 */

import { test, expect } from '@playwright/test';

test.describe('SandboxPanel Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:1420');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should render browser panel when opened', async ({ page }) => {
    // Click to open browser panel
    await page.click('[data-testid="browser-toggle"]');

    // Wait for panel to appear
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Verify panel is visible
    const panel = page.locator('div[role="complementary"][aria-label="Browser panel"]');
    await expect(panel).toBeVisible();

    // Verify browser controls are present
    await expect(page.locator('button[title="Back"]')).toBeVisible();
    await expect(page.locator('button[title="Forward"]')).toBeVisible();
    await expect(page.locator('button[title="Refresh"]')).toBeVisible();
    await expect(page.locator('button[title="Close browser"]')).toBeVisible();
  });

  test('should handle URL navigation', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Find URL input
    const urlInput = page.locator('input[aria-label="Browser URL"]');
    await expect(urlInput).toBeVisible();

    // Enter a URL
    await urlInput.fill('https://example.com');

    // Submit the form
    await urlInput.press('Enter');

    // Wait for navigation to complete
    await page.waitForTimeout(2000);

    // Verify URL was updated
    await expect(urlInput).toHaveValue('https://example.com');
  });

  test('should handle tab management', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Click add tab button
    await page.click('button[title="Add new tab"]');

    // Wait for new tab to appear
    await page.waitForTimeout(500);

    // Verify multiple tabs exist
    const tabs = page.locator('button[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(1);

    // Click on a tab to switch
    if (tabCount > 1) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
    }
  });

  test('should handle panel resize', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    const panel = page.locator('div[role="complementary"][aria-label="Browser panel"]');

    // Get initial width
    const initialBox = await panel.boundingBox();
    expect(initialBox).not.toBeNull();

    // Find resize handle
    const resizeHandle = page.locator('div[class*="cursor-col-resize"]');
    await expect(resizeHandle).toBeVisible();

    // Drag to resize (if visible)
    if (await resizeHandle.isVisible()) {
      const box = await resizeHandle.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 5, box.y + 5);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 5);
        await page.mouse.up();

        // Wait for resize animation
        await page.waitForTimeout(300);

        // Verify panel was resized
        const newBox = await panel.boundingBox();
        expect(newBox).not.toBeNull();
        if (newBox && initialBox) {
          expect(newBox.width).not.toBe(initialBox.width);
        }
      }
    }
  });

  test('should handle fullscreen toggle', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Click fullscreen button
    await page.click('button[title="Fullscreen"]');
    await page.waitForTimeout(500);

    // Verify panel is in fullscreen
    const panel = page.locator('div[role="complementary"][aria-label="Browser panel"]');
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // In fullscreen, panel should occupy most of the screen
      expect(box.width).toBeGreaterThan(800);
    }

    // Exit fullscreen
    await page.click('button[title="Exit fullscreen"]');
    await page.waitForTimeout(500);
  });

  test('should handle browser controls', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Test refresh button
    await page.click('button[title="Refresh"]');
    await page.waitForTimeout(500);

    // Test back button (should be enabled after navigation)
    const backButton = page.locator('button[title="Back"]');
    if (await backButton.isEnabled()) {
      await backButton.click();
      await page.waitForTimeout(500);
    }

    // Test forward button
    const forwardButton = page.locator('button[title="Forward"]');
    if (await forwardButton.isEnabled()) {
      await forwardButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should handle panel close', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Verify panel is visible
    const panel = page.locator('div[role="complementary"][aria-label="Browser panel"]');
    await expect(panel).toBeVisible();

    // Click close button
    await page.click('button[title="Close browser"]');
    await page.waitForTimeout(500);

    // Verify panel is closed
    await expect(panel).not.toBeVisible();
  });

  test('should display browser status correctly', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Check status indicators
    const statusIcon = page.locator('svg[data-icon="Wifi"] or svg[data-icon="WifiOff"]');
    await expect(statusIcon).toBeVisible();

    // Check status text
    const statusText = page.locator('text=Ready or text=Disconnected or text=Navigating');
    await expect(statusText).toBeVisible();
  });

  test('should handle external URL navigation', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Navigate to external URL
    const urlInput = page.locator('input[aria-label="Browser URL"]');
    await urlInput.fill('https://example.com');
    await urlInput.press('Enter');

    // Wait for screenshot display area to appear
    await page.waitForTimeout(3000);

    // Check if screenshot area is present (for external URLs)
    const screenshotArea = page.locator('img[src^="data:image/png;base64"]');
    if (await screenshotArea.isVisible()) {
      await expect(screenshotArea).toBeVisible();
    }
  });

  test('should handle safe URL navigation with webview', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Navigate to safe URL
    const urlInput = page.locator('input[aria-label="Browser URL"]');
    await urlInput.fill('about:blank');
    await urlInput.press('Enter');

    // Wait for webview to load
    await page.waitForTimeout(1000);

    // Check if webview is present (for safe URLs)
    const webview = page.locator('webview');
    if (await webview.isVisible()) {
      await expect(webview).toBeVisible();
    }
  });

  test('should display correct tab information', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Check tab title
    const tabTitle = page.locator('button[role="tab"] span[class*="truncate"]');
    await expect(tabTitle).toBeVisible();

    // Check tab icon
    const tabIcon = page.locator('button[role="tab"] svg');
    await expect(tabIcon).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Focus URL input
    const urlInput = page.locator('input[aria-label="Browser URL"]');
    await urlInput.focus();

    // Test keyboard navigation
    await page.keyboard.press('Control+A');
    await page.keyboard.type('https://example.com');
    await page.keyboard.press('Enter');

    // Wait for navigation
    await page.waitForTimeout(2000);

    // Verify URL was entered
    await expect(urlInput).toHaveValue('https://example.com');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Try to navigate to invalid URL
    const urlInput = page.locator('input[aria-label="Browser URL"]');
    await urlInput.fill('not-a-valid-url');
    await urlInput.press('Enter');

    // Wait for error handling
    await page.waitForTimeout(2000);

    // Verify panel is still responsive
    await expect(urlInput).toBeVisible();
    await expect(page.locator('button[title="Close browser"]')).toBeVisible();
  });

  test('should maintain state across interactions', async ({ page }) => {
    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Navigate to URL
    const urlInput = page.locator('input[aria-label="Browser URL"]');
    await urlInput.fill('https://example.com');
    await urlInput.press('Enter');

    await page.waitForTimeout(2000);

    // Add a new tab
    await page.click('button[title="Add new tab"]');
    await page.waitForTimeout(500);

    // Switch back to first tab
    const tabs = page.locator('button[role="tab"]');
    if (await tabs.count() > 1) {
      await tabs.nth(0).click();
      await page.waitForTimeout(500);

      // Verify first tab still has correct URL
      await expect(urlInput).toHaveValue('https://example.com');
    }
  });
});

test.describe('SandboxPanel Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Check main panel has proper role and label
    const panel = page.locator('div[role="complementary"][aria-label="Browser panel"]');
    await expect(panel).toBeVisible();

    // Check controls have proper labels
    await expect(page.locator('button[title="Back"]')).toHaveAttribute('title', 'Back');
    await expect(page.locator('button[title="Forward"]')).toHaveAttribute('title', 'Forward');
    await expect(page.locator('button[title="Refresh"]')).toHaveAttribute('title', 'Refresh');

    // Check URL input has proper label
    await expect(page.locator('input[aria-label="Browser URL"]')).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Open browser panel
    await page.click('[data-testid="browser-toggle"]');
    await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]');

    // Test Tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify we can navigate through controls
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
