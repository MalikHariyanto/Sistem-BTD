// World units, Y up. One sphere and one continuous annulus share the origin.
export const PHOTO_COUNT = 5000;
export const BLACK_HOLE_RADIUS = 1;
export const DISK = { inner: 1.14, outer: 6.4, speed: 0.085 };
export const JOURNEY_MS = 12600;
export const clamp = (n) => Math.max(0, Math.min(1, n));
export const ease = (n) => {
  const x = clamp(n);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const mix = (a, b, t) => a + (b - a) * t;

export function journeyProgress(elapsed) {
  if (elapsed <= 0) return 0;
  if (elapsed >= JOURNEY_MS) return 1;
  let low = 0,
    high = 1;
  for (let i = 0; i < 24; i++) {
    const p = (low + high) / 2;
    if (8600 * p + 4000 * ease((p - 0.24) / 0.12) < elapsed) low = p;
    else high = p;
  }
  return (low + high) / 2;
}
export const photoShowcaseAt = (p) =>
  ease((p - 0.22) / 0.04) * (1 - ease((p - 0.36) / 0.1));
export const orbitRateAt = (p) => mix(1, 0.035, ease((p - 0.72) / 0.28));
export function createPhotoOrbits(count = PHOTO_COUNT) {
  let seed = 42137;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const radius = DISK.inner + random() ** 1.18 * (DISK.outer - DISK.inner);
    data.set(
      [radius, random() * Math.PI * 2, (random() - 0.5) * 0.1, random()],
      i * 4,
    );
  }
  return data;
}
export function photoPosition(data, index, time = 0) {
  const i = index * 4,
    radius = data[i],
    angle = data[i + 1] - time * DISK.speed;
  return {
    x: Math.cos(angle) * radius,
    y: data[i + 2],
    z: Math.sin(angle) * radius,
    radius,
    angle,
    seed: data[i + 3],
  };
}
export function cameraPose(progress, time = 0) {
  const p = clamp(progress),
    travel = ease(p);
  const radius = Math.exp(mix(Math.log(14), Math.log(4.25), travel));
  // Increasing camera azimuth opposes the disk's decreasing world azimuth.
  // The middle pass is a slow, uninterrupted counter-orbit, not a stopped slide.
  const azimuth = Math.PI * 0.5 + 0.95 * ease((p - 0.16) / 0.4) + time * 0.03;
  const height = mix(2.9, 0.64, travel) + 0.38 * photoShowcaseAt(p);
  return {
    eye: [Math.cos(azimuth) * radius, height, Math.sin(azimuth) * radius],
    target: [0, 0, 0],
    azimuth,
    radius,
    height,
    fov: 46,
    diskRotation: time * DISK.speed,
  };
}
