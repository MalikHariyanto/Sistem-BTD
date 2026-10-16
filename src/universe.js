const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => {
  const x = clamp(n);
  return x * x * (3 - 2 * x);
};
const mix = (a, b, t) => a + (b - a) * t;
const random = (i) => {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

// Cached light field + 160/224 photo fragments; no 3D engine or video download.
export function createUniverse(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  if (!ctx)
    return { travel: async () => {}, settle: () => {}, reset: () => {} };
  let w = 0,
    h = 0,
    frame = 0,
    last = 0,
    time = 0;
  let visible = true,
    progress = 0,
    traveling = false,
    travelStart = 0,
    travelDuration = 0;
  let resolveTravel,
    images = [],
    generation = 0,
    field;
  const stars = Array.from({ length: 280 }, (_, i) => ({
    x: random(i),
    y: random(i + 400),
    r: random(i + 800) * 1.2 + 0.25,
  }));
  const fragments = Array.from({ length: 224 }, (_, i) => ({
    angle: random(i + 20) * Math.PI * 2,
    radius: 1.12 + random(i + 1000) * 1.55,
    tilt: (random(i + 2000) - 0.5) * 0.55,
    size: 9 + random(i + 3000) * 10,
  }));
  const thumbs = new Map();
  function buildField() {
    field = document.createElement("canvas");
    field.width = field.height = 1100;
    const c = field.getContext("2d"),
      r = 183;
    c.translate(550, 550);
    const halo = c.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 2.9);
    halo.addColorStop(0, "#e3a65e38");
    halo.addColorStop(0.27, "#b6763220");
    halo.addColorStop(1, "#00000000");
    c.fillStyle = halo;
    c.fillRect(-550, -550, 1100, 1100);
    c.rotate(-0.12);
    for (let i = 150; i >= 0; i--) {
      const radius = r * (1.02 + i * 0.012);
      c.lineWidth = i % 9 === 0 ? 1.9 : 0.65;
      c.strokeStyle = `rgba(239,${156 + (i % 50)},${80 + (i % 60)},${0.08 + (150 - i) / 900})`;
      c.beginPath();
      c.ellipse(
        0,
        0,
        radius,
        radius * (0.14 + i * 0.00055),
        0,
        Math.PI,
        Math.PI * 2,
      );
      c.stroke();
    }
    for (let i = 35; i >= 0; i--) {
      c.strokeStyle = `rgba(255,${183 + i},${115 + i},${0.025 + (35 - i) / 230})`;
      c.lineWidth = i % 8 === 0 ? 1.8 : 0.75;
      c.beginPath();
      c.ellipse(
        0,
        0,
        r * (1.005 + i * 0.005),
        r * (1.005 + i * 0.005),
        0,
        Math.PI,
        Math.PI * 2,
      );
      c.stroke();
    }
    for (let i = 0; i < 2400; i++) {
      const a = random(i + 1234) * Math.PI * 2,
        rr = r * (1.07 + random(i + 4666) * 1.72);
      c.fillStyle = `rgba(240,${170 + (i % 55)},${99 + (i % 70)},${0.12 + random(i + 59) * 0.4})`;
      c.fillRect(
        Math.cos(a) * rr,
        Math.sin(a) * rr * 0.21,
        0.5 + random(i + 99) * 1.5,
        0.6,
      );
    }
    c.fillStyle = "#090909";
    c.beginPath();
    c.arc(0, 0, r * 0.965, 0, Math.PI * 2);
    c.fill();
    const ring = c.createRadialGradient(0, 0, r * 0.94, 0, 0, r * 1.06);
    ring.addColorStop(0, "#00000000");
    ring.addColorStop(0.4, "#fbe2b0b0");
    ring.addColorStop(0.55, "#b67d4150");
    ring.addColorStop(1, "#00000000");
    c.fillStyle = ring;
    c.beginPath();
    c.arc(0, 0, r * 1.06, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 72; i++) {
      c.strokeStyle = `rgba(255,${177 + (i % 45)},${99 + (i % 60)},${0.12 + (72 - i) / 500})`;
      c.lineWidth = i % 11 === 0 ? 1.6 : 0.6;
      c.beginPath();
      c.ellipse(
        0,
        4,
        r * (1.07 + i * 0.025),
        r * (0.075 + i * 0.0019),
        0,
        0,
        Math.PI,
      );
      c.stroke();
    }
    for (let i = 0; i < 18; i++) {
      c.strokeStyle = `rgba(225,170,107,${0.04 + (18 - i) / 320})`;
      c.lineWidth = 0.6;
      c.beginPath();
      c.ellipse(
        0,
        0,
        r * (1.01 + i * 0.006),
        r * (0.95 + i * 0.009),
        0,
        0,
        Math.PI,
      );
      c.stroke();
    }
  }
  function drawPhoto(i, x, y, size, angle, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = ["#dbc8a8", "#ae9374", "#e5d8c2", "#79604b"][i % 4];
    ctx.fillRect(-size * 0.5, -size * 0.62, size, size * 1.24);
    const im = images.length ? images[i % images.length] : null;
    if (im)
      ctx.drawImage(im, -size * 0.46, -size * 0.58, size * 0.92, size * 1.04);
    else {
      ctx.fillStyle = ["#746657", "#a08c77", "#b6a58e"][i % 3];
      ctx.fillRect(-size * 0.45, -size * 0.57, size * 0.9, size * 1.02);
      ctx.strokeStyle = "#e7d4b26b";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-size * 0.37, -size * 0.49, size * 0.74, size * 0.86);
      ctx.beginPath();
      ctx.arc(0, -size * 0.08, size * 0.1, 0, Math.PI * 2);
      ctx.moveTo(-size * 0.2, size * 0.25);
      ctx.quadraticCurveTo(0, -size * 0.05, size * 0.2, size * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }
  function draw() {
    if (!w || !h) return;
    ctx.fillStyle = "#100f0e";
    ctx.fillRect(0, 0, w, h);
    const mobile = w < 700,
      r = Math.min(w * (mobile ? 0.265 : 0.18), h * 0.2),
      cx = w * 0.5,
      cy = h * (mobile ? 0.32 : 0.33);
    const zoom = smooth(progress * 0.96),
      dissolve = smooth((progress - 0.5) / 0.5),
      scale = mix(1, 4.7, zoom);
    for (const star of stars) {
      ctx.globalAlpha = (1 - dissolve) * (0.15 + star.r * 0.25);
      ctx.fillStyle = "#ebd7b4";
      ctx.fillRect(
        mix(star.x * w, (star.x - 0.5) * w * 1.3 + w * 0.5, zoom),
        star.y * h,
        star.r,
        star.r,
      );
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(cx - r * 0.85 * zoom, cy + r * 0.1 * zoom);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 1 - dissolve;
    ctx.drawImage(field, -r * 3, -r * 3, r * 6, r * 6);
    ctx.restore();
    const count = mobile ? 160 : 224,
      cols = mobile ? 7 : 14,
      rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      const f = fragments[i],
        a = f.angle + (progress >= 1 ? 0 : time * 0.018),
        rr = r * f.radius,
        sx = Math.cos(a) * rr,
        sy = Math.sin(a) * rr * 0.25;
      if (dissolve === 0 && sy < 0 && Math.abs(sx) < r * 0.97) continue;
      const startX = cx - r * 0.85 * zoom + sx * scale,
        startY = cy + r * 0.1 * zoom + sy * scale,
        cellW = w / (cols - 1),
        cellH = h / (rows - 1);
      const endX = (i % cols) * cellW + (random(i + 22) - 0.5) * cellW * 0.38,
        endY =
          Math.floor(i / cols) * cellH + (random(i + 99) - 0.5) * cellH * 0.25;
      drawPhoto(
        i,
        mix(startX, endX, dissolve),
        mix(startY, endY, dissolve),
        mix(f.size * (mobile ? 0.63 : 1) * scale, cellW * 0.94, dissolve),
        mix(a * 0.12, f.tilt, dissolve),
        mix(0.52, 0.66, dissolve),
      );
    }
    if (dissolve > 0) {
      const shade = ctx.createRadialGradient(
        w / 2,
        h / 2,
        0,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.7,
      );
      shade.addColorStop(0, `rgba(16,15,14,${dissolve * 0.62})`);
      shade.addColorStop(1, `rgba(16,15,14,${dissolve * 0.82})`);
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, w, h);
    }
    canvas.dataset.fragments = String(count);
  }
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden) return;
    if (now - last >= 33) {
      time = now / 1000;
      last = now;
      if (traveling) {
        progress = clamp((now - travelStart) / travelDuration);
        if (progress >= 1) {
          traveling = false;
          resolveTravel?.();
          resolveTravel = null;
        }
      }
      draw();
    }
    if (traveling || (!motion.matches && progress < 1))
      frame = requestAnimationFrame(tick);
  }
  function resume() {
    if (
      !frame &&
      visible &&
      !document.hidden &&
      (traveling || (!motion.matches && progress < 1))
    )
      frame = requestAnimationFrame(tick);
    else draw();
  }
  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    const d = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * d);
    canvas.height = Math.round(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    draw();
    resume();
  }
  buildField();
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) resume();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(canvas);
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = performance.now();
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      if (traveling && hiddenAt) travelStart += performance.now() - hiddenAt;
      resume();
    }
  });
  motion.addEventListener("change", () => {
    if (motion.matches && traveling) {
      progress = 1;
      traveling = false;
      resolveTravel?.();
      resolveTravel = null;
    }
    cancelAnimationFrame(frame);
    frame = 0;
    resume();
  });
  let sourceSignature;
  function loadThumbnail(src) {
    if (thumbs.has(src)) return Promise.resolve(thumbs.get(src));
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        const thumb = document.createElement("canvas");
        thumb.width = 160;
        thumb.height = 180;
        const edge = Math.min(im.width / 8, im.height / 9);
        thumb
          .getContext("2d")
          .drawImage(
            im,
            (im.width - edge * 8) / 2,
            (im.height - edge * 9) / 2,
            edge * 8,
            edge * 9,
            0,
            0,
            160,
            180,
          );
        thumbs.set(src, thumb);
        im.onload = im.onerror = null;
        im.src = "";
        resolve(thumb);
      };
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }
  window.addEventListener("photoschanged", async (e) => {
    const sources = e.detail;
    const signature = JSON.stringify(sources);
    if (sourceSignature === signature) return;
    sourceSignature = signature;
    const current = ++generation,
      loaded = new Array(sources.length);
    let next = 0;
    // Bound full-resolution decoding to four photos at once on phones.
    await Promise.all(
      Array.from({ length: Math.min(4, sources.length) }, async () => {
        while (next < sources.length && current === generation) {
          const index = next++;
          loaded[index] = await loadThumbnail(sources[index]);
        }
      }),
    );
    if (current !== generation) return;
    images = loaded.filter(Boolean);
    for (const key of thumbs.keys())
      if (!sources.includes(key)) thumbs.delete(key);
    draw();
  });
  resize();
  return {
    travel: () =>
      new Promise((resolve) => {
        resolveTravel?.();
        resolveTravel = resolve;
        traveling = true;
        progress = 0;
        travelStart = performance.now();
        travelDuration = motion.matches ? 350 : 5600;
        resume();
      }),
    settle: () => {
      progress = 1;
      traveling = false;
      resolveTravel?.();
      resolveTravel = null;
      draw();
    },
    reset: () => {
      progress = 0;
      traveling = false;
      resolveTravel?.();
      resolveTravel = null;
      resume();
    },
  };
}
