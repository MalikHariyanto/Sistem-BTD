import { test, expect } from "@playwright/test";

async function enter(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await page.locator("#enter-story").click();
}

test("the five chapters lead from birthday to flowers, poems, candle and a final letter", async ({page}) => {
  await enter(page);
  const route=[1,3,2,6,4];
  expect(await page.locator("#story-nav [data-chapter]").evaluateAll(buttons => buttons.map(b=>Number(b.dataset.chapter)))).toEqual(route);
  expect(await page.locator("#stage > .scene").evaluateAll(scenes => scenes.map(s=>Number(s.dataset.scene)))).toEqual([0,...route]);
  await expect(page.locator(".music-scene, .music-credit, [data-track]")).toHaveCount(0);
  for(const [position,scene] of route.entries()) {
    await expect(page.locator(".scene.is-active")).toHaveAttribute("data-scene",String(scene));
    await expect(page.locator("#chapter-count")).toHaveText(`0${position+1} / 05`);
    await expect(page.locator("#story-nav [aria-current]")).toHaveAttribute("data-chapter",String(scene));
    if(scene!==4)await page.locator("#next-scene").click();
  }
  await expect(page.locator("#next-scene")).toBeHidden();
  for(const scene of [6,2,3,1]) {
    await page.locator("#previous-scene").click();
    await expect(page.locator(".scene.is-active")).toHaveAttribute("data-scene",String(scene));
  }
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".garden-scene")).toHaveClass(/is-active/);
});

test("a blown candle invites the final letter, with replay only at its signature", async ({page}) => {
  await enter(page);
  await page.locator('[data-chapter="6"]').click();
  await page.locator("#ready-wish").click();
  await page.locator("#blow-candle").click();
  await expect(page.locator("#continue-letter")).toBeVisible();
  await expect(page.locator("#wish-result #replay")).toHaveCount(0);
  await page.locator("#continue-letter").click();
  await expect(page.locator(".letter-scene")).toHaveClass(/is-active/);
  await page.locator("#open-letter").click();
  await expect(page.locator("#letter-reading")).toBeVisible();
  await expect(page.locator("#next-scene")).toBeHidden();
  await page.locator("#replay").scrollIntoViewIfNeeded();
  await expect(page.locator(".letter-signoff #replay")).toBeVisible();
  expect(await page.locator("#story-audio").evaluate(a=>a.paused)).toBe(false);
  await page.locator("#replay").click();
  await expect(page.locator("#cover-copy")).toBeVisible();
  await expect(page.locator("#wish-result")).toBeHidden();
});

test("poem bookmarks select a poem directly without replacing flowers or secondary artwork", async ({page}) => {
  await enter(page);
  await page.locator('[data-chapter="2"]').click();
  await page.locator('[data-poem="2"]').click();
  await expect(page.locator("#poem-title")).toHaveText("Pada Hari Lahirmu");
  await expect(page.locator('[data-poem="2"]')).toHaveAttribute("aria-current","page");
  await expect(page.locator("#poem-photo [data-photo]")).toHaveAttribute("data-photo","poem2");
  await expect(page.locator(".poem-small-photo [data-photo]")).toHaveAttribute("data-photo","orbit04");
  await expect(page.locator(".flower-poem")).toBeVisible();
});
