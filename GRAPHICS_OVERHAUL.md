# NEON OUTBREAK 4.0 — validated graphics iteration

This release is a working vertical slice of the requested overhaul, not a claim that every AAA rendering feature is complete. All assets are original procedural geometry/maps generated locally. No runtime libraries, CDN, models, fonts or downloads were introduced. The 20×12 navigation grid, damage/economy formulas, eight tower types, eleven enemy classes, twenty waves, sound synthesis, music and controls remain.

## Rendering foundation and materials

- Retains WebGL 1 and the existing static city batches rather than replacing the engine. Fixes inward triangle winding in the original cylinders, spheres and tori; adds lathed stepped housings and hollow barrel geometry.
- Correct inverse-transpose normal transforms for orthogonal nonuniformly scaled meshes and beam transforms. View vectors use the actual orbit/reflection camera position instead of the previous hard-coded eye.
- GGX distribution, Schlick Fresnel, Smith visibility and metal/dielectric energy separation. Material families cover painted metal, concrete, wet asphalt, steel, skin, rubber/cloth, glass and ceramic. This is an approximate forward PBR shader, without environment cubemaps or HDR buffers.
- Reuses the seeded 1024² detail texture and adds a deterministic 1024² packed normal-XY / roughness / AO map. Procedural relief is material-dependent. Detail map keeps mipmaps and supported anisotropy; surface map uses mipmaps. Texture allocation is startup-only. These are shared maps, not unique authored textures per model. The two RGBA mip chains cost about 10.7 MiB; no unjustified 2048² surface maps.
- Linearized albedo, ACES-inspired tone mapping and display gamma in postprocessing. Restrained emissive gain and selective bloom. Performance mode applies the same filmic/gamma transform directly in the material shader while omitting bloom and post AA.

## Light, shadows and reflections

- Packed 24-bit directional shadow framebuffer, 3×3 PCF and normal-dependent bias. 1024² shadow map on Balanced/High, 2048² on Ultra/Cinematic; off on Performance. Approximate static+dynamic directional shadows rather than SSAO/contact shadows.
- Shadow render uses silhouette proxies for moving towers/enemies. City remains cached geometry. Idle shadow refresh is limited to 1 Hz; active refresh is limited to 30 Hz. Reduces redundant work; new structures may appear in the shadow map on the next refresh.
- Existing planar reflection pass now uses the true camera, Fresnel, roughness-dependent multi-tap reflection and a selective puddle mask. Removed synthetic neon stripe highlights. Refresh follows preset cadence and camera movement. Road reflectivity is deliberately low, not a map-wide mirror. No SSR.
- One bounded local warm combat light for the current explosion or muzzle flash. Not a full multi-light renderer.
- Framebuffer completeness is checked; optional post effects fall back to direct rendering if targets cannot be allocated. Sampler bindings are cleared before rendering into shadow/reflection textures to avoid feedback loops. Replaced targets are deleted.

## Geometry and motion

- All eight tower models rebuilt around machined lathe profiles. Six rotating machine-gun barrels and feed drum; paired railgun rails/coils; cryogenic tanks and plumbing; braced mortar; stacked Tesla coils; flamethrower tanks/hoses/heat shields; reactor containment columns and orbiting core components; braced standard turret.
- Physical armor/outrigger/heatsink upgrades and separate cosmetic attachments, mechanical recoil and charge indicators. Status light areas are limited. Existing costs, damage and upgrade ranks retained.
- Humanoids now have tapered heads, curved torso and pelvis geometry, connected upper/lower limbs, moving joints and optional fingers, rather than disconnected translated blocks. Gait distinguishes runners and heavy classes. Armor, bulwark shield, boss shoulders/spikes, shadow hood, splitter/regen growths and reaper claws distinguish silhouettes.
- Distance/count/quality detail gating; low-resolution spheres outside inspection range; low-cost shadow proxies. Brief damage lean and bounded sinking death remnants. These are lightweight procedural rigs, not skeletal animation, IK or authored death animations.
- Additional rooftop tanks, stepped roof volumes, facade ladders, utility vents, road drains and perimeter wrecked service vehicles. Existing buildings, paths, and buildable cells retained. Most architectural generation is still the original district; a complete city redesign remains future work.
- Smooth orbit/zoom and focus interpolation independent of frame rate. `◎` inspects the selected tower; `⌂` restores the strategic view. Original drag/wheel/buttons/keyboard controls remain.
- CPU simulation retains fixed 120 Hz accumulation; catch-up increased to 250 ms / 30 steps for low rendering rates, with bounded catch-up after long suspension. A prolonged stall or background tab still intentionally discards time.

## VFX and performance

- Particle pool remains bounded at 550; a preallocated dynamic interleaved vertex buffer submits soft depth-tested particles in one draw instead of a sphere draw per particle. No particle buffer allocation or shader compilation per frame.
- Weapon tracers, distinct muzzle colors, recoil, chain beams, cryogenic and fire status effects remain. New explosion/muzzle local lighting. Advanced smoke, shell ejection, heat distortion and expanded multi-layer explosion art are not implemented.
- No performance guarantee. UI shows observed FPS, CPU render-call wall time (includes potential driver stalls), and total draw calls across passes. `#neon3d.dataset.frameP95` records the rolling p95 present interval over up to 120 frames. CPU time is not a GPU timer.
- Detailed dynamic geometry still uses individual draws. Hardware instancing, dynamic model batching, spatial city/frustum culling, GPU timer queries, better shadow atlasing and browser/device-wide profiling remain important next optimization steps.

| Preset | Max render DPR | Mirror fraction / interval | Shadows |
|---|---:|---|---|
| Performance | .85 | off | off |
| Balanced | 1 | .35 / 4 frames | 1024 |
| High | 1.25 | .50 / 2 frames | 1024 |
| Ultra | 1.5 | .65 / every frame | 2048 |
| Cinematic | 2 | .75 / every frame | 2048 |

DPR is capped by device DPR. Mirror dimensions are also bounded by 1050×700. Color+depth shadow targets cost about 6 MiB at 1024 or 24 MiB at 2048, in addition to scene/reflection/bloom targets. Ultra/Cinematic can be very slow on software GPUs. Performance disables postprocessing/reflections/shadows and reduces mesh detail. Hardware profiling is required before choosing a shipping default for a target device.

## Validation and evidence

Run `node tests/browser.cjs` with Playwright and Chromium installed. The managed development environment already supplies both. `CHROMIUM_PATH` can select a different binary. The runner hosts files on an ephemeral loopback HTTP server and uses a test-only response-injected bridge to access the closure. No testing API or free credits ship in the game.

Checks include real canvas pointer placement, upgrade/modification/target/sell UI, positive damage from all seven weapons, a twenty-wave simulation with heavily funded defense including bosses and splitting enemies, rendering all enemy/tower classes, all five quality presets, GL errors/console errors, and actual fullscreen at 1280×720, 1536×864, 1920×1080, 2560×1440. Accelerated campaign testing is a logic regression, not a natural-economy balance test or a real-time twenty-wave playthrough. Layout tests assert actual fullscreen, positive canvas area and no horizontal clipping; scrollable panels remain supported.

`artifacts/validation.json` is generated from the current run and contains exact results. `before.png` is the imported 3.1 build; `after.png` uses the same camera/viewport with no combatants. `after-models.png` shows a deliberately staged model gallery inside the real game, not a normal gameplay economy. `inspection.png` is a closer rendered tower view. Screenshots are actual Chromium WebGL output, not concept art.

Tests run on Chromium SwiftShader (software WebGL). Timings and FPS are observations of that environment and must not be extrapolated to discrete GPUs or compared as a controlled benchmark: baseline used its original Auto setting and the overhaul uses explicit presets. Some runs show large driver stalls; the exact current observations are retained in JSON. Hardware FPS, audio quality by listening, gamepad/mobile behavior and cross-browser compatibility have not been verified.

## Build

`python3 tools/build.py` in the repository produces `dist/NEON_OUTBREAK_4_OFFLINE.html` and `dist/NEON_OUTBREAK_4_SOURCE.zip`. The standalone file embeds the current CSS/JS; `standalone-original.html` is preserved as the 3.1 reference. The browser regression also opens the generated standalone in an offline browser context with a local route fulfilling its single document, checking no external resource loads and no GL errors. Desktop policies may prohibit `file://`; in that case use the documented local server.

## Remaining requested work

The next milestone should focus on dynamic instancing and measured hardware frame budgets, authored-quality zombie animation/deaths, richer per-material maps and local lighting, advanced smoke/heat effects, and more architectural variation. HDR/MSAA framebuffer support, full FXAA/SMAA (the inherited pass is a simple contrast-aware five-tap filter), SSAO, SSR, skin subsurface scattering, physically accurate glass and volumetric atmosphere are not claimed. The current release is a tested playable foundation and model/material/shadow upgrade, not the entirety of the requested high-end art production.

## AFTERLIGHT 5.0 update

The second iteration adds real campaign decisions: three ranked doctrines, mutually exclusive specializations, alternating operation modifiers, elite infected, a second boss phase, free cooldown-based tactical pulse, kill-chain rewards and perfect-wave bonuses. A mission forecast, boss health bar and integrated research panel make the rules visible. Existing paid abilities, tower ranks/modifications and twenty-wave campaign remain. First-target priority now measures progress within the path segment instead of distance to the firing tower. Shift-place supports repeated construction.

Presentation adds a procedural distant skyline, a bounded 100-drop world-space rain field using the preallocated particle VBO (off on Performance), specialization geometry and elite armor. This is restrained atmospheric rain represented by small particles, not fluid simulation. No GPU buffers are created for rain during gameplay. The buffer capacity grows from 550 to 750 records; combat still caps at 550. New HUD content scrolls within the same cockpit.

Validation additionally checks doctrine spending, exclusivity of specializations, cooldown lockout, and six earned research points over twenty waves. Campaign tests are funded simulations and do not establish natural-economy balance. The latest source/standalone filenames use `NEON_OUTBREAK_5`. Previous 4.0 technical limitations still apply: this is not a quantified 100× visual/performance improvement.
