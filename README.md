# NEON OUTBREAK 3D — Graphics 4.0

Playable offline cyberpunk tower defense: 8 tower types, 20 waves and procedural WebGL geometry/audio. This release is a validated graphics iteration; see [GRAPHICS_OVERHAUL.md](GRAPHICS_OVERHAUL.md) for implementation details, limitations and evidence.

## Play

Open `index.html` in a current Chromium browser with hardware acceleration enabled. No installation, CDN or network access is needed. If local-file policy blocks it, run:

```sh
cd /workspace/gametower
python3 -m http.server 8000 --bind 127.0.0.1
```

Use a local browser to access the server. A generated all-in-one version is `dist/NEON_OUTBREAK_4_OFFLINE.html`. The original 3.1 version is kept in `standalone-original.html`.

Click an arsenal item and a free map cell to build. Click a tower to select, upgrade, modify, change targeting or sell. Drag to orbit, wheel to zoom, `◎` to inspect the selected tower, `⌂` to return. `1–8` select towers, Space starts a wave, `Q/W/E/R` trigger abilities, `U` upgrades, `F` toggles fullscreen, Esc cancels selection. Keep sound/music enabled or toggle them independently in the panel. Audio starts after a user gesture.

Graphics presets: Performance / Balanced / High / Ultra / Cinematic. Start with Performance on software GPUs. FPS, CPU render wall time and draw calls appear in the viewport; 144 FPS is a cap option, not a guarantee.

## Build and test

```sh
python3 tools/build.py
node tests/browser.cjs
```

Build uses only Python standard library. Tests require Node, Playwright and Chromium (`CHROMIUM_PATH` optional), already present in this managed environment. The application itself has no dependencies. Rebuild after editing CSS, HTML, JS or documentation; rebuild after tests to include current screenshots/results in the ZIP. Tests use temporary local hosting and an injected testing bridge; production code has no test cheats.

Source layout: `index.html`, `css/styles.css`, `js/game.js`. Current renderer is native WebGL 1, with cached procedural meshes, static city batches, normal/roughness maps, GGX material lighting, packed directional shadows, restrained planar reflections, particle batching and postprocessing. All added assets are original procedural code; no proprietary game resources are included.
