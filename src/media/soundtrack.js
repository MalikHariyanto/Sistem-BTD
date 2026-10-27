import { mediaUrl } from "./asset-url.js";

// Keep playback inside the initial trusted tap when autoplay is blocked.
// This module never waits for photographs, a database, or a page animation.
export function startSoundtrack(track, base = "/") {
  const source = mediaUrl(track.src, base);
  const status = document.querySelector("#track-status");
  let audio, pending = true, attempt = 0;

  function sync() {
    if (audio) audio.dataset.playback = audio.error ? "error"
      : audio.paused ? "paused" : audio.readyState >= 3 ? "playing" : "loading";
  }
  function pause() {
    attempt++;
    audio?.pause();
    sync();
  }
  function prepare() {
    if (!source) return null;
    if (!audio) {
      audio = new Audio();
      audio.id = "story-audio";
      audio.preload = "auto";
      audio.volume = 0.6;
      audio.loop = true;
      document.body.append(audio);
      ["play", "pause", "waiting", "canplay", "ended"].forEach(event => audio.addEventListener(event, sync));
      audio.addEventListener("playing", () => {
        pending = false;
        status.textContent = "";
        sync();
      });
      audio.addEventListener("error", () => {
        pending = true;
        pause();
        status.textContent = "Lagu belum bisa dimuat. Coba muat ulang halaman.";
      });
    }
    if (audio.src !== new URL(source, location.href).href || audio.error) {
      pause();
      audio.src = source;
      audio.load();
      sync();
    }
    return audio;
  }
  async function play() {
    const current = prepare();
    if (!current || !current.paused) return;
    const token = ++attempt;
    try {
      const playback = current.play();
      sync();
      await playback;
      if (token !== attempt) return;
      pending = false;
      status.textContent = "";
    } catch (error) {
      if (token !== attempt || error.name === "AbortError") return;
      current.pause();
      pending = true;
      status.textContent = error.name === "NotAllowedError"
        ? "Musik akan menemani setelah ketukan pertamamu."
        : "Lagu belum bisa diputar. Coba muat ulang halaman.";
    }
    sync();
  }
  function retry(event) { if (pending && event.isTrusted) void play(); }
  function visibility() {
    if (document.hidden) { pending = true; pause(); }
    else if (pending) void play();
  }
  document.addEventListener("click", retry, true);
  document.addEventListener("visibilitychange", visibility);
  prepare();
  if (!document.hidden) void play();
  return {
    dispose() {
      document.removeEventListener("click", retry, true);
      document.removeEventListener("visibilitychange", visibility);
      pause();
      audio?.remove();
    },
  };
}
