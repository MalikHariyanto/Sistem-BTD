import { chooseChapter } from "./story-helpers.js";
import { test, expect } from "@playwright/test";

// Browser zoom reduces CSS viewport space too. Cover the short laptop window
// from the report as well as standard and large displays, with fonts loaded.
for (const [width, height] of [[1280, 580], [1280, 620], [1366, 768], [1920, 930]]) {
  test(`all chapters fit a ${width}×${height} laptop without cut-off actions`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop compositions; phone reading is covered separately.");
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const cover = await page.locator('#semesta').boundingBox();
    expect(cover).toMatchObject({ x: 0, y: 0, width, height });
    await page.locator("#begin").click();
    await page.locator("#skip-intro").click();
    await page.locator("#enter-story").click();

    async function fits(selectors) {
      const bounds = await page.locator(".scene.is-active").evaluate((scene, selectors) => {
        const box = scene.getBoundingClientRect();
        return {
          overflow: scene.scrollHeight - scene.clientHeight,
          sideways: scene.scrollWidth - scene.clientWidth,
          controlsClear: box.top >= document.querySelector('.story-header').getBoundingClientRect().bottom &&
            box.bottom <= document.querySelector('#story-nav').getBoundingClientRect().top,
          content: selectors.map(selector => {
            const element = scene.querySelector(selector), rect = element.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return { selector, top: rect.top - box.top, bottom: box.bottom - rect.bottom,
              reachable: !!hit && (element === hit || element.contains(hit)) };
          }),
        };
      }, selectors);
      expect(bounds.overflow).toBeLessThanOrEqual(1);
      expect(bounds.sideways).toBeLessThanOrEqual(1);
      expect(bounds.controlsClear).toBe(true);
      for (const element of bounds.content) {
        expect(element.top, element.selector).toBeGreaterThanOrEqual(0);
        expect(element.bottom, element.selector).toBeGreaterThanOrEqual(0);
        expect(element.reachable, element.selector).toBe(true);
      }
    }

    const chapters = [
      [1, ['#dedication-title', '.memory-0']],
      [3, ['#quote-heading', '.garden-flowers']],
      [2, ['#poem-title', '#poem-text', '#next-poem']],
      [6, ['#wish-title', '#ready-wish']],
      [4, ['#letter-heading', '#open-letter', '#open-letter-text']],
    ];
    for (const [scene, selectors] of chapters) {
      if (scene !== 1) await chooseChapter(page, scene);
      await expect(page.locator('.scene.is-active')).toHaveAttribute('data-scene', String(scene));
      await fits(selectors);
    }
    await chooseChapter(page, 6);
    await page.locator('#ready-wish').click();
    await fits(['#blow-candle']);
    await chooseChapter(page, 4);
    await page.locator('#open-letter').click();
    await expect(page.locator('#letter-reading')).toBeVisible();
    await expect(page.locator('.letter-verse')).toHaveCount(4);
    await page.locator('[data-scene="4"]').evaluate(scene => { scene.scrollTop = scene.scrollHeight; });
    await expect(page.locator('#close-letter')).toBeInViewport();
    await chooseChapter(page, 2);
    for (let i = 0; i < 3; i++) {
      if (i) await page.locator('#next-poem').click();
      await fits(['#poem-title', '#poem-text', '#next-poem']);
    }
  });
}
