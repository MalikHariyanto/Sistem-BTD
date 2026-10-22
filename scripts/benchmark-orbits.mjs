import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Optional argument: the src directory of a reference checkout. No browser,
// artificial FPS claim or reduced particle population is used in this CPU test.
const root = resolve(process.argv[2] || fileURLToPath(new URL('../src', import.meta.url)));
const { createOrbit, cameraAt, orbitRateAt } = await import(pathToFileURL(resolve(root, 'universe-camera.js')));
const { createOrbitComposition } = await import(pathToFileURL(resolve(root, 'orbit-composition.js')));
const { assignOrbitPhotos } = await import(pathToFileURL(resolve(root, 'photo-textures.js')));
const orbit = createOrbit(), photoIds = assignOrbitPhotos(orbit, 200);
const ratios = Array.from({ length: 200 }, (_, i) => [.8, 1.6, 1][i % 3]);

for (const [width, height] of [[390, 844], [1440, 900]]) {
  const samples = [];
  let photographs = 0;
  // Warm up once, then collect two complete passes through the moving middle.
  for (let run = 0; run < 3; run++) {
    const composition = createOrbitComposition(orbit);
    let time = 6;
    for (let frame = 0; frame < 180; frame++) {
      const progress = .24 + frame / 179 * .20;
      const camera = cameraAt(progress, width, height);
      time += orbitRateAt(progress, width) / 30;
      const start = performance.now();
      const photos = composition.update({ camera, width, height, time, photoIds, ratios,
        now: 1000 + frame / 30 * 1000, reduced: frame === 0 });
      if (run > 0) samples.push(performance.now() - start);
      photographs += photos.length;
    }
  }
  samples.sort((a, b) => a - b);
  const round = value => Number(value.toFixed(3));
  console.log(JSON.stringify({ width, height, frames: samples.length,
    p50_ms: round(samples[Math.floor(samples.length * .5)]),
    p95_ms: round(samples[Math.floor(samples.length * .95)]),
    mean_ms: round(samples.reduce((a, b) => a + b, 0) / samples.length),
    max_ms: round(samples.at(-1)), photographs }));
}
