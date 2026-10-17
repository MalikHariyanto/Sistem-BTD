import { ORBIT_SPEED, ease } from "./universe-camera.js";

// Material coordinates follow the inclined front disk, not the optical halo.
// Their velocity matches a photo at the reference radius (dx/dt = -r * omega).
export const DISK_STREAM = {
  speed: 0.28 * ORBIT_SPEED,
  period: 0.92,
  origin: 0.04,
  feather: 0.04,
  minD: -0.13,
  maxD: 0.17,
};

// Advect the ORIGINAL disk, including its bright rim and dark material. At
// time zero its coordinates match the reference across the entire central
// view. Only the far image edges join; no central crop replaces the original.
export function createDiskStream(plate) {
  const { period, origin, feather, minD, maxD, speed } = DISK_STREAM;
  const makeCanvas = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    return canvas;
  };
  function material(source, detail = false) {
    const width = Math.round(1672 * period), height = Math.round(941 * (maxD - minD));
    const primary = makeCanvas(width, height), secondary = makeCanvas(width, height);
    for (const [canvas, offset, inverse] of [[primary, -origin, false], [secondary, period - origin, true]]) {
      const c = canvas.getContext("2d");
      c.setTransform(1, -0.26 * 941 / 1672, 0, 1, offset * 1672, -(0.35 + minD) * 941);
      if (detail) c.drawImage(source, 0.513 * 1672, 0.360 * 941, 1672 / 3, 941 / 3);
      else c.drawImage(source, 0, 0, 1672, 941);
      c.resetTransform();
      const gradient = c.createLinearGradient(width - feather * 1672, 0, width, 0);
      gradient.addColorStop(0, inverse ? "#0000" : "#000");
      gradient.addColorStop(1, inverse ? "#000" : "#0000");
      c.globalCompositeOperation = "destination-in";
      c.fillStyle = gradient; c.fillRect(0, 0, width, height);
    }
    const c = primary.getContext("2d");
    c.globalCompositeOperation = "lighter";
    c.drawImage(secondary, 0, 0);
    return primary;
  }
  const wide = material(plate);
  let detail;
  const mask = makeCanvas(836, 470), frame = makeCanvas(836, 470), coreMatte = makeCanvas(836, 470);
  const m = mask.getContext("2d", { willReadFrequently: true });
  m.drawImage(plate, 0, 0, mask.width, mask.height);
  const pixels = m.getImageData(0, 0, mask.width, mask.height);
  const corePixels = new ImageData(new Uint8ClampedArray(pixels.data), mask.width, mask.height);
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
    const i = (y * mask.width + x) * 4;
    const d = y / mask.height - 0.35 - 0.26 * x / mask.width;
    const light = (pixels.data[i] * 0.2126 + pixels.data[i + 1] * 0.7152 + pixels.data[i + 2] * 0.0722) / 255;
    const u = x / mask.width, v = y / mask.height;
    const core = 1 - ease((Math.hypot((u - 0.5) / 0.11, (v - 0.445) / 0.21) - 1.1) / 0.2);
    const shadow = core * (1 - ease((light - 0.125) / 0.125)) * (1 - ease((d + 0.045) / 0.027));
    corePixels.data[i + 3] = 255 * shadow;
    // Opaque material coverage, not a luminance-gated overlay. Dark grains
    // move too; the sole stationary exception is the actual core behind it.
    pixels.data[i + 3] = 255 * ease((d + 0.13) / 0.03) *
      (1 - ease((d - 0.105) / 0.05)) * (1 - shadow);
  }
  m.putImageData(pixels, 0, 0);
  coreMatte.getContext("2d").putImageData(corePixels, 0, 0);
  const c = frame.getContext("2d");
  return {
    setDetail(image) { detail = material(image, true); },
    draw(target, camera, time, detailMix, radiance) {
      c.clearRect(0, 0, frame.width, frame.height);
      c.save();
      c.setTransform(frame.width, 0.26 * frame.height, 0, frame.height, 0, 0.35 * frame.height);
      const shift = (time * speed) % period;
      for (const [image, alpha] of [[wide, 1], [detail, detailMix]]) {
        if (!image || !alpha) continue;
        c.globalAlpha = alpha;
        for (let tile = -1; tile <= 2; tile++)
          c.drawImage(image, origin + tile * period - shift, minD, period, maxD - minD);
      }
      c.restore();
      c.globalCompositeOperation = "destination-in";
      c.drawImage(mask, 0, 0);
      c.globalCompositeOperation = "source-over";
      target.save();
      target.globalAlpha = radiance;
      target.drawImage(frame, camera.x, camera.y, camera.width, camera.height);
      // Shade the core in this same small scratch surface. Applying a filter
      // to its vastly enlarged close-up would needlessly expand filter work.
      c.clearRect(0, 0, frame.width, frame.height);
      c.drawImage(coreMatte, 0, 0);
      c.globalCompositeOperation = "source-atop";
      c.fillStyle = `rgba(0,0,0,${1 - radiance})`;
      c.fillRect(0, 0, frame.width, frame.height);
      c.globalCompositeOperation = "source-over";
      target.globalAlpha = 1;
      target.drawImage(frame, camera.x, camera.y, camera.width, camera.height);
      target.restore();
    },
  };
}
