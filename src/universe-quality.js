// Phones keep the same flight and photo library with less work per frame.
export function universeQuality(canvas) {
  const phone = matchMedia('(pointer: coarse)').matches ||
    (canvas.clientWidth || innerWidth) <= 700;
  return phone
    ? { phone: true, particles: 32768, filaments: 8192, fallbackParticles: 8192, pixelRatio: 1.25, textureSize: 2048, tileSize: 128 }
    : { phone: false, particles: 32768, filaments: 32768, fallbackParticles: 8192, pixelRatio: 2, textureSize: 4096, tileSize: 256 };
}
