import { test, expect } from "@playwright/test";
import { actualPlayback, observeMedia } from "./audio-helpers.js";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

// Trace snapshots evaluate page scripts and can activate the document.
// Keep startup observation passive so the real browser policy is exercised.
test.use({ trace: "off", launchOptions: { executablePath, args: ["--autoplay-policy=no-user-gesture-required"] } });

test.describe("when the browser permits audible autoplay", () => {

  test("Country plays on page load before any user interaction", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const observe = await observeMedia(page);
    await expect.poll(async () => (await observe()).time).toBeGreaterThan(0.1);
    const media = await observe();
    expect(media.activation).toBe(false);
    expect(media.label).toBe("Suara menyala");
    expect(media.src).toContain("/music/koshun-nakao-country.mp3");
    expect(media.muted).toBe(false);
    expect(media.paused).toBe(false);
    expect(media.volume).toBeGreaterThan(0);
    await expect(page.locator("audio")).toHaveCount(1);
    await expect(page.locator('[data-track="0"]')).toHaveClass(/playing/);
  });
});
