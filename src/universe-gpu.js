import { createOrbit, PARTICLE_COUNT, ease } from "./universe-camera.js";
import { createOrbitComposition, compositionAt } from "./orbit-composition.js";
import { assignOrbitPhotos, planPhotoAtlas } from "./photo-textures.js";

// A photographic halo plus 32,768 persistent orbiting photo sprites. No engine dependency.
const vertex = `
attribute vec2 aPosition;
varying vec2 vScreen;
void main(){vScreen=vec2((aPosition.x+1.0)*0.5,(1.0-aPosition.y)*0.5);gl_Position=vec4(aPosition,0.0,1.0);}
`;
// The background ray and every photo use one world-space camera. Camera yaw
// changes position, parallax, disk perspective and shadow occlusion together.
const cameraGLSL = `
uniform vec3 uEye;
uniform vec3 uRight;
uniform vec3 uDown;
uniform vec3 uBack;
uniform float uFocal;
uniform vec2 uCenter;
vec3 cameraRay(vec2 pixel){
  vec2 p=(pixel-uCenter)/uFocal;
  return normalize(uRight*p.x+uDown*p.y-uBack);
}
float holeHit(vec3 ray){
  vec3 origin=uEye-vec3(0.0,-.045/1.776833,0.0);
  float b=dot(origin,ray);
  float d=b*b-dot(origin,origin)+.088*.088;
  if(d<=0.0)return 10000.0;
  float hit=-b-sqrt(d);
  return hit>0.0?hit:10000.0;
}
float smooth5(float x){x=clamp(x,0.0,1.0);return x*x*x*(x*(x*6.0-15.0)+10.0);}
`;
const fragment = `
precision highp float;
varying vec2 vScreen;
uniform sampler2D uWide;
uniform sampler2D uDetail;
uniform vec2 uViewport;
uniform vec4 uCamera;
uniform vec4 uState; // simulation time, photo reveal, vignette, detail reveal
uniform float uCover;
uniform float uZoom;
uniform float uViewAngle;
uniform float uOrbitBlend;
uniform float uShowcase;
${cameraGLSL}

float luminance(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec4 wide(vec2 uv){
  float inside=step(0.0,uv.x)*step(uv.x,1.0)*step(0.0,uv.y)*step(uv.y,1.0);
  return mix(vec4(.031,.035,.043,1.0),texture2D(uWide,uv),inside);
}
// Analytic ray/tilted-plane intersections avoid a costly ray march. The same
// photographic filaments remain on the disk as the camera travels around it.
vec3 spatialScene(vec2 pixel,float time){
  vec3 ray=cameraRay(pixel);
  vec3 origin=uEye-vec3(0.0,-.045/1.776833,0.0);
  float along=-dot(origin,ray);
  float impact=length(origin+ray*along);
  float shadow=holeHit(ray);
  vec3 color=vec3(.025,.029,.037);
  // Distant stars stay in world space, rather than following the photos.
  vec2 sky=vec2(atan(ray.x,-ray.z),asin(ray.y))*900.0;
  vec2 cell=floor(sky);
  float star=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
  color+=vec3(.24,.26,.28)*step(.9984,star)*
    (1.0-smoothstep(.03,.22,length(fract(sky)-.5)));
  // A photon ring and the folded far-side light form the familiar high arch.
  vec3 towards=vec3(0.0,-.045/1.776833,0.0)-uEye;
  vec2 center=uCenter+vec2(dot(towards,uRight),dot(towards,uDown))*uFocal/
    max(.028,-dot(towards,uBack));
  float holeDepth=max(.028,-dot(towards,uBack));
  vec2 delta=(pixel-center)*holeDepth/uFocal;
  vec2 sourceUV=vec2(.5,.43)+delta*vec2(1.0,1.776833);
  vec2 polar=delta/vec2(.17,.169);
  float phi=atan(polar.y,polar.x),radius=length(polar);
  float angle=phi-time*.075/(radius+.65);
  vec2 spun=vec2(.5,.43)+vec2(cos(angle),sin(angle))*radius*vec2(.17,.30);
  float guard=smoothstep(.088,.12,impact);
  vec2 mapped=mix(sourceUV,spun,.28*guard);
  vec3 lens=wide(mapped).rgb;
  // Keep the photographic, turbulent high arch; the horizontal material is
  // supplied by the actual 3D disk below, sharing depth with the photo stream.
  float band=abs(sourceUV.y-(.35+.26*sourceUV.x));
  float ringMask=smoothstep(.045,.11,band)*
    (1.0-smoothstep(1.4,2.0,radius));
  float photon=exp(-pow((impact-.090)/.0018,2.0))*.28;
  color+=lens*ringMask+vec3(1.0,.87,.68)*photon;
  if(shadow<9999.0)color=vec3(.008,.009,.012);
  vec3 normal=vec3(-.26/1.776833,1.0,-.19/1.776833);
  float denom=dot(ray,normal);
  float t=-dot(uEye,normal)/denom;
  if(abs(denom)>.00001 && t>0.0 && t<shadow){
    vec3 point=uEye+ray*t;
    float r=length(point.xz),theta=atan(point.z,point.x);
    float edge=smoothstep(.087,.122,r)*(1.0-smoothstep(.58,.68,r));
    float phase=theta-time*.115*pow(.28/max(.105,r),1.5);
    // Flow the reference's surface detail along the actual plane, rather than
    // spinning a rectangular black-hole image across the viewport.
    vec2 samplePoint=vec2(cos(phase),sin(phase))*r;
    vec2 uv=vec2(.5+samplePoint.x*5.0/(5.0-samplePoint.y),
      .475+(.26*samplePoint.x+.19*samplePoint.y)*5.0/(5.0-samplePoint.y));
    vec3 grain=wide(uv).rgb;
    float filaments=.5+.5*sin(r*1700.0+sin(phase*19.0+r*130.0)*1.8);
    float brightness=clamp((.15+luminance(grain)*.95+filaments*.035)*
      (.55+.55*pow(.14/max(.14,r),.7)),.05,.90);
    vec3 disk=mix(vec3(.60,.28,.12),vec3(1.0,.89,.69),brightness)*brightness;
    color=mix(color,disk,edge*.9);
  }
  return color;
}
void main(){
  vec2 pixel=vScreen*uViewport;
  vec2 uv=(pixel-uCamera.xy)/uCamera.zw;
  float time=uState.x;
  float diskD=uv.y-(.35+.26*uv.x);

  // Differential rotation is confined to the luminous annulus. Neither the
  // shadow nor the star field is rotated like a flat photograph.
  vec2 center=vec2(.5,.445),radii=vec2(.17,.30);
  vec2 polar=(uv-center)/radii;
  float radius=length(polar),theta=atan(polar.y,polar.x);
  float shadowGuard=smoothstep(1.0,1.32,length((uv-vec2(.5,.458))/vec2(.12,.22)));
  float annulus=smoothstep(.64,.86,radius)*(1.0-smoothstep(1.2,1.65,radius))*shadowGuard;
  float angle=theta-time*.095/(radius+.65)-uViewAngle*.4;
  vec2 spun=center+vec2(cos(angle),sin(angle))*radius*radii;
  vec2 ringUV=mix(uv,spun,annulus*.78);

  // The near side of a rotating, inclined disk moves sideways across the view.
  // The physical photo particles rotate separately with radius-dependent speed.
  float drift=.017*sin(time*.82+diskD*47.0)+.007*sin(time*1.31+uv.x*17.0-diskD*71.0);
  float diskMask=(1.0-smoothstep(.035,.13,abs(diskD)))*mix(shadowGuard,1.0,smoothstep(-.04,.012,diskD));
  vec2 diskUV=uv+vec2(drift,.26*drift);
  vec2 mapped=mix(ringUV,diskUV,diskMask);
  vec3 original=wide(uv).rgb;
  vec3 plasma=mix(original,wide(mapped).rgb,.65*smoothstep(.04,.3,luminance(original)));
  vec2 detailUV=(mapped-vec2(.513,.360))*3.0;
  vec4 detail=texture2D(uDetail,detailUV);
  float detailInside=step(0.0,detailUV.x)*step(detailUV.x,1.0)*step(0.0,detailUV.y)*step(detailUV.y,1.0);
  plasma=mix(plasma,detail.rgb,detail.a*detailInside*uState.w*smoothstep(.025,.10,luminance(original)));
  float orbitLight=1.0+.09*sin(theta*13.0-time*1.7+radius*23.0)*annulus;
  plasma*=orbitLight;

  // The unresolved plasma radiance falls away as individual cards become
  // optically resolvable. Geometry and photo positions remain unchanged.
  vec3 radiance=plasma;
  if(uOrbitBlend>.001)radiance=mix(plasma,spatialScene(pixel,time),uOrbitBlend);
  vec3 color=radiance*mix(1.0,.10,smoothstep(4.0,18.0,uZoom))*(1.0-.25*uShowcase);
  float vignette=smoothstep(.12,.83,length((pixel-uViewport*vec2(.5,.45))/max(uViewport.x,uViewport.y)));
  float shade=mix(uState.z*.65,min(.84,uState.z+.24),vignette);
  color=mix(color,vec3(.031,.035,.043),shade);
  float coverShade=smoothstep(.44,1.0,vScreen.y)*uCover*.92;
  color=mix(color,vec3(.063,.059,.055),coverShade);
  gl_FragColor=vec4(color,1.0);
}
`;

const orbitVertex = `
precision highp float;
attribute vec4 aOrbit; // radius, initial phase, thickness, stable identity
attribute vec2 aPhoto; // stable image id and original width/height
attribute float aFade;
uniform float uLayer;
uniform float uComposition;
uniform float uShowcase;
varying float vAspect;
varying float vPhotoId;
uniform vec2 uViewport;
${cameraGLSL}
varying float vDepth;
uniform float uTime;
uniform float uDpr;
uniform float uPointLimit;
uniform float uLens;
uniform float uLensFade;
varying vec4 vPhoto; // id, apparent size, rotation, opacity
varying float vHeat;
varying vec2 vOffset;
void main(){
  vPhotoId=aPhoto.x;
  vAspect=aPhoto.y;
  float seed=aOrbit.w;
  float radial=aOrbit.x*aOrbit.x-.075*.075-.0007*uTime;
  float span=.64*.64-.075*.075;
  float cycles=floor(radial/span);
  float r=sqrt(.075*.075+radial-cycles*span);
  float theta=aOrbit.y+4.0*.115*pow(.28,1.5)/.0007*
    (sqrt(aOrbit.x)-sqrt(r)-cycles*(sqrt(.64)-sqrt(.075)));
  float x=cos(theta)*r,z=sin(theta)*r;
  float y=.26*x+.19*z+aOrbit.z;
  float mask=smooth5((r-.087)/.035)*(1.0-smooth5((r-.61)/.03));
  // Secondary images of the far disk bend above and below the shadow. These
  // reuse the same particle identity and angular velocity as the physical disk.
  if(uLens>.5){
    mask=(1.0-smoothstep(-.035,.0,z))*.32*uLensFade;
    float band=(r-.14)/.50;
    x=cos(theta)*(.112+.085*band);
    y=sin(theta)*(.20+.15*band)+.10*x-.025;
    if(uLens>1.5)y=-y*.62+.032;
    z=-.01;
  }
  vec3 relative=vec3(x,y/1.776833,z)-uEye;
  float distance=-dot(relative,uBack);
  float scale=uFocal/max(.028,distance);
  vec2 pixel=uCenter+vec2(dot(relative,uRight),dot(relative,uDown))*scale;
  vDepth=distance;

  float grain=fract(seed*97.13);
  float dustSize=.00018+seed*.00038;
  float heroSize=.003+seed*.0018;
  float worldSize=dustSize;
  if(uLayer>.5){
    worldSize=heroSize*(1.0+.25*uShowcase);
    if(uLayer<1.5)mask*=step(.88,grain)*(1.0-uComposition);
    else {
      worldSize*=1.35;
      mask*=aFade*uComposition;
    }
  }
  float size=min(min(190.0,uViewport.x*.36),worldSize*scale);
  if(uLens>.5)size*=.60;
  mask*=smoothstep(.028,.075,distance);
  if(distance<=.028||pixel.x < -size||pixel.x>uViewport.x+size||pixel.y < -size||pixel.y>uViewport.y+size)mask=0.0;
  // Keep partially visible cards alive when their centers leave the viewport.
  // WebGL point clipping otherwise makes a whole photo pop off at the edge.
  float footprint=max(1.2/uDpr,size*1.3);
  vec2 bounded=clamp(pixel,vec2(.001),uViewport-vec2(.001));
  vOffset=(bounded-pixel)/footprint;
  vec2 clip=bounded/uViewport*2.0-1.0;
  gl_Position=mask>.001?vec4(clip.x,-clip.y,clamp(distance/6.0*2.0-1.0,-.999,.999),1.0):vec4(2.0,2.0,2.0,1.0);
  gl_PointSize=mask>.001?min(uPointLimit,footprint*uDpr):1.0;
  // Tiny tilted cards merge into light filaments. The same cards become legible
  // through perspective magnification, with no new grid or new positions.
  float readable=smoothstep(2.0,mix(28.0,12.0,uShowcase),size);
  float radialSpeed=-.0007/(2.0*r),angularSpeed=.115*pow(.28/r,1.5);
  float vx=cos(theta)*radialSpeed-sin(theta)*r*angularSpeed;
  float vz=sin(theta)*radialSpeed+cos(theta)*r*angularSpeed;
  vec3 velocity=vec3(vx,(.26*vx+.19*vz)/1.776833,vz);
  vec2 tangentVector=vec2(dot(velocity,uRight),dot(velocity,uDown))*distance+
    vec2(dot(relative,uRight),dot(relative,uDown))*dot(velocity,uBack);
  float tangent=atan(tangentVector.y,tangentVector.x);
  vPhoto=vec4(seed,size,mix(tangent,(seed-.5)*.18,readable),mask);
  vHeat=(1.0-smoothstep(.14,.64,r))*.36+seed*.20;
}
`;
const orbitFragment = `
precision highp float;
varying float vPhotoId;
varying float vAspect;
uniform sampler2D uPhotos;
uniform vec3 uAtlas;
uniform float uShade;
uniform float uLayer;
uniform float uComposition;
uniform float uShowcase;
uniform float uDpr;
uniform float uCover;
uniform vec2 uViewport;
${cameraGLSL}
varying float vDepth;
varying vec4 vPhoto;
varying float vHeat;
varying vec2 vOffset;
void main(){
  if(vPhoto.w<.001)discard;
  // Clip each fragment against the horizon. Cards pass behind the silhouette
  // progressively, without disappearing whole when their centers cross it.
  vec2 pixel=vec2(gl_FragCoord.x/uDpr,uViewport.y-gl_FragCoord.y/uDpr);
  vec3 ray=cameraRay(pixel);
  if(holeHit(ray)<vDepth/max(.001,dot(ray,-uBack)))discard;
  float size=vPhoto.y, readable=smoothstep(2.0,mix(28.0,12.0,uShowcase),size);
  vec2 p=(gl_PointCoord-vec2(.5)+vOffset)*1.3;
  float c=cos(vPhoto.z),s=sin(vPhoto.z);
  p=mat2(c,-s,s,c)*p;
  p.x/=min(vAspect,1.0);
  p.y/=min(1.0/vAspect,1.0)*mix(.28,1.0,smoothstep(1.5,12.0,size));
  float edge=max(abs(p.x),abs(p.y));
  if(edge>.5)discard;
  vec2 local=p+vec2(.5);
  float id=clamp(floor(vPhotoId+.5),0.0,uAtlas.z-1.0);
  vec2 tile=vec2(mod(id,uAtlas.x),floor(id/uAtlas.x));
  vec3 photo=texture2D(uPhotos,(tile+mix(vec2(.006),vec2(.994),local))/uAtlas.xy).rgb;
  float border=smoothstep(.48,.495,edge)*readable;
  photo=mix(photo,vec3(.91,.87,.79),border*.55);
  float lum=dot(photo,vec3(.2126,.7152,.0722));
  vec3 ember=mix(vec3(.68,.30,.095),vec3(1.0,.90,.66),vHeat+.22)*(.65+lum*.75);
  vec3 color=mix(ember,photo,readable);
  float opacity=mix(.72,.98,readable)*vPhoto.w;
  opacity*=mix(1.0-smoothstep(.20,.5,edge),1.0,readable);
  if(uLayer<.5)opacity*=mix(1.0,.60,uComposition);
  if(opacity<.025)discard;
  vec2 screen=gl_FragCoord.xy/(uViewport*uDpr);
  float shade=uShade*(.65+.25*length(screen-.5));
  color=mix(color,vec3(.031,.035,.043),shade);
  color=mix(color,vec3(.063,.059,.055),smoothstep(.44,1.0,1.0-screen.y)*uCover*.92);
  gl_FragColor=vec4(color,opacity);
}
`;

export function createUniverseGPU(canvas) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  let background,
    particles,
    textures,
    quadBuffer,
    orbitBuffer,
    photoBuffer,
    focusBuffer,
    last;
  const sources = { wide: null, detail: null, photos: null };
  const orbit = createOrbit();
  const composition = createOrbitComposition(orbit);
  let ratios = [];
  let photoIds = new Float32Array(PARTICLE_COUNT);
  let photoAttributes = new Float32Array(PARTICLE_COUNT * 2);
  const maxTextureSize = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));
  let atlas = [1, 1, 1];
  const pointLimit = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
  function compile(type, code) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw Error(message);
    }
    return shader;
  }
  function program(v, f, uniforms, attribute) {
    const vs = compile(gl.VERTEX_SHADER, v),
      fs = compile(gl.FRAGMENT_SHADER, f);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(p));
    return {
      program: p,
      attribute: gl.getAttribLocation(p, attribute),
      uniforms: Object.fromEntries(
        uniforms.map((n) => [n, gl.getUniformLocation(p, n)]),
      ),
    };
  }
  function upload(slot, source) {
    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, textures[slot]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (source)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
    else
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([8, 9, 11, 0]),
      );
  }
  function initialize() {
    background = program(
      vertex,
      fragment,
      [
        "uViewport",
        "uCamera",
        "uState",
        "uCover",
        "uWide",
        "uDetail",
        "uZoom",
        "uShowcase",
        "uViewAngle",
        "uOrbitBlend",
        "uEye",
        "uRight",
        "uDown",
        "uBack",
        "uFocal",
        "uCenter",
      ],
      "aPosition",
    );
    particles = program(
      orbitVertex,
      orbitFragment,
      [
        "uViewport",
        "uLayer",
        "uComposition",
        "uShowcase",
        "uEye",
        "uRight",
        "uDown",
        "uBack",
        "uFocal",
        "uCenter",
        "uTime",
        "uDpr",
        "uPointLimit",
        "uLens",
        "uLensFade",
        "uPhotos",
        "uAtlas",
        "uShade",
        "uCover",
      ],
      "aOrbit",
    );
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    particles.photoAttribute = gl.getAttribLocation(
      particles.program,
      "aPhoto",
    );
    particles.fadeAttribute = gl.getAttribLocation(particles.program, "aFade");
    focusBuffer = gl.createBuffer();
    photoBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, photoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, photoAttributes, gl.STATIC_DRAW);
    orbitBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, orbit, gl.STATIC_DRAW);
    textures = [0, 1, 2].map(() => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    });
    ["wide", "detail", "photos"].forEach((n, i) => upload(i, sources[n]));
  }
  try {
    initialize();
  } catch {
    return null;
  }
  function setCameraUniforms(u, camera) {
    gl.uniform3fv(u.uEye, camera.eye);
    gl.uniform3fv(u.uRight, camera.right);
    gl.uniform3fv(u.uDown, camera.down);
    gl.uniform3fv(u.uBack, camera.back);
    gl.uniform1f(u.uFocal, camera.focal);
    gl.uniform2f(u.uCenter, camera.centerX, camera.centerY);
  }
  function draw(args) {
    last = args;
    if (gl.isContextLost()) return;
    const { camera, width, height, time, detail, cover, showcase = 0 } = args;
    const dpr = canvas.width / width;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearDepth(1);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    textures.forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
    });
    gl.useProgram(background.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(background.attribute);
    gl.vertexAttribPointer(background.attribute, 2, gl.FLOAT, false, 0, 0);
    let u = background.uniforms;
    gl.uniform1i(u.uWide, 0);
    gl.uniform1i(u.uDetail, 1);
    gl.uniform2f(u.uViewport, width, height);
    gl.uniform4f(u.uCamera, camera.x, camera.y, camera.width, camera.height);
    gl.uniform4f(u.uState, time, camera.photoMix, camera.shade, detail);
    gl.uniform1f(u.uCover, cover);
    gl.uniform1f(u.uZoom, camera.zoom);
    gl.uniform1f(u.uShowcase, showcase);
    gl.uniform1f(u.uViewAngle, camera.viewAngle || 0);
    gl.uniform1f(u.uOrbitBlend, camera.orbitBlend);
    setCameraUniforms(u, camera);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(background.attribute);

    gl.useProgram(particles.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuffer);
    gl.enableVertexAttribArray(particles.attribute);
    gl.vertexAttribPointer(particles.attribute, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, photoBuffer);
    gl.enableVertexAttribArray(particles.photoAttribute);
    gl.vertexAttribPointer(particles.photoAttribute, 2, gl.FLOAT, false, 0, 0);
    u = particles.uniforms;
    gl.uniform2f(u.uViewport, width, height);
    setCameraUniforms(u, camera);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uDpr, dpr);
    gl.uniform1f(u.uPointLimit, pointLimit);
    gl.uniform1i(u.uPhotos, 2);
    gl.uniform3fv(u.uAtlas, atlas);
    gl.uniform1f(u.uShade, camera.shade);
    gl.uniform1f(u.uCover, cover);
    gl.uniform1f(u.uComposition, compositionAt(camera.zoom));
    gl.uniform1f(u.uShowcase, showcase);
    gl.uniform1f(u.uLayer, 0);
    gl.disableVertexAttribArray(particles.fadeAttribute);
    gl.vertexAttrib1f(particles.fadeAttribute, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // The lens images are behind the physical near side; the particles then
    // occlude each other by their actual depth instead of array order.
    gl.uniform1f(
      u.uLensFade,
      (1 - ease((camera.zoom - 5) / 7)) * (1 - camera.orbitBlend),
    );
    if (camera.zoom < 12) {
      gl.uniform1f(u.uLens, 1);
      gl.drawArrays(gl.POINTS, 0, 4096);
      gl.uniform1f(u.uLens, 2);
      gl.drawArrays(gl.POINTS, 0, 4096);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.uniform1f(u.uLens, 0);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    gl.uniform1f(u.uLayer, 1);
    if (compositionAt(camera.zoom) < 1)
      gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    const focused = composition.update({
      camera,
      width,
      height,
      time,
      photoIds,
      ratios,
      now: performance.now(),
      reduced: args.reduced,
    });
    const packed = new Float32Array(focused.length * 7);
    for (let i = 0; i < focused.length; i++) {
      const { index, alpha } = focused[i];
      packed.set(orbit.subarray(index * 4, index * 4 + 4), i * 7);
      packed[i * 7 + 4] = photoIds[index];
      packed[i * 7 + 5] = ratios[photoIds[index]] || 0.8;
      packed[i * 7 + 6] = alpha;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, focusBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, packed, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(particles.attribute, 4, gl.FLOAT, false, 28, 0);
    gl.vertexAttribPointer(
      particles.photoAttribute,
      2,
      gl.FLOAT,
      false,
      28,
      16,
    );
    gl.enableVertexAttribArray(particles.fadeAttribute);
    gl.vertexAttribPointer(particles.fadeAttribute, 1, gl.FLOAT, false, 28, 24);
    gl.uniform1f(u.uLayer, 2);
    // Keep the focal portraits clear of the ambient photographic dust.
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, focused.length);
    canvas.dataset.focusPhotos = String(
      focused.filter((p) => p.alpha > 0.5).length,
    );
    gl.disableVertexAttribArray(particles.fadeAttribute);
    gl.disableVertexAttribArray(particles.attribute);
    gl.disableVertexAttribArray(particles.photoAttribute);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
  }
  function setPhotos(images) {
    const count = images.length || 6;
    ratios = images.map((image) => image.width / image.height);
    const {
      columns: cols,
      rows,
      tileWidth,
      tileHeight,
      width,
      height,
    } = planPhotoAtlas(count, maxTextureSize);
    const sheet = document.createElement("canvas");
    sheet.width = width;
    sheet.height = height;
    const ctx = sheet.getContext("2d");
    for (let i = 0; i < count; i++) {
      const x = (i % cols) * tileWidth,
        y = Math.floor(i / cols) * tileHeight;
      if (images.length) ctx.drawImage(images[i], x, y, tileWidth, tileHeight);
      else {
        // Blank, warm photo mounts until the owner supplies personal images.
        ctx.fillStyle = [
          "#928375",
          "#c3b7a4",
          "#ad9c87",
          "#776b5f",
          "#d6cbb8",
          "#a38a72",
        ][i];
        ctx.fillRect(x, y, 256, 320);
        ctx.strokeStyle = "#f1e7d9a0";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 12, y + 12, 232, 296);
        ctx.strokeStyle = "#f3e9d350";
        ctx.beginPath();
        ctx.arc(x + 128, y + 138, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 70, y + 210);
        ctx.lineTo(x + 110, y + 175);
        ctx.lineTo(x + 140, y + 194);
        ctx.lineTo(x + 180, y + 160);
        ctx.stroke();
      }
    }
    photoIds = images.length
      ? assignOrbitPhotos(orbit, count)
      : Float32Array.from({ length: PARTICLE_COUNT }, (_, i) => i % count);
    photoAttributes = new Float32Array(PARTICLE_COUNT * 2);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const image = images[photoIds[i]];
      photoAttributes[i * 2] = photoIds[i];
      photoAttributes[i * 2 + 1] = image ? image.width / image.height : 0.8;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, photoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, photoAttributes, gl.STATIC_DRAW);
    canvas.dataset.atlasWidth = String(width);
    canvas.dataset.atlasHeight = String(height);
    canvas.dataset.atlasTile = String(tileWidth);
    atlas = [cols, rows, count];
    sources.photos = sheet;
    upload(2, sheet);
  }
  setPhotos([]);
  canvas.addEventListener("webglcontextlost", (event) =>
    event.preventDefault(),
  );
  canvas.addEventListener("webglcontextrestored", () => {
    initialize();
    if (last) draw(last);
  });
  return {
    draw,
    setPhotos,
    setPlate(source) {
      sources.wide = source;
      upload(0, source);
    },
    setDetail(source) {
      sources.detail = source;
      upload(1, source);
    },
  };
}
