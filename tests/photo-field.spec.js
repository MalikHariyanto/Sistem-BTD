import { test, expect } from "@playwright/test";
import { cameraAt, createOrbit, orbitAt, orbitFieldSize, projectOrbit, photoFieldAt } from "../src/universe-camera.js";

test("the middle contains hundreds of small photographs on real orbits and leaves opening and ending clear", () => {
  const orbit = createOrbit();
  expect(photoFieldAt(0)).toBe(0);
  expect(photoFieldAt(1)).toBe(0);
  for (const [width, height] of [[390, 664], [1440, 900]]) {
    for (const p of [0.26, 0.3, 0.36, 0.4]) {
      expect(photoFieldAt(p)).toBe(1);
      const camera = cameraAt(p, width, height);
      let visible = 0, distinctRadii = new Set();
      for (let i = 0; i < orbit.length / 4; i++) {
        const point = orbitAt(orbit, i, 6), size = orbitFieldSize(point.seed, width);
        if (!size) continue;
        const projected = projectOrbit(point, camera, width, height, size);
        if (projected && projected.size >= 4) {
          visible++;
          distinctRadii.add(Math.floor(point.radius * 100));
        }
      }
      expect(visible).toBeGreaterThan(width < 700 ? 500 : 1000);
      expect(distinctRadii.size).toBeGreaterThan(20);
    }
  }
  let previous = 0;
  for (let i = 0; i <= 1000; i++) {
    const strength = photoFieldAt(i / 1000);
    expect(Math.abs(strength - previous)).toBeLessThan(0.02);
    previous = strength;
  }
});

test("GPU resolves uploaded textures across the middle disk rather than showing only a few portraits", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const coverage = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const { cameraAt } = await import("/src/universe-camera.js");
    const width = innerWidth, height = innerHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const gpu = createUniverseGPU(canvas);
    if (!gpu) throw Error("WebGL initialization failed");
    const photo = document.createElement("canvas");
    photo.width = 100; photo.height = 140;
    const ctx = photo.getContext("2d");
    ctx.fillStyle = "#00ffff"; ctx.fillRect(0, 0, 100, 140);
    // Two contrasting halves ensure this is an actual sampled image texture.
    ctx.fillStyle = "#ff0066"; ctx.fillRect(50, 0, 50, 140);
    gpu.setPhotos([photo]);
    const gl = canvas.getContext("webgl"), camera = cameraAt(0.3, width, height);
    function capture(progress) {
      gpu.draw({ camera: { ...camera, progress }, width, height, time: 6, detail: 0, cover: 0, showcase: 1, reduced: true });
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels;
    }
    const before = capture(0), after = capture(0.3), cells = new Set();
    let extraCyan = 0, extraPink = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const cyan = p => p[i + 1] > p[i] + 60 && p[i + 2] > p[i] + 60;
      const pink = p => p[i] > p[i + 1] + 80 && p[i + 2] > p[i + 1] + 35;
      if (cyan(after) && !cyan(before)) { extraCyan++; cells.add(`${x >> 4},${y >> 4}`); }
      if (pink(after) && !pink(before)) extraPink++;
    }
    return { extraCyan, extraPink, cells: cells.size, width, error: gl.getError() };
  });
  expect(coverage.error).toBe(0);
  expect(coverage.extraCyan).toBeGreaterThan(coverage.width < 700 ? 1500 : 10000);
  expect(coverage.extraPink).toBeGreaterThan(coverage.width < 700 ? 1500 : 10000);
  expect(coverage.cells).toBeGreaterThan(coverage.width < 700 ? 35 : 100);
});

test("Canvas fallback also shows uploaded photographs across the middle and can continue into the story", async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
      return kind === "webgl" || kind === "webgl2" ? null : get.call(this, kind, ...args);
    };
  });
  await page.goto("/");
  const universe = page.locator("#universe");
  await expect(universe).toHaveAttribute("data-plate", "ready");
  await page.evaluate(() => {
    const photo = document.createElement("canvas");
    photo.width = 100; photo.height = 140;
    const ctx = photo.getContext("2d");
    ctx.fillStyle = "#00ffff"; ctx.fillRect(0, 0, 100, 140);
    dispatchEvent(new CustomEvent("photoschanged", { detail: [photo.toDataURL()] }));
  });
  await expect(universe).toHaveAttribute("data-photo-sources", "1");
  await page.locator("#begin").click();
  await expect(universe).toHaveAttribute("data-photo-field", "1.0000", { timeout: 20000 });
  // Inspect the middle of the showcase, after the tiny cards resolve.
  await expect.poll(async () => Number(await universe.getAttribute("data-progress")), { timeout: 10000 }).toBeGreaterThanOrEqual(0.3);
  const image = await universe.evaluate(canvas => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let cyan = 0;
    for (let i = 0; i < pixels.length; i += 16)
      if (pixels[i + 1] > pixels[i] + 60 && pixels[i + 2] > pixels[i] + 60) cyan++;
    return { fraction: cyan / (pixels.length / 16), progress: Number(canvas.dataset.progress), renderer: canvas.dataset.renderer };
  });
  expect(image.renderer).toBe("canvas2d");
  expect(image.progress).toBeGreaterThanOrEqual(0.3);
  expect(image.progress).toBeLessThan(0.41);
  expect(image.fraction).toBeGreaterThan(0.006);
  await page.locator("#skip-intro").click();
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
});
