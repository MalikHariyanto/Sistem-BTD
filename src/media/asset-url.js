// Public media stays relative to the deployment, including Vite subpaths.
export function normalizeMediaPath(source) {
  if (!source) return "";
  const value = source.trim();
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const suffixAt = value.search(/[?#]/);
  const path = suffixAt < 0 ? value : value.slice(0, suffixAt);
  const suffix = suffixAt < 0 ? "" : value.slice(suffixAt);
  const segments = path.replace(/^\.?\//, "").split("/");
  if (segments.some(segment => segment === ".."))
    throw new Error(`Path media harus berada di public/: ${source}`);
  return "/" + segments.filter(Boolean).map(segment => {
    try { return encodeURIComponent(decodeURIComponent(segment)); }
    catch { return encodeURIComponent(segment); }
  }).join("/") + suffix;
}

export function mediaUrl(source, base = "/") {
  const normalized = normalizeMediaPath(source);
  if (!normalized || /^(https?:|data:|blob:)/i.test(normalized)) return normalized;
  return base.replace(/\/?$/, "/") + normalized.slice(1);
}
