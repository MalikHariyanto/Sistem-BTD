import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createOrbit, cameraAt, journeyProgress, orbitRateAt } from "../src/universe-camera.js";
import { assignOrbitPhotos } from "../src/photo-textures.js";
import { createOrbitComposition } from "../src/orbit-composition.js";

// Captured from the approved 6316a41 composition BEFORE optimization. Compare
// every identity, projection and fade, rather than merely preserving counts.
const reference = JSON.parse(readFileSync(new URL("./fixtures/orbit-composition.json", import.meta.url), "utf8"));

test("optimized composition retains the approved journey and ending across photo libraries and viewports", () => {
  test.setTimeout(60000);
  const orbit=createOrbit();
  for(const scenario of reference.cases) {
    const {count,width,height,frames}=scenario;
    const photoIds=assignOrbitPhotos(orbit,count);
    const ratios=Array.from({length:count},(_,i)=>[.25,.8,1,1.6,4][i%5]);
    const composition=createOrbitComposition(orbit), hash=createHash("sha256");
    let time=3,samples=0;
    for(let frame=0;frame<frames;frame++) {
      const progress=journeyProgress(frame/15*1000);
      time+=orbitRateAt(progress,width)/15;
      const photos=composition.update({camera:cameraAt(progress,width,height),width,height,time,
        photoIds,ratios,now:1000+frame/15*1000,reduced:frame===0});
      hash.update(JSON.stringify(photos.map(p=>[p.index,p.projected.x,p.projected.y,p.projected.size,
        p.projected.depth,p.projected.crystal,p.projected.contact,p.alpha])));
      samples+=photos.length;
    }
    expect(samples,`${count} photos, ${width}×${height}`).toBe(scenario.samples);
    expect(hash.digest("hex"),`${count} photos, ${width}×${height}, reference ${reference.reference}`).toBe(scenario.sha256);
  }
});
