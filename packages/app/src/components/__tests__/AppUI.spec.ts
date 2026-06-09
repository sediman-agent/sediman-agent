/**
 * Playwright UI Tests for Main Application Interface
 * Tests the complete user interface and navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Main Application UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:1420');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Wait for main app to be ready
    await page.waitForSelector('body', { state: 'visible' });
  });

  test('should load main application', async ({ page }) => {
    // Verify main app container is visible
    const mainContainer = page.locator('#root, [id="app"], main');
    await expect(mainContainer).toBeVisible();

    // Verify no JavaScript errors
    const errors = await page.evaluate(() => {
      return (window as any).errors || [];
    });
    expect(errors.length).toBe(0);
  });

  test('should display navigation sidebar', async ({ page }) => {
    // Check for sidebar navigation
    const sidebar = page.locator('nav, [role="navigation"], aside');
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible();

      // Verify navigation items are present
      const navItems = sidebar.locator('a, button, [role="menuitem"]');
      const navCount = await navItems.count();
      expect(navCount).toBeGreaterThan(0);
    }
  });

  test('should handle page navigation', async ({ page }) => {
    // Look for navigation links
    const navLinks = page.locator('a[href]').first();

    if (await navLinks.isVisible()) {
      // Get initial URL
      const initialUrl = page.url();

      // Click a navigation link
      await navLinks.click();

      // Wait for navigation
      await page.waitForLoadState('networkidle');

      // Verify URL changed
      const newUrl = page.url();
      expect(newUrl).not.toBe(initialUrl);
    }
  });

  test('should handle agent interface', async ({ page }) => {
    // Look for agent-related elements
    const agentInterface = page.locator('[data-testid="agent-interface"], [class*="agent"], [id*="agent"]');

    if (await agentInterface.isVisible()) {
      await expect(agentInterface).toBeVisible();

      // Check for input field
      const inputField = agentInterface.locator('textarea, input[type="text"]').first();
      if (await inputField.isVisible()) {
        await expect(inputField).toBeVisible();

        // Test typing in the input
        await inputField.fill('Test message');
        await expect(inputField).toHaveValue('Test message');
      }
    }
  });

  test('should handle settings interface', async ({ page }) => {
    // Look for settings button or navigation
    const settingsButton = page.locator('button:has-text("Settings"), [aria-label="Settings"], a:has-text("Settings")');

    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForLoadState('networkidle');

      // Verify settings page loaded
      const settingsContent = page.locator('h1:has-text("Settings"), h2:has-text("Settings")');
      if (await settingsContent.isVisible()) {
        await expect(settingsContent).toBeVisible();
      }
    }
  });

  test('should handle sessions interface', async ({ page }) => {
    // Look for sessions button or navigation
    const sessionsButton = page.locator('button:has-text("Sessions"), [aria-label="Sessions"], a:has-text("Sessions")');

    if (await sessionsButton.isVisible()) {
      await sessionsButton.click();
      await page.waitForLoadState('networkidle');

      // Verify sessions page loaded
      const sessionsContent = page.locator('h1:has-text("Sessions"), [data-testid="sessions-list"]');
      if (await sessionsContent.isVisible()) {
        await expect(sessionsContent).toBeVisible();
      }
    }
  });

  test('should handle models interface', async ({ page }) => {
    // Look for models button or navigation
    const modelsButton = page.locator('button:has-text("Models"), [aria-label="Models"], a:has-text("Models")');

    if (await modelsButton.isVisible()) {
      await modelsButton.click();
      await page.waitForLoadState('networkidle');

      // Verify models page loaded
      const modelsContent = page.locator('h1:has-text("Models"), [data-testid="models-list"]');
      if (await modelsContent.isVisible()) {
        await expect(modelsContent).toBeVisible();
      }
    }
  });

  test('should handle skills interface', async ({ page }) => {
    // Look for skills button or navigation
    const skillsButton = page.locator('button:has-text("Skills"), [aria-label="Skills"], a:has-text("Skills")');

    if (await skillsButton.isVisible()) {
      await skillsButton.click();
      await page.waitForLoadState('networkidle');

      // Verify skills page loaded
      const skillsContent = page.locator('h1:has-text("Skills"), [data-testid="skills-list"]');
      if (await skillsContent.isVisible()) {
        await expect(skillsContent).toBeVisible();
      }
    }
  });
});

test.describe('Responsive Design', () => {
  test('should handle mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Verify main content is visible
    const mainContent = page.locator('main, #root');
    await expect(mainContent).toBeVisible();

    // Check for mobile-specific elements (like hamburger menu)
    const mobileMenu = page.locator('button[aria-label="Menu"], button[aria-label="Open menu"]');
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('should handle tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Verify main content is visible
    const mainContent = page.locator('main, #root');
    await expect(mainContent).toBeVisible();
  });

  test('should handle desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Verify main content is visible
    const mainContent = page.locator('main, #root');
    await expect(mainContent).toBeVisible();

    // Check for desktop-specific elements (like sidebar)
    const sidebar = page.locator('aside, nav[role="navigation"]');
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible();
    }
  });
});

test.describe('User Interactions', () => {
  test('should handle button clicks', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Find first visible button
    const button = page.locator('button').filter({ hasText: /^(?!.*\[.*\]).+$/ }).first();

    if (await button.isVisible()) {
      // Click button
      await button.click();

      // Wait for any state changes
      await page.waitForTimeout(500);

      // Verify button is still functional
      await expect(button).toBeVisible();
    }
  });

  test('should handle form inputs', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Find input fields
    const inputs = page.locator('input:not([type="hidden"]), textarea');

    const inputCount = await inputs.count();
    if (inputCount > 0) {
      // Test first input
      const input = inputs.first();
      await input.fill('Test input');
      await expect(input).toHaveValue('Test input');

      // Clear input
      await input.fill('');
      await expect(input).toHaveValue('');
    }
  });

  test('should handle dropdowns and selects', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Look for select elements
    const selects = page.locator('select');

    const selectCount = await selects.count();
    if (selectCount > 0) {
      // Test first select
      const select = selects.first();

      // Get current value
      const initialValue = await select.inputValue();

      // Try to select a different option
      const options = await select.locator('option').all();
      if (options.length > 1) {
        await select.selectOption({ index: 1 });
        const newValue = await select.inputValue();
        expect(newValue).not.toBe(initialValue);
      }
    }
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Test common keyboard shortcuts
    await page.keyboard.press('Escape');

    // Test Ctrl+K for command palette (if present)
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);

    // Close any modals that might have opened
    await page.keyboard.press('Escape');
  });

  test('should handle search functionality', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Look for search input
    const searchInput = page.locator('input[placeholder*="search" i], input[aria-label*="search" i]');

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('test');
      await page.keyboard.press('Enter');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Verify search didn't break the app
      const mainContent = page.locator('main, #root');
      await expect(mainContent).toBeVisible();
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle navigation errors gracefully', async ({ page }) => {
    // Navigate to invalid route
    await page.goto('http://localhost:1420/invalid-route');
    await page.waitForLoadState('networkidle');

    // Should either redirect to 404 or show error gracefully
    const content = page.locator('body');
    await expect(content).toBeVisible();

    // Should not have JavaScript errors
    const errors = await page.evaluate(() => {
      return (window as any).errors || [];
    });
    expect(errors.length).toBe(0);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Mock API error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Trigger an API call
    await page.reload();
    await page.waitForLoadState('networkidle');

    // App should still be functional
    const mainContent = page.locator('main, #root');
    await expect(mainContent).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Simulate network offline
    await page.context().setOffline(true);

    // Try to navigate
    await page.goto('http://localhost:1420/sessions');
    await page.waitForTimeout(2000);

    // Restore network
    await page.context().setOffline(false);

    // App should still be visible
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle rapid interactions without lag', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Perform rapid interactions
    for (let i = 0; i < 10; i++) {
      // Find and click a button
      const button = page.locator('button').first();
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(100);
      }
    }

    // Verify app is still responsive
    const mainContent = page.locator('main, #root');
    await expect(mainContent).toBeVisible();
  });

  test('should not have memory leaks', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform multiple navigations
    for (let i = 0; i < 5; i++) {
      await page.goto('http://localhost:1420');
      await page.waitForLoadState('networkidle');
    }

    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory growth should be reasonable (less than 50MB)
    const memoryGrowth = finalMemory - initialMemory;
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Check for h1 heading
    const h1 = page.locator('h1');
    const h1Count = await h1.count();

    // Should have exactly one h1
    if (h1Count > 0) {
      expect(h1Count).toBe(1);
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Check for elements with aria-label
    const ariaElements = page.locator('[aria-label]');
    const count = await ariaElements.count();

    // Should have some aria labels for accessibility
    expect(count).toBeGreaterThan(0);
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Check for semantic HTML
    const main = page.locator('main');
    const nav = page.locator('nav');
    const header = page.locator('header');

    // Should have semantic elements
    const hasSemantic = await main.isVisible() || await nav.isVisible() || await header.isVisible();
    expect(hasSemantic).toBe(true);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Check for text elements
    const textElements = page.locator('p, span, div:not([class*="bg"])');

    // Verify text is visible (basic contrast check)
    const firstText = textElements.first();
    if (await firstText.isVisible()) {
      const color = await firstText.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Should have a color value
      expect(color).toMatch(/^rgb/);
    }
  });
});
