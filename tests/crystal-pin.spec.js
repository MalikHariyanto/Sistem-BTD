import { test, expect } from "@playwright/test";
import { createOrbit, orbitAt, cameraAt } from "../src/universe-camera.js";
import { photoSurfaceAt, projectPhotoSurface } from "../src/photo-surface.js";
import { CRYSTAL_OUTER, CRYSTAL_TIP, crystalCenter, crystalBounds, crystalVeil } from "../src/crystal-pin.js";

test("projected crystal facets fit their reserved space and their tips stay on the original orbit", () => {
  const orbit = createOrbit(160);
  let escaped = 0, displacedTips = 0, perspective = 0;
  for (let i = 0; i < 160; i++) for (const ratio of [.25, .6, .8, 1, 1.6, 4]) {
    const point = orbitAt(orbit, i, 6), surface = photoSurfaceAt(point, 6, 1, ratio);
    const origin = { x: 310, y: 370, size: 80, crystal: 1 };
    const center = crystalCenter(origin, ratio, surface, 1), box = crystalBounds(origin, ratio);
    const tip = projectPhotoSurface(0, CRYSTAL_TIP, ratio, surface);
    if (Math.hypot(center.x + tip.x * 80 - origin.x, center.y + tip.y * 80 - origin.y) > .00001) displacedTips++;
    for (const [u,v] of CRYSTAL_OUTER) {
      const p = projectPhotoSurface(u,v,ratio,surface), x = center.x+p.x*80, y = center.y+p.y*80;
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) escaped++;
    }
    if (Math.abs(surface.yaw) > .1 && Math.abs(surface.pitch) > .08) perspective++;
  }
  expect(displacedTips).toBe(0);
  expect(escaped).toBe(0);
  expect(perspective).toBeGreaterThan(200);
});

test("rear photographs dissolve with optical height while the front and ending remain clear", () => {
  const camera = cameraAt(.3,1440,900);
  const at = (above, crystal = 0) => ({ x: camera.x + camera.width * .5,
    y: camera.y + camera.height * (.48 - above), crystal });
  let previous = crystalVeil(at(0),camera);
  for (let i = 0; i <= 100; i++) {
    const value = crystalVeil(at(i/100*.4),camera);
    expect(value).toBeLessThanOrEqual(previous);
    expect(previous-value).toBeLessThan(.025);
    previous = value;
  }
  expect(crystalVeil(at(0,1),camera)).toBeCloseTo(1);
  expect(crystalVeil(at(0),camera)).toBeLessThan(.3);
  expect(previous).toBeLessThan(.02);
  expect(crystalVeil(at(.4),cameraAt(1,1440,900))).toBe(1);
});

test("GPU crystal markers retain photo detail and render lit facets and their orbital caustic", async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? {width:390,height:844} : {width:1280,height:800});
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#open-editor").click();
  const result = await page.evaluate(async () => {
    const {createUniverseGPU}=await import('/src/universe-gpu.js');
    const {createOrbit,cameraAt,photoDepthAt}=await import('/src/universe-camera.js');
    const {createOrbitComposition}=await import('/src/orbit-composition.js');
    const {assignOrbitPhotos}=await import('/src/photo-textures.js');
    const {photoSurfaceAt,projectPhotoSurface}=await import('/src/photo-surface.js');
    const {crystalCenter}=await import('/src/crystal-pin.js');
    const width=innerWidth,height=innerHeight,canvas=document.createElement('canvas');
    canvas.width=width*2;canvas.height=height*2;
    const context=canvas.getContext('webgl',{alpha:false,preserveDrawingBuffer:true});
    const parameter=context.getParameter.bind(context);
    // Older drivers may cap point sprites at 32 pixels. Full crystal planes
    // must still retain their projected size and HD detail on these devices.
    context.getParameter=name=>name===context.ALIASED_POINT_SIZE_RANGE?new Float32Array([1,32]):parameter(name);
    const gpu=createUniverseGPU(canvas);if(!gpu)throw Error('Crystal shaders did not compile');
    context.getParameter=parameter;
    const photo=document.createElement('canvas');photo.width=160;photo.height=200;
    const ctx=photo.getContext('2d');ctx.fillStyle='#303030';ctx.fillRect(0,0,80,200);ctx.fillStyle='#d0d0d0';ctx.fillRect(80,0,80,200);
    gpu.setPhotos(Array(200).fill(photo));
    const black=document.createElement('canvas');black.width=black.height=32;black.getContext('2d').fillRect(0,0,32,32);gpu.setPlate(black);
    const camera=cameraAt(.3,width,height), time=6;
    gpu.draw({camera,width,height,time,detail:0,cover:0,showcase:camera.showcase,reduced:true});
    const gl=canvas.getContext('webgl'),pixels=new Uint8Array(canvas.width*canvas.height*4);
    gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const luminance=(x,y)=>{const i=((canvas.height-1-Math.round(y*2))*canvas.width+Math.round(x*2))*4;return pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;};
    const orbit=createOrbit(),photoIds=assignOrbitPhotos(orbit,200);
    const photos=createOrbitComposition(orbit).update({camera,width,height,time,photoIds,ratios:Array(200).fill(.8),now:1000,reduced:true});
    const pins=photos.filter(p=>p.projected.crystal>.98&&p.alpha>.85&&p.point.radius>.2&&p.projected.size>=24);
    const metrics=pins.map(photo=>{
      const size=photo.projected.size*photoDepthAt(photo.point,camera,1).scale;
      const pose=photoSurfaceAt(photo.point,time,1,.8);
      const center=crystalCenter({...photo.projected,size},.8,pose,photo.projected.crystal);
      const at=(u,v)=>{const p=projectPhotoSurface(u,v,.8,pose);return luminance(center.x+p.x*size,center.y+p.y*size);};
      return {contrast:at(.22,0)-at(-.22,0), rim:Math.max(at(-.535,0),at(.535,0)),
        facets:Math.abs(at(-.535,0)-at(.535,0)), anchor:luminance(photo.projected.x,photo.projected.y)};
    });
    return {metrics,pins:Number(canvas.dataset.crystalPins),geometry:canvas.dataset.portraitGeometry,error:gl.getError()};
  });
  expect(result.error).toBe(0);
  expect(result.geometry).toBe('instanced-quads');
  expect(result.pins).toBeGreaterThan(isMobile ? 12 : 24);
  expect(result.metrics.length).toBeGreaterThanOrEqual(isMobile ? 3 : 8);
  const mean=key=>result.metrics.reduce((sum,p)=>sum+p[key],0)/result.metrics.length;
  expect(mean('contrast'),JSON.stringify(result)).toBeGreaterThan(75);
  expect(mean('rim'),JSON.stringify(result)).toBeGreaterThan(65);
  expect(mean('facets'),JSON.stringify(result)).toBeGreaterThan(10);
  expect(mean('anchor'),JSON.stringify(result)).toBeGreaterThan(70);
});
