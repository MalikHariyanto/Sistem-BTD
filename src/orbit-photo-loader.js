import { assignOrbitPhotos } from './photo-textures.js';

// Neighborhood scoring for the whole library must not block taps or rendering.
export function assignPhotosOffscreen(orbit, count) {
  if (count <= 1) return Promise.resolve(new Float32Array(orbit.length / 4));
  return new Promise(resolve => {
    let worker, timer, finished = false;
    const complete = ids => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker?.terminate();
      resolve(ids || assignOrbitPhotos(orbit, count));
    };
    try {
      worker = new Worker(new URL('./orbit-photo-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = event => complete(event.data);
      worker.onerror = event => { event.preventDefault(); complete(); };
      timer = setTimeout(() => complete(), 15000);
      // Clone the buffer: the renderer retains its stable orbit identities.
      worker.postMessage({ orbit, count });
    } catch {
      complete();
    }
  });
}
