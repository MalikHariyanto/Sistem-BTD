import { test, expect } from "@playwright/test";

for (const renderer of ["webgl", "canvas2d"]) test(`${renderer}: the central ribbon itself carries wide and HD filaments with the photos`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const output = await page.evaluate(async (renderer) => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const { createDiskStream } = await import("/src/disk-stream.js");
    const { cameraAt, ORBIT_SPEED } = await import("/src/universe-camera.js");
    const width = 1200, height = 900;
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const gpu = renderer === "webgl" ? createUniverseGPU(canvas) : null;
    if (renderer === "webgl" && !gpu) throw Error("WebGL initialization failed");
    const gl = gpu ? canvas.getContext("webgl") : null;
    const ctx = gpu ? null : canvas.getContext("2d");
    if (gl) {
      const draw = gl.drawArrays.bind(gl);
      // Moving photo sprites must not make a stationary ribbon pass this test.
      gl.drawArrays = (mode, first, count) => mode === gl.POINTS ? undefined : draw(mode, first, count);
    }
    const results = [];
    for (const kind of ["wide", "detail"]) {
      const plate = document.createElement("canvas"); plate.width = 1672; plate.height = 941;
      const p = plate.getContext("2d"); p.fillStyle = "#08090b"; p.fillRect(0, 0, 1672, 941);
      const gradient = p.createLinearGradient(0, 0, 1672, 0);
      gradient.addColorStop(0, "#ad5928"); gradient.addColorStop(1, "#d59246"); p.fillStyle = gradient;
      p.beginPath(); p.moveTo(0, 0.325 * 941); p.lineTo(1672, 0.585 * 941);
      p.lineTo(1672, 0.73 * 941); p.lineTo(0, 0.47 * 941); p.closePath(); p.fill();
      const u = 0.59, v = 0.35 + 0.26 * u + 0.04;
      const detail = document.createElement("canvas"); detail.width = detail.height = 768;
      const source = kind === "wide" ? p : detail.getContext("2d"); source.fillStyle = "white";
      source.beginPath();
      if (kind === "wide") source.ellipse(u * 1672, v * 941, 5, 9, 0, 0, Math.PI * 2);
      else source.ellipse((u - 0.513) * 3 * 768, (v - 0.360) * 3 * 768, 8, 15, 0, 0, Math.PI * 2);
      source.fill();
      gpu?.setPlate(plate); gpu?.setDetail(detail);
      const stream = gpu ? null : createDiskStream(plate); stream?.setDetail(detail);
      for (const progress of [0, 0.3]) {
        const camera = cameraAt(progress, width, height);
        function capture(time) {
          let pixels;
          if (gpu) {
            gpu.draw({ camera, width, height, time, detail: 1, cover: 0, reduced: true });
            pixels = new Uint8Array(width * height * 4);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          } else {
            ctx.fillStyle = "#08090b"; ctx.fillRect(0, 0, width, height);
            ctx.drawImage(plate, camera.x, camera.y, camera.width, camera.height);
            ctx.drawImage(detail, camera.x + camera.width * 0.513, camera.y + camera.height * 0.36, camera.width / 3, camera.height / 3);
            stream.draw(ctx, camera, time, 1, 1);
            pixels = ctx.getImageData(0, 0, width, height).data;
          }
          let weight = 0, xSum = 0, ySum = 0;
          for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const u = (x - camera.x) / camera.width, v = (y - camera.y) / camera.height;
            const d = v - 0.35 - 0.26 * u;
            if (u < 0.43 || u > 0.68 || d < 0.015 || d > 0.065) continue;
            const i = ((gl ? height - y - 1 : y) * width + x) * 4;
            const signal = Math.max(0, Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) - 100);
            weight += signal; xSum += signal * x; ySum += signal * y;
          }
          return { x: xSum / weight, y: ySum / weight, weight };
        }
        const before = capture(0), after = capture(1.6);
        results.push({ kind, progress, before, after,
          expectedX: -1.6 * ORBIT_SPEED * 0.28 * camera.width,
          expectedY: -1.6 * ORBIT_SPEED * 0.28 * 0.26 * camera.height });
      }
    }
    return { results, error: gl?.getError() || 0 };
  }, renderer);
  expect(output.error).toBe(0);
  for (const { kind, progress, before, after, expectedX, expectedY } of output.results) {
    const label = `${kind}, camera ${progress}`;
    expect(before.weight, label).toBeGreaterThan(500);
    expect(after.weight, label).toBeGreaterThan(500);
    expect(after.x - before.x, label).toBeLessThan(-25);
    expect(Math.abs(after.x - before.x - expectedX), label).toBeLessThan(4);
    expect(Math.abs(after.y - before.y - expectedY), label).toBeLessThan(3);
  }
});
