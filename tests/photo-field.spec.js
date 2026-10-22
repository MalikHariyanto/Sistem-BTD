import { test, expect } from "@playwright/test";
import { cameraAt, createOrbit, orbitAt, projectOrbit, photoFieldAt } from "../src/universe-camera.js";
import { assignOrbitPhotos } from "../src/photo-textures.js";
import { createOrbitComposition, photoRegion } from "../src/orbit-composition.js";
import { crystalBounds } from "../src/crystal-pin.js";

test("the moving middle balances clear foreground crystals with fading rear photographs", () => {
  const orbit = createOrbit(), photoIds = assignOrbitPhotos(orbit, 200);
  const ratios = Array.from({ length: 200 }, (_, i) => [.8, 1.6, 1][i % 3]);
  expect(orbit.length / 4).toBe(32768);
  expect(photoFieldAt(0)).toBe(0);
  expect(photoFieldAt(1)).toBe(0);
  for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) {
    const composition = createOrbitComposition(orbit);
    let previous = new Map(), tracked = 0, total = 0, minVisible = Infinity, maxVisible = 0;
    let overlaps = 0, duplicates = 0, movedFromOrbit = 0, maxAlphaStep = 0, minSize = Infinity, maxSize = 0;
    const regions = { upper: 0, front: 0, lower: 0 }, seen = new Set();
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
      for (const photo of visible) { regions[photoRegion(photo.projected, camera)]++; seen.add(photoIds[photo.index]); }
      for (let i = 0; i < visible.length; i++) {
        const photo = visible[i], a = photo.projected, ratio = ratios[photoIds[photo.index]];
        // Use the larger footprint so a departing card is not culled as dust.
        const physical = projectOrbit(orbitAt(orbit, photo.index, time), camera, width, height, .05);
        if (!physical || Math.hypot(a.x - physical.x, a.y - physical.y) > .00001) movedFromOrbit++;
        minSize = Math.min(minSize, a.size); maxSize = Math.max(maxSize, a.size);
        for (let j = i + 1; j < visible.length; j++) {
          const aa=crystalBounds(a,ratio), b=visible[j].projected, bb=crystalBounds(b,ratios[photoIds[visible[j].index]]);
          if (aa.left<bb.right&&aa.right>bb.left&&aa.top<bb.bottom&&aa.bottom>bb.top) overlaps++;
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
    // Count readable foreground photographs, not the deliberately veiled rear.
    // Even a narrow phone keeps a populated stream, rather than five big pins.
    expect(minVisible).toBeGreaterThanOrEqual(width < 700 ? 8 : 18);
    expect(maxVisible).toBeLessThanOrEqual(width < 700 ? 90 : 160);
    expect(total / 150).toBeGreaterThan(width < 700 ? 12 : 28);
    expect(minSize).toBeGreaterThanOrEqual(width < 700 ? 10 : 12);
    expect(maxSize).toBeLessThanOrEqual(width < 700 ? 94 : 138);
    expect(regions.front + regions.lower).toBeGreaterThan(1200);
    expect(seen.size).toBeGreaterThan(width < 700 ? 30 : 50);
    expect(overlaps).toBe(0);
    expect(duplicates).toBe(0);
    expect(movedFromOrbit).toBe(0);
    expect(maxAlphaStep).toBeLessThan(.14);
    expect(tracked).toBeGreaterThan(1000);
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
    const regions = { upper: 0, front: 0, lower: 0 };
    const cells = new Set();
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 1] > pixels[i] + 30 && pixels[i + 2] > pixels[i] + 20) {
        cyan++; cells.add(`${x >> 4},${y >> 4}`);
        const u = (x - camera.x) / camera.width, v = (height - 1 - y - camera.y) / camera.height;
        const offset = v - (.35 + .26 * u);
        regions[offset < -.045 ? "upper" : offset > .065 ? "lower" : "front"]++;
      }
      if (pixels[i] > pixels[i + 1] + 45 && pixels[i + 2] > pixels[i + 1] + 5) pink++;
    }
    return { cyan, pink, regions, cells: cells.size, width, photos: Number(canvas.dataset.diskPhotos),
      filaments: Number(canvas.dataset.filaments), pins: Number(canvas.dataset.crystalPins), error: gl.getError() };
  });
  expect(result.error).toBe(0);
  expect(result.filaments).toBe(32768);
  expect(result.photos).toBeGreaterThan(result.width < 700 ? 12 : 24);
  expect(result.pins).toBeGreaterThan(result.width < 700 ? 12 : 24);
  expect(result.photos).toBeLessThanOrEqual(result.width < 700 ? 90 : 160);
  // Both halves must survive integration into the warm light, even over black.
  expect(result.cyan, JSON.stringify(result)).toBeGreaterThan(result.width < 700 ? 1500 : 8000);
  expect(result.pink).toBeGreaterThan(result.width < 700 ? 1500 : 8000);
  expect(result.cells).toBeGreaterThan(result.width < 700 ? 35 : 100);
  expect(result.regions.front + result.regions.lower).toBeGreaterThan(result.width < 700 ? 500 : 2000);
});

test("close disk photographs retain readable internal image contrast with 200 uploads", async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#open-editor").click();
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const m = await import("/src/universe-camera.js");
    const { createOrbitComposition, photoRegion } = await import("/src/orbit-composition.js");
    const { assignOrbitPhotos } = await import("/src/photo-textures.js");
    const { photoSurfaceAt, projectPhotoSurface } = await import("/src/photo-surface.js");
    const { crystalCenter } = await import("/src/crystal-pin.js");
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
    const contrast = photo => {
      const size = photo.projected.size * m.photoDepthAt(photo.point, camera, 1).scale;
      const pose = photoSurfaceAt(photo.point, 6, 1, .8);
      const {x,y}=crystalCenter({...photo.projected,size},.8,pose,photo.projected.crystal);
      const samples = [-.32, 0, .32].map(v => {
        const left = projectPhotoSurface(-.22, v, .8, pose);
        const right = projectPhotoSurface(.22, v, .8, pose);
        return luminance(x + right.x * size, y + right.y * size) - luminance(x + left.x * size, y + left.y * size);
      });
      return samples.reduce((sum, value) => sum + value, 0) / samples.length;
    };
    const contrasts = photos.filter(photo => photo.alpha > .8 && photo.point.radius > .2 && photo.point.depth > 0 && photo.projected.size >= 22).map(contrast);
    const rear = photos.filter(photo => photo.alpha > .08 && photo.point.radius > .2 && photo.point.depth < 0 && photo.projected.crystal < .05).map(contrast);
    return { contrast: contrasts.reduce((sum, value) => sum + value, 0) / contrasts.length,
      readable: contrasts.filter(value => value > 65).length, count: contrasts.length,
      rear: rear.reduce((sum, value) => sum + value, 0) / rear.length,
      rearReadable: rear.filter(value => value > 30).length, rearCount: rear.length, error: gl.getError() };
  });
  expect(result.error).toBe(0);
  expect(result.count).toBeGreaterThanOrEqual(isMobile ? 5 : 16);
  expect(result.readable / result.count, JSON.stringify(result)).toBeGreaterThan(.8);
  expect(result.contrast).toBeGreaterThan(85);
  expect(result.rearCount).toBeGreaterThan(isMobile ? 3 : 6);
  expect(result.rear, JSON.stringify(result)).toBeLessThan(result.contrast*.45);
  expect(result.rear).toBeGreaterThan(1);
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
  expect(image.photos).toBeGreaterThan(8);
  expect(image.photos).toBeLessThanOrEqual(await page.evaluate(() => innerWidth < 700 ? 90 : 160));
  expect(image.progress).toBeGreaterThanOrEqual(0.3);
  expect(image.progress).toBeLessThan(0.41);
  expect(image.fraction).toBeGreaterThan(0.006);
  await page.locator("#skip-intro").click();
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
});
