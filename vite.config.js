import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { prepareMedia } from "./scripts/prepare-media.mjs";

// Also run for a hosting provider that invokes `vite build` directly rather
// than npm's lifecycle hooks. Preparation finishes before content is bundled.
export default defineConfig({
  plugins: [{
    name: "gift-media-manifest",
    async buildStart() {
      await prepareMedia(fileURLToPath(new URL(".", import.meta.url)));
    },
  }],
});
