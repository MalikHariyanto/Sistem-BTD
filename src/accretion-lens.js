// A single optical image of the rear half of the physical disk. Each source
// keeps its radius, phase, depth and photograph: it bends instead of being
// drawn again in a second ring. The foreground orbit is completely unchanged.
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export function lensedOrbit(point, camera) {
  if (!Number.isFinite(point.angle)) return point;
  const thickness = point.y - 0.26 * point.x - 0.19 * point.depth;
  const lower = (camera.photoField || 0) * smooth(.012, .022, -thickness);
  const weight = smooth(0, 0.55 + .45 * lower, -Math.sin(point.angle)) *
    (1 - smooth(0.42, 0.64, point.radius)) *
    (1 - smooth(0.07, 0.25, Math.abs(camera.cx) / camera.distance));
  if (!weight) return point;
  const ring = 0.112 + 0.13 * point.radius;
  const x = Math.cos(point.angle) * ring;
  const upperY = -0.03 + Math.sin(point.angle) * ring * (0.30 / 0.17) + 0.26 * x + thickness * 0.38;
  // A stable slice of the disk's underside follows the lower optical image.
  // Each source still appears once. Fade back to the established optical path
  // outside the middle; the camera and intimate ending remain unchanged.
  // Turn both optical coordinates so the bottom travels left, together with
  // the lower luminous flow, rather than reversing its apparent rotation.
  const imageX = x * (1 - 2 * lower);
  const lowerY = .09 - Math.sin(point.angle) * ring * 1.30 - .26 * x + thickness * .38;
  const y = upperY + (lowerY - upperY) * lower;
  // Anchor the optical image to the same reference plane as the HD light.
  // Retain the source depth for correct size, atmosphere and horizon masking.
  const perspective = (camera.distance - point.depth) / camera.distance;
  return {
    ...point,
    x: point.x + (camera.cx + (imageX - camera.cx) * perspective - point.x) * weight,
    y: point.y + (camera.cy + (y - camera.cy) * perspective - point.y) * weight,
  };
}

// Matching equations for the native WebGL path. No extra mesh/draw pass or
// per-frame allocation is needed for the 32,768 persistent photo identities.
export const lensGLSL = `
vec3 lensedOrbit(vec3 source,float r,float theta,vec3 eye,float field){
  float thickness=source.y-.26*source.x-.19*source.z;
  float lower=field*softstep(.012,.022,-thickness);
  float weight=softstep(0.0,.55+.45*lower,-sin(theta))*(1.0-softstep(.42,.64,r))*
    (1.0-softstep(.07,.25,abs(eye.x)/eye.z));
  float ring=.112+.13*r;
  float x=cos(theta)*ring;
  float upperY=-.03+sin(theta)*ring*(.30/.17)+.26*x+thickness*.38;
  float imageX=x*(1.0-2.0*lower);
  float lowerY=.09-sin(theta)*ring*1.30-.26*x+thickness*.38;
  float y=mix(upperY,lowerY,lower);
  vec2 optical=eye.xy+(vec2(imageX,y)-eye.xy)*(eye.z-source.z)/eye.z;
  return vec3(mix(source.xy,optical,weight),source.z);
}
`;
