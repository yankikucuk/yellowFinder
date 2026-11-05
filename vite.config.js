import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/**
 * Builds the renderer (Vue + Tailwind CSS) into `dist/renderer`. The main
 * process loads the result with `loadFile`, so asset paths must be relative
 * (`base: "./"`).
 */
export default defineConfig({
  root: fileURLToPath(new URL("./src/renderer", import.meta.url)),
  base: "./",
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL("./dist/renderer", import.meta.url)),
    emptyOutDir: true
  }
});
