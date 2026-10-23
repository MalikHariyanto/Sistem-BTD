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


  test("the edited MP3 is audible during the opening countdown and keeps playing without music controls", async ({ page }) => {
    test.setTimeout(60000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      document.addEventListener("click", event => {
        if (event.target.closest?.("#begin")) window.beginTappedAt = performance.now();
      }, true);
      document.addEventListener("playing", event => {
        if (event.target.id === "story-audio" && !window.firstMusicPlay) {
          window.firstMusicPlay = { phase: document.querySelector("#semesta").dataset.phase,
            latency: performance.now() - window.beginTappedAt };
        }
      }, true);
    });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    const observe = await observeMedia(page);
    await expect.poll(async () => (await observe()).status).toContain("ketukan pertamamu");
    expect((await observe()).activation).toBe(false);
    expect((await observe()).paused).toBe(true);
    await expect.poll(async () => (await observe()).readyState).toBeGreaterThanOrEqual(3);
    await page.locator("#begin").click();
    const media = await actualPlayback(page);
    expect(media.src).toContain("/music/koshun-nakao-country-intro-cut.mp3");
    expect(media.muted).toBe(false);
    expect(media.volume).toBeGreaterThan(0);
    expect(media.paused).toBe(false);
    expect(media.loop).toBe(true);
    expect(media.duration).toBeGreaterThan(138);
    expect(media.duration).toBeLessThan(140);
    const start = await page.evaluate(() => window.firstMusicPlay);
    expect(start.phase).toBe("countdown");
    expect(start.latency).toBeLessThan(750);
    await page.locator("#enter-story").click();
    const before = await page.locator("#story-audio").evaluate(audio => audio.currentTime);
    await page.locator('[data-chapter="4"]').click();
    await page.locator("#open-letter").click();
    expect(await page.locator("#story-audio").evaluate(audio => audio.paused)).toBe(false);
    expect(await page.locator("#story-audio").evaluate(audio => audio.currentTime)).toBeGreaterThan(before);
    await expect(page.locator(".music-scene, .music-credit, [data-chapter=\"5\"]")).toHaveCount(0);
    await expect(page.locator("#sound-toggle, #ambient-toggle, [data-track], audio[controls]")).toHaveCount(0);
    await expect(page.locator("audio")).toHaveCount(1);
    // A moving playhead is insufficient: the original file had eight seconds
    // of near-silence. Decode its opening and check actual signal energy.
    const rms = await page.evaluate(async () => {
      const file = await (await fetch(document.querySelector("#story-audio").currentSrc)).arrayBuffer();
      const context = new OfflineAudioContext(1, 1, 44100);
      const decoded = await context.decodeAudioData(file), data = decoded.getChannelData(0);
      return [.1, .25].map(seconds => {
        const n = Math.floor(decoded.sampleRate * seconds);
        let sum = 0; for (let i = 0; i < n; i++) sum += data[i] ** 2;
        return Math.sqrt(sum / n);
      });
    });
    expect(rms[0]).toBeGreaterThan(.01);
    expect(rms[1]).toBeGreaterThan(.025);
    expect(errors).toEqual([]);
  });

  test("the opening keyboard action also starts music without visiting the playlist", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const observe = await observeMedia(page);
    await expect.poll(async () => (await observe()).status).toContain("ketukan pertamamu");
    expect((await observe()).activation).toBe(false);
    await page.locator("#begin").focus();
    await page.keyboard.press("Enter");
    await actualPlayback(page);
  });

  test("a missing media file reports an error and never claims to be playing", async ({ page }) => {
    await page.route("**/music/koshun-nakao-country-intro-cut.mp3", route => route.fulfill({ status: 404, body: "Missing audio" }));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect.poll(() => page.locator("#story-audio").evaluate(audio => audio.error?.code || 0)).toBeGreaterThan(0);
    await page.locator("#begin").click();
    await expect(page.locator("#track-status")).toContainText(/belum bisa/);
    await expect(page.locator("#story-audio")).toHaveAttribute("data-playback", "error");
    expect(await page.locator("#story-audio").evaluate(audio => audio.paused)).toBe(true);
  });
});

