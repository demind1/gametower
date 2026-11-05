# NEON OUTBREAK 3D — REFINED 3.1

Full source code for the standalone 3D tower-defense game.

## Files

- `index.html`: application markup and UI, linked to CSS and JS.
- `css/styles.css`: responsive interface, sidebar, fullscreen layout.
- `js/game.js`: complete game logic, procedural geometry, WebGL rendering, GLSL shaders, audio synthesis, interactions, enemy waves and upgrades.
- `standalone-original.html`: verified all-in-one original version from this conversation.

## Run

Open `index.html` in a current Chromium-based browser, preferably Chrome or Opera, with hardware acceleration enabled. It uses built-in WebGL and Web Audio APIs. No npm installation, internet connection, CDN, or external library is required. Alternatively open `standalone-original.html`.

## Development

The original project is a monolithic custom WebGL 1 renderer. For substantial rendering upgrades, refactor incrementally into distinct modules (gameplay state, geometry, materials, shaders, render passes, effects, interface, audio) without changing game behavior. Keep a working build at each step; only target WebGL 2 if you implement a graceful WebGL 1 fallback or test supported target browsers.

Useful regression checklist: choose a tower, place it, upgrade damage/rate/critical/appearance, sell it, launch waves, test different enemy types and boss, activate EMP/orbital/overdrive, use fullscreen, switch quality, check offline mode.

## Notes

- Texture resolution and visual quality depend on generated materials and rendering resolution; 144 FPS is a target, not a guarantee.
- No proprietary assets from Cyberpunk 2077 or FL Studio are included.
