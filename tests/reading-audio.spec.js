import { finishIntro } from "./helpers.js";
import { test, expect } from "@playwright/test";

async function enter(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#begin").click();
  await finishIntro(page);
  await page.locator("#enter-story").click();
}
test("scrolling poems and prayers keeps both control rows clear, and prayers remain readable", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Ke Bait untukmu", exact: true })
    .click();
  const checkRows = async () => {
    const boxes = await page.evaluate(() => {
      const header = document
        .querySelector(".story-header")
        .getBoundingClientRect();
      const scene = document
        .querySelector(".scene.is-active")
        .getBoundingClientRect();
      const nav = document.querySelector("#story-nav").getBoundingClientRect();
      const logo = document.querySelector("#home-link").getBoundingClientRect();
      const hit = document.elementFromPoint(
        logo.x + 10,
        logo.y + logo.height / 2,
      );
      return {
        headerBottom: header.bottom,
        sceneTop: scene.top,
        sceneBottom: scene.bottom,
        navTop: nav.top,
        logoOnTop: !!hit.closest("#home-link"),
        background: getComputedStyle(document.querySelector(".story-header"))
          .backgroundColor,
      };
    });
    expect(boxes.sceneTop).toBeGreaterThanOrEqual(boxes.headerBottom);
    expect(boxes.sceneBottom).toBeLessThanOrEqual(boxes.navTop);
    expect(boxes.logoOnTop).toBe(true);
    expect(boxes.background).not.toBe("rgba(0, 0, 0, 0)");
  };
  await page
    .locator("#poem-text")
    .evaluate(
      (p) =>
        (p.textContent +=
          "\n" +
          Array(35)
            .fill("Aku ingin menyimpan hari-hari bersamamu.")
            .join("\n")),
    );
  await page
    .locator('[data-scene="2"]')
    .evaluate((scene) => (scene.scrollTop = scene.scrollHeight / 2));
  await checkRows();
  await page.getByRole("button", { name: "Ke Tiga doa", exact: true }).click();
  for (const label of ["Bahagia", "Bertumbuh", "Dicintai"])
    await page
      .getByRole("button", { name: `Mekarkan doa: ${label}`, exact: true })
      .click();
  await expect(page.locator(".garden-note:not([hidden])")).toHaveCount(3);
  await expect(page.locator("#garden-wish-2 .garden-wish")).toBeInViewport();
  const typography = await page
    .locator("#garden-wish-2 .garden-wish")
    .evaluate((p) => {
      const s = getComputedStyle(p),
        box = p.getBoundingClientRect(),
        viewport = p.closest(".scene").getBoundingClientRect();
      return {
        font: parseFloat(s.fontSize),
        leading: parseFloat(s.lineHeight),
        top: box.top,
        bottom: box.bottom,
        viewportTop: viewport.top,
        viewportBottom: viewport.bottom,
      };
    });
  expect(typography.font).toBeGreaterThanOrEqual(16);
  expect(typography.leading).toBeGreaterThanOrEqual(26);
  expect(typography.top).toBeGreaterThanOrEqual(typography.viewportTop);
  expect(typography.bottom).toBeLessThanOrEqual(typography.viewportBottom);
  await page.locator("#garden-wish-2 summary").click();
  await page
    .locator('[data-scene="3"]')
    .evaluate((scene) => (scene.scrollTop = scene.scrollHeight));
  await checkRows();
  await expect(page.locator("#garden-wish-2 a")).toBeInViewport();
});

function tone() {
  const rate = 22050,
    frames = rate * 3,
    buffer = Buffer.alloc(44 + frames * 2);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    buffer.writeInt16LE(
      Math.round(Math.sin((i / rate) * Math.PI * 2 * 330) * 1800),
      44 + i * 2,
    );
  return buffer;
}
test("an uploaded song is preloaded and starts in the opening gesture, continues through chapters, and mutes during travel", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#open-editor").click();
  await page.locator("#audio-upload").setInputFiles({
    name: "our-song.wav",
    mimeType: "audio/wav",
    buffer: tone(),
  });
  await expect(page.locator("#editor-status")).toContainText(
    "Lagu pertama tersimpan",
  );
  await page.addInitScript(() => {
    window.__plays = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      window.__lastAudio = this;
      window.__plays.push({
        at: performance.now(),
        source: this.src,
        ready: this.readyState,
        phase: document.querySelector("#semesta")?.dataset.phase,
      });
      return play.apply(this, args);
    };
  });
  await page.reload();
  await expect(page.locator("#begin")).toBeEnabled();
  await page.evaluate(() =>
    document.querySelector("#begin").addEventListener(
      "click",
      () => {
        window.__beginAt = performance.now();
      },
      { capture: true },
    ),
  );
  await page.locator("#begin").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const initial = await page.evaluate(() => ({
    calls: window.__plays,
    begin: window.__beginAt,
    current: window.__lastAudio.currentTime,
    loop: window.__lastAudio.loop,
  }));
  expect(initial.calls).toHaveLength(1);
  expect(initial.calls[0].source).toMatch(/^blob:/);
  expect(initial.calls[0].at - initial.begin).toBeLessThan(100);
  expect(initial.calls[0].phase).toBe("idle");
  expect(initial.loop).toBe(true);
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(await page.evaluate(() => window.__lastAudio.paused)).toBe(true);
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await finishIntro(page);
  await page.locator("#enter-story").click();
  await page
    .getByRole("button", { name: "Ke Bait untukmu", exact: true })
    .click();
  expect(await page.evaluate(() => window.__plays.length)).toBe(2);
  expect(await page.evaluate(() => window.__lastAudio.paused)).toBe(false);
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("without a song the opening starts the ambient audio, with working immediate mute and resume", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.goto("/");
  await page.locator("#begin").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#sound-toggle")).toBeEnabled();
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
