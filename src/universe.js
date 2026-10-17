import { assignPhotoIds } from "./photo-textures.js";
import {
  JOURNEY_MS,
  PHOTO_COUNT,
  createPhotoOrbits,
  photoPosition,
  cameraPose,
  journeyProgress,
  photoShowcaseAt,
  orbitRateAt,
  clamp,
  ease,
} from "./gargantua-model.js";

// Lifecycle only. The React scene owns all WebGL geometry; there is no bitmap
// black-hole backdrop or independent plasma disk left to double the subject.
export function createUniverse(initialCanvas) {
  let canvas = initialCanvas,
    engine,
    progress = 0,
    time = 0,
    width = 0,
    height = 0;
  let visible = true,
    paused = false,
    traveling = false,
    started = 0,
    finish,
    raf = 0,
    last = 0;
  let images = [],
    generation = 0,
    signature,
    photosReady = Promise.resolve();
  const thumbnails = new Map(),
    motion = matchMedia("(prefers-reduced-motion: reduce)");
  const runtime = { progress, time };
  canvas.dataset.photoSources = "0";
  function report() {
    const pose = cameraPose(progress, time);
    Object.assign(canvas.dataset, {
      fragments: String(
        canvas.dataset.renderer === "canvas2d" ? 1800 : PHOTO_COUNT,
      ),
      horizonCount: "1",
      diskCount: "1",
      progress: progress.toFixed(4),
      flow: time.toFixed(4),
      photoShowcase: photoShowcaseAt(progress).toFixed(4),
      cameraPosition: pose.eye.map((n) => n.toFixed(5)).join(","),
      cameraAzimuth: pose.azimuth.toFixed(5),
      diskRotation: pose.diskRotation.toFixed(5),
    });
  }
  function draw() {
    if (!engine || !width || !height || paused || !visible || document.hidden)
      return;
    runtime.progress = progress;
    runtime.time = time;
    engine.draw();
    report();
  }
  function tick(now) {
    raf = 0;
    if (paused || !visible || document.hidden || (!traveling && motion.matches))
      return;
    const interval = 1000 / (canvas.dataset.renderer === "canvas2d" ? 20 : 30);
    if (!last || now - last >= interval) {
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (traveling)
        progress = motion.matches
          ? clamp((now - started) / 350)
          : journeyProgress(now - started);
      if (!motion.matches) time += dt * orbitRateAt(progress);
      draw();
      if (traveling && progress >= 1) {
        traveling = false;
        const done = finish;
        finish = undefined;
        done?.();
      }
    }
    if (traveling || !motion.matches) raf = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function resume() {
    draw();
    if (
      !raf &&
      !paused &&
      visible &&
      !document.hidden &&
      (traveling || !motion.matches)
    )
      raf = requestAnimationFrame(tick);
  }
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    engine?.resize(width, height);
    draw();
  }
  const resizeObserver = new ResizeObserver(resize);
  const engineReady = import("./GargantuaScene.jsx")
    .then(({ mountGargantua }) => mountGargantua(canvas, runtime))
    .catch(() => {
      const fallback = canvas.cloneNode(false);
      canvas.replaceWith(fallback);
      canvas = fallback;
      return createFallback(canvas, runtime);
    })
    .then(async (value) => {
      engine = value;
      resizeObserver.observe(canvas);
      resize();
      await engine.setPhotos(images);
      canvas.dataset.ready = "true";
      resume();
      return engine;
    });
  resizeObserver.observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) resume();
    else stop();
  }).observe(initialCanvas.parentElement);
  // The fallback replaces a failed WebGL canvas, so observe its scene as well.
  let hiddenAt;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = performance.now();
      stop();
    } else {
      if (traveling && hiddenAt !== undefined)
        started += performance.now() - hiddenAt;
      hiddenAt = undefined;
      resume();
    }
  });
  motion.addEventListener("change", () => {
    if (motion.matches && traveling) settle();
    stop();
    resume();
  });
  let pausedAt;
  function setPaused(value) {
    if (value === paused) return;
    paused = value;
    if (value) {
      pausedAt = performance.now();
      stop();
    } else {
      if (traveling && pausedAt !== undefined)
        started += performance.now() - pausedAt;
      pausedAt = undefined;
      resume();
    }
  }
  function thumbnail(src) {
    if (thumbnails.has(src)) return Promise.resolve(thumbnails.get(src));
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const c = document.createElement("canvas"),
          scale = Math.min(1, 320 / Math.max(image.width, image.height));
        c.width = Math.max(1, Math.round(image.width * scale));
        c.height = Math.max(1, Math.round(image.height * scale));
        c.getContext("2d").drawImage(image, 0, 0, c.width, c.height);
        thumbnails.set(src, c);
        image.onload = image.onerror = null;
        image.src = "";
        resolve(c);
      };
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }
  async function loadPhotos(sources) {
    const token = ++generation,
      loaded = new Array(sources.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, sources.length) }, async () => {
        while (next < sources.length && token === generation) {
          const i = next++;
          loaded[i] = await thumbnail(sources[i]);
        }
      }),
    );
    if (token !== generation) return;
    images = loaded.filter(Boolean);
    await engineReady;
    if (token !== generation) return;
    await engine.setPhotos(images);
    if (token !== generation) return;
    canvas.dataset.photoSources = String(images.length);
    for (const key of thumbnails.keys())
      if (!sources.includes(key)) thumbnails.delete(key);
    draw();
  }
  window.addEventListener("photoschanged", (event) => {
    const next = JSON.stringify(event.detail);
    if (signature === next) return;
    signature = next;
    photosReady = loadPhotos(event.detail);
  });
  function settle() {
    progress = 1;
    traveling = false;
    stop();
    draw();
    finish?.();
    finish = undefined;
    resume();
  }
  resize();
  return {
    get ready() {
      return Promise.all([engineReady, photosReady]);
    },
    setPaused,
    settle,
    travel: () =>
      new Promise((resolve) => {
        finish?.();
        finish = resolve;
        progress = 0;
        traveling = true;
        started = performance.now();
        resume();
      }),
    reset() {
      traveling = false;
      stop();
      finish?.();
      finish = undefined;
      progress = 0;
      draw();
      resume();
    },
  };
}

// Low-capability fallback: the same single sphere/annulus and opposing camera
// path, projected and depth-sorted in Canvas. No old photographic scene layers.
function createFallback(canvas, runtime) {
  const ctx = canvas.getContext("2d", { alpha: false }),
    orbits = createPhotoOrbits(1800);
  let width = canvas.clientWidth,
    height = canvas.clientHeight,
    images = [],
    photoIds = assignPhotoIds(orbits, 6);
  canvas.dataset.renderer = "canvas2d";
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0),
    normal = (v) => v.map((n) => n / Math.hypot(...v));
  return {
    resize(w, h) {
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
    },
    setPhotos(photos) {
      images = photos;
      photoIds = assignPhotoIds(orbits, photos.length || 6);
    },
    draw() {
      if (!ctx || !width || !height) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      const pose = cameraPose(runtime.progress, runtime.time),
        back = normal(pose.eye);
      const right = normal([back[2], 0, -back[0]]),
        up = [
          -back[0] * back[1],
          back[0] * back[0] + back[2] * back[2],
          -back[2] * back[1],
        ];
      const focal = height / (2 * Math.tan((46 * Math.PI) / 360)),
        distance = Math.hypot(...pose.eye),
        points = [];
      for (let i = 0; i < 1800; i++) {
        const p = photoPosition(orbits, i, runtime.time),
          relative = [p.x - pose.eye[0], p.y - pose.eye[1], p.z - pose.eye[2]];
        const z = -dot(relative, back);
        if (z < 0.1) continue;
        const scale = focal / z,
          x = width * 0.5 + dot(relative, right) * scale,
          y = height * 0.5 - dot(relative, up) * scale;
        const size = Math.min(
          150,
          width * 0.34,
          (0.12 + p.seed * 0.105) * scale,
        );
        if (x < -size || x > width + size || y < -size || y > height + size)
          continue;
        points.push({
          x,
          y,
          size,
          z,
          seed: p.seed,
          id: photoIds[i],
        });
      }
      points.sort((a, b) => b.z - a.z);
      let sphere = false;
      const hole = () => {
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.5, focal / distance, 0, Math.PI * 2);
        ctx.fill();
      };
      for (const p of points) {
        if (!sphere && p.z < distance) {
          hole();
          sphere = true;
        }
        const image = images[p.id % images.length],
          readable = ease((p.size - 5) / 27),
          ratio = image ? image.width / image.height : 0.8;
        const w = p.size * Math.min(ratio, 1),
          h = p.size * Math.min(1 / ratio, 1) * (0.24 + 0.76 * readable);
        if (image && readable > 0.15)
          ctx.drawImage(image, p.x - w / 2, p.y - h / 2, w, h);
        else {
          ctx.fillStyle = readable > 0.4 ? "#c1ab89" : "#efbb79";
          ctx.fillRect(
            p.x - w / 2,
            p.y - h / 2,
            Math.max(1, w),
            Math.max(1, h),
          );
        }
      }
      if (!sphere) hole();
    },
  };
}
