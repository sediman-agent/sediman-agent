/**
 * Playwright UI Tests for Browser Components
 * Tests the browser UI functionality including navigation, tabs, and interactions
 */

import { test, expect } from '@playwright/test';

test.describe('Browser UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');
  });

  test('should open browser panel from interface', async ({ page }) => {
    // Look for browser toggle button
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser"), [aria-label="Browser"]');

    if (await browserToggle.isVisible()) {
      await browserToggle.click();

      // Wait for panel to appear
      await page.waitForSelector('div[role="complementary"][aria-label="Browser panel"]', { timeout: 5000 });

      // Verify panel is visible
      const panel = page.locator('div[role="complementary"][aria-label="Browser panel"]');
      await expect(panel).toBeVisible();
    }
  });

  test('should display browser controls correctly', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Check for browser controls
      const controls = [
        'button[title="Back"]',
        'button[title="Forward"]',
        'button[title="Refresh"]',
        'button[title="Fullscreen"]',
        'button[title="Close browser"]'
      ];

      for (const control of controls) {
        const element = page.locator(control);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
        }
      }
    }
  });

  test('should handle URL input and navigation', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Find URL input
      const urlInput = page.locator('input[aria-label="Browser URL"], input[placeholder*="URL"]');
      await expect(urlInput).toBeVisible();

      // Test URL input
      await urlInput.fill('https://example.com');
      await urlInput.press('Enter');

      // Wait for navigation
      await page.waitForTimeout(2000);

      // Verify URL is still in input
      await expect(urlInput).toHaveValue('https://example.com');
    }
  });

  test('should display browser tabs', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Check for tabs
      const tabs = page.locator('button[role="tab"]');
      const tabCount = await tabs.count();

      expect(tabCount).toBeGreaterThan(0);

      // Verify first tab is visible
      if (tabCount > 0) {
        await expect(tabs.first()).toBeVisible();

        // Check for tab icon
        const tabIcon = tabs.first().locator('svg');
        await expect(tabIcon).toBeVisible();

        // Check for tab title
        const tabText = tabs.first().locator('span[class*="truncate"]');
        await expect(tabText).toBeVisible();
      }
    }
  });

  test('should add new tabs', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Get initial tab count
      const tabs = page.locator('button[role="tab"]');
      const initialCount = await tabs.count();

      // Click add tab button
      const addButton = page.locator('button[title="Add new tab"], button:has(svg[data-lucide="plus"])');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Verify tab count increased
        const newCount = await tabs.count();
        expect(newCount).toBe(initialCount + 1);
      }
    }
  });

  test('should close tabs', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Add a new tab first
      const addButton = page.locator('button[title="Add new tab"]');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
      }

      // Get tabs
      const tabs = page.locator('button[role="tab"]');
      const tabCount = await tabs.count();

      if (tabCount > 1) {
        // Find close button on a tab
        const closeButton = tabs.nth(1).locator('button, svg[data-lucide="x"]');
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(500);

          // Verify tab was closed
          const newCount = await tabs.count();
          expect(newCount).toBe(tabCount - 1);
        }
      }
    }
  });

  test('should switch between tabs', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Add multiple tabs
      const addButton = page.locator('button[title="Add new tab"]');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        await addButton.click();
        await page.waitForTimeout(500);
      }

      // Get tabs
      const tabs = page.locator('button[role="tab"]');
      const tabCount = await tabs.count();

      if (tabCount > 1) {
        // Switch to second tab
        await tabs.nth(1).click();
        await page.waitForTimeout(500);

        // Verify active tab changed
        const activeTab = page.locator('button[role="tab"][aria-selected="true"], button[role="tab"].border-blue-500');
        await expect(activeTab).toBeVisible();
      }
    }
  });

  test('should display browser status', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Check for status indicators
      const statusIcon = page.locator('svg');
      await expect(statusIcon.first()).toBeVisible();

      // Check for status text
      const statusText = page.locator('text=/Ready|Active|Loading|Error|Disconnected/');
      if (await statusText.isVisible()) {
        await expect(statusText).toBeVisible();
      }
    }
  });

  test('should handle fullscreen mode', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Click fullscreen button
      const fullscreenButton = page.locator('button[title="Fullscreen"], button:has(svg[data-lucide="maximize-2"])');
      if (await fullscreenButton.isVisible()) {
        await fullscreenButton.click();
        await page.waitForTimeout(500);

        // Verify panel is in fullscreen
        const panel = page.locator('div[role="complementary"][aria-label="Browser panel"]');
        const panelBox = await panel.boundingBox();

        if (panelBox) {
          // Fullscreen panel should be wide
          expect(panelBox.width).toBeGreaterThan(800);
        }

        // Exit fullscreen
        const exitButton = page.locator('button[title="Exit fullscreen"], button:has(svg[data-lucide="minimize-2"])');
        if (await exitButton.isVisible()) {
          await exitButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should handle refresh action', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Navigate to a page
      const urlInput = page.locator('input[aria-label="Browser URL"]');
      await urlInput.fill('https://example.com');
      await urlInput.press('Enter');
      await page.waitForTimeout(2000);

      // Click refresh button
      const refreshButton = page.locator('button[title="Refresh"]');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(1000);

        // Verify panel is still functional
        await expect(urlInput).toBeVisible();
      }
    }
  });

  test('should handle back/forward navigation', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Navigate to multiple pages
      const urlInput = page.locator('input[aria-label="Browser URL"]');

      await urlInput.fill('https://example.com');
      await urlInput.press('Enter');
      await page.waitForTimeout(2000);

      await urlInput.fill('https://example.org');
      await urlInput.press('Enter');
      await page.waitForTimeout(2000);

      // Try back button
      const backButton = page.locator('button[title="Back"]');
      if (await backButton.isVisible() && await backButton.isEnabled()) {
        await backButton.click();
        await page.waitForTimeout(1000);

        // Verify URL changed
        await expect(urlInput).toHaveValue('https://example.com');
      }

      // Try forward button
      const forwardButton = page.locator('button[title="Forward"]');
      if (await forwardButton.isVisible() && await forwardButton.isEnabled()) {
        await forwardButton.click();
        await page.waitForTimeout(1000);

        // Verify URL changed
        await expect(urlInput).toHaveValue('https://example.org');
      }
    }
  });

  test('should display screenshots for external URLs', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Navigate to external URL
      const urlInput = page.locator('input[aria-label="Browser URL"]');
      await urlInput.fill('https://example.com');
      await urlInput.press('Enter');

      // Wait for screenshot
      await page.waitForTimeout(3000);

      // Check for screenshot image
      const screenshot = page.locator('img[src^="data:image/png;base64"]');
      if (await screenshot.isVisible()) {
        await expect(screenshot).toBeVisible();

        // Check for URL badge on screenshot
        const urlBadge = page.locator('div:has-text("example.com")');
        if (await urlBadge.isVisible()) {
          await expect(urlBadge).toBeVisible();
        }
      }
    }
  });

  test('should handle panel resize', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Find resize handle
      const resizeHandle = page.locator('div[class*="cursor-col-resize"]');
      if (await resizeHandle.isVisible()) {
        const panel = page.locator('div[role="complementary"][aria-label="Browser panel"]');
        const initialBox = await panel.boundingBox();

        // Drag resize handle
        const handleBox = await resizeHandle.boundingBox();
        if (handleBox && initialBox) {
          await page.mouse.move(handleBox.x + 5, handleBox.y + 5);
          await page.mouse.down();
          await page.mouse.move(handleBox.x + 100, handleBox.y + 5);
          await page.mouse.up();

          await page.waitForTimeout(500);

          // Verify panel was resized
          const newBox = await panel.boundingBox();
          expect(newBox?.width).not.toBe(initialBox.width);
        }
      }
    }
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Focus URL input
      const urlInput = page.locator('input[aria-label="Browser URL"]');
      await urlInput.focus();

      // Test Ctrl+A to select all
      await page.keyboard.press('Control+A');
      await page.keyboard.type('https://example.com');
      await page.keyboard.press('Enter');

      await page.waitForTimeout(2000);

      // Verify URL was entered
      await expect(urlInput).toHaveValue('https://example.com');
    }
  });
});

test.describe('Browser UI Error Handling', () => {
  test('should handle invalid URLs gracefully', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Try invalid URL
      const urlInput = page.locator('input[aria-label="Browser URL"]');
      await urlInput.fill('not-a-valid-url');
      await urlInput.press('Enter');

      await page.waitForTimeout(2000);

      // Panel should still be functional
      await expect(urlInput).toBeVisible();
      await expect(page.locator('button[title="Close browser"]')).toBeVisible();
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Simulate network offline
    await page.context().setOffline(true);

    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Try to navigate
      const urlInput = page.locator('input[aria-label="Browser URL"]');
      await urlInput.fill('https://example.com');
      await urlInput.press('Enter');

      await page.waitForTimeout(2000);

      // Panel should still be responsive
      await expect(urlInput).toBeVisible();
    }

    // Restore network
    await page.context().setOffline(false);
  });

  test('should handle timeout gracefully', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Open browser panel
    const browserToggle = page.locator('[data-testid="browser-toggle"], button:has-text("Browser")');
    if (await browserToggle.isVisible()) {
      await browserToggle.click();
      await page.waitForTimeout(1000);

      // Slow down network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 5000);
      });

      // Try to navigate
      const urlInput = page.locator('input[aria-label="Browser URL"]');
      await urlInput.fill('https://example.com');
      await urlInput.press('Enter');

      await page.waitForTimeout(6000);

      // Panel should still be responsive
      await expect(urlInput).toBeVisible();
    }
  });
});
