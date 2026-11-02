import { test, expect } from '@playwright/test';
import { chooseChapter, finishIntro } from './story-helpers.js';
import { installGift, photoData } from './gift-fixtures.js';

async function enter(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGift(page, { photos: { portrait: photoData(1), poem0: photoData(2), poem1: photoData(3), poem2: photoData(4) } });
  await page.goto('/');
  await page.locator('#begin').click();
  await finishIntro(page);
  await page.locator('#enter-story').click();
}

test('phone photos introduce the birthday note gently and fill each poem frame', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Phone composition');
  await enter(page);
  const collage = await page.locator('.memory-constellation').boundingBox();
  expect(collage.width).toBeLessThanOrEqual(390);
  expect(collage.height).toBeLessThanOrEqual(360);
  await expect(page.locator('#dedication-title')).toBeInViewport();
  await chooseChapter(page, 2);
  for (let i = 0; i < 3; i++) {
    await page.locator(`[data-poem="${i}"]`).click();
    const frame = await page.locator('#poem-photo').boundingBox();
    const image = await page.locator('#poem-photo img').boundingBox();
    expect(image.width / image.height).toBeCloseTo(4 / 3, 1);
    expect(image.width * image.height / (frame.width * frame.height)).toBeGreaterThan(.75);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('blowing the candle launches confetti across the reveal and reset clears it', async ({ page }) => {
  await enter(page);
  await chooseChapter(page, 6);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#ready-wish').click();
  await page.locator('#blow-candle').click();
  const effect = await page.locator('.celebration-particles').evaluate(layer => ({
    animations: layer.getAnimations({ subtree: true }).length,
    pointerEvents: getComputedStyle(layer).pointerEvents,
    viewport: layer.clientWidth <= innerWidth,
  }));
  expect(effect.animations).toBeGreaterThan(20);
  expect(effect.pointerEvents).toBe('none');
  expect(effect.viewport).toBe(true);
  await expect(page.locator('#wish-result')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('#birthday-title')).toBeFocused({ timeout: 3000 });
  await page.locator('#relight').click();
  await expect(page.locator('.wish-scene')).not.toHaveClass(/celebrating/);
  expect(await page.locator('.celebration-particles').evaluate(layer => layer.getAnimations({ subtree: true }).length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#ready-wish').click();
  await page.locator('#blow-candle').click();
  await expect(page.locator('.celebration-particles')).toBeHidden();
  await expect(page.locator('#wish-result')).toBeVisible();
});

test('phone completes the full journey without skip even when a photo never responds', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Phone performance path');
  test.setTimeout(45000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await installGift(page, { photos: { orbit01: '/slow-orbit.webp' } });
  await page.route('**/slow-orbit.webp', () => {});
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#skip-intro')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Lewati perjalanan/ })).toHaveCount(0);
  await expect(page.locator('#universe')).toHaveAttribute('data-quality', 'phone');
  const pixels = await page.locator('#universe').evaluate(canvas => canvas.width / canvas.clientWidth);
  expect(pixels).toBeLessThanOrEqual(1.26);
  await page.locator('#begin').click();
  await expect(page.locator('#semesta')).toHaveAttribute('data-phase', 'traveling', { timeout: 15000 });
  await expect(page.locator('#enter-story')).toBeVisible({ timeout: 22000 });
  expect(Number(await page.locator('#universe').getAttribute('data-filaments'))).toBeLessThanOrEqual(8192);
  await page.locator('#enter-story').click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
  expect(errors).toEqual([]);
});
