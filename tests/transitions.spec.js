import { test, expect } from "@playwright/test";
import { cameraAt } from "../src/universe-camera.js";

async function enter(page) {
  await page.goto("/");
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
}

// Inspect every animation frame, including the interval after the outgoing
// effect ends. An endpoint screenshot alone cannot catch the old-page flash.
test("Next never exposes the outgoing chapter again, even with repeated clicks", async ({
  page,
}) => {
  await enter(page);
  for (const target of [2, 3, 4]) {
    const samples = await page.evaluate(async (target) => {
      const previous = document.querySelector(".scene.is-active"),
        incoming = document.querySelector(`[data-scene="${target}"]`);
      const frames = [];
      let end = false;
      function sample() {
        frames.push({
          old: previous.hidden ? 0 : Number(getComputedStyle(previous).opacity),
          next: incoming.hidden
            ? 0
            : Number(getComputedStyle(incoming).opacity),
        });
        if (!end) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      const next = document.querySelector("#next-scene");
      next.click();
      next.click();
      next.click();
      await new Promise((resolve) => {
        const completed = () => {
          if (previous.hidden && incoming.classList.contains("is-active"))
            resolve();
          else requestAnimationFrame(completed);
        };
        requestAnimationFrame(completed);
      });
      await new Promise((resolve) => setTimeout(resolve, 250));
      end = true;
      sample(); // Include the actual committed endpoint, even on a busy GPU.
      return frames;
    }, target);
    await expect(page.locator(".scene.is-active")).toHaveAttribute(
      "data-scene",
      String(target),
    );
    await expect(page.locator("[data-scene]:not([hidden])")).toHaveCount(1);
    let oldLast = 1,
      nextLast = 0;
    for (const frame of samples) {
      expect(frame.old).toBeLessThanOrEqual(oldLast + 0.015);
      expect(frame.next).toBeGreaterThanOrEqual(nextLast - 0.015);
      oldLast = frame.old;
      nextLast = frame.next;
    }
    expect(oldLast).toBe(0);
    expect(nextLast).toBe(1);
  }
});

test("poem content changes while transparent and stays visible after its animation completes", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Ke Bait untukmu", exact: true })
    .click();
  await expect(page.locator('[data-scene="2"]')).toHaveClass(/is-active/);
  const samples = await page.evaluate(async () => {
    const layout = document.querySelector(".poem-layout"),
      title = document.querySelector("#poem-title"),
      frames = [];
    let end = false;
    function sample() {
      frames.push({
        title: title.textContent,
        opacity: Number(getComputedStyle(layout).opacity),
      });
      if (!end) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
    document.querySelector("#next-poem").click();
    await new Promise((resolve) => {
      const completed = () => {
        if (!document.querySelector("#next-poem").disabled) resolve();
        else requestAnimationFrame(completed);
      };
      requestAnimationFrame(completed);
    });
    end = true;
    sample();
    return frames;
  });
  const change = samples.findIndex(
    (s, i) => i > 0 && s.title !== samples[i - 1].title,
  );
  expect(change).toBeGreaterThan(0);
  expect(samples[change - 1].opacity).toBeLessThan(0.08);
  expect(samples[change].opacity).toBeLessThan(0.15);
  await expect(page.locator("#poem-title")).toHaveText("Hal-hal Kecil");
  expect(samples.at(-1).opacity).toBe(1);
});

test("disk texture orbits at rest, the central shadow stays fixed, and reduced motion stops it", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-plate",
    "ready",
  );
  const c0 = cameraAt(
    0,
    await page.evaluate(() => innerWidth),
    await page.evaluate(() => innerHeight),
  );
  const capture = () =>
    page.locator("#universe").evaluate(
      (c, center) => {
        const ctx = c.getContext("2d"),
          gl = ctx ? null : c.getContext("webgl");
        let pixels;
        if (ctx) pixels = ctx.getImageData(0, 0, c.width, c.height).data;
        else {
          pixels = new Uint8Array(c.width * c.height * 4);
          gl.readPixels(
            0,
            0,
            c.width,
            c.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
        }
        let hash = 2166136261;
        for (let i = 0; i < pixels.length; i += 32)
          hash = Math.imul(hash ^ pixels[i], 16777619);
        const x = Math.round((center.x * c.width) / c.clientWidth),
          y = Math.round((center.y * c.height) / c.clientHeight);
        const offset = ((ctx ? y : c.height - y) * c.width + x) * 4;
        return {
          hash,
          center: [...pixels.slice(offset, offset + 3)],
          flow: Number(c.dataset.flow),
        };
      },
      { x: c0.x + c0.width * 0.5, y: c0.y + c0.height * 0.4 },
    );
  const first = await capture();
  await page.waitForTimeout(700);
  const second = await capture();
  expect(second.flow).toBeGreaterThan(first.flow);
  expect(second.hash).not.toBe(first.hash);
  expect(Math.max(...first.center)).toBeLessThan(50);
  for (let i = 0; i < 3; i++)
    expect(Math.abs(first.center[i] - second.center[i])).toBeLessThanOrEqual(3);
  await page.locator("#open-editor").click();
  const paused = await page.locator("#universe").getAttribute("data-flow");
  await page.waitForTimeout(400);
  await expect(page.locator("#universe")).toHaveAttribute("data-flow", paused);
  await page.keyboard.press("Escape");
  await expect
    .poll(async () =>
      Number(await page.locator("#universe").getAttribute("data-flow")),
    )
    .toBeGreaterThan(Number(paused));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  const frozen = await capture();
  await page.waitForTimeout(350);
  expect(await capture()).toEqual(frozen);
});

test("Canvas fallback still runs the story when WebGL is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (kind === "webgl" || kind === "webgl2") return null;
      return get.call(this, kind, ...args);
    };
  });
  await enter(page);
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-renderer",
    "canvas2d",
  );
  await page
    .getByRole("button", { name: "Ke Satu harapan", exact: true })
    .click();
  await expect(page.locator("#ready-wish")).toBeVisible();
});

test("header, footer and chapter dissolve together without a late theme change", async ({ page }) => {
  await page.goto("/");
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  // Check the full-screen opening as well as every reading chapter and return.
  for (const target of [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]) {
    const result = await page.evaluate(async target => {
      const incoming = document.querySelector(`[data-scene="${target}"]`);
      const button = document.body.dataset.chapter === "0"
        ? document.querySelector("#enter-story")
        : document.querySelector(`#story-nav [data-chapter="${target}"]`);
      button.click();
      const controls = [document.querySelector('.story-header'), document.querySelector('#story-nav')];
      const animation = incoming.getAnimations()[0];
      const frames = [], beginning = {
        theme: document.body.dataset.chapter,
        label: document.querySelector('#chapter-name').textContent,
        durations: controls.map(element => element.getAnimations()[0]?.effect.getTiming().duration),
        starts: controls.map(element => element.getAnimations()[0]?.startTime),
        duration: animation.effect.getTiming().duration,
        start: animation.startTime,
        snapshots: document.querySelectorAll('[data-chrome-snapshot]').length,
        dimmedControls: [...document.querySelectorAll('#story-nav button')].some(button =>
          button.disabled || Number(getComputedStyle(button).opacity) < 1),
      };
      await new Promise(resolve => {
        function frame() {
          frames.push({
            scene: Number(getComputedStyle(incoming).opacity),
            controls: controls.map(element => Number(getComputedStyle(element).opacity)),
          });
          if (!document.querySelector('#stage').hasAttribute('aria-busy')) resolve();
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
      return { beginning, frames,
        snapshots: document.querySelectorAll('[data-chrome-snapshot]').length,
        backgrounds: [...controls, incoming].map(element => getComputedStyle(element).backgroundColor),
        pending: controls.flatMap(element => element.getAnimations({ subtree: true })).length,
      };
    }, target);
    expect(result.beginning.theme).toBe(String(target));
    expect(result.beginning.snapshots).toBe(0);
    expect(result.beginning.dimmedControls).toBe(false);
    expect(result.beginning.durations).toEqual([result.beginning.duration, result.beginning.duration]);
    expect(result.beginning.starts).toEqual([result.beginning.start, result.beginning.start]);
    for (const frame of result.frames)
      for (const opacity of frame.controls) expect(Math.abs(opacity - frame.scene)).toBeLessThan(0.025);
    expect(result.backgrounds.slice(0, 2)).toEqual(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
    expect(result.snapshots).toBe(0);
    expect(result.pending).toBe(0);
  }
});
