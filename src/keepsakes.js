import { flowerSrc } from "./florals.js";

const onward = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
const invitations = {
  flowers: { title: "Ada bunga\nuntukmu.", hint: "sentuh bunganya", label: "Buka Bunga & doa" },
  note: { title: "Kutulis sesuatu\nuntukmu.", hint: "buka catatannya", label: "Buka Bait untukmu" },
  candle: { title: "Buat satu\nharapan.", hint: "sentuh lilinnya", label: "Buka Tiup lilin" },
  envelope: { title: "Masih ada\nsuratku.", hint: "buka amplopnya", label: "Buka Surat untukmu" },
  star: { title: "Kita baca\nsekali lagi?", hint: "sentuh bintangnya", label: "Baca cerita ini lagi" },
};

function object(kind) {
  switch (kind) {
    case "flowers":
      return `<img src="${flowerSrc("bouquet")}" alt="" width="512" height="768" decoding="async" draggable="false">`;
    case "note":
      return '<span class="keepsake-note-paper"><span>ada bait<br>yang menyimpan<br>namamu.</span></span>';
    case "candle":
      return '<span class="keepsake-flame"></span><span class="keepsake-wax"></span><span class="keepsake-dish"></span>';
    case "envelope":
      return '<span class="keepsake-envelope-body"><span class="keepsake-envelope-front"></span><span class="keepsake-envelope-flap"></span><span class="keepsake-seal">a.</span></span>';
    case "star":
      return '<span class="keepsake-star-paper"><svg viewBox="0 0 80 96"><path d="M40 7 49 36 71 48 49 60 40 89 31 60 9 48 31 36Z" fill="#b79b70"/><path d="M40 7 40 48 9 48 31 36Z" fill="#fff9e8"/><path d="M40 7 49 36 71 48 40 48Z" fill="#e6d3aa"/><path d="M40 48 40 89 31 60 9 48Z" fill="#d7bc8b"/><path d="M40 48 71 48 49 60 40 89Z" fill="#97744d"/><path d="m40 7 9 29 22 12-22 12-9 29-9-29L9 48l22-12Z" fill="none" stroke="#b99b6a" stroke-width=".7"/></svg></span>';
    default:
      throw new Error(`Unknown keepsake: ${kind}`);
  }
}

// All copy is editorial text above; recipient names/uploads never enter markup.
export function keepsakeContent(kind) {
  const { title, hint } = invitations[kind];
  return `<span class="keepsake-caption"><span class="keepsake-title">${title.replaceAll("\n", "<br>")}</span><small class="keepsake-hint">${hint} ${onward}</small></span><span class="keepsake-object keepsake-${kind}" aria-hidden="true">${object(kind)}</span>`;
}

export function setKeepsake(button, kind) {
  if (button.dataset.keepsake === kind) return;
  button.innerHTML = keepsakeContent(kind);
  button.dataset.keepsake = kind;
  button.setAttribute("aria-label", invitations[kind].label);
}

// Hold the lifted object until the caller has committed the next navigation.
// Cancel afterwards so the old object never flashes back or retains effects.
export async function liftKeepsake(button, reducedMotion) {
  const object = button?.querySelector(".keepsake-object");
  const caption = button?.querySelector(".keepsake-caption");
  if (!object || !caption || reducedMotion) return () => {};
  const animations = [
    object.animate([
      { opacity: 1, transform: "rotate(4deg) translateY(0) scale(1)" },
      { opacity: 0, transform: "rotate(-3deg) translateY(-10px) scale(1.12)" },
    ], { duration: 230, easing: "cubic-bezier(.22,.7,.18,1)", fill: "both" }),
    caption.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 230, easing: "ease-out", fill: "both",
    }),
  ];
  await Promise.allSettled(animations.map(animation => animation.finished));
  return () => animations.forEach(animation => animation.cancel());
}
