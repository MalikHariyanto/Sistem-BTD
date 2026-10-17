import { test, expect } from "@playwright/test";

test("lower wide and HD detail filaments rotate with the foreground photos while the center and stars stay fixed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const { cameraAt, ORBIT_SPEED } = await import("/src/universe-camera.js");
    const width = 1200, height = 900;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const gpu = createUniverseGPU(canvas);
    if (!gpu) throw Error("WebGL initialization failed");
    const gl = canvas.getContext("webgl"), draw = gl.drawArrays.bind(gl);
    // Measure actual background texels, without moving photo sprites hiding
    // a stationary lower light image (the original visual regression).
    gl.drawArrays = (mode, first, count) => mode === gl.POINTS ? undefined : draw(mode, first, count);
    const camera = cameraAt(0, width, height);
    const output = [];
    for (const kind of ["wide", "detail"]) {
      const plate = document.createElement("canvas");
      plate.width = 1672; plate.height = 941;
      const ctx = plate.getContext("2d");
      ctx.fillStyle = "#08090b"; ctx.fillRect(0, 0, plate.width, plate.height);
      ctx.strokeStyle = "#b97838"; ctx.lineWidth = 40;
      ctx.beginPath(); ctx.ellipse(836, 941 * 0.445, 1672 * 0.17 * 0.95, 941 * 0.3 * 0.95, 0, 0.35, 2.8); ctx.stroke();
      ctx.fillStyle = "white"; ctx.fillRect(165, 100, 8, 8);
      const theta = kind === "wide" ? Math.PI / 2 : 0.94;
      const u = 0.5 + 0.17 * 0.95 * Math.cos(theta), v = 0.445 + 0.30 * 0.95 * Math.sin(theta);
      const detail = document.createElement("canvas"); detail.width = detail.height = 768;
      if (kind === "wide") {
        ctx.fillStyle = "white"; ctx.beginPath(); ctx.ellipse(u * plate.width, v * plate.height, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        const dc = detail.getContext("2d"); dc.fillStyle = "white";
        dc.beginPath(); dc.ellipse((u - 0.513) * 3 * 768, (v - 0.360) * 3 * 768, 8, 15, 0, 0, Math.PI * 2); dc.fill();
      }
      gpu.setPlate(plate); gpu.setDetail(detail);
      const frames = [];
      for (const time of [0, 1.6]) {
        gpu.draw({ camera, width, height, time, detail: 1, cover: 0, reduced: true });
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let total = 0, sumX = 0, sumY = 0;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const uvY = (y - camera.y) / camera.height;
          if (uvY < 0.62 || uvY > 0.78) continue;
          const i = ((height - 1 - y) * width + x) * 4;
          const signal = Math.max(0, Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) - 100);
          total += signal; sumX += signal * x; sumY += signal * y;
        }
        const sample = (u, v) => {
          const x = Math.round(camera.x + u * camera.width), y = Math.round(camera.y + v * camera.height);
          const i = ((height - 1 - y) * width + x) * 4;
          return [...pixels.slice(i, i + 3)];
        };
        frames.push({ x: sumX / total, y: sumY / total, total, center: sample(0.5, 0.4), star: sample(0.1, 0.11) });
      }
      const radius = (0.95 * 0.17 - 0.112) / 0.13;
      const angle = theta + 1.6 * ORBIT_SPEED * (0.28 / radius) ** 1.5;
      const expectedX = (Math.cos(angle) - Math.cos(theta)) * 0.95 * 0.17 * camera.width;
      output.push({ kind, frames, expectedX });
    }
    return { output, error: gl.getError() };
  });
  expect(result.error).toBe(0);
  for (const { kind, frames: [before, after], expectedX } of result.output) {
    expect(before.total, kind).toBeGreaterThan(500);
    expect(after.total, kind).toBeGreaterThan(500);
    expect(after.x - before.x, `${kind}: clockwise lower light moves left`).toBeLessThan(-5);
    expect(Math.abs(after.x - before.x - expectedX), kind).toBeLessThan(4);
    expect(after.center, kind).toEqual(before.center);
    expect(Math.max(...after.center), kind).toBeLessThan(20);
    expect(after.star, kind).toEqual(before.star);
  }
});
