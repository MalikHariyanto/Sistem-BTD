import { ease, mix, photoFieldAt, diskY } from "./universe-camera.js";
import { projectPhotoSurface } from "./photo-surface.js";

// The tip, not the photograph's center, belongs to the physical orbit. All
// dimensions are relative to the original photo, so portrait/landscape remain
// intact and a distant marker is genuinely smaller than a near one.
export const CRYSTAL_TIP = .80;
export const CRYSTAL_FOOTPRINT = 2.6;
export const CRYSTAL_CONTACT = { top: -.012, topFull: .006, bottomFull: .075, bottom: .13 };
export function crystalStrength(point, camera) {
  const facing = (camera.cx * point.x + camera.distance * point.depth) / point.radius - point.radius;
  return photoFieldAt(camera.progress ?? 0) * ease((facing - .012) / .045);
}

// The annulus has a broad population of physical orbits, but only its lit
// upper surface should resolve into standing markers. Keep the actual source
// phase/depth on that surface; fade a marker when it leaves the luminous band.
export function crystalContact(projected, camera) {
  const u = (projected.x - camera.x) / camera.width;
  const v = (projected.y - camera.y) / camera.height;
  const d = v - diskY(u), c = CRYSTAL_CONTACT;
  const band = ease((d-c.top)/(c.topFull-c.top)) *
    (1-ease((d-c.bottomFull)/(c.bottom-c.bottomFull)));
  return mix(1, band, projected.crystal || 0);
}

export function crystalVeil(projected, camera) {
  const u = (projected.x - camera.x) / camera.width;
  const v = (projected.y - camera.y) / camera.height;
  const above = diskY(u) - v;
  const field = photoFieldAt(camera.progress ?? 0);
  // Optical photographs merge continuously into the upper plasma. The lower
  // rear image also recedes; readable crystal markers belong to the near disk.
  const near = field > 0 ? Math.min(1, (projected.crystal || 0) / field) : 1;
  return mix(1, mix(.28, 1, near) * (1 - .96 * ease((above - .01) / .26)) *
    (1 - .58 * ease((-above - .065) / .22)), field);
}

export function crystalCenter(projected, ratio, surface, strength) {
  const tip = projectPhotoSurface(0, CRYSTAL_TIP, ratio, surface);
  return { x: projected.x - tip.x * projected.size * strength,
    y: projected.y - tip.y * projected.size * strength };
}

export function crystalBounds(projected, ratio, gap = 0) {
  const pin = projected.crystal || 0;
  const w = projected.size * Math.min(ratio, 1), h = projected.size * Math.min(1 / ratio, 1);
  // Include the raised frame, refracted sidewall, tip and its compact caustic.
  // A conservative envelope avoids sampling trigonometry for every candidate.
  return { left: projected.x - w * mix(.56, .86, pin) - gap,
    right: projected.x + w * mix(.56, .86, pin) + gap,
    top: projected.y - h * mix(.56, 1.52, pin) - gap,
    bottom: projected.y + h * mix(.56, .16, pin) + gap };
}

// Reserve the wide photo body and the tapering foot independently. A single
// rectangle wastes the empty space beside a tall pin's transparent stem and
// makes a populated, thin disk look sparse. Outside the crystal passage this
// reduces to the original photo rectangle, preserving the intimate ending.
export function crystalFootprint(projected, ratio, gap = 0) {
  const pin = projected.crystal || 0;
  const w = projected.size * Math.min(ratio, 1), h = projected.size * Math.min(1 / ratio, 1);
  if (pin < .001) return [crystalBounds(projected, ratio, gap)];
  return [[.86,-1.52,-.20],[.40,-.20,-.10],[.20,-.10,.16]].map(([half,top,bottom]) => ({
    left: projected.x-w*mix(.56,half,pin)-gap,
    right: projected.x+w*mix(.56,half,pin)+gap,
    top: projected.y+h*mix(-.56,top,pin)-gap,
    bottom: projected.y+h*mix(.56,bottom,pin)+gap,
  }));
}

export const crystalFootprintsOverlap = (a,b) => a.some(x => b.some(y =>
  x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top));

export const CRYSTAL_OUTER = [[-.43,-.57],[.43,-.57],[.57,-.43],[.57,.393],[.32,.571],[0,CRYSTAL_TIP],[-.32,.571],[-.57,.393],[-.57,-.43]];
const INNER = [[-.42,-.5],[.42,-.5],[.5,-.42],[.5,.42],[.42,.5],[0,.5],[-.42,.5],[-.5,.42],[-.5,-.42]];

// Canvas fallback: the same projected facets and anchored tip, with a small
// two-triangle texture mesh. No filtered image copy or pixel reads per frame.
export function paintCrystalPin(ctx, image, projected, ratio, surface, strength, light) {
  const size = projected.size, center = crystalCenter(projected, ratio, surface, strength);
  const project = ([u,v]) => {
    const p = projectPhotoSurface(u, v, ratio, surface);
    return [center.x - projected.x + p.x * size, center.y - projected.y + p.y * size];
  };
  const outer = CRYSTAL_OUTER.map(project), inner = INNER.map(project);
  const path = vertices => {
    ctx.beginPath(); vertices.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
  };
  const alpha = ctx.globalAlpha;
  ctx.save();
  ctx.globalAlpha = alpha * strength * .22;
  // Recessed shadow makes the transparent bevel have a real sidewall.
  ctx.translate(size * .018, size * .024);
  path(outer); ctx.fillStyle = "#192126"; ctx.fill();
  ctx.translate(-size * .018, -size * .024);
  ctx.globalAlpha = alpha * strength;
  const shades = [.96,.76,.30,.85,.39,.88,.33,.72,.45];
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    const brightness = Math.min(1, shades[i] + surface.normal[0] * .15 + surface.normal[1] * .12);
    const pale = Math.round(95 + brightness * 155);
    path([outer[i], outer[j], inner[j], inner[i]]);
    ctx.fillStyle = `rgba(${pale},${Math.min(255,pale+3)},${Math.min(255,pale+6)},${i === 4 || i === 5 ? .46 : .72})`;
    ctx.fill(); ctx.strokeStyle = "#f5f6f37a"; ctx.lineWidth = .4; ctx.stroke();
  }
  ctx.save(); path(inner); ctx.clip(); ctx.globalAlpha = alpha;
  if (image) {
    const corners = [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(project);
    const uv = [[0,0],[image.width,0],[image.width,image.height],[0,image.height]];
    for (const indices of [[0,1,2],[0,2,3]]) {
      const [a,b,c] = indices.map(i => corners[i]), [s,t,u] = indices.map(i => uv[i]);
      const det = (t[0]-s[0])*(u[1]-s[1])-(u[0]-s[0])*(t[1]-s[1]);
      const m = [(b[0]-a[0])*(u[1]-s[1])-(c[0]-a[0])*(t[1]-s[1]),
        (b[1]-a[1])*(u[1]-s[1])-(c[1]-a[1])*(t[1]-s[1]),
        (c[0]-a[0])*(t[0]-s[0])-(b[0]-a[0])*(u[0]-s[0]),
        (c[1]-a[1])*(t[0]-s[0])-(b[1]-a[1])*(u[0]-s[0])].map(x => x / det);
      ctx.save(); path([a,b,c]); ctx.clip();
      ctx.transform(...m, a[0]-m[0]*s[0]-m[2]*s[1], a[1]-m[1]*s[0]-m[3]*s[1]);
      ctx.drawImage(image,0,0); ctx.restore();
    }
  } else { ctx.fillStyle = "#b5a792"; ctx.fillRect(-size,-size,size*2,size*2); }
  ctx.restore();
  ctx.globalAlpha = alpha * strength;
  path(outer); ctx.strokeStyle = "#f8f5e5cd"; ctx.lineWidth = Math.max(.55,size*.008); ctx.stroke();
  const gleam = outer[0], shine = Math.max(1.5,size*.035);
  ctx.strokeStyle = `rgba(255,255,250,${.65+.3*light})`; ctx.lineWidth = .65;
  ctx.beginPath(); ctx.moveTo(gleam[0]-shine,gleam[1]);ctx.lineTo(gleam[0]+shine,gleam[1]);
  ctx.moveTo(gleam[0],gleam[1]-shine*1.6);ctx.lineTo(gleam[0],gleam[1]+shine*1.6);ctx.stroke();
  // A compact caustic at the true orbital position. The frame and this point
  // share the same source, depth and fade, so nothing stays pinned to the screen.
  const r = Math.max(1.6,size*.045);
  const glow=ctx.createRadialGradient(0,0,0,0,0,r*2.5);
  glow.addColorStop(0,"#fffdf4d9"); glow.addColorStop(.25,"#fff8df80"); glow.addColorStop(1,"#fff8df00");
  ctx.fillStyle=glow;ctx.fillRect(-r*2.5,-r*2.5,r*5,r*5);
  ctx.fillStyle="#fffef4";ctx.beginPath();ctx.ellipse(0,0,r*.8,r*.28,.146,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

export const crystalPinGLSL = `
vec2 photoProject(vec2 p,vec2 extent,vec4 tilt,float roll){
  float cy=cos(tilt.x),sy=sin(tilt.x),cp=cos(tilt.y),sp=sin(tilt.y);
  vec2 a=p*extent;
  vec3 q=vec3(cy*a.x+sy*sp*a.y,cp*a.y,-sy*a.x+cy*sp*a.y);
  vec2 plane=q.xy*tilt.w/(1.0-tilt.z*q.z);
  float c=cos(roll),s=sin(roll);
  return vec2(c*plane.x-s*plane.y,s*plane.x+c*plane.y);
}
float crystalHull(vec2 p){
  return max(max(abs(p.x)-.57,-p.y-.57),
    max((abs(p.x)-p.y-1.00)*.70710678,(.7142857*abs(p.x)+p.y-.80)*.813733));
}
float crystalWindow(vec2 p){return max(max(abs(p.x),abs(p.y))-.5,(abs(p.x)+abs(p.y)-.92)*.70710678);}
vec4 crystalMaterial(vec2 p,vec2 anchorDelta,vec3 normal,vec3 environment,float size,float dpr,float light,vec2 direction){
  float aa=.75/max(12.0,size*dpr),hull=crystalHull(p),window=crystalWindow(p);
  float shell=(1.0-smoothstep(-aa,aa,hull))*smoothstep(-aa,aa,window);
  vec2 n=vec2(sign(p.x),0.0);
  float edge=abs(p.x)-.57;
  if(-p.y-.57>edge){edge=-p.y-.57;n=vec2(0.0,-1.0);}
  if((abs(p.x)-p.y-1.00)*.70710678>edge){edge=(abs(p.x)-p.y-1.00)*.70710678;n=vec2(sign(p.x),-1.0)*.70710678;}
  if((.7142857*abs(p.x)+p.y-.80)*.813733>edge)n=normalize(vec2(.7142857*sign(p.x),1.0));
  float bevelBand=clamp(window/max(.001,window-hull),0.0,1.0);
  float cut=step(.32,bevelBand)+step(.72,bevelBand);
  vec3 facet=normalize(vec3(n*(.32+cut*.20),.94-cut*.18));
  if(p.y>.5)facet=normalize(vec3(sign(p.x)*.65,.24,.70));
  if(p.y>.5&&abs(p.x)<(.80-p.y)*.23)facet=normalize(vec3(-.12,-.25,.96));
  vec3 lamp=normalize(vec3(direction*.64,.84));
  float diffuse=max(0.0,dot(facet,lamp));
  float fresnel=pow(1.0-max(.05,dot(facet,normal)),3.0);
  float specular=pow(max(0.0,dot(reflect(-lamp,facet),normal)),28.0);
  float facets=step(0.0,p.x)*.10+step(.5,p.y)*(.18+sign(p.x)*.13);
  vec3 silver=mix(vec3(.32,.37,.40),vec3(.98,.99,1.0),clamp(.35+diffuse*.60+facets,0.0,1.0));
  vec3 glass=mix(silver,environment,.24)+vec3(1.0,.78,.44)*diffuse*(.035+.025*light);
  float rim=1.0-smoothstep(0.0,aa*1.3,abs(hull));
  float seam=1.0-smoothstep(0.0,aa*.7,abs(window));
  glass+=vec3(.94,.97,1.0)*(rim*.65+seam*.28+specular*.9+fresnel*.16);
  // Two narrow, directional facet glints, without bleaching the photograph.
  vec2 g=p-vec2(-.43,-.57);
  float glint=(exp(-length(g)*size*.75)+exp(-abs(g.x)*size*1.8-abs(g.y)*size*.25)*.6)*(.45+.55*diffuse);
  vec2 g2=p-vec2(.57,.393);
  glint+=exp(-length(g2)*size*.9)*(.20+.60*max(0.0,normal.x));
  glass+=vec3(1.0,.98,.91)*glint*.7;
  float starSize=max(1.2,size*.031);
  vec2 star=anchorDelta/starSize;
  float caustic=exp(-dot(star*vec2(.42,1.7),star*vec2(.42,1.7)))*.76;
  float halo=exp(-dot(star,star)*.20)*.15;
  float flare=exp(-abs(star.x)*1.8-abs(star.y)*.30)*.45;
  float anchor=clamp(caustic+halo+flare,0.0,1.0);
  float ridge=(1.0-smoothstep(0.0,aa*.65,abs(abs(p.x)-(.80-p.y)*.23)))*step(.5,p.y);
  glass+=vec3(.97,.99,1.0)*ridge*.38;
  float transparency=mix(.47+.24*diffuse,.26+.15*diffuse,step(.5,p.y));
  float sparkle=glint*.50*smoothstep(-aa,aa,window);
  float alpha=max(max(shell*clamp(transparency+rim*.38+seam*.18+specular*.25+ridge*.12,0.0,1.0),anchor),sparkle);
  vec3 color=mix(glass,vec3(1.0,.98,.91),max(anchor,sparkle));
  return vec4(color,alpha);
}
`;
