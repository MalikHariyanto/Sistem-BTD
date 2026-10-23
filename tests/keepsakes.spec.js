import { test, expect } from "@playwright/test";
import { chooseChapter, openEditor } from "./story-helpers.js";

async function enter(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await page.locator("#enter-story").click();
  await expect(page.locator('.scene.is-active')).toHaveAttribute('data-scene', '1');
}

test("the keepsakes explain the next destination and work with keyboard activation", async ({ page }) => {
  await enter(page);
  for (const [kind, destination, scene] of [
    ["flowers", "Bunga & doa", 3],
    ["note", "Bait untukmu", 2],
    ["candle", "Tiup lilin", 6],
    ["envelope", "Surat untukmu", 4],
  ]) {
    const button = page.locator('#next-scene');
    await expect(button).toHaveAttribute('data-keepsake', kind);
    await expect(button).toHaveAccessibleName(`Buka ${destination}`);
    const box = await button.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.scene.is-active')).toHaveAttribute('data-scene', String(scene));
    await expect(page.locator('#chapter-dialog')).not.toBeVisible();
  }
  await expect(page.locator('#next-scene')).toBeHidden();
  await page.locator('#open-letter').click();
  await page.locator('#replay').scrollIntoViewIfNeeded();
  await expect(page.locator('.letter-signoff #replay')).toHaveAttribute('data-keepsake', 'star');
  await expect(page.locator('#replay .keepsake-star-paper')).toBeVisible();
  await page.locator('#replay').click();
  await expect(page.locator('#cover-copy')).toBeVisible();
  await expect(page.locator('#chapter-index')).toBeHidden();
  await expect(page.locator('#open-editor')).toBeVisible();
});

test("the index closes for the current chapter, restores focus on Escape, and exposes the editor", async ({ page }) => {
  await enter(page);
  await page.locator('#chapter-index').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#chapter-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#chapter-index')).toBeFocused();
  await expect(page.locator('#chapter-index')).toHaveAttribute('aria-expanded', 'false');
  await chooseChapter(page, 1);
  await expect(page.locator('#chapter-dialog')).not.toBeVisible();
  await expect(page.locator('#dedication-title')).toBeFocused();
  await openEditor(page);
  await expect(page.locator('#editor-dialog')).toBeVisible();
  await expect(page.locator('#chapter-dialog')).not.toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#chapter-index')).toBeFocused();
});

test("after the candle celebration one envelope leads to the letter and replay waits at the signature", async ({ page }) => {
  await enter(page);
  await chooseChapter(page, 6);
  await page.locator('#ready-wish').click();
  await page.locator('#blow-candle').click();
  await expect(page.locator('#continue-letter')).toBeVisible();
  await expect(page.locator('#continue-letter')).toHaveAttribute('data-keepsake', 'envelope');
  await expect(page.locator('#next-scene')).toBeHidden();
  await page.locator('#continue-letter').click();
  await expect(page.locator('.letter-scene')).toHaveClass(/is-active/);
  await expect(page.locator('#next-scene')).toBeHidden();
  await expect(page.locator('#replay')).not.toBeVisible();
  await page.locator('#open-letter').click();
  await page.locator('#replay').scrollIntoViewIfNeeded();
  await expect(page.locator('#replay')).toBeInViewport();
  expect(await page.locator('#story-audio').evaluate(audio => audio.paused)).toBe(false);
});

test("the celebration envelope stays faded until the outgoing chapter is hidden", async ({ page }) => {
  await enter(page);
  await chooseChapter(page, 6);
  await page.locator('#ready-wish').click();
  await page.locator('#blow-candle').click();
  await expect(page.locator('#continue-letter')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const samples = await page.evaluate(async () => {
    const button = document.querySelector('#continue-letter');
    const object = button.querySelector('.keepsake-object');
    const scene = button.closest('.scene');
    const values = [];
    button.click(); button.click(); button.click();
    await new Promise(resolve => {
      function sample() {
        values.push(scene.hidden ? 0 : Number(getComputedStyle(object).opacity));
        if (scene.hidden) resolve(); else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    return values;
  });
  let previous = 1;
  for (const opacity of samples) {
    expect(opacity).toBeLessThanOrEqual(previous + .01);
    previous = opacity;
  }
  expect(previous).toBe(0);
  await expect(page.locator('.scene.is-active')).toHaveAttribute('data-scene', '4');
  await expect(page.locator('#continue-letter').evaluate(button => button.getAnimations({ subtree: true }).length)).resolves.toBe(0);
});

test("the celebration invitation is fully visible on a small phone or short laptop", async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === 'mobile'
    ? { width: 320, height: 568 }
    : { width: 1280, height: 580 });
  await enter(page);
  await chooseChapter(page, 6);
  await page.locator('#ready-wish').click();
  await page.locator('#blow-candle').click();
  await expect(page.locator('#continue-letter')).toBeInViewport({ ratio: 1 });
  const boxes = await page.locator('#continue-letter').evaluate(button => {
    const action = button.getBoundingClientRect();
    const scene = button.closest('.scene').getBoundingClientRect();
    return { top: action.top, bottom: action.bottom, start: scene.top, end: scene.bottom };
  });
  expect(boxes.top).toBeGreaterThanOrEqual(boxes.start);
  expect(boxes.bottom).toBeLessThanOrEqual(boxes.end);
});
