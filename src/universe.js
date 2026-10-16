import { cameraAt, JOURNEY_MS, DISK, clamp, ease } from "./universe-camera.js";

const PLATE_URL = `${import.meta.env.BASE_URL}art/gargantua.webp`;
const mod = (n, base) => ((n % base) + base) % base;

// One photographic plate and a disk-bound photo material, both in source-image UVs.
// The camera approaches the disk itself. Photos never scatter into a separate grid.
export function createUniverse(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx)
    return {
      ready: Promise.resolve(false),
      travel: async () => {},
      settle: () => {},
      reset: () => {},
    };
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0,
    height = 0,
    dpr = 1,
    progress = 0,
    visible = true,
    frame = 0,
    last = 0;
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
  const aspect = 1672 / 941;
  const cellU = 1 / DISK.columns,
    cellD = cellU * aspect * 1.25;
  const rows = Math.ceil(DISK.halfWidth / cellD);

  function drawPlaceholder(column, row, u, d) {
    const shade = mod(column * 7 + row * 11, 4);
    ctx.fillStyle = ["#cbbb9e", "#ac9776", "#dccdb4", "#b8a282"][shade];
    ctx.fillRect(u, d, cellU, cellD);
    ctx.fillStyle = ["#948266", "#a69374", "#bba88b", "#a08a6b"][shade];
    ctx.fillRect(
      u + cellU * 0.045,
      d + cellD * 0.04,
      cellU * 0.91,
      cellD * 0.83,
    );
    ctx.strokeStyle = "#eee0c380";
    ctx.lineWidth = cellU * 0.008;
    ctx.beginPath();
    ctx.arc(u + cellU * 0.5, d + cellD * 0.35, cellU * 0.11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(
      u + cellU * 0.5,
      d + cellD * 0.66,
      cellU * 0.23,
      cellD * 0.14,
      0,
      Math.PI,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  function drawMaterial(camera) {
    if (camera.photoMix <= 0) return 0;
    const first = Math.max(0, Math.floor(-camera.x / camera.width / cellU) - 1);
    const end = Math.min(
      DISK.columns,
      Math.ceil((width - camera.x) / camera.width / cellU) + 1,
    );
    // Photos are sheared with the disk, not rotated independently or sent to a wall.
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.width, camera.height);
    ctx.transform(1, DISK.slope, 0, 1, 0, DISK.intercept);
    let drawn = 0;
    for (let column = first; column < end; column++) {
      const u = column * cellU;
      for (let row = -rows; row < rows; row++) {
        const d = row * cellD;
        const screenY =
          camera.y + camera.height * (DISK.intercept + DISK.slope * u + d);
        if (
          screenY > height + cellD * camera.height ||
          screenY + cellD * camera.height < 0
        )
          continue;
        const edge = ease(
          (DISK.halfWidth - Math.abs(d + cellD * 0.5)) / (cellD * 2),
        );
        if (edge <= 0) continue;
        // Preserve the dark silhouette where the far disk disappears behind the hole.
        const v =
          DISK.intercept + DISK.slope * (u + cellU * 0.5) + d + cellD * 0.5;
        const inShadow =
          ((u + 0.5 * cellU - 0.5) / 0.089) ** 2 + ((v - 0.45) / 0.17) ** 2 <
          0.94;
        if (inShadow && d < -0.02) continue;
        ctx.globalAlpha = camera.photoMix * edge;
        const im = images.length
          ? images[mod(column * 37 + row * 17, images.length)]
          : undefined;
        if (im) {
          // Draw from the original decoded thumbnail on every visible cell. No
          // low-resolution atlas is magnified 16x during the close approach.
          ctx.drawImage(im, u, d, cellU, cellD);
          ctx.fillStyle = `rgba(214,151,73,${(1 - camera.photoMix) * 0.28})`;
          ctx.fillRect(u, d, cellU, cellD);
        } else drawPlaceholder(column, row, u, d);
        // Fine seams emerge only when the photos are already close enough to read.
        if (camera.photoMix > 0.78) {
          ctx.globalAlpha = edge * (camera.photoMix - 0.78) * 1.1;
          ctx.strokeStyle = "#100f0e";
          ctx.lineWidth = 0.65 / camera.width;
          ctx.strokeRect(u, d, cellU, cellD);
        }
        drawn++;
      }
    }
    ctx.restore();
    return drawn;
  }

  function draw() {
    if (!width || !height) return;
    const camera = cameraAt(progress, width, height, aspect);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#08090b";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (plate)
      ctx.drawImage(plate, camera.x, camera.y, camera.width, camera.height);
    // A separately reconstructed close-up resolves the disk filaments before
    // photographs emerge, rather than enlarging one small bitmap all the way.
    const detailMix = detailPlate
      ? ease((camera.zoom - 2.8) / 3.2) *
        ease((performance.now() - detailArrived) / 600)
      : 0;
    if (detailMix > 0) {
      ctx.globalAlpha = detailMix;
      ctx.drawImage(
        detailPlate,
        camera.x + camera.width * 0.513,
        camera.y + camera.height * 0.36,
        camera.width / 3,
        camera.height / 3,
      );
      ctx.globalAlpha = 1;
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
    if (progress === 0) {
      const bottom = ctx.createLinearGradient(0, height * 0.44, 0, height);
      bottom.addColorStop(0, "#100f0e00");
      bottom.addColorStop(0.55, "#100f0ec0");
      bottom.addColorStop(1, "#100f0e");
      ctx.fillStyle = bottom;
      ctx.fillRect(0, 0, width, height);
    }
    canvas.dataset.fragments = String(DISK.columns * rows * 2);
    canvas.dataset.visiblePhotos = String(drawn);
    canvas.dataset.photoMix = camera.photoMix.toFixed(4);
    canvas.dataset.zoom = camera.zoom.toFixed(4);
    canvas.dataset.detailMix = detailMix.toFixed(4);
    canvas.dataset.progress = progress.toFixed(4);
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

  function tick(now) {
    frame = 0;
    if (!visible || document.hidden || !traveling) return;
    if (now - last >= 1000 / 30) {
      last = now;
      progress = clamp((now - started) / duration);
      draw();
      if (progress >= 1) {
        traveling = false;
        const resolve = finish;
        finish = undefined;
        resolve?.();
      }
    }
    if (traveling) frame = requestAnimationFrame(tick);
  }
  function resume() {
    if (traveling && visible && !document.hidden && !frame)
      frame = requestAnimationFrame(tick);
    else draw();
  }
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    // Retina drawing with a pixel budget, rather than the old fixed 1100px field.
    dpr = Math.min(devicePixelRatio || 1, 2, 3840 / width, 2160 / height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    }
  }).observe(canvas);
  let hiddenAt;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = performance.now();
      cancelAnimationFrame(frame);
      frame = 0;
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
      draw();
      finish?.();
      finish = undefined;
    }
  });

  function loadThumbnail(src) {
    if (thumbnails.has(src)) return Promise.resolve(thumbnails.get(src));
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        const thumb = document.createElement("canvas");
        thumb.width = 384;
        thumb.height = 480;
        const unit = Math.min(im.width / 4, im.height / 5);
        thumb
          .getContext("2d")
          .drawImage(
            im,
            (im.width - unit * 4) / 2,
            (im.height - unit * 5) / 2,
            unit * 4,
            unit * 5,
            0,
            0,
            384,
            480,
          );
        thumbnails.set(src, thumb);
        im.onload = im.onerror = null;
        im.src = "";
        resolve(thumb);
      };
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }
  window.addEventListener("photoschanged", async (e) => {
    const sources = e.detail,
      nextSignature = JSON.stringify(sources);
    if (signature === nextSignature) return;
    signature = nextSignature;
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
    canvas.dataset.photoSources = String(images.length);
    for (const key of thumbnails.keys())
      if (!sources.includes(key)) thumbnails.delete(key);
    draw();
  });
  resize();
  function settle() {
    progress = 1;
    traveling = false;
    cancelAnimationFrame(frame);
    frame = 0;
    draw();
    finish?.();
    finish = undefined;
  }
  return {
    ready,
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
    },
  };
}
