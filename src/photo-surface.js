// A photograph keeps its physical orbit and identity while its paper plane
// catches the light. Slow, deterministic orientation avoids frame-by-frame
// randomness. The ending gradually returns to the established face-on view.
export function photoSurfaceAt(point, time, field, ratio = 1) {
  const { seed, angle } = point;
  const yaw = field * (.38 * Math.sin(angle * .7 + seed * 13) + .08 * Math.sin(time * .28 + seed * 9));
  const pitch = field * (.23 * Math.cos(angle * .45 + seed * 17) + .055 * Math.sin(time * .23 + seed * 11));
  const roll = (seed - .5) * .18 + field * (.105 + .035 * Math.sin(angle + seed * 7 + time * .14));
  const perspective = field * .14;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const normal = [sy * cp, -sp, cy * cp];
  const light = .82 + .22 * Math.max(0, normal[0] * -.35 + normal[1] * -.55 + normal[2] * .76);
  const w = Math.min(ratio, 1), h = Math.min(1 / ratio, 1);
  const c = Math.cos(roll), s = Math.sin(roll);
  const bx = Math.abs(cy * c) * w + Math.abs(sy * sp * c - cp * s) * h;
  const by = Math.abs(cy * s) * w + Math.abs(sy * sp * s + cp * c) * h;
  const depth = 1 - perspective * .5 * (Math.abs(sy) * w + Math.abs(cy * sp) * h);
  // The material stays inside the footprint reserved by orbit composition,
  // including extreme portrait/landscape ratios and its thin paper edge.
  const fit = field > 0 ? Math.min(1, w * 1.08 * depth / bx, h * 1.08 * depth / by) : 1;
  return { yaw, pitch, roll, perspective, light, normal, fit };
}

// Project a point on the photo plane into its normalized screen footprint.
// Used to verify the shader's inverse projection and the photographed detail.
export function projectPhotoSurface(u, v, ratio, surface) {
  const w = Math.min(ratio, 1), h = Math.min(1 / ratio, 1);
  const cy = Math.cos(surface.yaw), sy = Math.sin(surface.yaw);
  const cp = Math.cos(surface.pitch), sp = Math.sin(surface.pitch);
  const x = cy * w * u + sy * sp * h * v;
  const y = cp * h * v;
  const z = -sy * w * u + cy * sp * h * v;
  const scale = surface.fit / (1 - surface.perspective * z);
  const c = Math.cos(surface.roll), s = Math.sin(surface.roll);
  return { x: (x * c - y * s) * scale, y: (x * s + y * c) * scale, z };
}

export const photoPoseGLSL = `
vec4 photoPose(float seed,float theta,float time,float field){
  float yaw=field*(.38*sin(theta*.7+seed*13.0)+.08*sin(time*.28+seed*9.0));
  float pitch=field*(.23*cos(theta*.45+seed*17.0)+.055*sin(time*.23+seed*11.0));
  float roll=(seed-.5)*.18+field*(.105+.035*sin(theta+seed*7.0+time*.14));
  return vec4(yaw,pitch,roll,field*.14);
}
float photoFit(vec4 pose,float ratio){
  float cy=cos(pose.x),sy=sin(pose.x),cp=cos(pose.y),sp=sin(pose.y),c=cos(pose.z),s=sin(pose.z);
  float w=min(ratio,1.0),h=min(1.0/ratio,1.0);
  float bx=abs(cy*c)*w+abs(sy*sp*c-cp*s)*h;
  float by=abs(cy*s)*w+abs(sy*sp*s+cp*c)*h;
  float depth=1.0-pose.w*.5*(abs(sy)*w+abs(cy*sp)*h);
  return min(1.0,min(w*1.08*depth/bx,h*1.08*depth/by));
}
`;
