import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { content } from "../src/content.js";
import { createPhotoLibrary } from "../src/media/photo-library.js";
import { mediaUrl, normalizeMediaPath } from "../src/media/asset-url.js";
import { collectPhotoManifest, validateMedia } from "../scripts/prepare-media.mjs";

test("default gift preserves every photo identity, chapter text and the exact soundtrack", async () => {
  assert.equal(Object.keys(content.photos).length, 209);
  assert.ok("orbit24" in content.photos && "orbit120" in content.photos && "orbit200" in content.photos);
  assert.ok(content.poems.length > 0);
  assert.ok(content.letter.length > 0);
  assert.equal(typeof content.recipient, "string");
  const bytes = await readFile(new URL("../public/music/koshun-nakao-country-intro-cut.mp3", import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "ac7cb208c4da069d1e2419ce120f2087302d7408a44d0e3d5a55c5f40f9515de");
});

test("automatic library uses natural filename order and recognizes story slots", async t => {
  const root = await mkdtemp(resolve(tmpdir(), "gift-media-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, "photos/orbit"), { recursive: true });
  await mkdir(resolve(root, "photos/story"), { recursive: true });
  for (const filename of ["10.jpg", "2.webp", "1.PNG", "momen kita #1.jpeg", ".hidden.png", "README.md"])
    await writeFile(resolve(root, "photos/orbit", filename), "fixture");
  await writeFile(resolve(root, "photos/story/portrait.jpg"), "portrait");
  await writeFile(resolve(root, "photos/story/hero.webp"), "letter");
  const manifest = await collectPhotoManifest(root);
  assert.deepEqual(manifest.orbit, ["/photos/orbit/1.PNG", "/photos/orbit/2.webp", "/photos/orbit/10.jpg", "/photos/orbit/momen%20kita%20%231.jpeg"]);
  const photos = createPhotoLibrary({ story: {}, orbit: [] }, manifest);
  assert.equal(photos.portrait, "/photos/story/portrait.jpg");
  assert.equal(photos.hero, "/photos/story/hero.webp");
  assert.equal(photos.orbit01, "/photos/orbit/1.PNG");
  assert.equal(photos.orbit05, "");
  await writeFile(resolve(root, "photos/story/portrait.webp"), "ambiguous");
  await assert.rejects(collectPhotoManifest(root), /Dua file memakai slot portrait/);
});

test("manual order takes precedence, with 200 slots and clear duplicate/capacity failures", () => {
  const manifest = { story: { hero: "/photos/auto.webp" }, orbit: ["/photos/auto.webp"] };
  const config = { story: { hero: "/photos/chosen.webp" }, orbit: ["photos/two.jpg", "/photos/one.jpg"] };
  const photos = createPhotoLibrary(config, manifest);
  assert.equal(photos.hero, "/photos/chosen.webp");
  assert.equal(photos.orbit01, "/photos/two.jpg");
  assert.equal(photos.orbit02, "/photos/one.jpg");
  const full = Array.from({ length: 200 }, (_, i) => `/photos/${i}.webp`);
  assert.equal(createPhotoLibrary({ story: {}, orbit: full }).orbit200, "/photos/199.webp");
  assert.throws(() => createPhotoLibrary({ story: {}, orbit: [...full, "/photos/200.webp"] }), /maksimum 200/);
  assert.throws(() => createPhotoLibrary({ story: {}, orbit: ["photos/a b.jpg", "/photos/a%20b.jpg"] }), /duplikat/);
});

test("media paths preserve spaces, fragments and deployment subpaths", () => {
  assert.equal(normalizeMediaPath("/photos/sore kita.jpg?v=2#frame"), "/photos/sore%20kita.jpg?v=2#frame");
  assert.equal(normalizeMediaPath("/photos/sore%20kita.jpg"), "/photos/sore%20kita.jpg");
  assert.equal(normalizeMediaPath("/photos/100% kamu.jpg"), "/photos/100%25%20kamu.jpg");
  assert.equal(mediaUrl("/photos/foto.jpg", "/birthday/"), "/birthday/photos/foto.jpg");
  assert.equal(mediaUrl("photos/foto.jpg"), "/photos/foto.jpg");
  assert.equal(mediaUrl("https://example.com/p.jpg", "/birthday/"), "https://example.com/p.jpg");
  assert.throws(() => normalizeMediaPath("../secret.jpg"), /public/);
});

test("build validation fails on missing assets instead of silently shipping broken slots", async t => {
  const root = await mkdtemp(resolve(tmpdir(), "gift-check-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sample = { ...content, photos: Object.fromEntries(Object.keys(content.photos).map(key => [key, ""])), tracks: [{ src: "/song.mp3" }] };
  await writeFile(resolve(root, "song.mp3"), "soundtrack");
  assert.equal(await validateMedia(sample, root), 1);
  sample.photos.hero = "/missing.jpg";
  await assert.rejects(validateMedia(sample, root), /File media tidak ditemukan/);
  sample.photos.hero = "/sore%20kita.jpg";
  await writeFile(resolve(root, "sore kita.jpg"), "photo");
  assert.equal(await validateMedia(sample, root), 2);
  await writeFile(resolve(root, "sore kita.jpg"), "");
  await assert.rejects(validateMedia(sample, root), /kosong/);
});
