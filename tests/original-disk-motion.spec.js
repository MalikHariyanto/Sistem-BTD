// Actual artwork: preserve its identity and track rim + dark grain in six regions.
import { test, expect } from "@playwright/test";
test("the original disk stays identical at rest and its real rim and dark grain all travel together", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const { cameraAt } = await import("/src/universe-camera.js");
    const W = 1672, H = 941, c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const gpu = createUniverseGPU(c), gl = c.getContext("webgl");
    if (!gpu) throw Error("GPU failed");
    const draw = gl.drawArrays.bind(gl);
    gl.drawArrays = (mode, first, count) => mode === gl.POINTS ? void 0 : draw(mode, first, count);
    const plate = new Image();
    plate.src = "/art/gargantua.webp";
    await plate.decode();
    gpu.setPlate(plate);
    const reference = document.createElement("canvas");
    reference.width = W;
    reference.height = H;
    reference.getContext("2d").drawImage(plate, 0, 0);
    const ref = reference.getContext("2d").getImageData(0, 0, W, H).data;
    const camera = { ...cameraAt(0, W, H), x: 0, y: 0, width: W, height: H, zoom: 2, shade: 0 };
    const capture = (t) => {
      gpu.draw({ camera, width: W, height: H, time: t, detail: 0, cover: 0, reduced: true });
      const p = new Uint8Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p);
      return p;
    };
    const a = capture(0), b = capture(0.65), smooth = (a2, b2, x) => {
      const t = Math.max(0, Math.min(1, (x - a2) / (b2 - a2)));
      return t * t * (3 - 2 * t);
    };
    let err = 0, maxErr = 0, n = 0;
    for (let x = 168; x < 1504; x += 4) for (let dd = -0.06; dd < 0.1; dd += 6e-3) {
      const y = Math.round((0.35 + 0.26 * (x + 0.5) / W + dd) * H), u = (x + 0.5) / W, v = (y + 0.5) / H, i = ((H - y - 1) * W + x) * 4, ri = (y * W + x) * 4;
      const px = (u - 0.5) / 0.17, py = (v - 0.445) / 0.3, r = Math.hypot(px, py), theta = Math.atan2(py, px);
      const guard = smooth(1, 1.32, Math.hypot((u - 0.5) / 0.12, (v - 0.458) / 0.22));
      const ann = smooth(0.64, 0.86, r) * (1 - smooth(1.2, 1.65, r)) * guard;
      const light = 1 + 0.06 * Math.sin(theta * 13 + r * 23) * ann;
      const vign = smooth(0.12, 0.83, Math.hypot((x + 0.5 - W * 0.5) / W, (y + 0.5 - H * 0.45) / W));
      for (let ch = 0; ch < 3; ch++) {
        const expected = Math.min(255, Math.max(0, (ref[ri + ch] / 255 * light * (1 - 0.24 * vign) + [0.031, 0.035, 0.043][ch] * 0.24 * vign) * 255));
        const e = Math.abs(a[i + ch] - expected);
        err += e;
        maxErr = Math.max(maxErr, e);
        n++;
      }
    }
    const sample = (p, u, d) => {
      const x = Math.max(0, Math.min(W - 1, Math.round(u * W))), y = Math.max(0, Math.min(H - 1, Math.round((0.35 + 0.26 * u + d) * H)));
      return p[((H - y - 1) * W + x) * 4 + 1];
    };
    const zones = [];
    for (const [name, lo, hi] of [["left", 0.15, 0.3], ["center", 0.425, 0.575], ["right", 0.7, 0.85]]) for (const [part, dl, dh] of [["rim", -0.06, -0.025], ["body", 0.015, 0.095]]) {
      const samples = [];
      for (let u = lo; u < hi; u += 2 / W) for (let d = dl; d < dh; d += 3e-3) {
        const g = sample(a, u + 2 / W, d) - sample(a, u - 2 / W, d);
        const val = sample(a, u, d);
        if (Math.abs(g) > 3 && (part !== "rim" || val > 45)) samples.push([u, d]);
      }
      const correlations = [];
      for (let lag = -25; lag <= 25; lag++) {
        let aa = 0, bb = 0, ab = 0;
        for (const [u, d] of samples) {
          const x = sample(a, u + (lag + 2) / W, d) - sample(a, u + (lag - 2) / W, d), y = sample(b, u + 2 / W, d) - sample(b, u - 2 / W, d);
          aa += x * x;
          bb += y * y;
          ab += x * y;
        }
        correlations.push({ lag, correlation: ab / Math.sqrt(aa * bb) });
      }
      correlations.sort((a2, b2) => b2.correlation - a2.correlation);
      zones.push({ name, part, samples: samples.length, best: correlations[0], stationary: correlations.find((c2) => c2.lag === 0) });
    }
    return { identity: { average: err / n, max: maxErr }, expectedLag: 0.65 * 0.065 * 0.28 * W, zones, error: gl.getError() };
  });
  expect(result.error).toBe(0);
  expect(result.identity.average).toBeLessThan(0.3);
  expect(result.identity.max).toBeLessThan(1.5);
  for (const zone of result.zones) {
    const label = `${zone.name} ${zone.part}`;
    expect(zone.samples, label).toBeGreaterThan(50);
    expect(Math.abs(zone.best.lag - result.expectedLag), label).toBeLessThan(1.5);
    expect(zone.best.correlation, label).toBeGreaterThan(0.85);
    expect(zone.stationary.correlation, label).toBeLessThan(0.25);
  }
});

test("the actual HD plate never leaves a bright transported patch inside the core", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const { cameraAt } = await import("/src/universe-camera.js");
    const width = 1200, height = 675, canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const gpu = createUniverseGPU(canvas);
    if (!gpu) throw Error("WebGL initialization failed");
    const gl = canvas.getContext("webgl"), draw = gl.drawArrays.bind(gl);
    gl.drawArrays = (mode, first, count) => mode === gl.POINTS ? undefined : draw(mode, first, count);
    const load = async (src) => { const image = new Image(); image.src = src; await image.decode(); return image; };
    const plate = await load("/art/gargantua.webp"), detail = await load("/art/gargantua-detail.webp");
    gpu.setPlate(plate); gpu.setDetail(detail);
    const source = document.createElement("canvas"); source.width = width; source.height = height;
    source.getContext("2d").drawImage(plate, 0, 0, width, height);
    const original = source.getContext("2d").getImageData(0, 0, width, height).data;
    const camera = { ...cameraAt(0, width, height), x: 0, y: 0, width, height, zoom: 2, shade: 0 };
    const probes = [];
    for (let y = 0; y < height; y += 3) for (let x = 0; x < width; x += 3) {
      const u = (x + 0.5) / width, v = (y + 0.5) / height, i = (y * width + x) * 4;
      if (Math.hypot((u - 0.5) / 0.11, (v - 0.445) / 0.21) < 1.05 &&
          v - 0.35 - 0.26 * u < -0.055 && Math.max(...original.slice(i, i + 3)) < 28)
        probes.push(((height - y - 1) * width + x) * 4);
    }
    const frames = [];
    for (const time of [0, 2, 6]) {
      gpu.draw({ camera, width, height, time, detail: 1, cover: 0, reduced: true });
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      frames.push(probes.flatMap(i => [...pixels.slice(i, i + 3)]));
    }
    return { count: probes.length, maximum: Math.max(...frames.flat()),
      drift: Math.max(...frames.slice(1).flatMap(frame => frame.map((value, i) => Math.abs(value - frames[0][i])))), error: gl.getError() };
  });
  expect(result.count).toBeGreaterThan(500);
  expect(result.maximum).toBeLessThan(35);
  expect(result.drift).toBeLessThanOrEqual(2);
  expect(result.error).toBe(0);
});
