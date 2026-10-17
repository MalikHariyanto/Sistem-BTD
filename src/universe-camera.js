const FLIGHT_MS = 8600;
const PHOTO_REVEAL_MS = 4000;
export const JOURNEY_MS = FLIGHT_MS + PHOTO_REVEAL_MS;
export const DISK = { slope: 0.26, intercept: 0.35 };
export const PARTICLE_COUNT = 32768;
export const ORBIT = { inner: 0.14, outer: 0.64, tilt: 0.19, centerY: 0.475 };
export const ASPECT = 1672 / 941;
export const HORIZON = { x: 0, y: -0.045 / ASPECT, z: 0, radius: 0.088 };
const INFLOW = 0.0007;
const PLUNGE_RADIUS = 0.075;
export const clamp = (n) => Math.max(0, Math.min(1, n));
export const ease = (n) => {
  const x = clamp(n);
  return clamp(x * x * x * (x * (x * 6 - 15) + 10));
};
export const mix = (a, b, t) => a + (b - a) * t;
export const diskY = (u) => DISK.intercept + DISK.slope * u;

// Spend time inside the crowded photo stream. Clock dilation eases in/out
// and never freezes or reverses the camera dolly.
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
export const orbitRateAt = (p) => 0.025 + 0.975 * (1 - ease((p - 0.7) / 0.3));
// The cinematic counter-orbit is confined to the middle. Outside this window,
// the original approach and intimate ending retain their exact camera poses.
export const middleMotionAt = (p) =>
  ease((p - 0.18) / 0.06) * (1 - ease((p - 0.44) / 0.18));

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
// A steady inward mass flow: r² decreases with time, and the integrated
// Keplerian angular velocity accelerates towards the inner edge. New particles
// enter at the outer rim invisibly; a stable identity never jumps across screen.
export function orbitAt(data, index, time) {
  const offset = index * 4,
    initial = data[offset];
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
  const opacity =
    ease((radius - 0.087) / 0.035) * (1 - ease((radius - 0.61) / 0.03));
  return {
    x,
    depth,
    y: 0.26 * x + ORBIT.tilt * depth + data[offset + 2],
    radius,
    angle,
    opacity,
    seed: data[offset + 3],
  };
}

// Orbit above the tilted disk, then dolly into its near side. Position and basis
// transform the entire world; particles never move into a second screen layout.
export function cameraAt(progress, width, height, aspect = 1672 / 941, time = 0) {
  const clockP = clamp(progress);
  const wideView = photoShowcaseAt(clockP);
  // Keep the shadow in view during the arc, then continue to the close-up.
  const p =
    clockP -
    0.025 * ease((clockP - 0.2) / 0.1) * (1 - ease((clockP - 0.36) / 0.22));
  // Camera position AND viewing basis rotate around the hole, then join the
  // close-up dolly tangentially. Particle phases never use this angle.
  const middleMotion = middleMotionAt(clockP);
  const originalAngle = -1.05 * ease((clockP - 0.24) / 0.14);
  // Positive rotation about the tilted disk normal decreases world azimuth,
  // opposing the photographs' increasing azimuth. Continue moving during the
  // four-second showcase, then ease back into the original ending trajectory.
  const counterOrbit = 0.85 * ease((clockP - 0.2) / 0.24) + time * 0.03;
  const viewAngle = mix(originalAngle, counterOrbit, middleMotion);
  const orbitBlend =
    ease((clockP - 0.2) / 0.06) * (1 - ease((clockP - 0.44) / 0.2));
  const wideLens =
    ease((clockP - 0.2) / 0.18) * (1 - ease((clockP - 0.38) / 0.2));
  const travel = ease(p),
    mobile = width < 700;
  const baseWidth =
    (mobile
      ? Math.max(width * 1.9, height * 0.82)
      : Math.max(Math.min(width * 1.06, height * 1.7), height * 0.95)) *
    (1 - 0.2 * wideLens);
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
  const cx = focusX * focus * (1 - 0.75 * wideView),
    cy =
      (0.26 * focusX + ORBIT.tilt * focusDepth - heightAboveDisk * closeUp) *
      focus *
      (1 - 0.65 * wideView);
  const imageWidth = (baseWidth * 5) / distance,
    imageHeight = imageWidth / aspect;
  // Orbit about the disk normal: a world-Y turn would cross its plane and
  // flatten the whole annulus into a line halfway through the viewing pass.
  const axis = [-0.26 / ASPECT, 1, -ORBIT.tilt / ASPECT];
  const magnitude = Math.hypot(...axis);
  const n = axis.map((v) => v / magnitude);
  const rotate = (v) => {
    const c = Math.cos(viewAngle),
      sn = Math.sin(viewAngle);
    const d = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
    const cross = [
      n[1] * v[2] - n[2] * v[1],
      n[2] * v[0] - n[0] * v[2],
      n[0] * v[1] - n[1] * v[0],
    ];
    return v.map((x, i) => x * c + cross[i] * sn + n[i] * d * (1 - c));
  };
  // Rise gently over the disk during the arc, then descend into the near
  // stream. Changing inclination makes the camera pass legible even though
  // the central shadow is rotationally symmetric.
  const pitch =
    0.1 * ease((clockP - 0.24) / 0.08) * (1 - ease((clockP - 0.38) / 0.2));
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  const eye = rotate([
    cx,
    (cy / ASPECT) * cp - distance * sp,
    (cy / ASPECT) * sp + distance * cp,
  ]);
  return {
    eye,
    right: rotate([1, 0, 0]),
    down: rotate([0, cp, sp]),
    back: rotate([0, -sp, cp]),
    focal: baseWidth * 5,
    orbitBlend,
    zoom,
    viewAngle,
    middleMotion,
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
  if (point.opacity < 0.005 || occludedByHole(point, camera)) return null;
  return projectWorld(point, camera, width, height, worldSize);
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function cameraSpace(point, camera) {
  const relative = [
    point.x - camera.eye[0],
    point.y / ASPECT - camera.eye[1],
    point.depth - camera.eye[2],
  ];
  return {
    x: dot(relative, camera.right),
    y: dot(relative, camera.down),
    depth: -dot(relative, camera.back),
  };
}
export function projectWorld(point, camera, width, height, worldSize = 0) {
  const view = cameraSpace(point, camera),
    depth = view.depth;
  if (depth <= 0.028) return null;
  const scale = camera.focal / depth;
  const size = Math.min(photoSizeLimit(width), worldSize * scale);
  const x = camera.centerX + view.x * scale;
  const y = camera.centerY + view.y * scale;
  if (x < -size || x > width + size || y < -size || y > height + size)
    return null;
  return { x, y, size, depth };
}

// Ray/sphere intersection in world coordinates, shared with the GPU. The far
// disk disappears behind the shadow; near-side photos remain in front of it.
export function occludedByHole(point, camera) {
  const ray = [
    point.x - camera.eye[0],
    point.y / ASPECT - camera.eye[1],
    point.depth - camera.eye[2],
  ];
  const distance = Math.hypot(...ray);
  const direction = ray.map((n) => n / distance);
  const offset = [
    camera.eye[0] - HORIZON.x,
    camera.eye[1] - HORIZON.y,
    camera.eye[2] - HORIZON.z,
  ];
  const b = dot(offset, direction);
  const discriminant = b * b - dot(offset, offset) + HORIZON.radius ** 2;
  if (discriminant <= 0) return false;
  const hit = -b - Math.sqrt(discriminant);
  return hit > 0 && hit < distance;
}

// Apparent tangent of an inward orbit after camera perspective, rather than a
// screen-space rotation borrowed from the initial, stationary view.
export function orbitTangent(point, camera) {
  const r = point.radius,
    a = point.angle,
    dr = -INFLOW / (2 * r);
  const omega = 0.115 * (0.28 / r) ** 1.5;
  const vx = Math.cos(a) * dr - Math.sin(a) * r * omega;
  const vz = Math.sin(a) * dr + Math.cos(a) * r * omega;
  const velocity = [vx, (0.26 * vx + ORBIT.tilt * vz) / ASPECT, vz];
  const view = cameraSpace(point, camera),
    back = dot(velocity, camera.back);
  return Math.atan2(
    dot(velocity, camera.down) * view.depth + view.y * back,
    dot(velocity, camera.right) * view.depth + view.x * back,
  );
}
