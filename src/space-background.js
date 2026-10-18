// Extend only the outermost sky/filaments. The bounded sample can never reach
// the central hole, so wide screens get no second Gargantua or stretched core.
const EDGE = .08;
const SPACE = [8, 9, 11];
const extend = n => n < 0 ? EDGE * (1 - Math.exp(n / EDGE))
  : n > 1 ? 1 - EDGE * (1 - Math.exp((1 - n) / EDGE)) : n;

export const spaceGLSL = `
float spaceEdge(float n){
  return n<0.0 ? .08*(1.0-exp(n/.08))
    : n>1.0 ? 1.0-.08*(1.0-exp((1.0-n)/.08)) : n;
}
vec4 wide(vec2 uv){
  float x=spaceEdge(uv.x);
  // Continue the same inclined light stream through the outer edges.
  vec2 sampleUV=vec2(x,spaceEdge(uv.y+.26*(x-uv.x)));
  float distance=length(uv-clamp(uv,0.0,1.0));
  return vec4(mix(vec3(8.0,9.0,11.0)/255.0,texture2D(uWide,sampleUV).rgb,exp(-distance*.9)),1.0);
}
`;

// Canvas fallback: bake the distant extension once, rather than resampling
// pixels every frame. The original full-resolution artwork stays on top.
export function createSpaceBackdrop(plate) {
  const sample = document.createElement('canvas');
  sample.width = 512; sample.height = 288;
  const source = sample.getContext('2d', { willReadFrequently: true });
  source.drawImage(plate, 0, 0, sample.width, sample.height);
  const pixels = source.getImageData(0, 0, sample.width, sample.height).data;
  const sky = document.createElement('canvas');
  sky.width = 1024; sky.height = 576;
  const context = sky.getContext('2d'), field = context.createImageData(sky.width, sky.height);
  for (let y = 0; y < sky.height; y++) {
    const v = (y + .5) / sky.height * 3 - 1;
    for (let x = 0; x < sky.width; x++) {
      const u = (x + .5) / sky.width * 3 - 1, sx = extend(u);
      const px = sx * (sample.width - 1), py = extend(v + .26 * (sx - u)) * (sample.height - 1);
      const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
      const a = (y0 * sample.width + x0) * 4;
      const b = (y0 * sample.width + Math.min(x0 + 1, sample.width - 1)) * 4;
      const c = (Math.min(y0 + 1, sample.height - 1) * sample.width + x0) * 4;
      const d = (Math.min(y0 + 1, sample.height - 1) * sample.width + Math.min(x0 + 1, sample.width - 1)) * 4;
      const fade = Math.exp(-Math.hypot(u - Math.max(0, Math.min(1, u)), v - Math.max(0, Math.min(1, v))) * .9);
      const offset = (y * sky.width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const color = (pixels[a + channel] * (1 - fx) + pixels[b + channel] * fx) * (1 - fy)
          + (pixels[c + channel] * (1 - fx) + pixels[d + channel] * fx) * fy;
        field.data[offset + channel] = SPACE[channel] + (color - SPACE[channel]) * fade;
      }
      field.data[offset + 3] = 255;
    }
  }
  context.putImageData(field, 0, 0);
  const core = document.createElement('canvas');
  core.width = plate.width; core.height = plate.height;
  const original = core.getContext('2d');
  original.drawImage(plate, 0, 0);
  original.globalCompositeOperation = 'destination-in';
  for (const [x, y] of [[core.width, 0], [0, core.height]]) {
    const feather = original.createLinearGradient(0, 0, x, y);
    for (const [at, alpha] of [[0, 0], [.025, 1], [.975, 1], [1, 0]])
      feather.addColorStop(at, `rgba(0,0,0,${alpha})`);
    original.fillStyle = feather;
    original.fillRect(0, 0, core.width, core.height);
  }
  return {
    draw(ctx, camera, width = ctx.canvas.width, height = ctx.canvas.height) {
      // Once the camera enters the image, the extension is entirely offscreen.
      // Keep the original single-image draw for the close-up flight.
      if (camera.x + camera.width * .025 <= 0 && camera.x + camera.width * .975 >= width
        && camera.y + camera.height * .025 <= 0 && camera.y + camera.height * .975 >= height) {
        ctx.drawImage(plate, camera.x, camera.y, camera.width, camera.height);
        return;
      }
      ctx.drawImage(sky, camera.x - camera.width, camera.y - camera.height, camera.width * 3, camera.height * 3);
      ctx.drawImage(core, camera.x, camera.y, camera.width, camera.height);
    },
  };
}
