import { test, expect } from "@playwright/test";

test("WebGL projects the actual moving camera and keeps the upper shadow free of photo bleed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createUniverseGPU } = await import("/src/universe-gpu.js");
    const {
      cameraAt,
      createOrbit,
      orbitAt,
      projectOrbit,
      projectWorld,
      orbitPhotoSize,
      orbitDustSize,
      HORIZON,
      ASPECT,
      photoShowcaseAt,
    } = await import("/src/universe-camera.js");
    const canvas = document.createElement("canvas");
    // Fixed pixel budget isolates projection/raster agreement from device DPR.
    const width = 1280,
      height = 800;
    canvas.width = width;
    canvas.height = height;
    const gpu = createUniverseGPU(canvas);
    if (!gpu) throw Error("WebGL renderer failed to initialize");
    const plate = new Image();
    plate.src = "/art/gargantua.webp";
    await plate.decode();
    gpu.setPlate(plate);
    const photo = document.createElement("canvas");
    photo.width = 160;
    photo.height = 200;
    const ctx = photo.getContext("2d");
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(0, 0, 160, 200);
    gpu.setPhotos([photo]);
    const gl = canvas.getContext("webgl"),
      orbit = createOrbit(),
      frames = [];
    for (const progress of [0.3, 0.33, 0.36]) {
      const camera = cameraAt(progress, width, height);
      // Hold physical time fixed: visible displacement must come from the camera.
      const time = 6;
      gpu.draw({
        camera,
        width,
        height,
        time,
        detail: 0,
        cover: 0,
        showcase: photoShowcaseAt(progress),
        reduced: true,
      });
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const isCyan = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const i = ((height - 1 - Math.floor(y)) * width + Math.floor(x)) * 4;
        return (
          pixels[i + 1] > pixels[i] + 40 &&
          pixels[i + 2] > pixels[i] + 40 &&
          pixels[i + 1] > 100
        );
      };
      let predicted = 0,
        matched = 0;
      for (let i = 0; i < orbit.length / 4; i += 1) {
        const p = orbitAt(orbit, i, time);
        if (p.opacity < 0.9 || orbitPhotoSize(p.seed) <= orbitDustSize(p.seed))
          continue;
        const screen = projectOrbit(
          p,
          camera,
          width,
          height,
          orbitPhotoSize(p.seed) * 1.25,
        );
        if (
          !screen ||
          screen.size < 8 ||
          screen.x < 2 ||
          screen.x > width - 2 ||
          screen.y < 2 ||
          screen.y > height - 2
        )
          continue;
        predicted++;
        if (
          isCyan(screen.x, screen.y) ||
          isCyan(screen.x + 1, screen.y) ||
          isCyan(screen.x, screen.y + 1)
        )
          matched++;
      }
      const center = projectWorld(
        { x: HORIZON.x, y: HORIZON.y * ASPECT, depth: HORIZON.z },
        camera,
        width,
        height,
      );
      const radius = (HORIZON.radius * camera.focal) / center.depth;
      let leaks = 0,
        samples = 0;
      // Above the accretion plane, inside the sphere; never mask legitimate
      // near-side material crossing the lower part of the projected shadow.
      for (
        let y = Math.max(0, Math.ceil(center.y - radius * 0.65));
        y < center.y - radius * 0.25;
        y++
      )
        for (
          let x = Math.max(0, Math.ceil(center.x - radius * 0.3));
          x < Math.min(width, center.x + radius * 0.3);
          x++
        ) {
          samples++;
          if (isCyan(x, y)) leaks++;
        }
      const program = gl.getParameter(gl.CURRENT_PROGRAM);
      const eye = [
        ...gl.getUniform(program, gl.getUniformLocation(program, "uEye")),
      ];
      frames.push({
        predicted,
        matched,
        leaks,
        samples,
        eye,
        expectedEye: camera.eye,
        error: gl.getError(),
      });
    }
    return frames;
  });
  for (const frame of result) {
    expect(frame.error).toBe(0);
    expect(frame.predicted).toBeGreaterThan(10);
    expect(frame.matched / frame.predicted).toBeGreaterThan(0.95);
    expect(frame.samples).toBeGreaterThan(100);
    expect(frame.leaks).toBe(0);
    frame.eye.forEach((v, i) => expect(v).toBeCloseTo(frame.expectedEye[i], 5));
  }
  expect(
    Math.hypot(...result[0].eye.map((v, i) => v - result[2].eye[i])),
  ).toBeGreaterThan(1);
});
