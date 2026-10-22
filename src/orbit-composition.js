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
  cameraAt,
  journeyProgress,
  journeyTimeAt,
  orbitRateAt,
  diskY,
} from "./universe-camera.js";
import { crystalBounds, crystalFootprint, crystalFootprintsOverlap, crystalStrength, crystalVeil, crystalContact } from "./crystal-pin.js";
import { crystalSurface } from "./accretion-lens.js";

// The intimate ending favors the near arc. During the middle, the SAME source
// population also remains readable along the optically bent rear arcs.
export function frontArc(point, camera) {
  const facing =
    (camera.cx * point.x + camera.distance * point.depth) / point.radius -
    point.radius;
  return ease((facing - 0.012) / 0.045);
}
export const compositionAt = (zoom) => ease((zoom - 1.15) / 0.5);
export const photoArcVisibility = (point, camera) =>
  mix(frontArc(point, camera), 1, photoFieldAt(camera.progress ?? 0));
export function photoRegion(projected, camera) {
  const u = (projected.x - camera.x) / camera.width;
  const v = (projected.y - camera.y) / camera.height;
  const offset = v - diskY(u);
  return offset < -.045 ? "upper" : offset > .065 ? "lower" : "front";
}
function projectionFrame(camera, width, minimum = 0) {
  const field = photoFieldAt(camera.progress ?? 0);
  const scale = portraitScaleAt(camera.zoom), photoLimit = photoSizeLimit(width);
  return { field, scale, photoLimit, minimum,
    limit: mix(photoLimit * scale, width < 700 ? DISK_PHOTOS.phoneLimit : DISK_PHOTOS.desktopLimit, field),
    heroLimit: width < 700 ? DISK_PHOTOS.phoneHeroLimit : DISK_PHOTOS.desktopHeroLimit };
}

export function focusProjection(point, camera, width, height, frame = projectionFrame(camera, width)) {
  const { field } = frame;
  const grain = (point.seed * 97.13) % 1;
  const front = frontArc(point, camera);
  const diskScale = mix(DISK_PHOTOS.mediumScale, DISK_PHOTOS.scale,
    ease((grain - .66) / .34) * (.45 + .55 * front));
  const hero = grain > .96 ? field * front : 0;
  const worldSize = (0.003 + point.seed * 0.0018) * 1.35 * (1 + 0.8 * (camera.showcase || 0)) *
    mix(1, diskScale, field) * mix(1, DISK_PHOTOS.heroGain, hero);
  // Both optical mappings preserve depth. Reject exactly those photographs
  // that cannot meet the existing size threshold, before lensing/occlusion.
  // Future collision predictions use minimum=0 and keep their full footprint.
  if (frame.minimum) {
    const depth = camera.distance - point.depth;
    if (depth <= .028 || Math.min(frame.photoLimit, worldSize * ((camera.baseWidth * 5) / depth)) * frame.scale < frame.minimum)
      return null;
  }
  const projected = projectOrbit(
    crystalSurface(point, camera, field),
    camera,
    width,
    height,
    worldSize,
    frame.scale,
  );
  if (projected) {
    projected.size = Math.min(projected.size, mix(frame.limit, frame.heroLimit, hero));
    projected.hero = hero > .5;
    projected.crystal = crystalStrength(point, camera);
    projected.contact = crystalContact(projected, camera);
  }
  return projected;
}

function bounds(point, ratio, gap) {
  return crystalFootprint(point, ratio, gap);
}
const overlap = crystalFootprintsOverlap;

// Admit photographs into free space on their ACTUAL orbits. Existing
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
  const exposure = new Map();
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
        exposure.clear();
        previous = now;
        return [];
      }
      const dt = previous
        ? Math.min(0.1, Math.max(0, (now - previous) / 1000))
        : 1;
      previous = now;
      const mobileEnding = width < 700 && camera.progress >= .9;
      const field = photoFieldAt(camera.progress ?? 0);
      // Predict the camera's dolly as well as orbital movement. A static-camera
      // prediction misses cards that converge on screen during the zoom.
      const ahead = .4;
      const futureCamera = field > 0
        ? cameraAt(journeyProgress(journeyTimeAt(camera.progress) + ahead * 1000), width, height)
        : camera;
      const futureTime = time + (field > 0 ? orbitRateAt(camera.progress, width) * ahead : .12);
      const middleCamera = field > 0
        ? cameraAt(journeyProgress(journeyTimeAt(camera.progress) + ahead * 500), width, height)
        : camera;
      const middleTime = time + orbitRateAt(camera.progress, width) * ahead * .5;
      const gap = mix(width < 700 ? (mobileEnding ? 6 : 8) : 15, width < 700 ? 3 : 5, field);
      const limit = Math.round(mix(width < 700 ? (mobileEnding ? 10 : 8) : 16,
        width < 700 ? DISK_PHOTOS.phoneCount : DISK_PHOTOS.desktopCount, field));
      const regionLimits = {
        upper: Math.round(limit * .20 * field),
        lower: Math.round(limit * .18 * field),
      };
      regionLimits.front = limit - regionLimits.upper - regionLimits.lower;
      const records = [];
      const minimum = mix(mix(
        width < 700 ? (mobileEnding ? 28 : 34) : 55,
        width < 700 ? 18 : 24,
        camera.showcase || 0,
      ), width < 700 ? DISK_PHOTOS.phoneMinimum : DISK_PHOTOS.desktopMinimum, field);
      const currentFrame = projectionFrame(camera, width, minimum);
      const futureFrame = projectionFrame(futureCamera, width);
      const middleFrame = projectionFrame(middleCamera, width);
      const unrestrictedFrame = { ...currentFrame, minimum: 0 };
      for (const index of candidates) {
        const point = orbitAt(orbit, index, time);
        const projected = focusProjection(point, camera, width, height, currentFrame);
        if (!projected || projected.size < minimum) continue;
        const existing = active.has(index);
        if (projected.contact < (existing ? .001 : .65)) continue;
        if (!existing && point.opacity < 0.8) continue;
        if (
          !existing &&
          (projected.x < 0 ||
            projected.x > width ||
            projected.y < 0 ||
            projected.y > height)
        )
          continue;
        const front = photoArcVisibility(point, camera);
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
        const halfWidth = projected.size * Math.min(ratio, 1) * .52;
        const halfHeight = projected.size * Math.min(1 / ratio, 1) * .52;
        const frame = projected.crystal > .001 ? crystalBounds(projected, ratio, 0) : {
          left: projected.x-halfWidth, right: projected.x+halfWidth,
          top: projected.y-halfHeight, bottom: projected.y+halfHeight,
        };
        if (
          !existing &&
          (frame.left < 0 || frame.right > width || frame.top < 65 || frame.bottom > height - 24)
        )
          continue;
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
          target: front * quiet * projected.contact,
          id,
          region: projected.crystal > .5 ? "front" : field > 0 ? photoRegion(projected, camera) : "front",
          innerArc: (camera.showcase || 0) > 0.5 && point.radius < 0.24 &&
            (field === 0 || point.depth > 0),
          rect: bounds(projected, ratio, gap),
          ratio,
          priority:
            (active.has(index) ? 1000 : 0) +
            (active.get(index)?.alpha || 0) * 1000 +
            projected.crystal * 300 +
            100 *
              (camera.showcase || 0) *
              (1 - ease(Math.abs(point.radius - 0.14) / 0.06)) +
            portraitPriority * quiet * front +
            field * 24 / (1 + (exposure.get(id) || 0)) +
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
        if (state.alpha <= .12) continue;
        const projected = focusProjection(orbitAt(orbit, index, time), camera, width, height, unrestrictedFrame);
        if (projected) held.push({ index, id: photoIds[index], rect: bounds(projected, ratios[photoIds[index]] || .8, gap) });
      }
      const available = ratios.length || 6;
      const perPhoto = Math.max(1, Math.ceil(limit / available));
      // Reserve identity separately from space. In the intimate ending, a
      // departing portrait owns its source until its dissolve is complete,
      // even after losing its target slot. Keep the dense middle's existing
      // threshold, where near-transparent retiring cards resolve into light.
      const occupiedPhotos = new Set(field > 0
        ? held.map(photo => photo.id)
        : [...active.keys()].map(index => photoIds[index]));
      // Keep a few real inner orbits visible, so the plunge/fade can be seen.
      // The remaining slots retain the wider stream and its sense of depth.
      const innerLimit =
        (camera.showcase || 0) > 0.5 ? (width < 700 ? 2 : 5) : 0;
      let innerCount = 0,
        outerCount = 0;
      const regionCounts = { upper: 0, lower: 0, front: 0 };
      let heroCount = 0, largePinCount = 0;
      for (const record of records) {
        if (selected.length >= limit) break;
        const largePin = record.projected.crystal > .75 && record.projected.size > (width < 700 ? 36 : 76);
        if (largePin && largePinCount >= (width < 700 ? 2 : 7)) continue;
        if (record.projected.hero && heroCount >= (width < 700 ? 5 : 10)) continue;
        if (regionCounts[record.region] >= regionLimits[record.region]) continue;
        if (
          innerLimit &&
          (record.innerArc
            ? innerCount >= innerLimit
            : outerCount >= limit - innerLimit)
        )
          continue;
        if ((usage.get(record.id) || 0) >= perPhoto) continue;
        if (perPhoto === 1 && !active.has(record.index) && occupiedPhotos.has(record.id)) continue;
        if (selected.some(other => overlap(record.rect, other.rect))) continue;
        if (!active.has(record.index) && held.some(other => overlap(record.rect, other.rect)))
          continue;
        // Predict only candidates that still have a free slot NOW. The same
        // three collision samples are retained, but rejected/hidden sources
        // no longer calculate two unused future orbits every frame.
        const future = focusProjection(orbitAt(orbit, record.index, futureTime), futureCamera, width, height, futureFrame) || record.projected;
        const middle = field > 0
          ? focusProjection(orbitAt(orbit, record.index, middleTime), middleCamera, width, height, middleFrame) || record.projected
          : record.projected;
        record.future = bounds(future, record.ratio, gap);
        record.middle = bounds(middle, record.ratio, gap);
        if (selected.some(other => (field > 0 && overlap(record.middle, other.middle)) || overlap(record.future, other.future))) continue;
        selected.push(record);
        if (largePin) largePinCount++;
        if (record.projected.hero) heroCount++;
        regionCounts[record.region]++;
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
          ? .24 : mix(.65, .4, field);
        state.alpha +=
          (target - state.alpha) * (reduced ? 1 : 1 - Math.exp(-dt / response));
        if (state.alpha < 0.005 && !target) {
          active.delete(index);
          continue;
        }
        const point = record?.point || orbitAt(orbit, index, time);
        const projected =
          record?.projected || focusProjection(point, camera, width, height, unrestrictedFrame);
        if (field > 0 && state.alpha * point.opacity > .5)
          exposure.set(photoIds[index], (exposure.get(photoIds[index]) || 0) + dt);
        if (projected)
          result.push({
            index,
            point,
            projected,
            alpha: state.alpha * photoArcVisibility(point, camera) * crystalVeil(projected, camera),
          });
      }
      return result;
    },
  };
}
