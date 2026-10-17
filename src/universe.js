import {
  cameraAt,
  projectWorld,
  HORIZON,
  ASPECT,
  JOURNEY_MS,
  journeyProgress,
  photoShowcaseAt,
  orbitRateAt,
  DISK,
  PARTICLE_COUNT,
  createOrbit,
  orbitAt,
  orbitTangent,
  projectOrbit,
  orbitDustSize,
  orbitPhotoSize,
  clamp,
  ease,
} from "./universe-camera.js";

import { createOrbitComposition, compositionAt } from "./orbit-composition.js";
import { assignOrbitPhotos } from "./photo-textures.js";
import { createUniverseGPU } from "./universe-gpu.js";

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
  let flowSeconds = 0,
    lastSimulationFrame = 0;
  let traveling = false,
    started = 0,
    duration = JOURNEY_MS,
    finish;
  let detailPlate,
    detailArrived = 0;
  let plate,
    images = [],
    generation = 0,
    signature;
  const thumbnails = new Map();
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
    const blend = compositionAt(camera.zoom);
    const showcase = photoShowcaseAt(progress);
    for (let i = 0; i < orbit.length / 4; i++) {
      const point = orbitAt(orbit, i, flowSeconds);
      const projected = projectOrbit(point, camera, width, height);
      if (projected)
        points.push({ ...point, ...projected, index: i, photoId: photoIds[i] });
    }
    points.sort((a, b) => b.depth - a.depth);
    function paint(point, opacity = 1) {
      const { x, y, size, seed, depth } = point;
      const readable = ease((size - 2) / (26 - 16 * showcase));
      ctx.save();
      ctx.translate(x, y);
      const tangent = orbitTangent(point, camera);
      ctx.rotate(tangent * (1 - readable) + (seed - 0.5) * 0.18 * readable);
      ctx.globalAlpha =
        opacity *
        point.opacity *
        (0.38 + readable * 0.6) *
        ease((depth - 0.028) / 0.047);
      const image = images[point.photoId];
      const ratio = image ? image.width / image.height : 0.8;
      const cardWidth = size * Math.min(ratio, 1);
      const cardHeight =
        size *
        Math.min(1 / ratio, 1) *
        (0.28 + 0.72 * ease((size - 1.5) / 10.5));
      if (image && readable > 0.01) {
        ctx.drawImage(
          image,
          -cardWidth / 2,
          -cardHeight / 2,
          cardWidth,
          cardHeight,
        );
        ctx.fillStyle = `rgba(227,161,77,${(1 - readable) * 0.85})`;
        ctx.fillRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
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
        ctx.strokeStyle = "#e7dcc9";
        ctx.lineWidth = Math.max(0.5, size * 0.009);
        ctx.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
      }
      ctx.restore();
    }
    for (const point of points) {
      const dust = projectOrbit(
        orbitAt(orbit, point.index, flowSeconds),
        camera,
        width,
        height,
        orbitDustSize(point.seed),
      );
      if (dust) paint({ ...point, ...dust }, 1 - 0.4 * blend);
      if (blend < 1 && orbitPhotoSize(point.seed) > orbitDustSize(point.seed))
        paint(
          {
            ...point,
            ...projectOrbit(
              orbitAt(orbit, point.index, flowSeconds),
              camera,
              width,
              height,
              orbitPhotoSize(point.seed) * (1 + 0.25 * showcase),
            ),
          },
          1 - blend,
        );
    }
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
        { ...point, ...projected, photoId: photoIds[index] },
        alpha * blend,
      );
    canvas.dataset.focusPhotos = String(
      focused.filter((p) => p.alpha > 0.5).length,
    );
    return points.length;
  }

  function draw() {
    if (!width || !height || suspended || !visible || document.hidden) return;
    const camera = cameraAt(progress, width, height, aspect);
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
        cover: 1 - ease(progress / 0.18),
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
    // The fallback follows the same moving world-space camera. Anchor the lens
    // plate to the projected sphere, rather than leaving a static backdrop.
    if (camera.orbitBlend > 0) {
      const hole = projectWorld(
        { x: HORIZON.x, y: HORIZON.y * ASPECT, depth: 0 },
        camera,
        width,
        height,
        0,
      );
      if (hole) {
        const scale = camera.focal / hole.depth;
        camera.x += (hole.x - 0.5 * scale - camera.x) * camera.orbitBlend;
        camera.y +=
          (hole.y - (0.43 * scale) / ASPECT - camera.y) * camera.orbitBlend;
        camera.width += (scale - camera.width) * camera.orbitBlend;
        camera.height = camera.width / ASPECT;
      }
    }
    if (plate)
      ctx.drawImage(plate, camera.x, camera.y, camera.width, camera.height);
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
      ctx.rotate(flowSeconds * 0.065);
      ctx.drawImage(plate, -0.5 / 0.17, -0.445 / 0.3, 1 / 0.17, 1 / 0.3);
      ctx.restore();
    }
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
    const cover = 1 - ease(progress / 0.18);
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
    canvas.dataset.viewAngle = camera.viewAngle.toFixed(4);
    canvas.dataset.cameraPosition = camera.eye
      .map((v) => v.toFixed(5))
      .join(",");
    canvas.dataset.detailMix = detailMix.toFixed(4);
    canvas.dataset.progress = progress.toFixed(4);
    canvas.dataset.photoShowcase = photoShowcaseAt(progress).toFixed(4);
    canvas.dataset.flow = flowSeconds.toFixed(4);
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
    return !suspended && (traveling || !motion.matches);
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
      if (traveling)
        progress = motion.matches
          ? clamp((now - started) / duration)
          : journeyProgress(now - started);
      if (!motion.matches) flowSeconds += dt * orbitRateAt(progress);
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
      im.onload = () => {
        const thumb = document.createElement("canvas");
        // Preserve the whole image and its original orientation. The atlas may
        // pack rectangles uniformly, but each sprite restores this aspect ratio.
        const scale = Math.min(1, 320 / Math.max(im.width, im.height));
        thumb.width = Math.max(1, Math.round(im.width * scale));
        thumb.height = Math.max(1, Math.round(im.height * scale));
        thumb.getContext("2d").drawImage(im, 0, 0, thumb.width, thumb.height);
        thumbnails.set(src, thumb);
        im.onload = im.onerror = null;
        im.src = "";
        resolve(thumb);
      };
      im.onerror = () => resolve(null);
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
    if (gpu) gpu.setPhotos(images);
    else photoIds = assignOrbitPhotos(orbit, images.length);
    canvas.dataset.photoSources = String(images.length);
    for (const key of thumbnails.keys())
      if (!sources.includes(key)) thumbnails.delete(key);
    draw();
  }
  resize();
  function settle() {
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
      draw();
      resume();
    },
  };
}
