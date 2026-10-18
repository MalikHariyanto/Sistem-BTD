import { test, expect } from '@playwright/test';

for (const renderer of ['webgl', 'canvas2d']) {
  test(`${renderer}: the original image edges join the surrounding space without rectangular color seams`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const result = await page.evaluate(async renderer => {
      const { cameraAt } = await import('/src/universe-camera.js');
      const { createUniverseGPU } = await import('/src/universe-gpu.js');
      const { createSpaceBackdrop } = await import('/src/space-background.js');
      const plate = document.createElement('canvas');
      plate.width = 1672; plate.height = 941;
      const paint = plate.getContext('2d');
      const gradient = paint.createLinearGradient(0, 0, plate.width, plate.height);
      gradient.addColorStop(0, '#ab7655'); gradient.addColorStop(1, '#596576');
      paint.fillStyle = gradient; paint.fillRect(0, 0, plate.width, plate.height);
      const backdrop = renderer === 'canvas2d' ? createSpaceBackdrop(plate) : null;
      const samples = [];
      for (const [width, height] of [[1920, 930], [2560, 1080], [390, 844]]) {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const gpu = renderer === 'webgl' ? createUniverseGPU(canvas) : null;
        const ctx = gpu ? null : canvas.getContext('2d');
        const gl = gpu ? canvas.getContext('webgl') : null;
        if (gpu) {
          const draw = gl.drawArrays.bind(gl);
          gl.drawArrays = (mode, first, count) => mode === gl.POINTS ? undefined : draw(mode, first, count);
          gpu.setPlate(plate);
        }
        for (const progress of [0, .04]) {
          const camera = cameraAt(progress, width, height);
          if (gpu) gpu.draw({ camera, width, height, time: 0, detail: 0, cover: 0, reduced: true });
          else { ctx.fillStyle = '#08090b'; ctx.fillRect(0, 0, width, height); backdrop.draw(ctx, camera); }
          const pixel = (x, y) => {
            if (ctx) return [...ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0, 3);
            const rgba = new Uint8Array(4);
            gl.readPixels(Math.round(x), height - 1 - Math.round(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
            return [...rgba.slice(0, 3)];
          };
          for (const edge of [camera.x, camera.x + camera.width]) {
            if (edge > 3 && edge < width - 3) {
              const y = Math.max(4, Math.min(height - 4, camera.y + camera.height * .2));
              samples.push({ name: `${width}×${height}, p=${progress}, vertical edge`, a: pixel(edge - 2, y), b: pixel(edge + 2, y) });
            }
          }
          for (const edge of [camera.y, camera.y + camera.height]) {
            if (edge > 3 && edge < height - 3)
              samples.push({ name: `${width}×${height}, p=${progress}, horizontal edge`, a: pixel(width / 2, edge - 2), b: pixel(width / 2, edge + 2) });
          }
        }
        if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
      return samples;
    }, renderer);
    expect(result.length).toBeGreaterThanOrEqual(5);
    for (const sample of result) {
      // Both sides must contain artwork, not a featureless dark filler. A
      // smooth image must remain continuous at its former rectangular bounds.
      expect(Math.max(...sample.a), sample.name).toBeGreaterThan(35);
      expect(Math.max(...sample.b), sample.name).toBeGreaterThan(35);
      expect(Math.max(...sample.a.map((color, i) => Math.abs(color - sample.b[i]))), sample.name).toBeLessThan(6);
    }
  });
}
