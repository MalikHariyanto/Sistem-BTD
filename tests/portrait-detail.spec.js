import { pauseUniverse } from "./gift-fixtures.js";
import { test, expect } from "@playwright/test";

test("near-photo cache preserves photo identity, stays bounded and only uploads changed portraits", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await pauseUniverse(page);
  const result = await page.evaluate(async () => {
    const { createPortraitAtlas } = await import("/src/portrait-textures.js");
    const gl = document.createElement("canvas").getContext("webgl");
    const atlas = createPortraitAtlas(gl, 4096);
    const images = Array.from({ length: 200 }, (_, id) => {
      const image = document.createElement("canvas"); image.width = 32; image.height = 40;
      const ctx = image.getContext("2d");
      ctx.fillStyle = `rgb(${id},70,180)`; ctx.fillRect(0, 0, 32, 40);
      ctx.fillStyle = `rgb(${id},150,90)`; ctx.fillRect(16, 20, 16, 20);
      return image;
    });
    atlas.update([0], images.slice(0, 1), 128);
    atlas.clear();
    let uploads = 0, mismatches = 0, checks = 0;
    const upload = gl.texSubImage2D.bind(gl);
    const getError = gl.getError.bind(gl);
    gl.getError = () => { checks++; return getError(); };
    gl.texSubImage2D = (...args) => { uploads++; upload(...args); };
    function verify(ids) {
      const slots = atlas.update(ids, images, 128), plan = atlas.plan;
      const fb = gl.createFramebuffer();
      gl.activeTexture(gl.TEXTURE3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gl.getParameter(gl.TEXTURE_BINDING_2D), 0);
      for (const [id, slot] of slots) for (const [fraction, expected] of [[.25, [id,70,180]], [.75, [id,150,90]]]) {
        const pixel = new Uint8Array(4);
        gl.readPixels((slot % plan.columns + fraction) * plan.tileWidth, (Math.floor(slot / plan.columns) + fraction) * plan.tileHeight, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        if (expected.some((value, i) => Math.abs(pixel[i] - value) > 1)) mismatches++;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
      return slots.size;
    }
    const ids = Array.from({ length: 16 }, (_, i) => i);
    const initial = verify(ids), initialUploads = uploads, initialChecks = checks;
    for (let i = 0; i < 20; i++) verify(ids);
    const stableUploads = uploads - initialUploads, stableChecks = checks - initialChecks;
    const replacements = verify([...ids.slice(1), 199]);
    const replacementUploads = uploads - initialUploads;
    const bounded = verify(Array.from({ length: 200 }, (_, i) => i));
    const plan = { ...atlas.plan };
    atlas.clear();
    const originalError = gl.getError.bind(gl), allocate = gl.texImage2D.bind(gl);
    let failed = false, allocations = 0;
    gl.texImage2D = () => { failed = true; allocations++; };
    gl.getError = () => failed ? (failed = false, gl.OUT_OF_MEMORY) : originalError();
    const fallback = atlas.update(ids, images, 128).size;
    const failedAttempts = allocations;
    atlas.update(ids, images, 128);
    const retries = allocations - failedAttempts;
    gl.texImage2D = allocate; gl.getError = originalError;
    atlas.clear();
    const recovered = verify(ids);
    // A partially failed upload batch must not expose any unvalidated new
    // identity, or invalidate the fourteen untouched cached photographs.
    let pendingError = false;
    const realError = gl.getError.bind(gl), realUpload = gl.texSubImage2D.bind(gl);
    gl.texSubImage2D = (...args) => { realUpload(...args); pendingError = true; };
    gl.getError = () => pendingError ? (pendingError = false, gl.OUT_OF_MEMORY) : realError();
    const changed = [...ids.slice(0,14),198,199];
    const failedBatch = atlas.update(changed,images,128);
    const retained = failedBatch.size, exposedFailure = failedBatch.has(198)||failedBatch.has(199);
    gl.texSubImage2D=realUpload; gl.getError=realError;
    const retriedBatch=verify(changed), error = gl.getError();
    return { initial, initialUploads, initialChecks, stableChecks, stableUploads, replacements, replacementUploads, bounded, mismatches, plan, fallback, retries, recovered, retained, exposedFailure, retriedBatch, error };
  });
  expect(result.initial).toBe(16);
  expect(result.initialUploads).toBe(16);
  expect(result.stableUploads).toBe(0);
  expect(result.initialChecks).toBe(2); // one allocation, one changed batch
  expect(result.stableChecks).toBe(0);
  expect(result.replacements).toBe(16);
  expect(result.replacementUploads).toBe(1);
  expect(result.bounded).toBe(16);
  expect(result.mismatches).toBe(0);
  expect(result.plan.width * result.plan.height * 4).toBeLessThanOrEqual(8192000);
  expect(result.fallback).toBe(0);
  expect(result.retries).toBe(0);
  expect(result.recovered).toBe(16);
  expect(result.retained).toBe(14);
  expect(result.exposedFailure).toBe(false);
  expect(result.retriedBatch).toBe(16);
  expect(result.error).toBe(0);
});

test("full-library near photographs resolve fine detail on screen without changing distant orbits", async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await pauseUniverse(page);
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const { cameraAt } = await import("/src/universe-camera.js");
    const width = innerWidth, height = innerHeight;
    const photo = document.createElement("canvas"); photo.width = 256; photo.height = 320;
    const ctx = photo.getContext("2d");
    for (let x = 0; x < 256; x += 2) {
      ctx.fillStyle = x % 4 ? "#b4b4b4" : "#505050"; ctx.fillRect(x, 0, 2, 320);
    }
    function render(detail) {
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const gpu = createUniverseGPU(canvas), gl = canvas.getContext("webgl");
      gpu.setPhotos(Array(200).fill(photo));
      if (!detail) {
        const error = gl.getError.bind(gl);
        let refused = false;
        gl.texImage2D = () => { refused = true; };
        gl.getError = () => refused ? (refused = false, gl.OUT_OF_MEMORY) : error();
      }
      const capture = progress => {
        const camera = cameraAt(progress, width, height);
        gpu.draw({ camera, width, height, time: 6, detail: 0, cover: 0, showcase: camera.showcase, reduced: true });
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels;
      };
      const opening = capture(0), close = capture(1);
      let energy = 0;
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        energy += Math.abs(2 * close[i] - close[i - 4] - close[i + 4]);
      }
      return { opening, energy, detailed: Number(canvas.dataset.detailedPhotos), error: gl.getError() };
    }
    const base = render(false), sharp = render(true);
    let distantChanges = 0;
    for (let i = 0; i < base.opening.length; i++) if (base.opening[i] !== sharp.opening[i]) distantChanges++;
    return { gain: sharp.energy / base.energy, distantChanges, detailed: sharp.detailed, baseError: base.error, sharpError: sharp.error };
  });
  expect(result.gain).toBeGreaterThan(1.2);
  expect(result.distantChanges).toBe(0);
  expect(result.detailed).toBeGreaterThan(0);
  expect(result.detailed).toBeLessThanOrEqual(16);
  expect(result.baseError).toBe(0);
  expect(result.sharpError).toBe(0);
});
