import { pauseUniverse } from "./gift-fixtures.js";
import { test, expect } from "@playwright/test";

// Patterned inputs catch wrong rows / stretched stripes that solid-color
// fixtures and a simple source-count assertion cannot detect.
test("every photo keeps its own image rows and padded edges at full and mobile atlas sizes", async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await pauseUniverse(page);
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const canvas = document.createElement("canvas");
    const renderer = createUniverseGPU(canvas);
    const gl = canvas.getContext("webgl");
    const makePhotos = count => Array.from({ length: count }, (_, id) => {
      const c = document.createElement("canvas");
      c.width = id % 2 ? 160 : 64; c.height = id % 2 ? 90 : 128;
      const ctx = c.getContext("2d");
      for (let q = 0; q < 4; q++) {
        ctx.fillStyle = `rgb(${id},${40 + q * 50},${240 - q * 45})`;
        ctx.fillRect((q % 2) * c.width / 2, Math.floor(q / 2) * c.height / 2, c.width / 2, c.height / 2);
      }
      return c;
    });
    const checks = [];
    for (const count of [120, 200, 209]) {
      for (const limit of [4096, 1024]) {
        // Simulate a texture upload being refused above a mobile limit.
        const originalUpload = gl.texImage2D.bind(gl), originalError = gl.getError.bind(gl);
        let rejected = false, attempts = 0;
        gl.texImage2D = (...args) => {
          attempts++;
          if (args[5].width > limit || args[5].height > limit) rejected = true;
          else originalUpload(...args);
        };
        gl.getError = () => rejected ? (rejected = false, gl.OUT_OF_MEMORY) : originalError();
        const success = renderer.setPhotos(makePhotos(count));
        gl.texImage2D = originalUpload; gl.getError = originalError;
        gl.activeTexture(gl.TEXTURE2);
        const texture = gl.getParameter(gl.TEXTURE_BINDING_2D), fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        const width = Number(canvas.dataset.atlasWidth), height = Number(canvas.dataset.atlasHeight);
        const pixels = new Uint8Array(width * height * 4);
        const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const tile = Number(canvas.dataset.atlasTile), th = tile * 1.25, cols = width / tile;
        let mismatches = 0;
        for (let id = 0; id < count; id++) {
          // Check all four quadrants, including the extruded outer padding.
          for (const [fx, fy] of [[.25,.25],[.75,.25],[.25,.75],[.75,.75],[0,0],[1,0],[0,1],[1,1]]) {
            const x = (id % cols) * tile + Math.round(fx * (tile - 1));
            const y = Math.floor(id / cols) * th + Math.round(fy * (th - 1));
            const q = (fx > .5 ? 1 : 0) + (fy > .5 ? 2 : 0), offset = (y * width + x) * 4;
            const expected = [id, 40 + q * 50, 240 - q * 45, 255];
            if (expected.some((v, i) => Math.abs(v - pixels[offset + i]) > 1)) mismatches++;
          }
        }
        checks.push({ count, limit, success, attempts, complete, mismatches, width, height, error: gl.getError() });
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
      }
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return checks;
  });
  for (const check of result) {
    expect(check.success).toBe(true);
    expect(check.complete).toBe(true);
    expect(check.mismatches, JSON.stringify(check)).toBe(0);
    expect(check.error).toBe(0);
    expect(check.width).toBeLessThanOrEqual(check.limit);
    expect(check.height).toBeLessThanOrEqual(check.limit);
    if (check.limit === 1024) expect(check.attempts).toBeGreaterThan(1);
  }
});

test("failed replacement retains the matching old texture and layout, then recovers", async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await pauseUniverse(page);
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const canvas = document.createElement("canvas"), renderer = createUniverseGPU(canvas);
    const gl = canvas.getContext("webgl");
    const c = document.createElement("canvas"); c.width = c.height = 32;
    const ctx = c.getContext("2d"); ctx.fillStyle = "#a346d2"; ctx.fillRect(0, 0, 32, 32);
    renderer.setPhotos([c]);
    gl.activeTexture(gl.TEXTURE2);
    const originalTexture = gl.getParameter(gl.TEXTURE_BINDING_2D), originalLayout = { ...canvas.dataset };
    const originalUpload = gl.texImage2D.bind(gl), originalError = gl.getError.bind(gl);
    let pendingError = false, warnings = 0;
    window.addEventListener("photosrendererror", () => warnings++);
    gl.texImage2D = () => { pendingError = true; };
    gl.getError = () => pendingError ? (pendingError = false, gl.OUT_OF_MEMORY) : originalError();
    const failed = renderer.setPhotos(Array(200).fill(c));
    gl.texImage2D = originalUpload; gl.getError = originalError;
    const retained = gl.getParameter(gl.TEXTURE_BINDING_2D) === originalTexture;
    const failedLayout = { ...canvas.dataset };
    const originalBufferData = gl.bufferData.bind(gl);
    gl.bufferData = () => { pendingError = true; };
    gl.getError = () => pendingError ? (pendingError = false, gl.OUT_OF_MEMORY) : originalError();
    const bufferFailed = renderer.setPhotos(Array(200).fill(c));
    const retainedAfterBufferFailure = gl.getParameter(gl.TEXTURE_BINDING_2D) === originalTexture;
    gl.bufferData = originalBufferData; gl.getError = originalError;
    const recovered = renderer.setPhotos(Array(200).fill(c));
    return { failed, retained, bufferFailed, retainedAfterBufferFailure, originalLayout, failedLayout, recovered, warnings, final: { ...canvas.dataset }, error: gl.getError() };
  });
  expect(result.failed).toBe(false);
  expect(result.retained).toBe(true);
  for (const key of ["atlasWidth", "atlasHeight", "atlasTile", "photoSources"])
    expect(result.failedLayout[key]).toBe(result.originalLayout[key]);
  expect(result.failedLayout.photosStatus).toBe("error");
  expect(result.bufferFailed).toBe(false);
  expect(result.retainedAfterBufferFailure).toBe(true);
  expect(result.warnings).toBe(2);
  expect(result.recovered).toBe(true);
  expect(result.final.photoSources).toBe("200");
  expect(result.final.photosStatus).toBe("ready");
  expect(result.error).toBe(0);
});
