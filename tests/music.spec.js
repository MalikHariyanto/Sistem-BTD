import { test, expect } from "@playwright/test";
import { actualPlayback, observeMedia } from "./audio-helpers.js";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

// Trace snapshots evaluate page scripts and can activate the document.
// Keep startup observation passive so the real browser policy is exercised.
test.use({ trace: "off", launchOptions: { executablePath, args: [
    "--autoplay-policy=document-user-activation-required",
    "--disable-features=MediaEngagementBypassAutoplayPolicies,PreloadMediaEngagementData",
  ] } });

test.describe("when the browser requires a gesture for audible playback", () => {


  test("the supplied MP3 preloads, starts on the opening tap, and stays paused after an explicit pause", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    const observe = await observeMedia(page);
    await expect.poll(async () => (await observe()).label).toBe("Ketuk untuk musik");
    expect((await observe()).activation).toBe(false);
    expect((await observe()).paused).toBe(true);
    await expect.poll(async () => (await observe()).readyState).toBeGreaterThanOrEqual(2);
    await page.locator("#begin").click();
    const media = await actualPlayback(page);
    expect(media.src).toContain("/music/koshun-nakao-country.mp3");
    expect(media.muted).toBe(false);
    expect(media.volume).toBeGreaterThan(0);
    expect(media.paused).toBe(false);
    expect(media.loop).toBe(true);
    expect(media.duration).toBeGreaterThan(150);
    expect(media.duration).toBeLessThan(153);
    expect(await page.locator("body").getAttribute("data-chapter")).toBe("0");
    await page.locator("#enter-story").click();
    await page.locator("#sound-toggle").click();
    await expect(page.locator("#sound-label")).toHaveText("Suara mati");
    const pausedAt = await page.locator("#story-audio").evaluate(audio => audio.currentTime);
    await page.locator('[data-chapter="4"]').click();
    await page.locator("#open-letter").click();
    expect(await page.locator("#story-audio").evaluate(audio => audio.paused)).toBe(true);
    await page.locator("#sound-toggle").click();
    await actualPlayback(page);
    expect(await page.locator("#story-audio").evaluate(audio => audio.currentTime)).toBeGreaterThanOrEqual(pausedAt);
    await expect(page.locator("audio")).toHaveCount(1);
    await page.locator('[data-chapter="5"]').click();
    await page.locator("#ambient-toggle").click();
    expect(await page.locator("#story-audio").evaluate(audio => audio.paused)).toBe(true);
    await expect(page.locator("#ambient-toggle")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#sound-toggle").click();
    await expect(page.locator("#sound-toggle")).toHaveAttribute("aria-pressed", "false");
    expect(errors).toEqual([]);
  });

  test("the opening keyboard action also starts music without visiting the playlist", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const observe = await observeMedia(page);
    await expect.poll(async () => (await observe()).label).toBe("Ketuk untuk musik");
    expect((await observe()).activation).toBe(false);
    await page.locator("#begin").focus();
    await page.keyboard.press("Enter");
    await actualPlayback(page);
  });

  test("a missing media file reports an error and never claims to be playing", async ({ page }) => {
    await page.route("**/music/koshun-nakao-country.mp3", route => route.fulfill({ status: 404, body: "Missing audio" }));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect.poll(() => page.locator("#story-audio").evaluate(audio => audio.error?.code || 0)).toBeGreaterThan(0);
    await page.locator("#sound-toggle").click();
    await expect(page.locator("#track-status")).toContainText(/belum bisa/);
    await expect(page.locator("#sound-toggle")).toHaveAttribute("aria-pressed", "false");
    expect(await page.locator("#story-audio").evaluate(audio => audio.paused)).toBe(true);
  });
});

