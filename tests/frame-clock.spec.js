import { test, expect } from "@playwright/test";
import { advanceFrameClock } from "../src/frame-clock.js";

test("30 fps stays evenly paced across display refresh rates and timestamp rounding", () => {
  for (const refresh of [60, 90, 120]) {
    let previous=0, lastFrame, renders=0;
    const gaps=[];
    for (let frame=0;frame<refresh*4;frame++) {
      const now=1000+frame*1000/refresh+[0,.12,-.12][frame%3];
      const next=advanceFrameClock(now,previous,1000/30);
      if(next===null)continue;
      previous=next; renders++;
      if(lastFrame!==undefined)gaps.push(frame-lastFrame);
      lastFrame=frame;
    }
    expect(renders).toBe(120);
    expect(new Set(gaps)).toEqual(new Set([refresh/30]));
  }
});

test("24 fps fallback retains its cadence and a long pause skips missed slots", () => {
  let previous=0, lastFrame;
  const gaps=[];
  for(let frame=0;frame<240;frame++) {
    const now=1000+frame*1000/60;
    const next=advanceFrameClock(now,previous,1000/24);
    if(next===null)continue;
    previous=next;
    if(lastFrame!==undefined)gaps.push(frame-lastFrame);
    lastFrame=frame;
  }
  expect(Math.min(...gaps)).toBe(2);
  expect(Math.max(...gaps)).toBe(3);
  const afterPause=advanceFrameClock(10000,previous,1000/24);
  expect(Math.abs(afterPause-10000)).toBeLessThan(1000/24);
  expect(advanceFrameClock(10000,afterPause,1000/24)).toBeNull();
});
