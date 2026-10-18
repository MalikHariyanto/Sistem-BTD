import { expect } from "@playwright/test";

// Ordinary page.evaluate grants transient activation in Chromium, which can
// accidentally unlock autoplay. Observe startup through CDP without a gesture.
export async function observeMedia(page) {
  const session = await page.context().newCDPSession(page);
  return async () => {
    const { result } = await session.send("Runtime.evaluate", {
      expression: `JSON.stringify((() => {
        const audio = document.querySelector('#story-audio');
        return { activation: navigator.userActivation.hasBeenActive,
          status: document.querySelector('#track-status')?.textContent,
          playback: audio?.dataset.playback,
          src: audio?.currentSrc, muted: audio?.muted, volume: audio?.volume,
          paused: audio?.paused, loop: audio?.loop, duration: audio?.duration,
          time: audio?.currentTime, readyState: audio?.readyState };
      })())`,
      returnByValue: true,
      userGesture: false,
    });
    return JSON.parse(result.value);
  };
}

export async function actualPlayback(page) {
  await expect(page.locator("#story-audio")).toHaveAttribute("data-playback", "playing");
  await expect.poll(() => page.locator("#story-audio").evaluate(audio => audio.currentTime)).toBeGreaterThan(0.1);
  return page.locator("#story-audio").evaluate(audio => ({
    src: audio.currentSrc, muted: audio.muted, volume: audio.volume,
    paused: audio.paused, loop: audio.loop, duration: audio.duration,
  }));
}
