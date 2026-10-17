import { test, expect } from "@playwright/test";

test("the React renderer contains one black sphere and one 5000-photo InstancedMesh, with actual opposing movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  const result = await page.evaluate(async () => {
    const { mountGargantua } = await import("/src/GargantuaScene.jsx");
    const canvas = document.createElement("canvas");
    canvas.style = "width:900px;height:600px";
    document.body.append(canvas);
    const runtime = { progress: 0.3, time: 3 },
      engine = await mountGargantua(canvas, runtime);
    const images = Array.from({ length: 37 }, (_, i) => {
      const c = document.createElement("canvas");
      c.width = i % 2 ? 100 : 180;
      c.height = i % 2 ? 180 : 100;
      const ctx = c.getContext("2d");
      ctx.fillStyle =
        { 0: "#ff0000", 7: "#00ffff", 36: "#ff00ff" }[i] ||
        `hsl(${(i * 137.5) % 360} 100% 50%)`;
      ctx.fillRect(0, 0, c.width, c.height);
      return c;
    });
    await engine.setPhotos(images);
    engine.draw();
    const { scene, camera, renderer } = engine.inspect(),
      meshes = [];
    scene.traverse((object) => {
      if (object.isMesh) meshes.push(object);
    });
    const disk = scene.getObjectByName("photo-accretion-disk"),
      hole = scene.getObjectByName("gargantua-horizon");
    const direction = camera.getWorldDirection(camera.position.clone());
    const dot = direction.dot(camera.position.clone().normalize());
    const first = {
      camera: Math.atan2(camera.position.z, camera.position.x),
      disk: disk.rotation.y,
    };
    runtime.time = 4;
    engine.draw();
    const last = {
      camera: Math.atan2(camera.position.z, camera.position.x),
      disk: disk.rotation.y,
    };
    const ids = [...disk.geometry.getAttribute("aTile").array];
    const output = {
      meshes: meshes.map((m) => ({
        name: m.name,
        instanced: !!m.isInstancedMesh,
        count: m.count,
      })),
      sphere: hole.geometry.type,
      black: hole.material.color.getHex(),
      holePosition: hole.position.toArray(),
      instances: disk.count,
      sources: new Set(ids).size,
      lookDot: dot,
      opposing: (last.camera - first.camera) * -(last.disk - first.disk) < 0,
      error: renderer.getContext().getError(),
      bloom: renderer.info.render.calls > 0,
    };
    // Read native colors from top, middle and last atlas rows. This catches
    // whole-atlas Y flips that silently attach the wrong image/aspect to ids.
    runtime.progress = 1;
    runtime.time = 0;
    engine.draw();
    output.resolvedProgress = disk.material.uniforms.uProgress.value;
    const eye = camera.position.clone().multiplyScalar(0.5);
    disk.count = 1;
    disk.setMatrixAt(
      0,
      disk.matrix
        .clone()
        .compose(
          eye,
          disk.quaternion.clone().identity(),
          disk.scale.clone().set(0.6, 0.6, 1),
        ),
    );
    disk.instanceMatrix.needsUpdate = true;
    const tile = disk.geometry.getAttribute("aTile"),
      spin = disk.geometry.getAttribute("aSpin");
    spin.array[0] = 0.99 / 1.173;
    spin.needsUpdate = true;
    output.colorSamples = [];
    const gl = renderer.getContext();
    for (const id of [0, 7, 36]) {
      tile.array[0] = id;
      tile.needsUpdate = true;
      engine.draw();
      const pixel = new Uint8Array(4);
      gl.readPixels(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel,
      );
      output.colorSamples.push([...pixel]);
    }
    engine.dispose();
    canvas.remove();
    return output;
  });
  expect(result.meshes).toHaveLength(2);
  expect(result.instances).toBe(5000);
  expect(result.sources).toBe(37);
  expect(result.sphere).toBe("SphereGeometry");
  expect(result.black).toBe(0);
  expect(result.holePosition).toEqual([0, 0, 0]);
  expect(result.lookDot).toBeCloseTo(-1, 5);
  expect(result.opposing).toBe(true);
  expect(result.error).toBe(0);
  expect(result.bloom).toBe(true);
  expect(result.resolvedProgress).toBe(1);
  const [red, cyan, magenta] = result.colorSamples;
  expect(red[0]).toBeGreaterThan(220);
  expect(red[1]).toBeLessThan(25);
  expect(red[2]).toBeLessThan(25);
  expect(cyan[0]).toBeLessThan(25);
  expect(cyan[1]).toBeGreaterThan(220);
  expect(cyan[2]).toBeGreaterThan(220);
  expect(magenta[0]).toBeGreaterThan(220);
  expect(magenta[1]).toBeLessThan(25);
  expect(magenta[2]).toBeGreaterThan(220);
});
