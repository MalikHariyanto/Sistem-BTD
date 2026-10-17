// One prepared media element survives chapter changes, pause/resume and uploads.
// All initial playback begins in the opening button's synchronous gesture.
export function createSoundtrack(onChange) {
  const audio = new Audio();
  audio.preload = "auto";
  audio.loop = true;
  let firstSource = "",
    index = 0,
    kind = null,
    context,
    master,
    nodes = [],
    started = false,
    wasPlaying = false;
  let pending = false,
    error = "",
    intent = 0;
  const state = () => ({
    playing: !!(kind === "track"
      ? !audio.paused && audio.readyState >= 2 && !pending
      : kind === "ambient" && nodes.length > 0 && context?.state === "running"),
    kind,
    index,
    pending,
    error,
    currentTime: audio.currentTime,
    readyState: audio.readyState,
  });
  const notify = () => onChange(state());
  const silenceAmbient = () => {
    nodes.forEach((node) => {
      node.stop();
      node.disconnect();
    });
    nodes = [];
  };
  function prepareSource(src) {
    if (audio.getAttribute("src") === src) return;
    audio.src = src;
    audio.load();
  }
  function setFirstSource(src) {
    firstSource = src || "";
    if (index === 0 && kind !== "ambient" && !state().playing) {
      if (src) prepareSource(src);
      else {
        audio.removeAttribute("src");
        audio.load();
      }
    }
  }
  function unlock() {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.065;
      master.connect(context.destination);
    }
    return context.resume();
  }
  async function ambient() {
    const token = ++intent;
    audio.pause();
    silenceAmbient();
    error = "";
    kind = "ambient";
    index = -1;
    try {
      const resumed = unlock();
      [130.81, 164.81, 196, 261.63, 329.63].forEach((frequency, i) => {
        const oscillator = context.createOscillator(),
          gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.012, context.currentTime);
        gain.gain.linearRampToValueAtTime(
          0.12 - i * 0.012,
          context.currentTime + 0.18 + i * 0.025,
        );
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start();
        nodes.push(oscillator);
      });
      await resumed;
      if (token !== intent) return;
    } catch {
      error =
        "Audio belum bisa diputar. Ketuk tombol suara untuk mencoba lagi.";
      kind = null;
    }
    notify();
  }
  async function playTrack(nextIndex, src) {
    if (!src) return false;
    const token = ++intent;
    silenceAmbient();
    audio.pause();
    kind = "track";
    index = nextIndex;
    error = "";
    pending = true;
    prepareSource(src);
    // Call play before yielding; never wait for an animation, metadata or fetch.
    const playing = audio.play();
    notify();
    try {
      await playing;
      if (token !== intent) return false;
      pending = false;
      notify();
      return true;
    } catch {
      if (token !== intent) return false;
      pending = false;
      error =
        "Lagu belum bisa diputar. Periksa file atau ketuk suara untuk mencoba lagi.";
      notify();
      return false;
    }
  }
  function pause() {
    intent++;
    audio.pause();
    silenceAmbient();
    pending = false;
    notify();
  }
  function toggle() {
    if (state().playing || pending) {
      pause();
      return;
    }
    if (kind === "track" && audio.getAttribute("src"))
      return playTrack(index, audio.getAttribute("src"));
    if (firstSource) return playTrack(0, firstSource);
    return ambient();
  }
  for (const name of ["playing", "pause", "waiting", "canplay", "error"])
    audio.addEventListener(name, () => {
      if (name === "waiting") pending = true;
      if (name === "playing" || name === "canplay") pending = false;
      notify();
    });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      wasPlaying = !!state().playing;
      audio.pause();
      if (context?.state === "running") context.suspend().then(notify);
    } else if (wasPlaying) {
      wasPlaying = false;
      if (kind === "track")
        audio.play().catch(() => {
          error = "Ketuk suara untuk melanjutkan lagunya.";
          notify();
        });
      else context?.resume().then(notify);
    }
  });
  return {
    get state() {
      return state();
    },
    setFirstSource,
    startOpening() {
      if (started) return;
      started = true;
      return firstSource ? playTrack(0, firstSource) : ambient();
    },
    toggle,
    pause,
    toggleAmbient() {
      return kind === "ambient" && state().playing ? pause() : ambient();
    },
    toggleTrack(i, src) {
      return kind === "track" && index === i && state().playing
        ? pause()
        : playTrack(i, src);
    },
    reset() {
      pause();
      kind = null;
      index = 0;
      firstSource = "";
      audio.removeAttribute("src");
      audio.load();
      notify();
    },
  };
}
