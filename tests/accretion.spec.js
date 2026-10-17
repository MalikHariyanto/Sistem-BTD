import { test, expect } from "@playwright/test";
import {
  ASPECT,
  HORIZON,
  INFLOW,
  PLUNGE_RADIUS,
  ORBIT,
  cameraAt,
  createOrbit,
  orbitAt,
  occludedByHole,
  projectOrbit,
  photoShowcaseAt,
} from "../src/universe-camera.js";
import {
  createOrbitComposition,
  compositionAt,
} from "../src/orbit-composition.js";

test("photos spiral inward, accelerate and vanish before an invisible outer respawn", () => {
  const data = new Float32Array([0.2, 0.4, 0, 0.8]);
  const a = orbitAt(data, 0, 0),
    b = orbitAt(data, 0, 4);
  expect(b.radius).toBeLessThan(a.radius);
  expect(a.radius ** 2 - b.radius ** 2).toBeCloseTo(INFLOW * 4, 10);
  expect(orbitAt(data, 0, 4.1).angle - b.angle).toBeGreaterThan(
    orbitAt(data, 0, 0.1).angle - a.angle,
  );
  const gone = (0.2 ** 2 - 0.098 ** 2) / INFLOW;
  expect(orbitAt(data, 0, gone + 0.001).opacity).toBe(0);
  const reset = (0.2 ** 2 - PLUNGE_RADIUS ** 2) / INFLOW;
  const before = orbitAt(data, 0, reset - 0.000001),
    after = orbitAt(data, 0, reset + 0.000001);
  expect(before.opacity).toBe(0);
  expect(after.opacity).toBeLessThan(0.000001);
  expect(after.radius).toBeCloseTo(ORBIT.outer, 5);
  expect(before.seed).toBe(after.seed);
  expect(Math.abs(after.angle - before.angle)).toBeLessThan(0.0001);
});

test("the same world horizon hides rear orbits and inside points throughout the camera flight", () => {
  for (const p of [0, 0.24, 0.3, 0.36, 0.5, 0.8, 1]) {
    const camera = cameraAt(p, 1440, 900);
    const offset = [
      camera.cx - HORIZON.x,
      camera.cy / ASPECT - HORIZON.y,
      camera.distance - HORIZON.z,
    ];
    const n = offset.map((v) => v / Math.hypot(...offset));
    const point = (d) => ({
      x: HORIZON.x + n[0] * d,
      y: (HORIZON.y + n[1] * d) * ASPECT,
      depth: HORIZON.z + n[2] * d,
    });
    expect(occludedByHole(point(-0.2), camera)).toBe(true);
    expect(occludedByHole(point(0), camera)).toBe(true);
    expect(occludedByHole(point(0.2), camera)).toBe(false);
    expect(projectOrbit(point(-0.2), camera, 1440, 900)).toBeNull();
  }
});

test("the middle shows the hole with a limited, non-overlapping set of real orbit portraits", () => {
  const orbit = createOrbit(),
    ids = Float32Array.from({ length: orbit.length / 4 }, (_, i) => i % 120);
  for (const [width, height] of [
    [390, 664],
    [1440, 900],
  ]) {
    const camera = cameraAt(0.3, width, height),
      composition = createOrbitComposition(orbit);
    const holeX =
      camera.centerX - (camera.cx * camera.baseWidth * 5) / camera.distance;
    expect(holeX).toBeGreaterThan(0);
    expect(holeX).toBeLessThan(width);
    expect(photoShowcaseAt(0.3)).toBe(1);
    for (const p of [0.26, 0.3, 0.34])
      expect(compositionAt(cameraAt(p, width, height).zoom)).toBe(1);
    let max = 0,
      nearHorizonFrames = 0;
    for (let frame = 0; frame < 45; frame++) {
      const time = 4 + frame / 30;
      const photos = composition
        .update({
          camera,
          width,
          height,
          time,
          photoIds: ids,
          ratios: Array(120).fill(0.8),
          now: 1000 + (frame * 1000) / 30,
          reduced: frame === 0,
        })
        .filter((p) => p.alpha * p.point.opacity > 0.5);
      max = Math.max(max, photos.length);
      if (photos.some((p) => p.point.radius < 0.22)) nearHorizonFrames++;
      expect(photos.length).toBeLessThanOrEqual(width < 700 ? 8 : 16);
      expect(new Set(photos.map((p) => ids[p.index])).size).toBe(photos.length);
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i],
          actual = orbitAt(orbit, photo.index, time);
        expect(photo.point).toEqual(actual);
        expect(occludedByHole(actual, camera)).toBe(false);
        for (let j = i + 1; j < photos.length; j++) {
          const other = photos[j];
          const overlap =
            Math.abs(photo.projected.x - other.projected.x) <
              (photo.projected.size + other.projected.size) * 0.4 &&
            Math.abs(photo.projected.y - other.projected.y) <
              (photo.projected.size + other.projected.size) * 0.5;
          expect(overlap).toBe(false);
        }
      }
    }
    expect(max).toBeGreaterThanOrEqual(width < 700 ? 2 : 4);
    expect(nearHorizonFrames).toBeGreaterThan(10);
  }
});

test("GPU clips a rear photo's corners at the horizon while retaining real foreground depth", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const { cameraAt, HORIZON, ASPECT, occludedByHole } = await import(
      "/src/universe-camera.js"
    );
    const canvas = document.createElement("canvas"),
      width = 1200,
      height = 800;
    canvas.width = width;
    canvas.height = height;
    const gpu = createUniverseGPU(canvas);
    if (!gpu) throw Error("WebGL initialization failed");
    const photo = document.createElement("canvas");
    photo.width = photo.height = 100;
    photo.getContext("2d").fillStyle = "#00ffff";
    photo.getContext("2d").fillRect(0, 0, 100, 100);
    gpu.setPhotos([photo]);
    const camera = cameraAt(0.3, width, height),
      focal = camera.baseWidth * 5;
    const gl = canvas.getContext("webgl"),
      layers = [],
      draw = gl.drawArrays.bind(gl);
    gl.drawArrays = (mode, first, count) => {
      if (mode === gl.POINTS) {
        const program = gl.getParameter(gl.CURRENT_PROGRAM);
        layers.push(
          gl.getUniform(program, gl.getUniformLocation(program, "uLayer")),
        );
      }
      return draw(mode, first, count);
    };
    gpu.draw({
      camera,
      width,
      height,
      time: 0,
      detail: 0,
      cover: 0,
      showcase: 1,
      reduced: true,
    });
    gl.drawArrays = draw;
    const program = gl.getParameter(gl.CURRENT_PROGRAM);
    const set = (name, value) =>
      gl.uniform1f(gl.getUniformLocation(program, name), value);
    set("uComposition", 1);
    set("uShowcase", 1);
    set("uLayer", 2);
    set("uTime", 0);
    set("uShade", 0);
    const buffer = gl.getVertexAttrib(
      gl.getAttribLocation(program, "aOrbit"),
      gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING,
    );
    for (const name of ["aOrbit", "aPhoto", "aFade"])
      gl.enableVertexAttribArray(gl.getAttribLocation(program, name));
    // Locate the right limb using the exact sphere intersection, then place a
    // legal orbit photo just outside it so its corners cross the silhouette.
    const centerY =
      camera.centerY +
      ((HORIZON.y - camera.cy / ASPECT) * focal) / camera.distance;
    const centerX = camera.centerX - (camera.cx * focal) / camera.distance;
    const world = (x, y, z) => ({
      x: camera.cx + ((x - camera.centerX) / focal) * (camera.distance - z),
      y:
        camera.cy +
        ((y - camera.centerY) / focal) * (camera.distance - z) * ASPECT,
      depth: z,
    });
    let limb = Math.floor(centerX);
    while (occludedByHole(world(limb, centerY, -0.2), camera) && limb < width)
      limb++;
    const outputs = [];
    for (const [x, z] of [
      [limb + 5, -0.2],
      [centerX, 0.3],
      [limb + 20, -0.2],
      [limb + 40, -0.2],
      [limb + 90, -0.2],
    ]) {
      const p = world(x, centerY, z),
        radius = Math.hypot(p.x, z),
        angle = Math.atan2(z, p.x);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          radius,
          angle,
          p.y - 0.26 * p.x - 0.19 * z,
          0.99,
          0,
          1,
          1,
        ]),
        gl.DYNAMIC_DRAW,
      );
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, 1);
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let cyan = 0,
        leaks = 0,
        forbidden = 0,
        signal = 0;
      for (
        let py = Math.floor(centerY) - 35;
        py <= Math.ceil(centerY) + 35;
        py++
      )
        for (let px = Math.floor(x) - 35; px <= Math.ceil(x) + 35; px++) {
          if (px < 0 || px >= width || py < 0 || py >= height) continue;
          const i = ((height - 1 - py) * width + px) * 4;
          const lit =
            pixels[i + 1] > pixels[i] + 70 && pixels[i + 2] > pixels[i] + 70;
          signal += Math.max(0, Math.min(pixels[i + 1] - pixels[i], pixels[i + 2] - pixels[i]));
          const hidden = occludedByHole(world(px + 0.5, py + 0.5, z), camera);
          if (hidden) forbidden++;
          if (lit) {
            cyan++;
            if (hidden) leaks++;
          }
        }
      outputs.push({ cyan, leaks, forbidden, signal, layers, error: gl.getError() });
    }
    return outputs;
  });
  expect(result[0].layers).toEqual([0, 3, 2]);
  expect(result[0].forbidden).toBeGreaterThan(300);
  // The near limb now dissolves a rear photo before the sphere cuts it.
  // Four actual GPU probes verify a gradual fade instead of a binary cutoff.
  const rim = [result[0], result[2], result[3], result[4]];
  for (let i = 1; i < rim.length; i++)
    expect(rim[i].signal).toBeGreaterThan(rim[i - 1].signal + 10);
  expect(result[4].cyan).toBeGreaterThan(50);
  expect(result[0].leaks).toBe(0);
  expect(result[1].cyan).toBeGreaterThan(100);
  expect(result[1].leaks).toBe(0);
  expect(result.every((r) => r.error === 0)).toBe(true);
});
