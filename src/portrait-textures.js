// Keep detail for the few camera-facing photographs, independently of the
// lower-resolution atlas shared by thousands of distant orbit particles.
export const PORTRAIT_CAPACITY = 16;
export function selectPortraitIds(photos, photoIds) {
  // Arrival opacity must not keep an older small card ahead of a newly
  // approaching large portrait. Rank by the amount of visible screen detail.
  const priority = photo => photo.projected.size * Math.min(1, photo.alpha * 2);
  const ranked = photos.filter(photo => photo.alpha > .05 && photo.projected.size >= 40)
    .sort((a, b) => priority(b) - priority(a));
  return [...new Set(ranked.map(photo => photoIds[photo.index]))].slice(0, PORTRAIT_CAPACITY);
}
export function sharpenPortrait(image) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 320 / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const source = frame.data.slice(), stride = canvas.width * 4;
  // A restrained unsharp mask restores edge detail, without hard white halos,
  // crushed shadows, changing the palette or sharpening the distant dust.
  for (let y = 1; y < canvas.height - 1; y++)
    for (let x = 1; x < canvas.width - 1; x++) {
      const i = y * stride + x * 4;
      for (let c = 0; c < 3; c++) {
        const average = (source[i + c - 4] + source[i + c + 4] + source[i + c - stride] + source[i + c + stride]) / 4;
        const delta = Math.max(-10, Math.min(10, (source[i + c] - average) * .35));
        frame.data[i + c] = source[i + c] + delta;
      }
    }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

export function createPortraitAtlas(gl, maxSize) {
  let texture, plan, unavailable = false;
  const slots = new Array(PORTRAIT_CAPACITY).fill(null), cached = new Map();
  function bind() {
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.activeTexture(gl.TEXTURE2);
  }
  function allocate(width, height) {
    const candidate = gl.createTexture();
    if (!candidate) return null;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, candidate);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    if (gl.getError() === gl.NO_ERROR && !gl.isContextLost()) return candidate;
    gl.deleteTexture(candidate);
    return null;
  }
  // WebGL requires a complete binding even when the shader uses the base atlas.
  texture = allocate(1, 1);
  bind();
  function ensure(count, baseTile) {
    if (plan) return plan.tileWidth > baseTile;
    if (unavailable) return false;
    const capacity = Math.min(PORTRAIT_CAPACITY, count);
    const columns = Math.ceil(Math.sqrt(capacity)), rows = Math.ceil(capacity / columns);
    for (const tileWidth of [320, 256, 192]) {
      const tileHeight = tileWidth * 1.25;
      const width = columns * tileWidth, height = rows * tileHeight;
      if (tileWidth <= baseTile || width > maxSize || height > maxSize) continue;
      const candidate = allocate(width, height);
      if (!candidate) continue;
      gl.deleteTexture(texture);
      texture = candidate;
      plan = { capacity, columns, rows, tileWidth, tileHeight, width, height, gutter: 2 };
      return true;
    }
    unavailable = true;
    return false;
  }
  return {
    get plan() { return plan; },
    clear() {
      slots.fill(null); cached.clear();
      // A replacement library can need more slots than the previous one.
      plan = undefined; unavailable = false;
    },
    update(ids, images, baseTile) {
      const wanted = new Set([...new Set(ids.filter(id => images[id]))].slice(0, PORTRAIT_CAPACITY));
      if (!wanted.size || gl.isContextLost() || !ensure(images.length, baseTile)) {
        bind();
        return new Map();
      }
      bind();
      gl.activeTexture(gl.TEXTURE3);
      const uploaded = [];
      let attempted = false;
      for (const id of wanted) {
        if (cached.has(id)) continue;
        const slot = slots.findIndex((old, index) => index < plan.capacity && !wanted.has(old));
        if (slot < 0) continue;
        const tile = document.createElement("canvas");
        tile.width = plan.tileWidth; tile.height = plan.tileHeight;
        const ctx = tile.getContext("2d");
        const g = plan.gutter, w = tile.width, h = tile.height;
        try {
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(sharpenPortrait(images[id]), g, g, w - 2 * g, h - 2 * g);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tile, g, g, w - 2*g, 1, g, 0, w - 2*g, g);
          ctx.drawImage(tile, g, h-g-1, w - 2*g, 1, g, h-g, w - 2*g, g);
          ctx.drawImage(tile, g, 0, 1, h, 0, 0, g, h);
          ctx.drawImage(tile, w-g-1, 0, 1, h, w-g, 0, g, h);
          cached.delete(slots[slot]);
          slots[slot] = null;
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          attempted = true;
          gl.texSubImage2D(gl.TEXTURE_2D, 0, (slot % plan.columns) * w, Math.floor(slot / plan.columns) * h, gl.RGBA, gl.UNSIGNED_BYTE, tile);
          // Reserve the slot while the rest of this upload batch is prepared.
          // Commit identities only after validating the batch as a whole.
          slots[slot] = id;
          uploaded.push({ id, slot });
        } catch {
          // The main photo atlas remains valid if an optional detail upload fails.
        }
      }
      // getError can synchronize with the GPU. One check per changed batch,
      // rather than one per photo, retains failure handling without repeatedly
      // stalling the frame. Untouched cached slots remain valid after failure.
      const valid = !attempted || (gl.getError() === gl.NO_ERROR && !gl.isContextLost());
      for (const { id, slot } of uploaded) {
        if (valid) cached.set(id, slot);
        else slots[slot] = null;
      }
      gl.activeTexture(gl.TEXTURE2);
      return new Map([...cached].filter(([id]) => wanted.has(id)));
    },
  };
}
