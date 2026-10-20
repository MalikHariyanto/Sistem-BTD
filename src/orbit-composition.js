import {
  ease,
  orbitAt,
  orbitDustSize,
  orbitPhotoSize,
  projectOrbit,
  portraitScaleAt,
  mix,
  photoFieldAt,
  photoSizeLimit,
  DISK_PHOTOS,
} from "./universe-camera.js";

// Only the camera-facing arc carries readable portraits in the close-up. The
// opposite arc still belongs to the disk, but resolves as distant photographic
// dust. Fade before the projected tangent reverses direction, never wrap x.
export function frontArc(point, camera) {
  const facing =
    (camera.cx * point.x + camera.distance * point.depth) / point.radius -
    point.radius;
  return ease((facing - 0.012) / 0.045);
}
export const compositionAt = (zoom) => ease((zoom - 1.15) / 0.5);
export function focusProjection(point, camera, width, height) {
  const projected = projectOrbit(
    point,
    camera,
    width,
    height,
    (0.003 + point.seed * 0.0018) * 1.35 * (1 + 0.8 * (camera.showcase || 0)) *
      mix(1, DISK_PHOTOS.scale, photoFieldAt(camera.progress ?? 0)),
    portraitScaleAt(camera.zoom),
  );
  if (projected) {
    const field = photoFieldAt(camera.progress ?? 0);
    const limit = mix(photoSizeLimit(width) * portraitScaleAt(camera.zoom),
      width < 700 ? DISK_PHOTOS.phoneLimit : DISK_PHOTOS.desktopLimit, field);
    projected.size = Math.min(projected.size, limit);
  }
  return projected;
}

function bounds(point, ratio, gap) {
  const w = point.size * Math.min(ratio, 1) * 0.56 + gap;
  const h = point.size * Math.min(1 / ratio, 1) * 0.56 + gap;
  return {
    left: point.x - w,
    right: point.x + w,
    top: point.y - h,
    bottom: point.y + h,
  };
}
const overlap = (a, b) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Admit a few portraits into free space on their ACTUAL orbits. Existing
// portraits have priority; new ones fade in, departing ones fade out. No grid,
// position correction, texture reassignment, or random choice on each frame.
export function createOrbitComposition(orbit) {
  const candidates = [];
  for (let i = 0; i < orbit.length / 4; i++)
    if (
      i % 4 === 0 ||
      orbitPhotoSize(orbit[i * 4 + 3]) > orbitDustSize(orbit[i * 4 + 3])
    )
      candidates.push(i);
  const active = new Map();
  let previous = 0;
  return {
    update({
      camera,
      width,
      height,
      time,
      photoIds,
      ratios,
      now,
      reduced = false,
    }) {
      if (camera.zoom < 1.4) {
        active.clear();
        previous = now;
        return [];
      }
      const dt = previous
        ? Math.min(0.1, Math.max(0, (now - previous) / 1000))
        : 1;
      previous = now;
      const mobileEnding = width < 700 && camera.progress >= .9;
      const field = photoFieldAt(camera.progress ?? 0);
      const gap = mix(width < 700 ? (mobileEnding ? 6 : 8) : 15, width < 700 ? 4 : 7, field);
      const limit = Math.round(mix(width < 700 ? (mobileEnding ? 10 : 8) : 16,
        width < 700 ? DISK_PHOTOS.phoneCount : DISK_PHOTOS.desktopCount, field));
      const records = [];
      for (const index of candidates) {
        const point = orbitAt(orbit, index, time);
        const projected = focusProjection(point, camera, width, height);
        const minimum = mix(mix(
          width < 700 ? (mobileEnding ? 28 : 34) : 55,
          width < 700 ? 18 : 24,
          camera.showcase || 0,
        ), width < 700 ? DISK_PHOTOS.phoneMinimum : DISK_PHOTOS.desktopMinimum, field);
        if (!projected || projected.size < minimum) continue;
        const existing = active.has(index);
        if (!existing && point.opacity < 0.8) continue;
        if (
          !existing &&
          (projected.x < 0 ||
            projected.x > width ||
            projected.y < 0 ||
            projected.y > height)
        )
          continue;
        const front = frontArc(point, camera);
        if (front < (existing ? 0.01 : 0.5)) continue;
        // Keep breathing room around the greeting without moving any orbits.
        const radius = Math.hypot(
          (projected.x / width - 0.5) / 0.42,
          (projected.y / height - 0.45) / 0.24,
        );
        const quiet = mix(
          1,
          ease((radius - 0.8) / 0.45),
          ease((camera.zoom - 18) / 20),
        );
        if (quiet < (existing ? 0.01 : 0.5)) continue;
        const id = photoIds[index],
          ratio = ratios[id] || 0.8;
        const halfWidth = projected.size * Math.min(ratio, 1) * 0.52;
        const halfHeight = projected.size * Math.min(1 / ratio, 1) * 0.52;
        if (
          !existing &&
          (projected.x - halfWidth < 0 ||
            projected.x + halfWidth > width ||
            projected.y - halfHeight < 65 ||
            projected.y + halfHeight > height - 24)
        )
          continue;
        const future =
          focusProjection(
            orbitAt(orbit, index, time + mix(0.12, 0.6, field)),
            camera,
            width,
            height,
          ) || projected;
        // Tall phones have room for more medium portraits around the greeting.
        // Existing portraits keep priority and their original size.
        const preferred = width * .25;
        const portraitPriority = mobileEnding && height >= width * 2
          ? Math.min(projected.size, preferred) - Math.max(0, projected.size - preferred) * .8
          : projected.size;
        records.push({
          index,
          point,
          projected,
          target: front * quiet,
          id,
          innerArc: (camera.showcase || 0) > 0.5 && point.radius < 0.24,
          rect: bounds(projected, ratio, gap),
          future: bounds(future, ratio, gap),
          priority:
            (active.has(index) ? 1000 : 0) +
            (active.get(index)?.alpha || 0) * 1000 +
            100 *
              (camera.showcase || 0) *
              (1 - ease(Math.abs(point.radius - 0.14) / 0.06)) +
            portraitPriority * quiet * front +
            point.seed * 10,
        });
      }
      records.sort((a, b) => b.priority - a.priority);
      const selected = [],
        usage = new Map();
      // A retiring card still owns its space until its dissolve is almost
      // complete. Do not fill that space with a second translucent photograph.
      const held = [];
      if (field > 0) for (const [index, state] of active) {
        if (state.alpha <= .08) continue;
        const projected = focusProjection(orbitAt(orbit, index, time), camera, width, height);
        if (projected) held.push({ index, id: photoIds[index], rect: bounds(projected, ratios[photoIds[index]] || .8, gap) });
      }
      const available = ratios.length || 6;
      const perPhoto = Math.max(1, Math.ceil(limit / available));
      // Keep a few real inner orbits visible, so the plunge/fade can be seen.
      // The remaining slots retain the wider stream and its sense of depth.
      const innerLimit =
        (camera.showcase || 0) > 0.5 ? (width < 700 ? 2 : 5) : 0;
      let innerCount = 0,
        outerCount = 0;
      for (const record of records) {
        if (selected.length >= limit) break;
        if (
          innerLimit &&
          (record.innerArc
            ? innerCount >= innerLimit
            : outerCount >= limit - innerLimit)
        )
          continue;
        if ((usage.get(record.id) || 0) >= perPhoto) continue;
        if (
          selected.some(
            (other) =>
              overlap(record.rect, other.rect) ||
              overlap(record.future, other.future),
          )
        )
          continue;
        if (!active.has(record.index) && held.some(other =>
          overlap(record.rect, other.rect) || (available >= limit && record.id === other.id)))
          continue;
        selected.push(record);
        if (record.innerArc) innerCount++;
        else outerCount++;
        usage.set(record.id, (usage.get(record.id) || 0) + 1);
      }
      const targets = new Map(selected.map((record) => [record.index, record]));
      for (const record of selected)
        if (!active.has(record.index)) active.set(record.index, { alpha: 0 });
      const result = [];
      for (const [index, state] of active) {
        const record = targets.get(index);
        const target = record?.target || 0;
        // Keep departures short through the tail of the middle dissolve, so
        // retiring cards clear the space before the ending portraits grow.
        const response = target < state.alpha && field > 0
          ? .24 : mix(.65, .55, field);
        state.alpha +=
          (target - state.alpha) * (reduced ? 1 : 1 - Math.exp(-dt / response));
        if (state.alpha < 0.005 && !target) {
          active.delete(index);
          continue;
        }
        const point = record?.point || orbitAt(orbit, index, time);
        const projected =
          record?.projected || focusProjection(point, camera, width, height);
        if (projected)
          result.push({
            index,
            point,
            projected,
            alpha: state.alpha * frontArc(point, camera),
          });
      }
      return result;
    },
  };
}
