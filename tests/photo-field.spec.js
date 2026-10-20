import { test, expect } from "@playwright/test";
import { cameraAt, createOrbit, orbitAt, projectOrbit, photoFieldAt } from "../src/universe-camera.js";
import { assignOrbitPhotos } from "../src/photo-textures.js";
import { createOrbitComposition } from "../src/orbit-composition.js";

test("the moving middle stays full of light with clear, spaced photos and stable identities", () => {
  const orbit = createOrbit(), photoIds = assignOrbitPhotos(orbit, 200);
  const ratios = Array.from({ length: 200 }, (_, i) => [.8, 1.6, 1][i % 3]);
  expect(orbit.length / 4).toBe(32768);
  expect(photoFieldAt(0)).toBe(0);
  expect(photoFieldAt(1)).toBe(0);
  for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) {
    const composition = createOrbitComposition(orbit);
    let previous = new Map(), tracked = 0, total = 0, minVisible = Infinity, maxVisible = 0;
    let overlaps = 0, duplicates = 0, movedFromOrbit = 0, maxAlphaStep = 0, minSize = Infinity, maxSize = 0;
    // Five seconds of real movement, mixed image ratios, and a moving camera.
    // Include retiring cards, not just the newly selected target population.
    for (let frame = 0; frame < 150; frame++) {
      const progress = .26 + frame / 149 * .1, camera = cameraAt(progress, width, height);
      const time = 6 + frame / 30 * .85;
      const photos = composition.update({ camera, width, height, time, photoIds, ratios,
        now: 1000 + frame / 30 * 1000, reduced: frame === 0 });
      const visible = photos.filter(photo => photo.alpha > .5);
      minVisible = Math.min(minVisible, visible.length);
      maxVisible = Math.max(maxVisible, visible.length);
      duplicates += visible.length - new Set(visible.map(photo => photoIds[photo.index])).size;
      total += visible.length;
      for (let i = 0; i < visible.length; i++) {
        const photo = visible[i], a = photo.projected, ratio = ratios[photoIds[photo.index]];
        // Use the larger footprint so a departing card is not culled as dust.
        const physical = projectOrbit(orbitAt(orbit, photo.index, time), camera, width, height, .02);
        if (!physical || Math.hypot(a.x - physical.x, a.y - physical.y) > .00001) movedFromOrbit++;
        minSize = Math.min(minSize, a.size); maxSize = Math.max(maxSize, a.size);
        for (let j = i + 1; j < visible.length; j++) {
          const b = visible[j].projected, other = ratios[photoIds[visible[j].index]];
          if (Math.abs(a.x - b.x) < (a.size * Math.min(ratio, 1) + b.size * Math.min(other, 1)) / 2 &&
            Math.abs(a.y - b.y) < (a.size * Math.min(1 / ratio, 1) + b.size * Math.min(1 / other, 1)) / 2) overlaps++;
        }
      }
      for (const photo of photos) {
        const before = previous.get(photo.index);
        if (before) {
          maxAlphaStep = Math.max(maxAlphaStep, Math.abs(photo.alpha - before.alpha));
          tracked++;
        }
      }
      previous = new Map(photos.map(photo => [photo.index, photo]));
    }
    expect(minVisible).toBeGreaterThanOrEqual(width < 700 ? 14 : 28);
    expect(maxVisible).toBeLessThanOrEqual(width < 700 ? 22 : 44);
    expect(total / 150).toBeGreaterThan(width < 700 ? 18 : 38);
    expect(minSize).toBeGreaterThanOrEqual(width < 700 ? 20 : 26);
    expect(maxSize).toBeLessThanOrEqual(width < 700 ? 54 : 74);
    expect(overlaps).toBe(0);
    expect(duplicates).toBe(0);
    expect(movedFromOrbit).toBe(0);
    expect(maxAlphaStep).toBeLessThan(.14);
    expect(tracked).toBeGreaterThan(2000);
  }
});

test("uploaded image colors stay visible on the clean middle disk, including dark regions", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#open-editor").click();
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const { cameraAt } = await import("/src/universe-camera.js");
    const width = innerWidth, height = innerHeight;
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const gpu = createUniverseGPU(canvas);
    if (!gpu) throw Error("WebGL initialization failed");
    const photo = document.createElement("canvas"); photo.width = 256; photo.height = 320;
    const ctx = photo.getContext("2d");
    ctx.fillStyle = "#00ffff"; ctx.fillRect(0, 0, 128, 320);
    ctx.fillStyle = "#ff0066"; ctx.fillRect(128, 0, 128, 320);
    gpu.setPhotos(Array(200).fill(photo));
    const gl = canvas.getContext("webgl"), camera = cameraAt(.32, width, height);
    const dark = document.createElement("canvas"); dark.width = dark.height = 32;
    dark.getContext("2d").fillRect(0, 0, 32, 32);
    gpu.setPlate(dark);
    gpu.draw({ camera, width, height, time: 6, detail: 0, cover: 0, showcase: camera.showcase, reduced: true });
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let cyan = 0, pink = 0;
    const cells = new Set();
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 1] > pixels[i] + 30 && pixels[i + 2] > pixels[i] + 20) {
        cyan++; cells.add(`${x >> 4},${y >> 4}`);
      }
      if (pixels[i] > pixels[i + 1] + 45 && pixels[i + 2] > pixels[i + 1] + 5) pink++;
    }
    return { cyan, pink, cells: cells.size, width, photos: Number(canvas.dataset.diskPhotos),
      filaments: Number(canvas.dataset.filaments), error: gl.getError() };
  });
  expect(result.error).toBe(0);
  expect(result.filaments).toBe(32768);
  expect(result.photos).toBeGreaterThan(result.width < 700 ? 14 : 28);
  expect(result.photos).toBeLessThanOrEqual(result.width < 700 ? 22 : 44);
  // Both halves must survive integration into the warm light, even over black.
  expect(result.cyan, JSON.stringify(result)).toBeGreaterThan(result.width < 700 ? 1500 : 8000);
  expect(result.pink).toBeGreaterThan(result.width < 700 ? 1500 : 8000);
  expect(result.cells).toBeGreaterThan(result.width < 700 ? 35 : 100);
});

test("close disk photographs retain readable internal image contrast with 200 uploads", async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#open-editor").click();
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const m = await import("/src/universe-camera.js");
    const { createOrbitComposition } = await import("/src/orbit-composition.js");
    const { assignOrbitPhotos } = await import("/src/photo-textures.js");
    const width = innerWidth, height = innerHeight;
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const gpu = createUniverseGPU(canvas), gl = canvas.getContext("webgl");
    const photo = document.createElement("canvas"); photo.width = 256; photo.height = 320;
    const ctx = photo.getContext("2d");
    ctx.fillStyle = "#303030"; ctx.fillRect(0, 0, 128, 320);
    ctx.fillStyle = "#d0d0d0"; ctx.fillRect(128, 0, 128, 320);
    gpu.setPhotos(Array(200).fill(photo));
    const dark = document.createElement("canvas"); dark.width = dark.height = 32;
    dark.getContext("2d").fillRect(0, 0, 32, 32);
    gpu.setPlate(dark);
    const camera = m.cameraAt(.32, width, height);
    gpu.draw({ camera, width, height, time: 6, detail: 0, cover: 0, showcase: camera.showcase, reduced: true });
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    function luminance(x, y) {
      const i = ((height - 1 - Math.round(y)) * width + Math.round(x)) * 4;
      return pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722;
    }
    const orbit = m.createOrbit(), photoIds = assignOrbitPhotos(orbit, 200);
    const photos = createOrbitComposition(orbit).update({ camera, width, height, time: 6, photoIds,
      ratios: Array(200).fill(.8), now: 1000, reduced: true });
    const contrasts = photos.filter(photo => photo.alpha > .8 && photo.point.radius > .2).map(photo => {
      const { x, y } = photo.projected;
      const size = photo.projected.size * m.photoDepthAt(photo.point, camera, 1).scale;
      return luminance(x + size * .8 * .22, y) - luminance(x - size * .8 * .22, y);
    });
    return { contrast: contrasts.reduce((sum, value) => sum + value, 0) / contrasts.length,
      readable: contrasts.filter(value => value > 65).length, count: contrasts.length, error: gl.getError() };
  });
  expect(result.error).toBe(0);
  expect(result.count).toBeGreaterThan(isMobile ? 12 : 28);
  expect(result.readable / result.count, JSON.stringify(result)).toBeGreaterThan(.8);
  expect(result.contrast).toBeGreaterThan(85);
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
    return { fraction: cyan / (pixels.length / 16), progress: Number(canvas.dataset.progress), renderer: canvas.dataset.renderer, photos: Number(canvas.dataset.diskPhotos), filaments: Number(canvas.dataset.filaments) };
  });
  expect(image.renderer).toBe("canvas2d");
  expect(image.filaments).toBe(8192);
  expect(image.photos).toBeGreaterThan(10);
  expect(image.photos).toBeLessThanOrEqual(await page.evaluate(() => innerWidth < 700 ? 22 : 44));
  expect(image.progress).toBeGreaterThanOrEqual(0.3);
  expect(image.progress).toBeLessThan(0.41);
  expect(image.fraction).toBeGreaterThan(0.006);
  await page.locator("#skip-intro").click();
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
});
