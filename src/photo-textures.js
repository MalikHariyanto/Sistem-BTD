import { orbitAt } from "./universe-camera.js";

// Keep both the hardware size and decoded GPU memory bounded as libraries grow.
export function planPhotoAtlas(count, maxSize = 4096) {
  const columns = Math.min(count, Math.ceil(Math.sqrt(count * 1.25)));
  const rows = Math.ceil(count / columns);
  for (const tileWidth of [256, 192, 128, 96, 64, 32]) {
    const tileHeight = tileWidth * 1.25;
    const width = columns * tileWidth,
      height = rows * tileHeight;
    if (width <= maxSize && height <= maxSize && width * height <= 8_000_000)
      return { columns, rows, tileWidth, tileHeight, width, height };
  }
  throw new Error("Photo atlas exceeds the supported texture size.");
}

// Assign once when the library changes, never while the camera moves. Nearby
// particles prefer different photos at several points along their orbits.
// Global use breaks ties so every uploaded image participates evenly.
export function assignOrbitPhotos(orbit, photoCount) {
  const count = orbit.length / 4;
  const ids = new Float32Array(count);
  if (photoCount <= 1) return ids;
  const cell = 0.012,
    radiusSquared = cell * cell;
  const snapshots = [0, 10, 25].map((time) => {
    const points = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const p = orbitAt(orbit, i, time);
      points[i * 2] = p.x;
      points[i * 2 + 1] = p.depth;
    }
    return { points, buckets: new Map() };
  });
  const used = new Uint32Array(photoCount),
    scores = new Uint16Array(photoCount);
  for (let i = 0; i < count; i++) {
    scores.fill(0);
    for (const { points, buckets } of snapshots) {
      const x = points[i * 2],
        z = points[i * 2 + 1];
      const cx = Math.floor((x + 1) / cell),
        cz = Math.floor((z + 1) / cell);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          const neighbors = buckets.get((cx + dx) * 256 + cz + dz);
          if (!neighbors) continue;
          for (const j of neighbors) {
            const distance =
              (x - points[j * 2]) ** 2 + (z - points[j * 2 + 1]) ** 2;
            if (distance < radiusSquared)
              scores[ids[j]] += distance < radiusSquared * 0.25 ? 4 : 1;
          }
        }
    }
    let best = (i * 37) % photoCount;
    for (let c = 0; c < photoCount; c++)
      if (
        scores[c] < scores[best] ||
        (scores[c] === scores[best] && used[c] < used[best])
      )
        best = c;
    ids[i] = best;
    used[best]++;
    for (const { points, buckets } of snapshots) {
      const key =
        Math.floor((points[i * 2] + 1) / cell) * 256 +
        Math.floor((points[i * 2 + 1] + 1) / cell);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(i);
    }
  }
  return ids;
}
