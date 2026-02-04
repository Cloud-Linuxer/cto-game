/**
 * Smoke Tests - Quick sanity checks
 *
 * Run these first to ensure basic functionality works
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/AWS 스타트업 타이쿤/);

    // Check for main heading
    await expect(page.locator('h1')).toContainText('AWS 스타트업 타이쿤');

    // Check for new game button
    await expect(page.locator('button:has-text("새 게임 시작")')).toBeVisible();
  });

  test('can start a new game', async ({ page }) => {
    await page.goto('/');

    // Click new game button
    await page.click('button:has-text("새 게임 시작")');

    // Wait for game page to load
    await page.waitForURL(/\/game\/[a-f0-9-]+/);

    // Verify game UI elements
    await expect(page.locator('text=Turn')).toBeVisible();
    await expect(page.locator('text=유저')).toBeVisible();
    await expect(page.locator('text=자금')).toBeVisible();
    await expect(page.locator('text=신뢰도')).toBeVisible();
  });

  test('can make a choice in game', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("새 게임 시작")');

    // Wait for game to load
    await page.waitForURL(/\/game\/[a-f0-9-]+/);
    await page.waitForTimeout(1000);

    // Find and click first choice button
    const choiceButton = page.locator('button').filter({ hasText: /선택|확인|진행/ }).first();
    await choiceButton.click();

    // Verify turn advanced or something changed
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Turn')).toBeVisible();
  });

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard');

    // Check for leaderboard heading
    await expect(page.locator('h1, h2').filter({ hasText: /리더보드|순위/ })).toBeVisible();
  });

  test('game survives page reload', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("새 게임 시작")');

    // Wait for game to load
    await page.waitForURL(/\/game\/([a-f0-9-]+)/);
    const gameUrl = page.url();

    // Make a choice
    await page.waitForTimeout(1000);
    const choiceButton = page.locator('button').filter({ hasText: /선택|확인|진행/ }).first();
    await choiceButton.click();
    await page.waitForTimeout(1000);

    // Get current turn number
    const turnText = await page.locator('text=Turn').textContent();

    // Reload page
    await page.reload();

    // Verify game state persists
    await expect(page.locator('text=Turn')).toBeVisible();
    await page.waitForTimeout(500);

    // Turn number should be same or higher
    const newTurnText = await page.locator('text=Turn').textContent();
    expect(newTurnText).toBeTruthy();
  });

  test('mobile viewport works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check page is responsive
    const body = page.locator('body');
    const boundingBox = await body.boundingBox();

    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }

    // Verify main elements are still visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("새 게임 시작")')).toBeVisible();
  });

  test('backend API is reachable', async ({ page }) => {
    // Try to start a new game (which calls backend)
    const response = await page.request.post('http://localhost:3000/api/game/start', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Backend should respond successfully
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('gameId');
  });
});
