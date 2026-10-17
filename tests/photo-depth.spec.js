import { test, expect } from "@playwright/test";
import { ASPECT, HORIZON, cameraAt, photoDepthAt, occludedByHole, horizonOutline } from "../src/universe-camera.js";

test("distant photos darken while inward photos dissolve and shrink ahead of the horizon", () => {
  const camera = cameraAt(0.3, 1440, 900);
  const point = depth => ({ x: 0.35, depth, y: 0.26 * 0.35 + 0.19 * depth, radius: Math.hypot(0.35, depth) });
  const near = point(0.25), far = point(-0.25);
  expect(occludedByHole(near, camera)).toBe(false);
  expect(occludedByHole(far, camera)).toBe(false);
  const foreground = photoDepthAt(near, camera), background = photoDepthAt(far, camera);
  expect(background.opacity).toBeGreaterThan(0.1);
  expect(background.opacity).toBeLessThan(foreground.opacity);
  expect(background.brightness).toBeLessThan(foreground.brightness);
  expect(background.detail).toBeLessThan(foreground.detail);
  let previous = { opacity: 2, detail: 2, scale: 2 };
  for (const radius of [0.2, 0.18, 0.16, 0.14, 0.12, 0.105]) {
    const material = photoDepthAt({ x: 0, depth: radius, y: 0.19 * radius, radius }, camera);
    expect(material.opacity).toBeLessThan(previous.opacity);
    expect(material.detail).toBeLessThan(previous.detail);
    expect(material.scale).toBeLessThan(previous.scale);
    previous = material;
  }
  expect(previous.opacity).toBe(0);
  expect(previous.scale).toBeCloseTo(0.6);
  // Fade changes continuously as each orbit approaches the horizon.
  let opacity = 0;
  for (let i = 0; i <= 1000; i++) {
    const radius = 0.105 + i * 0.0001;
    const next = photoDepthAt({ x: 0, depth: radius, y: 0.19 * radius, radius }, camera).opacity;
    expect(Math.abs(next - opacity)).toBeLessThan(0.005);
    opacity = next;
  }
});

test("mobile immersion fills the former text space while cover and ending retain their framing", () => {
  for (const [width, height] of [[320, 568], [390, 664], [390, 844], [430, 932]]) {
    expect(cameraAt(0, width, height).centerY / height).toBeCloseTo(0.32);
    const immersive = cameraAt(0, width, height, ASPECT, 1);
    expect(immersive.centerY / height).toBeCloseTo(0.54);
    expect(immersive.zoom).toBeCloseTo(1.35);
    expect(immersive.height).toBeGreaterThan(height * 0.62);
    let previous = immersive.zoom;
    for (let i = 1; i <= 1000; i++) {
      const next = cameraAt(i / 1000, width, height, ASPECT, 1).zoom;
      expect(next).toBeGreaterThanOrEqual(previous);
      previous = next;
    }
    const outline = horizonOutline(immersive), ys = outline.map(point => point[1]);
    const middle = (Math.min(...ys) + Math.max(...ys)) / (2 * height);
    expect(middle).toBeGreaterThan(0.47);
    expect(middle).toBeLessThan(0.55);
    const mobileMiddle = cameraAt(0.3, width, height);
    expect(mobileMiddle.centerY / height).toBeGreaterThan(0.52);
    expect(cameraAt(1, width, height).centerY / height).toBe(0.5);
  }
  expect(cameraAt(0, 1440, 900, ASPECT, 1).centerY / 900).toBe(0.38);
});

test("opening recenters smoothly during countdown and resets correctly on replay and resize", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("#universe"), width = await page.evaluate(() => innerWidth);
  await expect(canvas).toHaveAttribute("data-plate", "ready");
  const initial = width < 700 ? 0.32 : 0.38;
  expect(Number(await canvas.getAttribute("data-framing-y"))).toBeCloseTo(initial);
  const frames = await page.evaluate(async () => {
    const canvas = document.querySelector('#universe'), frames = [];
    document.querySelector('#begin').click();
    await new Promise(resolve => {
      const start = performance.now();
      function sample(now) {
        frames.push({ at: now, y: Number(canvas.dataset.framingY), immersion: Number(canvas.dataset.immersion), progress: Number(canvas.dataset.progress) });
        if (now - start > 1350) resolve(); else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    return frames;
  });
  expect(frames.at(-1).immersion).toBe(1);
  expect(frames.at(-1).progress).toBe(0);
  expect(frames.at(-1).y).toBeCloseTo(width < 700 ? 0.54 : 0.38);
  let lastChange = frames[0];
  for (let i = 1; i < frames.length; i++) {
    expect(frames[i].y).toBeGreaterThanOrEqual(frames[i - 1].y);
    if (frames[i].y === lastChange.y) continue;
    // Bound speed by elapsed render time, rather than assuming a fixed frame
    // rate in software WebGL. One 30-fps sampling interval covers callback lag.
    const elapsed = (frames[i].at - lastChange.at) / 1000;
    expect(frames[i].y - lastChange.y).toBeLessThan(0.42 * elapsed + 0.015);
    lastChange = frames[i];
  }
  await page.locator('#skip-intro').click();
  await page.locator('#home-link').click();
  await expect(canvas).toHaveAttribute('data-immersion', '0.0000');
  expect(Number(await canvas.getAttribute('data-framing-y'))).toBeCloseTo(initial);
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: viewport.width, height: viewport.height - 100 });
  await expect.poll(async () => Number(await canvas.getAttribute('data-framing-y'))).toBeCloseTo(initial);
});
