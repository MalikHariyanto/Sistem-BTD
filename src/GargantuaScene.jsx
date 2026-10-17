import React, { useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { createRoot, extend, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Effect, EffectAttribute, BlendFunction } from "postprocessing";
import * as THREE from "three";
import {
  PHOTO_COUNT,
  BLACK_HOLE_RADIUS,
  createPhotoOrbits,
  cameraPose,
} from "./gargantua-model.js";
import { planPhotoAtlas, assignPhotoIds } from "./photo-textures.js";

extend({
  Group: THREE.Group,
  Color: THREE.Color,
  Mesh: THREE.Mesh,
  InstancedMesh: THREE.InstancedMesh,
  PlaneGeometry: THREE.PlaneGeometry,
  SphereGeometry: THREE.SphereGeometry,
  MeshBasicMaterial: THREE.MeshBasicMaterial,
  ShaderMaterial: THREE.ShaderMaterial,
  Points: THREE.Points,
  BufferGeometry: THREE.BufferGeometry,
  BufferAttribute: THREE.BufferAttribute,
});
class SceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
// All visual geometry lives here: exactly one black sphere, one InstancedMesh
// containing 5,000 photographs, and a distant star field. No black-hole plates,
// second luminous disk, torus meshes, or copied optical-image geometries.
const photoVertex = `
attribute float aTile;
attribute float aHeat;
attribute float aSpin;
uniform vec2 uViewport;
uniform float uProgress;
varying vec2 vUv;
varying float vTile;
varying float vHeat;
varying float vReadable;
varying vec2 vDisk;
void main(){
  vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
  vec2 size=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
  float pixels=max(size.x,size.y)*uViewport.y*projectionMatrix[1][1]/max(.05,-center.z)*.5;
  float hero=step(.94,fract(aSpin*1.173));
  float settling=smoothstep(.60,.92,uProgress)*smoothstep(20.,50.,pixels);
  size*=mix(1.,mix(.11,1.,hero),settling);
  pixels*=mix(1.,mix(.11,1.,hero),settling);
  // The far half of this SAME annulus bends over the shadow. This optical
  // projection moves its existing instances; it never draws a second disk.
  float worldRadius=length(instanceMatrix[3].xz);
  float viewDepth=-center.z,cameraDistance=length(cameraPosition);
  float farSide=smoothstep(.02,.6,viewDepth-cameraDistance);
  float lensRadius=(1.045+.065*(worldRadius-1.14))*viewDepth/cameraDistance;
  float reach=1.-smoothstep(1.,1.6,abs(center.x)/lensRadius);
  float arch=sqrt(max(0.,lensRadius*lensRadius-center.x*center.x));
  float lensLift=max(0.,arch-center.y)*farSide*reach;
  float readable=smoothstep(5.,32.,pixels)*smoothstep(.03,.18,uProgress);
  // At a distance, neighboring photographic grains overlap into one luminous
  // surface. Resolve those same grains into individual cards during approach.
  // This fills the annulus without introducing another plasma mesh or layer.
  size*=mix(2.7,1.,readable);
  pixels*=mix(2.7,1.,readable);
  float cap=min(1.,min(170.,uViewport.x*.34)/max(1.,pixels));
  vec2 p=position.xy*size*cap;
  float c=cos(aSpin),s=sin(aSpin);
  vec2 planeOffset=mat2(c,-s,s,c)*p;
  vDisk=instanceMatrix[3].xz+planeOffset;
  vec4 lying=modelViewMatrix*(instanceMatrix*vec4(0.,0.,0.,1.)+vec4(planeOffset.x,0.,planeOffset.y,0.));
  float tilt=aSpin*.06;
  c=cos(tilt);s=sin(tilt);
  vec2 portrait=mat2(c,-s,s,c)*p;
  vec4 facing=center+vec4(portrait,0.,0.);
  lying.y+=lensLift;facing.y+=lensLift;
  gl_Position=projectionMatrix*mix(lying,facing,readable);
  vUv=uv;vTile=aTile;vHeat=aHeat;vReadable=readable;
}`;
const photoFragment = `
uniform sampler2D uPhotos;
uniform vec2 uAtlas;
varying vec2 vUv;
varying float vTile;
varying float vHeat;
varying float vReadable;
varying vec2 vDisk;
void main(){
  float id=floor(vTile+.5);
  vec2 tile=vec2(mod(id,uAtlas.x),floor(id/uAtlas.x));
  vec2 local=mix(vec2(.006),vec2(.994),vec2(vUv.x,1.-vUv.y));
  vec3 photo=texture2D(uPhotos,(tile+local)/uAtlas).rgb;
  float luma=dot(photo,vec3(.2126,.7152,.0722));
  vec3 warm=mix(vec3(.82,.25,.065),vec3(1.,.83,.55),vHeat);
  // Continuous radial filaments run across the existing photo surfaces. They
  // share disk coordinates, so distant overlapping quads read as flowing gas
  // rather than disconnected flat confetti. All emission resolves into photos.
  float r=length(vDisk),angle=atan(vDisk.y,vDisk.x);
  float bands=sin(r*85.+angle*12.+sin(angle*7.+r*4.)*6.+sin(angle*17.-r*6.)*1.5);
  float fine=sin(r*250.+angle*34.+sin(angle*9.+r*12.)*2.);
  float detail=1.-smoothstep(.007,.04,length(fwidth(vDisk)));
  float filaments=.72+.20*bands+.08*fine*detail;
  float outer=1.-smoothstep(4.8,6.65,r);
  vec3 plasma=warm*(.9+luma*.08)*(1.+vHeat*5.)*filaments*outer;
  vec3 color=mix(plasma,photo,vReadable);
  float edge=max(abs(vUv.x-.5),abs(vUv.y-.5));
  color=mix(color,vec3(.86,.77,.63),smoothstep(.479,.499,edge)*vReadable*.5);
  gl_FragColor=vec4(color,1.);
}`;

// A small screen-space deflection of existing light at the sphere's edge.
// Bloom is sourced solely from the photo material's HDR values.
class LensingEffect extends Effect {
  constructor() {
    super(
      "GravitationalDeflection",
      `
    uniform vec2 center;
    uniform vec2 screenAspect;
    uniform float radius;
    void mainUv(inout vec2 uv){
      vec2 delta=(uv-center)*screenAspect;
      float r=length(delta),ratio=r/max(.0001,radius);
      float band=smoothstep(1.01,1.12,ratio)*(1.-smoothstep(1.6,2.8,ratio));
      uv=center+delta*(1.-.055*band/max(1.,ratio*ratio))/screenAspect;
    }`,
      {
        blendFunction: BlendFunction.NORMAL,
        uniforms: new Map([
          ["center", new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
          ["screenAspect", new THREE.Uniform(new THREE.Vector2(1, 1))],
          ["radius", new THREE.Uniform(0.1)],
        ]),
      },
    );
  }
}
function Lens() {
  const effect = useMemo(() => new LensingEffect(), []);
  const { camera, size } = useThree();
  const center = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    center.set(0, 0, 0).project(camera);
    effect.uniforms
      .get("center")
      .value.set(center.x * 0.5 + 0.5, center.y * 0.5 + 0.5);
    effect.uniforms.get("screenAspect").value.set(size.width / size.height, 1);
    effect.uniforms.get("radius").value =
      (BLACK_HOLE_RADIUS /
        camera.position.length() /
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) *
      0.5;
  });
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} />;
}
// Preserve only pixels where the scene depth is the sphere's surface. Bloom
// remains outside the core, and an actual foreground photo keeps its color.
class HorizonShadowEffect extends Effect {
  constructor() {
    super(
      "HorizonShadow",
      `
    uniform mat4 inverseProjection;
    uniform vec2 nearFar;
    uniform float holeDistance;
    uniform float holeRadius;
    void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
      outputColor=inputColor;
      vec4 projected=inverseProjection*vec4(uv*2.-1.,1.,1.);
      vec3 ray=normalize(projected.xyz/projected.w);
      float b=holeDistance*ray.z;
      float discriminant=b*b-holeDistance*holeDistance+holeRadius*holeRadius;
      if(discriminant>0.){
        float surface=(-b-sqrt(discriminant))*(-ray.z);
        float depth=readDepth(uv);
        float actual=nearFar.x*nearFar.y/(nearFar.y-depth*(nearFar.y-nearFar.x));
        float spherePixel=1.-smoothstep(.008,.024,abs(surface-actual));
        float impact=length(vec3(0.,0.,holeDistance)+ray*(-b))/holeRadius;
        float core=1.-smoothstep(.82,.98,impact);
        outputColor.rgb=mix(inputColor.rgb,vec3(0.),spherePixel*core);
      }
    }`,
      {
        attributes: EffectAttribute.DEPTH,
        blendFunction: BlendFunction.NORMAL,
        uniforms: new Map([
          ["inverseProjection", new THREE.Uniform(new THREE.Matrix4())],
          ["nearFar", new THREE.Uniform(new THREE.Vector2(0.05, 180))],
          ["holeDistance", new THREE.Uniform(14)],
          ["holeRadius", new THREE.Uniform(BLACK_HOLE_RADIUS)],
        ]),
      },
    );
  }
}
function HorizonShadow() {
  const effect = useMemo(() => new HorizonShadowEffect(), []);
  const { camera } = useThree();
  useFrame(() => {
    effect.uniforms
      .get("inverseProjection")
      .value.copy(camera.projectionMatrixInverse);
    effect.uniforms.get("holeDistance").value = camera.position.length();
    effect.uniforms.get("nearFar").value.set(camera.near, camera.far);
  });
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} />;
}
function PhotoDisk({ runtime, atlas }) {
  const mesh = useRef();
  const orbit = useMemo(() => createPhotoOrbits(), []);
  const { size } = useThree();
  const uniforms = useMemo(
    () => ({
      uPhotos: { value: atlas.texture },
      uAtlas: { value: new THREE.Vector2(atlas.columns, atlas.rows) },
      uViewport: { value: new THREE.Vector2(size.width, size.height) },
      uProgress: { value: 0 },
    }),
    [atlas],
  );
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4(),
      position = new THREE.Vector3(),
      scale = new THREE.Vector3(),
      quaternion = new THREE.Quaternion();
    const tiles = assignPhotoIds(orbit, atlas.count),
      heat = new Float32Array(PHOTO_COUNT),
      spin = new Float32Array(PHOTO_COUNT);
    for (let i = 0; i < PHOTO_COUNT; i++) {
      const r = orbit[i * 4],
        angle = orbit[i * 4 + 1],
        seed = orbit[i * 4 + 3];
      const id = tiles[i],
        ratio = atlas.ratios[id] || 0.8;
      const longest = 0.12 + seed * 0.105;
      position.set(Math.cos(angle) * r, orbit[i * 4 + 2], Math.sin(angle) * r);
      scale.set(
        longest * Math.min(ratio, 1),
        longest * Math.min(1 / ratio, 1),
        1,
      );
      matrix.compose(position, quaternion, scale);
      mesh.current.setMatrixAt(i, matrix);
      tiles[i] = id;
      heat[i] = Math.pow(1 - (r - 1.14) / (6.4 - 1.14), 2.4);
      spin[i] = seed * Math.PI * 2;
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.geometry.setAttribute(
      "aTile",
      new THREE.InstancedBufferAttribute(tiles, 1),
    );
    mesh.current.geometry.setAttribute(
      "aHeat",
      new THREE.InstancedBufferAttribute(heat, 1),
    );
    mesh.current.geometry.setAttribute(
      "aSpin",
      new THREE.InstancedBufferAttribute(spin, 1),
    );
    mesh.current.userData.photoCount = PHOTO_COUNT;
    mesh.current.userData.sourceCount = atlas.count;
  }, [atlas, orbit]);
  useFrame(() => {
    mesh.current.rotation.y = cameraPose(
      runtime.progress,
      runtime.time,
    ).diskRotation;
    // Fiber keeps its own uniform containers. Write the live material rather
    // than the original props: scalar values are copied during reconciliation.
    const live = mesh.current.material.uniforms;
    live.uViewport.value.set(size.width, size.height);
    live.uProgress.value = runtime.progress;
  });
  return (
    <instancedMesh
      name="photo-accretion-disk"
      ref={mesh}
      args={[null, null, PHOTO_COUNT]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={photoVertex}
        fragmentShader={photoFragment}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
function CameraFlight({ runtime, onReady }) {
  const state = useThree();
  useLayoutEffect(() => {
    onReady(state);
  }, []);
  useFrame(() => {
    const pose = cameraPose(runtime.progress, runtime.time);
    state.camera.position.fromArray(pose.eye);
    state.camera.lookAt(0, 0, 0);
    const t = Math.min(1, runtime.progress / 0.6),
      smooth = t * t * t * (t * (t * 6 - 15) + 10);
    state.camera.setViewOffset(
      state.size.width,
      state.size.height,
      0,
      state.size.height * 0.18 * (1 - smooth),
      state.size.width,
      state.size.height,
    );
    state.camera.updateMatrixWorld();
  }, -2);
  return null;
}
export default function GargantuaScene({ runtime, atlas, onReady, onCommit }) {
  useLayoutEffect(() => {
    onCommit?.();
  }, [atlas]);
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <CameraFlight runtime={runtime} onReady={onReady} />
      <Stars
        radius={70}
        depth={70}
        count={900}
        factor={0.6}
        saturation={0}
        speed={0}
        fade
      />
      <PhotoDisk runtime={runtime} atlas={atlas} />
      <mesh name="gargantua-horizon" renderOrder={1}>
        <sphereGeometry args={[BLACK_HOLE_RADIUS, 96, 64]} />
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>
      {/* Separate passes keep the depth mask after bloom, preserving the void. */}
      <EffectComposer
        mergeMode="none"
        multisampling={0}
        enableNormalPass={false}
        resolutionScale={0.5}
      >
        <Lens />
        <Bloom
          intensity={1.0}
          radius={0.45}
          luminanceThreshold={1.6}
          luminanceSmoothing={0.15}
          resolutionScale={0.5}
          levels={6}
          mipmapBlur
        />
        <HorizonShadow />
      </EffectComposer>
    </>
  );
}
function buildAtlas(images, maxSize) {
  const count = images.length || 6,
    plan = planPhotoAtlas(count, maxSize);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  const colors = [
    "#a28a6a",
    "#d6c6ac",
    "#a58d73",
    "#82705b",
    "#dac9ae",
    "#ba9d79",
  ];
  for (let i = 0; i < count; i++) {
    const x = (i % plan.columns) * plan.tileWidth,
      y = Math.floor(i / plan.columns) * plan.tileHeight;
    if (images.length)
      ctx.drawImage(images[i], x, y, plan.tileWidth, plan.tileHeight);
    else {
      ctx.fillStyle = colors[i];
      ctx.fillRect(x, y, plan.tileWidth, plan.tileHeight);
      ctx.strokeStyle = "#eee0c5";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 8, y + 8, plan.tileWidth - 16, plan.tileHeight - 16);
      ctx.font = "28px Georgia";
      ctx.fillStyle = "#f7edda";
      ctx.textAlign = "center";
      ctx.fillText("✧", x + plan.tileWidth / 2, y + plan.tileHeight / 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Canvas atlas rows run from the top; flip each card locally in the shader.
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return {
    ...plan,
    count,
    texture,
    ratios: images.map((image) => image.width / image.height),
  };
}

// Mount on the existing canvas, preserving the app's IndexedDB/editor lifecycle.
// A manual 30-fps clock advances useFrame and the composer only when visible.
export async function mountGargantua(canvas, runtime) {
  const root = createRoot(canvas);
  const width = canvas.clientWidth || innerWidth,
    height = canvas.clientHeight || innerHeight;
  let state, atlas, readyResolve, readyReject;
  let atlasUpdates = Promise.resolve();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: true,
  });
  const context = renderer.getContext(),
    debug = context.getExtension("WEBGL_debug_renderer_info");
  const software =
    debug &&
    /SwiftShader|llvmpipe|software/i.test(
      context.getParameter(debug.UNMASKED_RENDERER_WEBGL),
    );
  const ready = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  await root.configure({
    frameloop: "never",
    dpr: software
      ? 1
      : Math.min(devicePixelRatio || 1, width < 700 ? 1.25 : 1.5),
    size: { width, height, top: 0, left: 0 },
    gl: renderer,
    camera: { fov: 46, near: 0.05, far: 180, position: cameraPose(0).eye },
    onCreated: (s) => {
      state = s;
      state.gl.setClearColor("#000000", 1);
    },
  });
  // configure creates the renderer before the React tree is committed.
  const render = (current, onCommit) => {
    root.render(
      <SceneBoundary onError={readyReject}>
        <GargantuaScene
          runtime={runtime}
          atlas={current}
          onCommit={onCommit}
          onReady={(s) => {
            state = s;
            readyResolve();
          }}
        />
      </SceneBoundary>,
    );
  };
  atlas = buildAtlas([], 4096);
  render(atlas);
  let timeout;
  try {
    await Promise.race([
      ready,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(Error("3D scene initialization timed out")),
          10000,
        );
      }),
    ]);
  } catch (error) {
    root.unmount();
    atlas.texture.dispose();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  canvas.dataset.renderer = "three-instanced";
  canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
  canvas.addEventListener("webglcontextrestored", () =>
    state.advance(performance.now() / 1000, true),
  );
  return {
    draw() {
      state.advance(performance.now() / 1000, true);
    },
    resize(w, h) {
      state.setSize(w, h, 0, 0);
    },
    setPhotos(images) {
      const sources = [...images];
      // Serialize React commits so rapid uploads cannot strand an earlier
      // promise or dispose a texture still used by the active material.
      atlasUpdates = atlasUpdates.then(async () => {
        const previous = atlas;
        atlas = buildAtlas(
          sources,
          Math.min(4096, state.gl.capabilities.maxTextureSize),
        );
        await new Promise((resolve) => render(atlas, resolve));
        previous.texture.dispose();
        state.advance(performance.now() / 1000, true);
        canvas.dataset.atlasWidth = String(atlas.width);
        canvas.dataset.atlasHeight = String(atlas.height);
        canvas.dataset.atlasTile = String(atlas.tileWidth);
      });
      return atlasUpdates;
    },
    inspect() {
      return { scene: state.scene, camera: state.camera, renderer: state.gl };
    },
    dispose() {
      atlas.texture.dispose();
      root.unmount();
    },
  };
}
