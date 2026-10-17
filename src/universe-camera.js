const FLIGHT_MS = 8600;
const PHOTO_REVEAL_MS = 2600;
export const JOURNEY_MS = FLIGHT_MS + PHOTO_REVEAL_MS;
export const DISK = { slope: 0.26, intercept: 0.35 };
export const PARTICLE_COUNT = 32768;
export const ORBIT = { inner: 0.14, outer: 0.64, tilt: 0.19, centerY: 0.475 };
export const clamp = (n) => Math.max(0, Math.min(1, n));
export const ease = (n) => {
  const x = clamp(n);
  return clamp(x * x * x * (x * (x * 6 - 15) + 10));
};
export const mix = (a, b, t) => a + (b - a) * t;
export const diskY = (u) => DISK.intercept + DISK.slope * u;

// Spend time inside the crowded photo stream, keeping the original camera
// path. Clock dilation eases in/out and never freezes or reverses the dolly.
export function journeyProgress(elapsedMs) {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= JOURNEY_MS) return 1;
  let low = 0,
    high = 1;
  for (let i = 0; i < 24; i++) {
    const p = (low + high) / 2;
    const elapsed = FLIGHT_MS * p + PHOTO_REVEAL_MS * ease((p - 0.4) / 0.22);
    if (elapsed < elapsedMs) low = p;
    else high = p;
  }
  return (low + high) / 2;
}
export const photoShowcaseAt = (p) =>
  ease((p - 0.37) / 0.07) * (1 - ease((p - 0.6) / 0.1));
export const orbitRateAt = (p) =>
  (0.025 + 0.975 * (1 - ease((p - 0.7) / 0.3))) *
  (1 - 0.55 * photoShowcaseAt(p));

// Stable particle identities: an uploaded image changes the texture, never its
// orbit. A single packed buffer is shared by the GPU and the Canvas fallback.
export function createOrbit(count = PARTICLE_COUNT) {
  let state = 42137;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    // Continuous radii and a thicker, irregular vertical spread avoid rows.
    const radius = ORBIT.inner + random() ** 1.22 * (ORBIT.outer - ORBIT.inner);
    const phase = random() * Math.PI * 2;
    data.set([radius, phase, (random() - 0.5) * 0.064, random()], i * 4);
  }
  return data;
}
export function orbitAt(data, index, time) {
  const offset = index * 4,
    radius = data[offset];
  const angle = data[offset + 1] + time * 0.115 * (0.28 / radius) ** 1.5;
  const x = Math.cos(angle) * radius,
    depth = Math.sin(angle) * radius;
  return {
    x,
    depth,
    y: 0.26 * x + ORBIT.tilt * depth + data[offset + 2],
    radius,
    angle,
    seed: data[offset + 3],
  };
}

// A camera dollies into the near side of the SAME 3D disk. The background is
// the z=0 plane; particles have their own perspective, parallax and near clip.
// No interpolation of particle positions into a second layout takes place.
export function cameraAt(progress, width, height, aspect = 1672 / 941) {
  const p = clamp(progress),
    travel = ease(p),
    mobile = width < 700;
  const baseWidth = mobile
    ? Math.max(width * 1.9, height * 0.82)
    : Math.max(Math.min(width * 1.06, height * 1.7), height * 0.95);
  const focusDepth = 0.32,
    focusX = 0.24,
    clearance = 0.115,
    heightAboveDisk = 0.033;
  const focus = ease(p / 0.94);
  // Recover the original approach exactly in the opening. Gradually soften its
  // final magnification so the ending feels intimate without entering the disk.
  // Both paths and the blend have zero endpoint velocity and acceleration.
  const closeUp = ease((p - 0.35) / 0.65);
  const logZoom = mix(Math.log(5 / 0.052), Math.log(5 / clearance), closeUp);
  const zoom = Math.exp(logZoom * travel);
  const distance = focusDepth * focus + 5 / zoom;
  const cx = focusX * focus,
    cy =
      (0.26 * focusX + ORBIT.tilt * focusDepth - heightAboveDisk * closeUp) *
      focus;
  const imageWidth = (baseWidth * 5) / distance,
    imageHeight = imageWidth / aspect;
  return {
    zoom,
    distance,
    cx,
    cy,
    baseWidth,
    x: width * 0.5 - (0.5 + cx) * imageWidth,
    y:
      mix(height * (mobile ? 0.32 : 0.38), height * 0.5, travel) -
      (ORBIT.centerY + cy) * imageHeight,
    width: imageWidth,
    height: imageHeight,
    centerX: width * 0.5,
    centerY: mix(height * (mobile ? 0.32 : 0.38), height * 0.5, travel),
    // Only for reporting and the final gentle text vignette. Individual photos
    // resolve from their apparent pixel size, not a progress-driven crossfade.
    photoMix: ease((zoom - 3) / 12),
    shade: 0.035 + 0.2 * ease((p - 0.86) / 0.14),
  };
}

// Most of the disk is fine photographic dust; a sparse population of larger
// cards can be read without covering all the distant orbits. Stable at all zooms.
export function orbitPhotoSize(seed) {
  return (seed * 97.13) % 1 > 0.88
    ? 0.003 + seed * 0.0018
    : 0.00018 + seed * 0.00038;
}
export const orbitDustSize = (seed) => 0.00018 + seed * 0.00038;
export const photoSizeLimit = (width) => Math.min(190, width * 0.36);

export function projectOrbit(
  point,
  camera,
  width,
  height,
  worldSize = orbitPhotoSize(point.seed),
) {
  const depth = camera.distance - point.depth;
  if (depth <= 0.028) return null;
  const scale = (camera.baseWidth * 5) / depth;
  const size = Math.min(photoSizeLimit(width), worldSize * scale);
  const x = camera.centerX + (point.x - camera.cx) * scale;
  const y = camera.centerY + ((point.y - camera.cy) * scale) / (1672 / 941);
  if (x < -size || x > width + size || y < -size || y > height + size)
    return null;
  const u = 0.5 + (point.x * 5) / (5 - point.depth);
  const v = ORBIT.centerY + (point.y * 5) / (5 - point.depth);
  if (
    point.depth < 0 &&
    ((u - 0.5) / 0.112) ** 2 + ((v - 0.43) / 0.205) ** 2 < 1.05
  )
    return null;
  return { x, y, size, depth };
}
