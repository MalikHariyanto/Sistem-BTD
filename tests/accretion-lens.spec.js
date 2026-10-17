import { test, expect } from "@playwright/test";
import { lensedOrbit } from "../src/accretion-lens.js";
import { cameraAt, createOrbit, orbitAt, projectOrbit, occludedByHole } from "../src/universe-camera.js";

test("rear photographs follow the HD upper halo while the foreground and intimate ending retain their orbits", () => {
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    const camera = cameraAt(0.14, width, height);
    const data = new Float32Array([0.28, Math.PI * 1.5, 0, 0.93]);
    const rear = orbitAt(data, 0, 0), optical = lensedOrbit(rear, camera);
    expect(occludedByHole(rear, camera)).toBe(true);
    expect(occludedByHole(optical, camera)).toBe(false);
    const projected = projectOrbit(rear, camera, width, height, 0.004);
    expect(projected).not.toBeNull();
    const u = (projected.x - camera.x) / camera.width;
    const v = (projected.y - camera.y) / camera.height;
    expect(u).toBeCloseTo(0.5, 5);
    expect(v).toBeGreaterThan(0.16);
    expect(v).toBeLessThan(0.24);
    // It remains the same source, with its real depth and inward progress.
    for (const key of ["seed", "radius", "angle", "depth", "opacity"])
      expect(optical[key]).toBe(rear[key]);
    const front = orbitAt(new Float32Array([0.28, Math.PI / 2, 0, 0.93]), 0, 0);
    expect(lensedOrbit(front, camera)).toBe(front);
    expect(lensedOrbit(rear, cameraAt(1, width, height))).toBe(rear);
  }
});

test("a photo travels continuously from the near disk around the upper rear image without a second copy or a viewport wrap", () => {
  const camera = cameraAt(0.3, 1440, 900), source = createOrbit(1);
  source[0] = 0.3; source[2] = 0;
  let previous, maxStep = 0, raised = 0, plain = 0;
  for (let frame = 0; frame <= 4096; frame++) {
    source[1] = frame * Math.PI * 2 / 4096;
    const point = orbitAt(source, 0, 0), image = lensedOrbit(point, camera);
    if (previous) maxStep = Math.max(maxStep, Math.hypot(image.x - previous.x, image.y - previous.y));
    if (image.y < point.y - 0.12) raised++;
    if (image === point) plain++;
    previous = image;
  }
  expect(maxStep * camera.width).toBeLessThan(6);
  expect(raised).toBeGreaterThan(800);
  expect(plain).toBeGreaterThan(2000);
});

test("GPU carries actual uploaded photo detail through the upper halo and keeps the black center opaque", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const { cameraAt, HORIZON, ASPECT, createOrbit, orbitAt } = await import("/src/universe-camera.js");
    const width = innerWidth, height = innerHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const gpu = createUniverseGPU(canvas);
    if (!gpu) throw Error("WebGL initialization failed");
    const photo = document.createElement("canvas");
    photo.width = photo.height = 64;
    const ctx = photo.getContext("2d");
    ctx.fillStyle = "#00ffff"; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#ff0066"; ctx.fillRect(32, 0, 32, 64);
    gpu.setPhotos([photo]);
    const gl = canvas.getContext("webgl"), camera = cameraAt(0.3, width, height);
    const captures = [], orbit = createOrbit();
    const draw = gl.drawArrays.bind(gl);
    let physicalTime = 0;
    // Isolate rear material so legitimate foreground crossings cannot be
    // mistaken for a failure of the black hole's depth mask.
    gl.drawArrays = (mode, first, count) => {
      if (mode === gl.POINTS) {
        const program = gl.getParameter(gl.CURRENT_PROGRAM);
        const layer = gl.getUniform(program, gl.getUniformLocation(program, "uLayer"));
        if (layer === 2) return;
        const buffer = gl.getVertexAttrib(gl.getAttribLocation(program, "aOrbit"), gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
        const rear = new Float32Array(orbit.length);
        for (let i = 0; i < orbit.length / 4; i++) {
          const point = orbitAt(orbit, i, physicalTime);
          rear.set([point.depth < 0 ? point.radius : 0.64, point.angle, orbit[i * 4 + 2], point.seed], i * 4);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, rear, gl.DYNAMIC_DRAW);
      }
      return draw(mode, first, count);
    };
    for (const time of [5, 7]) {
      physicalTime = time;
      gpu.draw({ camera, width, height, time: 0, detail: 0, cover: 0, showcase: 1, reduced: true });
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let cyan = 0, pink = 0, centerLeaks = 0, changed = 0;
      const core = {
        x: camera.centerX - camera.cx * camera.baseWidth * 5 / camera.distance,
        y: camera.centerY + (HORIZON.y - camera.cy / ASPECT) * camera.baseWidth * 5 / camera.distance,
        radius: HORIZON.radius * camera.baseWidth * 5 / camera.distance * 0.6,
      };
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = ((height - y - 1) * width + x) * 4;
        const isCyan = pixels[i + 1] > pixels[i] + 30 && pixels[i + 2] > pixels[i] + 20;
        const isPink = pixels[i] > pixels[i + 1] + 45 && pixels[i + 2] > pixels[i + 1] + 5;
        const v = (y - camera.y) / camera.height;
        if (v > 0.1 && v < 0.31) {
          if (isCyan) cyan++;
          if (isPink) pink++;
          if (captures[0] && Math.abs(pixels[i + 1] - captures[0].pixels[i + 1]) > 35) changed++;
        }
        if (Math.hypot(x - core.x, y - core.y) < core.radius && (isCyan || isPink)) centerLeaks++;
      }
      captures.push({ cyan, pink, centerLeaks, changed, pixels });
    }
    return { frames: captures.map(({ pixels, ...counts }) => counts), error: gl.getError() };
  });
  expect(result.error).toBe(0);
  for (const frame of result.frames) {
    expect(frame.cyan).toBeGreaterThan(200);
    expect(frame.pink).toBeGreaterThan(200);
    expect(frame.centerLeaks).toBe(0);
  }
  expect(result.frames[1].changed).toBeGreaterThan(500);
});
