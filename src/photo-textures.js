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

// The entire instanced annulus rotates rigidly, so local neighbors remain local
// at every camera angle. Choose ids once and balance the complete photo library.
export function assignPhotoIds(orbit, photoCount) {
  const ids = new Float32Array(orbit.length / 4);
  if (photoCount <= 1) return ids;
  const cell = 0.24,
    buckets = new Map(),
    used = new Uint32Array(photoCount);
  const scores = new Uint16Array(photoCount);
  for (let i = 0; i < ids.length; i++) {
    const radius = orbit[i * 4],
      angle = orbit[i * 4 + 1];
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    const cx = Math.floor(x / cell),
      cz = Math.floor(z / cell);
    scores.fill(0);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        for (const neighbor of buckets.get(`${cx + dx},${cz + dz}`) || []) {
          const distance = (x - neighbor.x) ** 2 + (z - neighbor.z) ** 2;
          if (distance < cell * cell)
            scores[ids[neighbor.index]] +=
              distance < cell * cell * 0.25 ? 4 : 1;
        }
      }
    let best = (i * 37) % photoCount;
    for (let j = 0; j < photoCount; j++)
      if (
        scores[j] < scores[best] ||
        (scores[j] === scores[best] && used[j] < used[best])
      )
        best = j;
    ids[i] = best;
    used[best]++;
    const key = `${cx},${cz}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ x, z, index: i });
  }
  return ids;
}
