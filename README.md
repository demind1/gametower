# NEON OUTBREAK 3D — AFTERLIGHT 5.0

Playable offline cyberpunk tower defense: 8 tower types, 20 waves and procedural WebGL geometry/audio. This release is a validated graphics iteration; see [GRAPHICS_OVERHAUL.md](GRAPHICS_OVERHAUL.md) for implementation details, limitations and evidence.

## Скачать готовую игру

- [Автономная игра — NEON_OUTBREAK_5_OFFLINE.html](dist/NEON_OUTBREAK_5_OFFLINE.html): откройте файл на GitHub и нажмите **Download raw file**, затем откройте скачанный HTML в браузере.
- [Игра, исходники и скриншоты — ZIP](dist/NEON_OUTBREAK_5_SOURCE.zip).
- Весь репозиторий: **Code → Download ZIP**.

Игра работает без интернета; устанавливать зависимости для игры не нужно.

## Play

Open `index.html` in a current Chromium browser with hardware acceleration enabled. No installation, CDN or network access is needed. If local-file policy blocks it, run:

```sh
cd /workspace/gametower
python3 -m http.server 8000 --bind 127.0.0.1
```

Use a local browser to access the server. A generated all-in-one version is `dist/NEON_OUTBREAK_5_OFFLINE.html`. The original 3.1 version is kept in `standalone-original.html`.

Click an arsenal item and a free map cell to build. Click a tower to select, upgrade, modify, change targeting or sell. Drag to orbit, wheel to zoom, `◎` to inspect the selected tower, `⌂` to return. `1–8` select towers, Space starts a wave, `Q/W/E/R` trigger abilities, `U` upgrades, `F` toggles fullscreen, Esc cancels selection. Keep sound/music enabled or toggle them independently in the panel. Audio starts after a user gesture.

Graphics presets: Performance / Balanced / High / Ultra / Cinematic. Start with Performance on software GPUs. FPS, CPU render wall time and draw calls appear in the viewport; 144 FPS is a cap option, not a guarantee.

## Build and test

```sh
python3 tools/build.py
node tests/browser.cjs
```

Build uses only Python standard library. Tests require Node, Playwright and Chromium (`CHROMIUM_PATH` optional), already present in this managed environment. The application itself has no dependencies. Rebuild after editing CSS, HTML, JS or documentation; rebuild after tests to include current screenshots/results in the ZIP. Tests use temporary local hosting and an injected testing bridge; production code has no test cheats.

Source layout: `index.html`, `css/styles.css`, `js/game.js`. Current renderer is native WebGL 1, with cached procedural meshes, static city batches, normal/roughness maps, GGX material lighting, packed directional shadows, restrained planar reflections, particle batching and postprocessing. All added assets are original procedural code; no proprietary game resources are included.

## AFTERLIGHT campaign systems

Every third cleared wave grants one doctrine point: Ballistics (+8% global damage/rank), Control (+12% slow/burn duration/rank), Logistics (+8% rewards and reactor income/rank). Each caps at rank 5. Spend points in the cockpit; taking a doctrine never blocks starting a wave.

At tower level III choose one permanent 220-credit specialization: Rapid (+35% fire rate; reactor +20% income) or Siege (+30% damage, +0.65 cells range; reactor +30% income). Specialization adds visible cooling fins or armor. Selling refunds the normal percentage of total investment.

Operations change every two waves: normal quarantine, fast assault, resilient assault, bonus bounty. Forecast lists exact changes. From wave 4, some non-boss enemies become larger armored-looking elites with 1.55× HP and double rewards. Bosses enter a faster second phase below half HP.

A free tactical pulse slows all enemies, with a 24-second cooldown. Existing paid abilities remain independent. A leak-free wave adds 40 credits and repairs one base HP; each ten kills in a chain adds 15 credits (chain window 2.5 simulated seconds). Hold Shift while placing to keep the same tower selected for repeated construction. Tower tooltips show core stats.

These systems are new balance changes, not a claim of a finished competitive balance pass. See the browser test for functional checks; manual playtesting remains useful.
