import { lensedOrbit } from "./accretion-lens.js";

const FLIGHT_MS = 8600;
const PHOTO_REVEAL_MS = 3600;
export const JOURNEY_MS = FLIGHT_MS + PHOTO_REVEAL_MS;
export const DISK = { slope: 0.26, intercept: 0.35 };
export const PARTICLE_COUNT = 32768;
export const ORBIT = { inner: 0.14, outer: 0.64, tilt: 0.19, centerY: 0.475 };
export const ASPECT = 1672 / 941;
export const HORIZON = { x: 0, y: -0.045 / ASPECT, z: 0, radius: 0.095 };
export const INFLOW = 0.0018;
export const PLUNGE_RADIUS = 0.075;
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
    const elapsed = FLIGHT_MS * p + PHOTO_REVEAL_MS * ease((p - 0.24) / 0.12);
    if (elapsed < elapsedMs) low = p;
    else high = p;
  }
  return (low + high) / 2;
}
export const photoShowcaseAt = (p) =>
  ease((p - 0.22) / 0.04) * (1 - ease((p - 0.34) / 0.08));
// A photographic middle distance resolves the disk itself, between tiny
// light grains and the sparse, readable foreground portraits.
export const photoFieldAt = (p) =>
  ease((p - 0.14) / 0.12) * (1 - ease((p - 0.4) / 0.18));
export const orbitFieldSize = (seed, width) =>
  (seed * 97.13) % 1 > 0.76
    ? (0.0032 + seed * 0.0016) * (width < 700 ? 1.3 : 1)
    : 0;
export const orbitRateAt = (p) =>
  (0.025 + 0.975 * (1 - ease((p - 0.7) / 0.3))) *
  (1 - 0.15 * photoShowcaseAt(p));

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
    initial = data[offset];
  // r² drains steadily. Integrate the changing angular speed rather than
  // snapping photos onto a smaller ring or multiplying their angle each frame.
  const span = ORBIT.outer ** 2 - PLUNGE_RADIUS ** 2;
  const radial = initial ** 2 - PLUNGE_RADIUS ** 2 - INFLOW * time;
  const cycles = Math.floor(radial / span);
  const radius = Math.sqrt(PLUNGE_RADIUS ** 2 + radial - cycles * span);
  const angle =
    data[offset + 1] +
    ((4 * 0.115 * 0.28 ** 1.5) / INFLOW) *
      (Math.sqrt(initial) -
        Math.sqrt(radius) -
        cycles * (Math.sqrt(ORBIT.outer) - Math.sqrt(PLUNGE_RADIUS)));
  const x = Math.cos(angle) * radius,
    depth = Math.sin(angle) * radius;
  return {
    x,
    depth,
    y: 0.26 * x + ORBIT.tilt * depth + data[offset + 2],
    radius,
    angle,
    opacity:
      ease((radius - 0.098) / 0.036) * (1 - ease((radius - 0.61) / 0.03)),
    seed: data[offset + 3],
  };
}

// A camera dollies into the near side of the SAME 3D disk. The background is
// the z=0 plane; particles have their own perspective, parallax and near clip.
// No interpolation of particle positions into a second layout takes place.
export function cameraAt(progress, width, height, aspect = 1672 / 941, immersion = ease(progress / 0.16)) {
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
  const opticalZoom = Math.exp(logZoom * travel);
  // Fill the phone's freed text area with a gentle push-in. Its additive
  // magnification merges into the existing dolly without a pull-back or jump.
  const zoom = opticalZoom + (mobile ? 0.35 * clamp(immersion) * (1 - ease(p / 0.45)) : 0);
  const distance = focusDepth * focus + 5 / zoom;
  const cx = focusX * focus,
    cy =
      (0.26 * focusX + ORBIT.tilt * focusDepth - heightAboveDisk * closeUp) *
      focus;
  const imageWidth = (baseWidth * 5) / distance,
    imageHeight = imageWidth / aspect;
  const centerY = mix(
    height * (mobile ? mix(0.32, 0.54, clamp(immersion)) : 0.38),
    height * 0.5,
    travel,
  );
  return {
    progress: p,
    zoom,
    distance,
    cx,
    cy,
    baseWidth,
    x: width * 0.5 - (0.5 + cx) * imageWidth,
    y:
      centerY -
      (ORBIT.centerY + cy) * imageHeight,
    width: imageWidth,
    height: imageHeight,
    centerX: width * 0.5,
    centerY,
    // Only for reporting and the final gentle text vignette. Individual photos
    // resolve from their apparent pixel size, not a progress-driven crossfade.
    photoMix: ease((zoom - 3) / 12),
    shade: 0.035 + 0.2 * ease((p - 0.86) / 0.14),
    showcase: photoShowcaseAt(p),
  };
}

// Most of the disk is fine photographic dust; a sparse population of larger
// cards can be read without covering all the distant orbits. Stable at all zooms.
export function orbitPhotoSize(seed) {
  return (seed * 97.13) % 1 > 0.9
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
  point = lensedOrbit(point, camera);
  if (point.opacity < 0.005 || occludedByHole(point, camera)) return null;
  return projectWorld(point, camera, width, height, worldSize);
}

export function projectWorld(point, camera, width, height, worldSize = 0) {
  const depth = camera.distance - point.depth;
  if (depth <= 0.028) return null;
  const scale = (camera.baseWidth * 5) / depth;
  const size = Math.min(photoSizeLimit(width), worldSize * scale);
  const x = camera.centerX + (point.x - camera.cx) * scale;
  const y = camera.centerY + ((point.y - camera.cy) * scale) / (1672 / 941);
  if (x < -size || x > width + size || y < -size || y > height + size)
    return null;
  return { x, y, size, depth };
}

// Ray/sphere depth, evaluated in the same world coordinates as the photo disk.
// Photos in front can cross the silhouette; photos behind are hidden by it.
export function occludedByHole(point, camera) {
  const eye = [camera.cx, camera.cy / ASPECT, camera.distance];
  const ray = [
    point.x - eye[0],
    point.y / ASPECT - eye[1],
    point.depth - eye[2],
  ];
  const distance = Math.hypot(...ray),
    dir = ray.map((v) => v / distance);
  const origin = [eye[0] - HORIZON.x, eye[1] - HORIZON.y, eye[2] - HORIZON.z];
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const b = dot(origin, dir),
    d = b * b - dot(origin, origin) + HORIZON.radius ** 2;
  if (d <= 0) return false;
  const hit = -b - Math.sqrt(d);
  return hit > 0 && hit < distance;
}

export function orbitTangent(point, camera) {
  if (point.depth < 0 && Math.abs(camera.cx) / camera.distance < 0.25) {
    const dt = 0.001, r = point.radius, a = point.angle;
    const nextR = Math.sqrt(r * r - INFLOW * dt);
    const nextA = a + 0.115 * (0.28 / r) ** 1.5 * dt;
    const x = Math.cos(nextA) * nextR, depth = Math.sin(nextA) * nextR;
    const next = lensedOrbit({ ...point, x, depth, radius: nextR, angle: nextA,
      y: 0.26 * x + ORBIT.tilt * depth + point.y - 0.26 * point.x - ORBIT.tilt * point.depth }, camera);
    const current = lensedOrbit(point, camera);
    const d = camera.distance - point.depth, nd = camera.distance - next.depth;
    return Math.atan2(((next.y - camera.cy) / nd - (current.y - camera.cy) / d) / ASPECT,
      (next.x - camera.cx) / nd - (current.x - camera.cx) / d);
  }
  const r = point.radius,
    a = point.angle,
    dr = -INFLOW / (2 * r);
  const omega = 0.115 * (0.28 / r) ** 1.5;
  const vx = Math.cos(a) * dr - Math.sin(a) * r * omega;
  const vz = Math.sin(a) * dr + Math.cos(a) * r * omega;
  const depth = camera.distance - point.depth;
  return Math.atan2(
    (0.26 * vx + ORBIT.tilt * vz) * depth + (point.y - camera.cy) * vz,
    ASPECT * (vx * depth + (point.x - camera.cx) * vz),
  );
}

// Exact tangent cone of the sphere, projected to a reusable Canvas clip path.
export function horizonOutline(camera, segments = 64) {
  const eye = [camera.cx, camera.cy / ASPECT, camera.distance];
  const offset = [eye[0] - HORIZON.x, eye[1] - HORIZON.y, eye[2] - HORIZON.z];
  const length = Math.hypot(...offset),
    n = offset.map((v) => v / length);
  const u = [n[2], 0, -n[0]],
    ul = Math.hypot(...u);
  for (let i = 0; i < 3; i++) u[i] /= ul;
  const v = [n[1] * u[2], n[2] * u[0] - n[0] * u[2], -n[1] * u[0]];
  const radius = HORIZON.radius * Math.sqrt(1 - (HORIZON.radius / length) ** 2);
  return Array.from({ length: segments }, (_, i) => {
    const a = (i * Math.PI * 2) / segments;
    const p = [HORIZON.x, HORIZON.y, HORIZON.z].map(
      (c, j) =>
        c +
        (n[j] * HORIZON.radius ** 2) / length +
        radius * (u[j] * Math.cos(a) + v[j] * Math.sin(a)),
    );
    const scale = (camera.baseWidth * 5) / (eye[2] - p[2]);
    return [
      camera.centerX + (p[0] - eye[0]) * scale,
      camera.centerY + (p[1] - eye[1]) * scale,
    ];
  });
}

// Photographs resolve differently across the disk's depth. Inner material
// shrinks, aligns with the flow and darkens before reaching the hard horizon.
export function photoDepthAt(point, camera) {
  point = lensedOrbit(point, camera);
  const depth = camera.distance - point.depth;
  const far = ease((depth / camera.distance - 0.98) / 0.36);
  const infall = ease((point.radius - 0.108) / 0.082);
  const origin = [camera.cx - HORIZON.x, camera.cy / ASPECT - HORIZON.y, camera.distance - HORIZON.z];
  const ray = [point.x - camera.cx, (point.y - camera.cy) / ASPECT, -depth];
  const length = Math.hypot(...ray);
  const along = origin.reduce((sum, value, i) => sum + value * ray[i] / length, 0);
  const closest = Math.sqrt(Math.max(0, origin.reduce((sum, value) => sum + value * value, 0) - along * along));
  const rear = ease((depth - (camera.distance - 0.035)) / 0.075);
  const limb = mix(1, ease((closest - HORIZON.radius - 0.001) / 0.022), rear);
  return {
    opacity: (1 - 0.38 * far) * infall * limb,
    brightness: (1 - 0.4 * far) * (0.68 + 0.32 * infall),
    detail: (1 - 0.3 * far) * infall,
    scale: 0.6 + 0.4 * infall,
  };
}
