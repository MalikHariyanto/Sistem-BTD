// A finished WAAPI effect must hold until its final state is committed. Otherwise
// fill:none exposes the old page for a frame (or longer) before it is hidden.
export function createMotion(preference) {
  const running = new Map();
  const styled = new Set();
  const commit = (element, frame) => {
    for (const key of ["opacity", "transform"]) {
      if (frame[key] !== undefined) element.style[key] = String(frame[key]);
    }
    styled.add(element);
  };
  async function play(element, frames, duration = 700) {
    running.get(element)?.cancel();
    if (preference.matches) {
      commit(element, frames.at(-1));
      return true;
    }
    const animation = element.animate(frames, {
      duration,
      easing: "cubic-bezier(.22,.7,.18,1)",
      fill: "both",
    });
    running.set(element, animation);
    try {
      await animation.finished;
    } catch {
      return false;
    }
    if (running.get(element) !== animation) return false;
    commit(element, frames.at(-1));
    running.delete(element);
    animation.cancel();
    return true;
  }
  function reset(element) {
    running.get(element)?.cancel();
    running.delete(element);
    element.style.removeProperty("opacity");
    element.style.removeProperty("transform");
    styled.delete(element);
  }
  function resetTree(root) {
    for (const element of new Set([...running.keys(), ...styled]))
      if (element === root || root.contains(element)) reset(element);
  }
  return { play, reset, resetTree };
}
