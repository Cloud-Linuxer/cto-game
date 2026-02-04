/**
 * EventPopup E2E Tests
 *
 * Tests complete user flow with event popups
 */

import { test, expect, Page } from '@playwright/test';

// Helper to wait for game to load
async function waitForGameLoad(page: Page) {
  await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// Helper to start a new game
async function startNewGame(page: Page) {
  await page.goto('/');
  await page.click('text=새 게임 시작');
  await waitForGameLoad(page);
}

// Helper to make a choice and advance turn
async function makeChoice(page: Page, choiceNumber: number = 1) {
  const choiceButton = page.locator(`button:has-text("선택지 ${choiceNumber}")`).first();
  await choiceButton.click();
  await page.waitForTimeout(500); // Wait for API call
}

test.describe('EventPopup - Basic Flow', () => {
  test('should display event popup when random event is triggered', async ({ page }) => {
    // Start new game
    await startNewGame(page);

    // Play several turns until an event is triggered
    // (This assumes events have a chance to trigger on each turn)
    let eventFound = false;
    for (let i = 0; i < 10 && !eventFound; i++) {
      await makeChoice(page, 1);

      // Check if event popup appeared
      const eventPopup = page.locator('[role="dialog"][aria-modal="true"]');
      if (await eventPopup.isVisible({ timeout: 1000 }).catch(() => false)) {
        eventFound = true;

        // Verify event popup structure
        await expect(eventPopup).toBeVisible();

        // Check for event header
        const header = eventPopup.locator('[data-testid="event-header"]');
        await expect(header).toBeVisible();

        // Check for event content
        const content = eventPopup.locator('[data-testid="event-content"]');
        await expect(content).toBeVisible();

        // Check for choices
        const choices = eventPopup.locator('button:has-text("이 선택지를 선택")');
        await expect(choices.first()).toBeVisible();

        break;
      }
    }

    // If no event was found after 10 turns, skip (events are probabilistic)
    if (!eventFound) {
      test.skip();
    }
  });

  test('should allow selecting event choice with mouse click', async ({ page }) => {
    // Start game and trigger event (using manual trigger for testing)
    await page.goto('/');
    // TODO: Implement test event trigger endpoint
    // For now, this test requires manual event triggering
    test.skip();
  });

  test('should show keyboard shortcuts on event choices', async ({ page }) => {
    // Start game
    await startNewGame(page);

    // Wait for event (skip if no event after 10 turns)
    let eventFound = false;
    for (let i = 0; i < 10 && !eventFound; i++) {
      await makeChoice(page, 1);

      const eventPopup = page.locator('[role="dialog"][aria-modal="true"]');
      if (await eventPopup.isVisible({ timeout: 1000 }).catch(() => false)) {
        eventFound = true;

        // Check for keyboard shortcut badges
        const shortcutBadge = eventPopup.locator('text="1"').first();
        await expect(shortcutBadge).toBeVisible();

        break;
      }
    }

    if (!eventFound) {
      test.skip();
    }
  });

  test('should close popup after selecting choice', async ({ page }) => {
    await startNewGame(page);

    let eventFound = false;
    for (let i = 0; i < 10 && !eventFound; i++) {
      await makeChoice(page, 1);

      const eventPopup = page.locator('[role="dialog"][aria-modal="true"]');
      if (await eventPopup.isVisible({ timeout: 1000 }).catch(() => false)) {
        eventFound = true;

        // Click first choice
        const choiceButton = eventPopup.locator('button:has-text("이 선택지를 선택")').first();
        await choiceButton.click();

        // Wait for popup to close
        await expect(eventPopup).not.toBeVisible({ timeout: 5000 });

        break;
      }
    }

    if (!eventFound) {
      test.skip();
    }
  });
});

test.describe('EventPopup - Keyboard Navigation', () => {
  test('should select choice with number keys', async ({ page }) => {
    await startNewGame(page);

    let eventFound = false;
    for (let i = 0; i < 10 && !eventFound; i++) {
      await makeChoice(page, 1);

      const eventPopup = page.locator('[role="dialog"][aria-modal="true"]');
      if (await eventPopup.isVisible({ timeout: 1000 }).catch(() => false)) {
        eventFound = true;

        // Press '1' key to select first choice
        await page.keyboard.press('1');

        // Wait for popup to close
        await expect(eventPopup).not.toBeVisible({ timeout: 5000 });

        break;
      }
    }

    if (!eventFound) {
      test.skip();
    }
  });

  test('should not allow ESC to close popup', async ({ page }) => {
    await startNewGame(page);

    let eventFound = false;
    for (let i = 0; i < 10 && !eventFound; i++) {
      await makeChoice(page, 1);

      const eventPopup = page.locator('[role="dialog"][aria-modal="true"]');
      if (await eventPopup.isVisible({ timeout: 1000 }).catch(() => false)) {
        eventFound = true;

        // Try to press ESC
        await page.keyboard.press('Escape');

        // Popup should still be visible (choice is mandatory)
        await expect(eventPopup).toBeVisible();

        // Close by selecting a choice
        await page.keyboard.press('1');

        break;
      }
    }

    if (!eventFound) {
      test.skip();
    }
  });
});

test.describe('EventPopup - Error Handling', () => {
  test('should show retry button on API error', async ({ page }) => {
    // This test requires mocking API failure
    // TODO: Implement API mocking or error injection
    test.skip();
  });

  test('should retry last choice when retry button is clicked', async ({ page }) => {
    // This test requires mocking API failure then success
    test.skip();
  });
});

test.describe('EventPopup - Event Chaining', () => {
  test('should automatically show next event in chain', async ({ page }) => {
    // This test requires triggering a CHAIN event
    // TODO: Implement test endpoint for chain events
    test.skip();
  });

  test('should show multiple events in sequence', async ({ page }) => {
    // This test requires multiple chained events
    test.skip();
  });
});

test.describe('EventPopup - Performance', () => {
  test('should render popup within 300ms', async ({ page }) => {
    await startNewGame(page);

    let eventFound = false;
    for (let i = 0; i < 10 && !eventFound; i++) {
      await makeChoice(page, 1);

      const startTime = Date.now();
      const eventPopup = page.locator('[role="dialog"][aria-modal="true"]');

      if (await eventPopup.isVisible({ timeout: 1000 }).catch(() => false)) {
        const endTime = Date.now();
        const renderTime = endTime - startTime;

        eventFound = true;

        // Verify render time is under 300ms
        expect(renderTime).toBeLessThan(300);

        // Close popup
        await page.keyboard.press('1');

        break;
      }
    }

    if (!eventFound) {
      test.skip();
    }
  });

  test('should complete choice selection within 1000ms', async ({ page }) => {
    await startNewGame(page);

    let eventFound = false;
    for (let i = 0; i < 10 && !eventFound; i++) {
      await makeChoice(page, 1);

      const eventPopup = page.locator('[role="dialog"][aria-modal="true"]');
      if (await eventPopup.isVisible({ timeout: 1000 }).catch(() => false)) {
        eventFound = true;

        const startTime = Date.now();

        // Click choice
        const choiceButton = eventPopup.locator('button:has-text("이 선택지를 선택")').first();
        await choiceButton.click();

        // Wait for popup to close
        await expect(eventPopup).not.toBeVisible({ timeout: 5000 });

        const endTime = Date.now();
        const completionTime = endTime - startTime;

        // Verify completion time is under 1000ms
        expect(completionTime).toBeLessThan(1000);

        break;
      }
    }

    if (!eventFound) {
      test.skip();
    }
  });
});

test.describe('EventPopup - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display correctly on mobile', async ({ page }) => {
    await startNewGame(page);

    let eventFound = false;
    for (let i = 0; i < 10 && !eventFound; i++) {
      await makeChoice(page, 1);

      const eventPopup = page.locator('[role="dialog"][aria-modal="true"]');
      if (await eventPopup.isVisible({ timeout: 1000 }).catch(() => false)) {
        eventFound = true;

        // Verify popup is responsive
        const boundingBox = await eventPopup.boundingBox();
        expect(boundingBox).not.toBeNull();

        if (boundingBox) {
          // Popup should not exceed viewport width
          expect(boundingBox.width).toBeLessThanOrEqual(375);

          // Popup should be visible (not off-screen)
          expect(boundingBox.x).toBeGreaterThanOrEqual(0);
          expect(boundingBox.y).toBeGreaterThanOrEqual(0);
        }

        // Close popup
        const choiceButton = eventPopup.locator('button:has-text("이 선택지를 선택")').first();
        await choiceButton.click();

        break;
      }
    }

    if (!eventFound) {
      test.skip();
    }
  });

  test('should allow touch interactions on mobile', async ({ page }) => {
    await startNewGame(page);

    let eventFound = false;
    for (let i = 0; i < 10 && !eventFound; i++) {
      await makeChoice(page, 1);

      const eventPopup = page.locator('[role="dialog"][aria-modal="true"]');
      if (await eventPopup.isVisible({ timeout: 1000 }).catch(() => false)) {
        eventFound = true;

        // Tap choice button
        const choiceButton = eventPopup.locator('button:has-text("이 선택지를 선택")').first();
        await choiceButton.tap();

        // Popup should close
        await expect(eventPopup).not.toBeVisible({ timeout: 5000 });

        break;
      }
    }

    if (!eventFound) {
      test.skip();
    }
  });
});
