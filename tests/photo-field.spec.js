import { test, expect } from "@playwright/test";
import { cameraAt, createOrbit, orbitAt, orbitFieldSize, projectOrbit, photoFieldAt, middlePhotoEmphasis, orbitFieldLimit, photoDepthAt } from "../src/universe-camera.js";

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

test("slowmo exposes readable photos while preserving the small distant population and physical occlusion", () => {
  const orbit = createOrbit();
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    for (const progress of [0.26, 0.3, 0.34]) {
      const camera = cameraAt(progress, width, height);
      let readable = 0, ambient = 0;
      for (let i = 0; i < orbit.length / 4; i++) {
        const point = orbitAt(orbit, i, 6);
        const emphasis = middlePhotoEmphasis(point.seed, camera.showcase);
        const fieldSize = orbitFieldSize(point.seed, width, camera.showcase);
        if (!fieldSize) continue;
        const projected = projectOrbit(point, camera, width, height, fieldSize);
        if (!projected) continue;
        const size = Math.min(orbitFieldLimit(width, emphasis), projected.size) * photoDepthAt(point, camera).scale;
        if (emphasis > 0.25 && size >= 20) readable++;
        if (!emphasis) ambient++;
      }
      // Dozens of individually readable cards, with thousands of smaller ones.
      expect(readable).toBeGreaterThan(width < 700 ? 40 : 70);
      expect(readable).toBeLessThan(width < 700 ? 120 : 200);
      expect(ambient).toBeGreaterThan(readable * 15);
    }
    // The gain has no effect on the cover, ending or majority of dust particles.
    for (let i = 0; i < 1000; i++) {
      const seed = orbit[i * 4 + 3];
      for (const progress of [0, 0.16, 0.42, 0.8, 1])
        expect(orbitFieldSize(seed, width, cameraAt(progress, width, height).showcase)).toBe(orbitFieldSize(seed, width));
    }
    // A magnified photo still dissolves near the horizon and remains dimmer far away.
    const camera = cameraAt(0.3, width, height);
    const near = { x: .35, y: .14, depth: .25, radius: .43 };
    const far = { ...near, depth: -.25, y: .26 * .35 - .19 * .25 };
    expect(photoDepthAt(far, camera, 1).brightness).toBeLessThan(photoDepthAt(near, camera, 1).brightness);
    expect(photoDepthAt({ ...near, radius: .105 }, camera, 1).opacity).toBe(0);
    const seed = Array.from(orbit).filter((_, i) => i % 4 === 3).find(s => middlePhotoEmphasis(s, 1) > .9);
    let previous = orbitFieldSize(seed, width, 0);
    for (let i = 1; i <= 1000; i++) {
      const size = orbitFieldSize(seed, width, i / 1000);
      expect(size - previous).toBeGreaterThanOrEqual(0);
      expect(size - previous).toBeLessThan(.0001);
      previous = size;
    }
  }
});

test("GPU resolves uploaded textures across the middle disk rather than showing only a few portraits", async ({ page }) => {
  test.setTimeout(60000);
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
    function measure() {
      const before = capture(0), after = capture(0.3), cells = new Set();
      let extraCyan = 0, extraPink = 0, chroma = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const cyan = p => p[i + 1] > p[i] + 30 && p[i + 2] > p[i] + 20;
        const pink = p => p[i] > p[i + 1] + 45 && p[i + 2] > p[i + 1] + 5;
        if (cyan(after) && !cyan(before)) { extraCyan++; chroma += Math.max(after[i],after[i+1],after[i+2])-Math.min(after[i],after[i+1],after[i+2]); cells.add(`${x >> 4},${y >> 4}`); }
        if (pink(after) && !pink(before)) extraPink++;
      }
      return { extraCyan, extraPink, chroma: chroma / extraCyan, cells: cells.size, width, error: gl.getError() };
    }
    const normal = measure();
    // Dark disk regions used to multiply opacity down until image detail vanished.
    const dark = document.createElement("canvas"); dark.width = dark.height = 32;
    const darkContext = dark.getContext("2d");
    darkContext.fillStyle = "#08090b"; darkContext.fillRect(0, 0, 32, 32);
    gpu.setPlate(dark);
    return { ...normal, dim: measure() };
  });
  expect(coverage.error).toBe(0);
  expect(coverage.chroma).toBeGreaterThan(25);
  expect(coverage.chroma).toBeLessThan(160);
  expect(coverage.extraCyan).toBeGreaterThan(coverage.width < 700 ? 1500 : 10000);
  expect(coverage.extraPink).toBeGreaterThan(coverage.width < 700 ? 1500 : 10000);
  expect(coverage.cells).toBeGreaterThan(coverage.width < 700 ? 35 : 100);
  expect(coverage.dim.error).toBe(0);
  expect(coverage.dim.extraCyan, JSON.stringify(coverage.dim)).toBeGreaterThan(coverage.width < 700 ? 100 : 300);
  expect(coverage.dim.cells).toBeGreaterThan(coverage.width < 700 ? 5 : 20);
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
      if (pixels[i + 1] > pixels[i] + 30 && pixels[i + 2] > pixels[i] + 20) cyan++;
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
