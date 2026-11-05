/**
 * Renders build/icon.svg to the PNG files electron-builder consumes.
 *
 * Run with Electron so no image library is needed:
 *   npm run icon
 *
 * Outputs:
 * - build/icon.png      1024x1024, full bleed. Used for Windows (ico) and Linux.
 * - build/icon-mac.png  1024x1024, the tile drawn at 80% on a transparent
 *                       canvas, which is the inset macOS expects.
 */

import { app, BrowserWindow } from "electron";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SIZE = 1024;
const MAC_SCALE = 0.8;
const buildDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "build");

/**
 * Wraps the SVG in a page that draws it at the requested scale on a
 * transparent canvas of the final size.
 *
 * @param {string} svg SVG markup.
 * @param {number} scale 1 for full bleed, less for an inset.
 * @returns {string} HTML page.
 */
function pageFor(svg, scale) {
  const edge = Math.round(SIZE * scale);
  const offset = Math.round((SIZE - edge) / 2);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: ${SIZE}px; height: ${SIZE}px; background: transparent; overflow: hidden; }
    svg { position: absolute; left: ${offset}px; top: ${offset}px; width: ${edge}px; height: ${edge}px; }
  </style></head><body>${svg}</body></html>`;
}

/**
 * Renders one variant to a PNG file in the given window.
 *
 * @param {BrowserWindow} window Offscreen window reused for every variant.
 * @param {string} directory Temporary directory for the page file.
 * @param {string} svg SVG markup.
 * @param {number} scale Scale of the tile inside the canvas.
 * @param {string} fileName Output file name inside build/.
 */
async function render(window, directory, svg, scale, fileName) {
  const pagePath = join(directory, `${fileName}.html`);
  await writeFile(pagePath, pageFor(svg, scale), "utf8");
  await window.loadFile(pagePath);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const image = await window.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  await writeFile(join(buildDirectory, fileName), image.toPNG());
  process.stdout.write(`wrote build/${fileName} ${image.getSize().width}x${image.getSize().height}\n`);
}

app.whenReady().then(async () => {
  const directory = await mkdtemp(join(tmpdir(), "yellowfinder-icon-"));
  const window = new BrowserWindow({
    show: false,
    width: SIZE,
    height: SIZE,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true, sandbox: true, contextIsolation: true }
  });
  try {
    const svg = await readFile(join(buildDirectory, "icon.svg"), "utf8");
    await render(window, directory, svg, 1, "icon.png");
    await render(window, directory, svg, MAC_SCALE, "icon-mac.png");
    app.exit(0);
  } catch (error) {
    process.stderr.write(`${error.stack}\n`);
    app.exit(1);
  } finally {
    window.destroy();
    await rm(directory, { recursive: true, force: true });
  }
});
