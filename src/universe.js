import {
  cameraAt,
  photoDepthAt,
  JOURNEY_MS,
  journeyProgress,
  photoShowcaseAt,
  photoFieldAt,
  orbitRateAt,
  DISK,
  PARTICLE_COUNT,
  ORBIT_SPEED,
  createOrbit,
  orbitAt,
  orbitTangent,
  horizonOutline,
  HORIZON,
  projectOrbit,
  orbitDustSize,
  orbitPhotoSize,
  clamp,
  ease,
} from "./universe-camera.js";

import { createOrbitComposition, compositionAt } from "./orbit-composition.js";
import { assignOrbitPhotos } from "./photo-textures.js";
import { createUniverseGPU } from "./universe-gpu.js";
import { createDiskStream } from "./disk-stream.js";
import { createSpaceBackdrop } from "./space-background.js";
import { sharpenPortrait, PORTRAIT_CAPACITY } from "./portrait-textures.js";
import { photoSurfaceAt } from "./photo-surface.js";
import { paintCrystalPin } from "./crystal-pin.js";

const PLATE_URL = `${import.meta.env.BASE_URL}art/gargantua.webp`;

// A photographic gravitational lens and a physical annulus of photo particles.
// The flight approaches the very same orbits visible from the first frame.
export function createUniverse(canvas) {
  const gpu = createUniverseGPU(canvas);
  if (!gpu) {
    const fallback = canvas.cloneNode(false);
    canvas.replaceWith(fallback);
    canvas = fallback;
  }
  const ctx = gpu ? null : canvas.getContext("2d", { alpha: false });
  canvas.dataset.renderer = gpu ? "webgl" : "canvas2d";
  if (!ctx && !gpu)
    return {
      ready: Promise.resolve(false),
      travel: async () => {},
      settle: () => {},
      prepare: () => {},
      reset: () => {},
      setPaused: () => {},
    };
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0,
    height = 0,
    dpr = 1,
    progress = 0,
    visible = true,
    suspended = false,
    frame = 0,
    last = 0;
  let immersion = 0, immersionStarted;
  let flowSeconds = 0,
    lastSimulationFrame = 0;
  let traveling = false,
    started = 0,
    duration = JOURNEY_MS,
    finish;
  let detailPlate,
    detailArrived = 0;
  let plate,
    spaceBackdrop,
    lightField,
    lowerMask,
    lowerFrame,
    diskStream,
    images = [],
    generation = 0,
    signature;
  const thumbnails = new Map();
  const portraitDetails = new Map();
  function portraitDetail(source) {
    let image = portraitDetails.get(source);
    if (!image) image = sharpenPortrait(source);
    portraitDetails.delete(source);
    portraitDetails.set(source, image);
    if (portraitDetails.size > PORTRAIT_CAPACITY)
      portraitDetails.delete(portraitDetails.keys().next().value);
    return image;
  }
  let photosReady = Promise.resolve();
  const aspect = 1672 / 941;
  const orbit = createOrbit(gpu ? PARTICLE_COUNT : 8192);
  let photoIds = new Float32Array(orbit.length / 4);
  const composition = createOrbitComposition(orbit);

  function visibleEstimate(camera) {
    let visible = 0;
    for (let i = 0; i < orbit.length / 4; i += 64)
      if (projectOrbit(orbitAt(orbit, i, flowSeconds), camera, width, height))
        visible++;
    return visible * 64;
  }
  function drawMaterial(camera) {
    const points = [];
    const shadow = horizonOutline(camera);
    const shadowMask = new Path2D();
    shadowMask.rect(-1, -1, width + 2, height + 2);
    shadow.forEach(([sx, sy], i) =>
      i ? shadowMask.lineTo(sx, sy) : shadowMask.moveTo(sx, sy),
    );
    shadowMask.closePath();
    const rearDepth = camera.distance - HORIZON.z - HORIZON.radius;
    const blend = compositionAt(camera.zoom);
    const showcase = photoShowcaseAt(progress);
    const field = photoFieldAt(progress);
    for (let i = 0; i < orbit.length / 4; i++) {
      const point = orbitAt(orbit, i, flowSeconds);
      const projected = projectOrbit(point, camera, width, height);
      if (projected)
        points.push({ ...point, ...projected, source: point, index: i, photoId: photoIds[i] });
    }
    points.sort((a, b) => b.depth - a.depth);
    function paint(point, opacity = 1, maskRear = true, isPhoto = true, focused = false) {
      const { x, y, seed, depth } = point;
      const sourcePoint = point.source || point;
      const middle = focused ? field : 0;
      const atmosphere = isPhoto ? photoDepthAt(sourcePoint, camera, middle) : { opacity: 1, brightness: 1, detail: 1, scale: 1 };
      const size = point.size * atmosphere.scale;
      const diskClarity = focused ? field * ease((size - 12) / 18) *
        (1 - ease((depth / camera.distance - 0.98) / 0.36)) *
        ease((sourcePoint.radius - 0.108) / 0.082) : 0;
      const nearClarity = focused ? Math.max(ease((size - 32) / 96) * atmosphere.detail, .9 * diskClarity) : 0;
      const readable = ease((size - 2) / (26 - 16 * showcase)) * atmosphere.detail * (isPhoto ? 1 : 1 - field);
      const coupled = lightField ? 1 - ease((Math.abs(camera.cx) / camera.distance - 0.07) / 0.18) : 0;
      const u = clamp((x - camera.x) / camera.width), v = clamp((y - camera.y) / camera.height);
      const light = lightField?.[Math.min(71, Math.floor(v * 72)) * 128 + Math.min(127, Math.floor(u * 128))] || 0;
      const lightFloor = 0.24 + 0.34 * middle + 0.22 * nearClarity + 0.16 * diskClarity;
      const localLight = 1 - coupled + coupled * (lightFloor + (1 - lightFloor) * ease((light - 0.025) / 0.525));
      ctx.save();
      if (maskRear && depth >= rearDepth) ctx.clip(shadowMask, "evenodd");
      ctx.translate(x, y);
      const tangent = orbitTangent(sourcePoint, camera);
      const surface = focused && field > 0 ? photoSurfaceAt(sourcePoint, flowSeconds, field,
        images[point.photoId] ? images[point.photoId].width / images[point.photoId].height : .8) : null;
      const photoAlpha = opacity * atmosphere.opacity * localLight * point.opacity *
        (0.38 + readable * 0.6) * ease((depth - 0.028) / 0.047);
      if (surface && point.crystal > .001) {
        ctx.globalAlpha = photoAlpha;
        const source = images[point.photoId], ratio = source ? source.width / source.height : .8;
        const image = source && nearClarity > .4 ? portraitDetail(source) : source;
        // The renderer has already translated to the orbital anchor. Project
        // the jewel's facets and image above it; the tip stays on that anchor.
        paintCrystalPin(ctx, image, { ...point, size }, ratio, surface, point.crystal, light);
        ctx.restore();
        return;
      }
      if (surface) {
        ctx.rotate(surface.roll);
        ctx.scale(surface.fit, surface.fit);
        // Canvas keeps an inexpensive affine projection of the same paper
        // normal. No image filters, mesh allocations or pixel reads per frame.
        ctx.transform(Math.cos(surface.yaw), 0,
          Math.sin(surface.yaw) * Math.sin(surface.pitch), Math.cos(surface.pitch), 0, 0);
      } else ctx.rotate(tangent * (1 - readable) + (seed - 0.5) * 0.18 * readable);
      ctx.globalAlpha = photoAlpha;
      const integration = Math.max(field * 0.12, coupled * 0.65) * (1 - 0.55 * middle) * (1 - 0.45 * nearClarity) * (1 - 0.35 * diskClarity);
      if (!isPhoto) ctx.globalAlpha *= 1 - .25 * field;
      const source = images[point.photoId];
      // The decoded source is already ample for the small middle cards. Keep
      // unsharp processing cached for the few large ending portraits only.
      const image = source && nearClarity > .05 && field < .01 ? portraitDetail(source) : source;
      const ratio = source ? source.width / source.height : 0.8;
      const cardWidth = size * Math.min(ratio, 1);
      const cardHeight =
        size *
        Math.min(1 / ratio, 1) *
        (0.28 + 0.72 * ease((size - 1.5) / 10.5));
      if (surface && readable > .6) {
        ctx.fillStyle = "#392419";
        ctx.fillRect(-cardWidth / 2 + .7, -cardHeight / 2 + .9, cardWidth, cardHeight);
      }
      if (image && readable > 0.01) {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          image,
          -cardWidth / 2,
          -cardHeight / 2,
          cardWidth,
          cardHeight,
        );
        ctx.fillStyle = `rgba(227,161,77,${(1 - readable) * 0.85 + integration * 0.16})`;
        ctx.fillRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
        if (atmosphere.brightness < 1) {
          ctx.fillStyle = `rgba(0,0,0,${1 - atmosphere.brightness})`;
          ctx.fillRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
        }
        if (surface && surface.light < 1) {
          ctx.fillStyle = `rgba(0,0,0,${1 - surface.light})`;
          ctx.fillRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
        }
      } else {
        ctx.fillStyle = readable > 0.1 ? "#b8a68e" : "#f4c58e";
        ctx.fillRect(
          -cardWidth / 2,
          -cardHeight / 2,
          Math.max(0.8, cardWidth),
          Math.max(0.8, cardHeight),
        );
      }
      if (readable > 0.65) {
        ctx.strokeStyle = field > .5 ? "#cbb28b55" : "#e7dcc9";
        ctx.lineWidth = Math.max(0.5, size * 0.009);
        ctx.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
        if (surface) {
          ctx.strokeStyle = `rgba(240,204,150,${.18 + .15 * Math.max(0, -surface.normal[0] - surface.normal[1])})`;
          ctx.lineWidth = .7;
          ctx.beginPath();
          ctx.moveTo(-cardWidth / 2, cardHeight / 2);
          ctx.lineTo(-cardWidth / 2, -cardHeight / 2);
          ctx.lineTo(cardWidth / 2, -cardHeight / 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // Depth-sorted dust behind the horizon shares a single clip. Rebuilding
    // thousands of clipping regions per frame stalls software Canvas devices.
    let rearClipped = true;
    ctx.save();
    ctx.clip(shadowMask, "evenodd");
    for (const point of points) {
      if (rearClipped && point.depth < rearDepth) {
        ctx.restore();
        rearClipped = false;
      }
      const dust = projectOrbit(
        orbitAt(orbit, point.index, flowSeconds),
        camera,
        width,
        height,
        orbitDustSize(point.seed),
      );
      if (dust) paint({ ...point, ...dust }, 1 - 0.4 * blend, false, false);
      if (blend < 1 && orbitPhotoSize(point.seed) > orbitDustSize(point.seed))
        paint(point, 1 - blend, false);
    }
    if (rearClipped) ctx.restore();
    const focused = composition.update({
      camera,
      width,
      height,
      time: flowSeconds,
      photoIds,
      ratios: images.map((image) => image.width / image.height),
      now: performance.now(),
      reduced: motion.matches,
    });
    for (const { index, point, projected, alpha } of focused)
      paint(
        { ...point, ...projected, source: point, photoId: photoIds[index] },
        alpha * blend,
        true, true, true,
      );
    canvas.dataset.diskPhotos = String(field > .5 ? focused.filter(p => p.alpha * p.point.opacity > .5).length : 0);
    canvas.dataset.filaments = String(orbit.length / 4);
    canvas.dataset.crystalPins = String(focused.filter(p => p.projected.crystal > .75 && p.alpha * p.point.opacity > .45).length);
    canvas.dataset.focusPhotos = String(
      focused.filter((p) => p.alpha * p.point.opacity > 0.5).length,
    );
    return points.length;
  }

  function draw() {
    if (!width || !height || suspended || !visible || document.hidden) return;
    const camera = cameraAt(progress, width, height, aspect, immersion);
    const detailMix = detailPlate
      ? ease((camera.zoom - 2.8) / 3.2) *
        ease((performance.now() - detailArrived) / 600)
      : 0;
    if (gpu) {
      gpu.draw({
        camera,
        width,
        height,
        time: flowSeconds,
        detail: detailMix,
        cover: (1 - ease(progress / 0.18)) * (1 - immersion),
        reduced: motion.matches,
        showcase: photoShowcaseAt(progress),
      });
      report(camera, visibleEstimate(camera), detailMix);
      return;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#08090b";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const radiance =
      (1 - 0.9 * ease((camera.zoom - 4) / 14)) *
      (1 - 0.25 * photoShowcaseAt(progress));
    ctx.globalAlpha = radiance;
    if (spaceBackdrop) spaceBackdrop.draw(ctx, camera, width, height);
    // A separately reconstructed close-up resolves the disk filaments before
    // photographs emerge, rather than enlarging one small bitmap all the way.
    if (detailMix > 0) {
      ctx.globalAlpha = detailMix * radiance;
      ctx.drawImage(
        detailPlate,
        camera.x + camera.width * 0.513,
        camera.y + camera.height * 0.36,
        camera.width / 3,
        camera.height / 3,
      );
      ctx.globalAlpha = 1;
    }
    if (!motion.matches && plate) {
      ctx.save();
      ctx.globalAlpha = 0.28 * (1 - camera.photoMix) * radiance;
      ctx.translate(
        camera.x + camera.width * 0.5,
        camera.y + camera.height * 0.445,
      );
      ctx.scale(camera.width * 0.17, camera.height * 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, 1.3, 0, Math.PI * 2);
      ctx.arc(0, 0, 0.72, 0, Math.PI * 2, true);
      ctx.clip("evenodd");
      ctx.beginPath();
      ctx.rect(-4, -4, 8, 4.15);
      ctx.clip();
      ctx.rotate(flowSeconds * ORBIT_SPEED);
      ctx.drawImage(plate, -0.5 / 0.17, -0.445 / 0.3, 1 / 0.17, 1 / 0.3);
      ctx.restore();
    }
    if (lowerFrame && !motion.matches) {
      const lower = lowerFrame.getContext("2d");
      lower.clearRect(0, 0, lowerFrame.width, lowerFrame.height);
      lower.save();
      lower.translate(lowerFrame.width * 0.5, lowerFrame.height * 0.445);
      lower.scale(lowerFrame.width * 0.17, lowerFrame.height * 0.30);
      // Same clockwise source motion as the GPU's lower optical arc. The
      // lightweight fallback uses its representative radius for this image.
      lower.rotate(flowSeconds * ORBIT_SPEED * (0.28 / 0.44) ** 1.5);
      lower.drawImage(plate, -0.5 / 0.17, -0.445 / 0.30, 1 / 0.17, 1 / 0.30);
      if (detailMix > 0) {
        lower.globalAlpha = detailMix;
        lower.drawImage(detailPlate, (0.513 - 0.5) / 0.17, (0.360 - 0.445) / 0.30, 1 / (3 * 0.17), 1 / (3 * 0.30));
      }
      lower.restore();
      lower.globalCompositeOperation = "destination-in";
      lower.drawImage(lowerMask, 0, 0);
      lower.globalCompositeOperation = "source-over";
      ctx.globalAlpha = radiance;
      ctx.drawImage(lowerFrame, camera.x, camera.y, camera.width, camera.height);
    }
    if (diskStream && !motion.matches)
      diskStream.draw(ctx, camera, flowSeconds, detailMix, radiance);
    const drawn = drawMaterial(camera);
    // Only subtle edge falloff during the move. Text contrast is added after
    // approaching the photographs, never as a flash that hides the transition.
    ctx.globalAlpha = 1;
    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      Math.min(width, height) * 0.12,
      width * 0.5,
      height * 0.45,
      Math.max(width, height) * 0.83,
    );
    vignette.addColorStop(0, `rgba(8,9,11,${camera.shade * 0.65})`);
    vignette.addColorStop(0.65, `rgba(8,9,11,${camera.shade})`);
    vignette.addColorStop(
      1,
      `rgba(8,9,11,${Math.min(0.84, camera.shade + 0.24)})`,
    );
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    // A soft fade belongs to the distant cover only, so the greeting remains
    // readable without putting text in front of the zoomed accretion disk.
    const cover = (1 - ease(progress / 0.18)) * (1 - immersion);
    if (cover > 0) {
      ctx.globalAlpha = cover;
      const bottom = ctx.createLinearGradient(0, height * 0.44, 0, height);
      bottom.addColorStop(0, "#100f0e00");
      bottom.addColorStop(0.55, "#100f0ec0");
      bottom.addColorStop(1, "#100f0e");
      ctx.fillStyle = bottom;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
    report(camera, drawn, detailMix);
  }
  function report(camera, drawn, detailMix) {
    canvas.dataset.fragments = String(orbit.length / 4);
    canvas.dataset.visiblePhotos = String(drawn);
    canvas.dataset.visibilityCount = gpu ? "sampled-estimate" : "exact";
    canvas.dataset.photoMix = camera.photoMix.toFixed(4);
    canvas.dataset.zoom = camera.zoom.toFixed(4);
    canvas.dataset.detailMix = detailMix.toFixed(4);
    canvas.dataset.progress = progress.toFixed(4);
    canvas.dataset.photoShowcase = photoShowcaseAt(progress).toFixed(4);
    canvas.dataset.photoField = photoFieldAt(progress).toFixed(4);
    canvas.dataset.flow = flowSeconds.toFixed(4);
    canvas.dataset.immersion = immersion.toFixed(4);
    canvas.dataset.framingY = (camera.centerY / height).toFixed(4);
  }

  function fallbackPlate() {
    const c = document.createElement("canvas");
    c.width = 1672;
    c.height = 941;
    const p = c.getContext("2d");
    p.fillStyle = "#08090b";
    p.fillRect(0, 0, c.width, c.height);
    const glow = p.createRadialGradient(836, 430, 140, 836, 430, 390);
    glow.addColorStop(0, "#f3d4a645");
    glow.addColorStop(0.3, "#b77d3830");
    glow.addColorStop(1, "#08090b00");
    p.fillStyle = glow;
    p.fillRect(0, 0, c.width, c.height);
    p.strokeStyle = "#d9b179";
    p.lineWidth = 1.5;
    p.beginPath();
    p.ellipse(836, 430, 154, 168, 0, 0, Math.PI * 2);
    p.stroke();
    p.fillStyle = "#08090b";
    p.beginPath();
    p.ellipse(836, 430, 150, 164, 0, 0, Math.PI * 2);
    p.fill();
    p.save();
    p.translate(0, DISK.intercept * c.height);
    p.transform(1, (DISK.slope * c.height) / c.width, 0, 1, 0, 0);
    const disk = p.createLinearGradient(0, -24, 0, 72);
    disk.addColorStop(0, "#77523700");
    disk.addColorStop(0.35, "#e5b875");
    disk.addColorStop(0.48, "#fff0cf");
    disk.addColorStop(0.65, "#85552d");
    disk.addColorStop(1, "#77523700");
    p.fillStyle = disk;
    p.fillRect(0, -24, c.width, 96);
    p.restore();
    return c;
  }

  const ready = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "high";
    let done = false;
    const complete = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      plate = ok ? image : fallbackPlate();
      gpu?.setPlate(plate);
      if (!gpu) {
        spaceBackdrop = createSpaceBackdrop(plate);
        diskStream = createDiskStream(plate);
        // Read a tiny irradiance map once, never the full image every frame.
        const sample = document.createElement("canvas");
        sample.width = 128; sample.height = 72;
        const context = sample.getContext("2d", { willReadFrequently: true });
        context.drawImage(plate, 0, 0, 128, 72);
        const pixels = context.getImageData(0, 0, 128, 72).data;
        lightField = Float32Array.from({ length: 128 * 72 }, (_, i) =>
          (pixels[i * 4] * 0.2126 + pixels[i * 4 + 1] * 0.7152 + pixels[i * 4 + 2] * 0.0722) / 255);
        // Cache a luminance-gated lower arc mask once, keeping both the black
        // center and the star field untouched by the moving light image.
        lowerMask = document.createElement("canvas");
        lowerMask.width = 836; lowerMask.height = 470;
        const mask = lowerMask.getContext("2d", { willReadFrequently: true });
        mask.drawImage(plate, 0, 0, lowerMask.width, lowerMask.height);
        const field = mask.getImageData(0, 0, lowerMask.width, lowerMask.height);
        for (let y = 0; y < lowerMask.height; y++) for (let x = 0; x < lowerMask.width; x++) {
          const u = x / lowerMask.width, v = y / lowerMask.height;
          const i = (y * lowerMask.width + x) * 4;
          const radius = Math.hypot((u - 0.5) / 0.17, (v - 0.445) / 0.30);
          const light = (field.data[i] * 0.2126 + field.data[i + 1] * 0.7152 + field.data[i + 2] * 0.0722) / 255;
          field.data[i + 3] = 255 * 0.82 * ease((radius - 0.58) / 0.24) *
            (1 - ease((radius - 1.35) / 0.40)) * ease((v - 0.35 - 0.26 * u - 0.025) / 0.075) * ease((light - 0.018) / 0.182);
        }
        mask.putImageData(field, 0, 0);
        lowerFrame = document.createElement("canvas");
        lowerFrame.width = lowerMask.width; lowerFrame.height = lowerMask.height;
      }
      canvas.dataset.plate = ok ? "ready" : "fallback";
      canvas.dataset.plateWidth = String(plate.width);
      draw();
      resolve(ok);
    };
    const timeout = setTimeout(() => complete(false), 7000);
    image.onload = () => complete(true);
    image.onerror = () => complete(false);
    image.src = PLATE_URL;
  });
  const detailImage = new Image();
  detailImage.decoding = "async";
  detailImage.fetchPriority = "low";
  detailImage.onload = () => {
    // Feather the detail plate into its parent UV crop. Missing or slow detail
    // never blocks the story, and a late response fades in instead of popping.
    const c = document.createElement("canvas");
    c.width = detailImage.width;
    c.height = detailImage.height;
    const p = c.getContext("2d");
    p.drawImage(detailImage, 0, 0);
    p.globalCompositeOperation = "destination-in";
    for (const vertical of [false, true]) {
      const g = p.createLinearGradient(
        0,
        0,
        vertical ? 0 : c.width,
        vertical ? c.height : 0,
      );
      g.addColorStop(0, "#0000");
      g.addColorStop(0.07, "#000");
      g.addColorStop(0.93, "#000");
      g.addColorStop(1, "#0000");
      p.fillStyle = g;
      p.fillRect(0, 0, c.width, c.height);
    }
    detailPlate = c;
    gpu?.setDetail(c);
    diskStream?.setDetail(c);
    detailArrived = performance.now();
    canvas.dataset.detail = "ready";
    draw();
  };
  detailImage.onerror = () => {
    canvas.dataset.detail = "unavailable";
  };
  ready.then(() => {
    detailImage.src = `${import.meta.env.BASE_URL}art/gargantua-detail.webp`;
  });

  function shouldAnimate() {
    return !suspended && (traveling || !motion.matches || (immersionStarted !== undefined && immersion < 1));
  }
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden || !shouldAnimate()) return;
    const interval = 1000 / (gpu ? 30 : 24);
    if (now - last >= interval) {
      // Carry fractional frame time instead of dropping to 20 fps on 60 Hz.
      last = now - ((now - last) % interval);
      const dt = lastSimulationFrame
        ? Math.min((now - lastSimulationFrame) / 1000, 0.1)
        : 0;
      lastSimulationFrame = now;
      if (immersionStarted !== undefined)
        immersion = motion.matches ? 1 : ease((now - immersionStarted) / 1000);
      if (traveling)
        progress = motion.matches
          ? clamp((now - started) / duration)
          : journeyProgress(now - started);
      if (!motion.matches) flowSeconds += dt * orbitRateAt(progress, width);
      draw();
      if (traveling && progress >= 1) {
        traveling = false;
        const resolve = finish;
        finish = undefined;
        resolve?.();
      }
    }
    if (shouldAnimate()) frame = requestAnimationFrame(tick);
  }
  function resume() {
    if (shouldAnimate() && visible && !document.hidden && !frame) {
      lastSimulationFrame = 0;
      frame = requestAnimationFrame(tick);
    } else draw();
  }
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    // Retina drawing with a pixel budget, rather than the old fixed 1100px field.
    dpr = Math.min(devicePixelRatio || 1, 2, 3840 / width, 2160 / height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
    resume();
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) resume();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
      lastSimulationFrame = 0;
    }
  }).observe(canvas);
  let hiddenAt;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = performance.now();
      cancelAnimationFrame(frame);
      frame = 0;
      lastSimulationFrame = 0;
    } else {
      if (traveling && hiddenAt !== undefined)
        started += performance.now() - hiddenAt;
      hiddenAt = undefined;
      resume();
    }
  });
  motion.addEventListener("change", () => {
    if (motion.matches && traveling) {
      progress = 1;
      traveling = false;
      finish?.();
      finish = undefined;
    }
    cancelAnimationFrame(frame);
    frame = 0;
    lastSimulationFrame = 0;
    draw();
    resume();
  });

  function loadThumbnail(src) {
    if (thumbnails.has(src)) return Promise.resolve(thumbnails.get(src));
    return new Promise((resolve) => {
      const im = new Image();
      const finish = (image) => {
        im.onload = im.onerror = null;
        im.src = "";
        resolve(image);
      };
      im.onload = () => {
        try {
          if (!im.naturalWidth || !im.naturalHeight) throw Error("Empty photo");
          const thumb = document.createElement("canvas");
          // Preserve the whole image and its original orientation. The atlas may
          // pack rectangles uniformly, but each sprite restores this aspect ratio.
          const scale = Math.min(1, 320 / Math.max(im.width, im.height));
          thumb.width = Math.max(1, Math.round(im.width * scale));
          thumb.height = Math.max(1, Math.round(im.height * scale));
          thumb.getContext("2d").drawImage(im, 0, 0, thumb.width, thumb.height);
          thumbnails.set(src, thumb);
          finish(thumb);
        } catch {
          finish(null);
        }
      };
      im.onerror = () => finish(null);
      im.src = src;
    });
  }
  window.addEventListener("photoschanged", (e) => {
    const sources = e.detail,
      nextSignature = JSON.stringify(sources);
    if (signature === nextSignature) return;
    signature = nextSignature;
    photosReady = loadPhotos(sources);
  });
  async function loadPhotos(sources) {
    const current = ++generation,
      loaded = new Array(sources.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, sources.length) }, async () => {
        while (next < sources.length && current === generation) {
          const i = next++;
          loaded[i] = await loadThumbnail(sources[i]);
        }
      }),
    );
    if (current !== generation) return;
    images = loaded.filter(Boolean);
    portraitDetails.clear();
    const unreadable = sources.length - images.length;
    if (unreadable) window.dispatchEvent(new CustomEvent("photosrendererror", {
      detail: `${unreadable} foto belum terbaca. Unggah ulang foto tersebut; foto lain tetap tersimpan.`,
    }));
    if (gpu) gpu.setPhotos(images);
    else {
      photoIds = assignOrbitPhotos(orbit, images.length);
    }
    if (!gpu) canvas.dataset.photoSources = String(images.length);
    for (const key of thumbnails.keys())
      if (!sources.includes(key)) thumbnails.delete(key);
    draw();
  }
  resize();
  function settle() {
    immersion = 1;
    immersionStarted = undefined;
    progress = 1;
    traveling = false;
    cancelAnimationFrame(frame);
    frame = 0;
    draw();
    finish?.();
    finish = undefined;
    resume();
  }
  return {
    get ready() {
      return Promise.all([ready, photosReady]);
    },
    prepare() {
      immersionStarted = performance.now();
      if (motion.matches) immersion = 1;
      resume();
    },
    setPaused(value) {
      suspended = value;
      cancelAnimationFrame(frame);
      frame = 0;
      lastSimulationFrame = 0;
      if (!value) resume();
    },
    travel: () =>
      new Promise((resolve) => {
        finish?.();
        finish = resolve;
        progress = 0;
        immersionStarted ??= performance.now();
        traveling = true;
        started = performance.now();
        if (document.hidden) hiddenAt = started;
        duration = motion.matches ? 350 : JOURNEY_MS;
        resume();
      }),
    settle,
    reset: () => {
      traveling = false;
      cancelAnimationFrame(frame);
      frame = 0;
      finish?.();
      finish = undefined;
      progress = 0;
      immersion = 0;
      immersionStarted = undefined;
      draw();
      resume();
    },
  };
}
