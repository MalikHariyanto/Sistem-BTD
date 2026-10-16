export const JOURNEY_MS = 7600;
export const DISK = {
  slope: 0.26,
  intercept: 0.35,
  halfWidth: 0.105,
  columns: 144,
};

export const clamp = (n) => Math.max(0, Math.min(1, n));
// Zero velocity and acceleration at both ends, shared by camera and material.
export const ease = (n) => {
  const x = clamp(n);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export const mix = (a, b, t) => a + (b - a) * t;
export const diskY = (u) => DISK.intercept + DISK.slope * u;

// Every photograph stays on this same disk plane throughout the move.
export function cameraAt(progress, width, height, aspect = 1672 / 941) {
  const p = clamp(progress),
    travel = ease(p),
    mobile = width < 700;
  const baseWidth = mobile
    ? Math.max(width * 1.9, height * 0.82)
    : Math.max(Math.min(width * 1.06, height * 1.7), height * 0.95);
  const zoom = Math.exp(Math.log(16) * travel);
  const focus = ease(p / 0.85);
  const u = mix(0.5, 0.68, focus),
    v = mix(0.47, diskY(0.68), focus);
  const imageWidth = baseWidth * zoom,
    imageHeight = imageWidth / aspect;
  return {
    zoom,
    x: width * 0.5 - u * imageWidth,
    y:
      mix(height * (mobile ? 0.32 : 0.38), height * 0.5, travel) -
      v * imageHeight,
    width: imageWidth,
    height: imageHeight,
    // Nothing that resembles a photograph is visible from the distant view.
    photoMix: ease((zoom - 3.2) / 6.8),
    shade: 0.05 + 0.48 * ease((p - 0.68) / 0.32),
  };
}
