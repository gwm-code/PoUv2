# Mistheart Modular Progress Log

## 2025-11-15
- Imported the Lv1–10 enemy roster from the mist bestiary doc, assigned combat stats/XP/gold curves, and wired sprite filename hooks for each creature so art can drop straight into `assets`.
- Rebalanced legacy Mistling/Shambler entries to fit the new curve and expanded `content/enemies.json` to 22 entries with level metadata for future encounter-scaling work.
- Updated the encounter factory to draw random low-level pairs by default (falling back to the full pool if needed) so test fights now surface the broader fauna instead of the first two JSON entries.
- Hooked party-aware scaling into encounters: we now read the average level of the roster’s three strongest heroes and restrict enemy selection to that band so difficulty climbs naturally even before biome gating is in place.
- Taught the battle renderer to load per-enemy sprite filenames (with automatic fallback to Mistling/default blocks if a PNG is missing/corrupt), so art updates no longer need code changes.
- Added a “Manual Battles” toggle to Settings for QA runs: when enabled the overworld suppresses random encounters and pressing Enter/Space spawns a fight on demand, making traversal testing painless.
- Built the first town hub (**Fogwood Watch**): handcrafted 32×20 layout, three NPCs with lore/testing tips, custom roof/farm tiles, and a south gate exit so designers can iterate on hub flows without touching the generator.
- Dropped the first playable dungeon (**Gloomhollow Sink**): handcrafted cavern layout, collision-aware movement, random encounters (or manual battles if the toggle is on), and glowing exit tiles that return you to the overworld.
- Introduced **Emberfall Crossing**, a second town for the Ashen Barrens with forge NPCs, lava-side layout, and automatic gate detection so multiple hubs can coexist as the generator spawns more towns.
- Refined the Fogwood UX: entering works whether you stand on or in front of the marker, exiting now requires pressing Enter at the south gate (no more accidental Esc behavior), bounds are clamped so you can’t walk off-screen, and the biome label correctly shows town metadata.
- Standardised town gates: Fogwood’s southern boundary now uses a 3‑tile road aperture, and any of those tiles counts as an exit so hubs feel more generous while staying lore-friendly.
- Allowed those gate tiles to be considered walkable so you can stand on any of them and exit without fighting the collision mask; feet-based tile detection ensures the prompt and interaction align.
- Auto-derived the exit tile list from the town layout template, guaranteeing all rendered gate tiles (not neighboring forests) get registered as valid exits even if we tweak ASCII art later.
- Tightened overworld collision: movement now tests the hero’s full bounding box against surrounding tiles, so you can’t slide partway into mountains/water when approaching from specific angles.
- Scaled the overworld up to a 1024×1024 map with camera-follow rendering and a sampled minimap, so we can start authoring full biome layouts without shrinking the viewport.
- Documented the refreshed roster in `README.md` for continuity.

## 2025-11-14
- Wired a dedicated start-menu theme (`Into the Mistheart.mp3`) that lives at the app level, loops softly while the title screen is visible, and pauses/resets automatically when launching the game or muting the track.
- Added a gold-accented speaker toggle to the start menu; the mute state persists via `localStorage` so returning to the menu keeps the player’s preference, and the same state now governs whether audio auto-plays after fullscreen prompts.
- Ensured fullscreen/resolution settings remain in sync between the start menu and in-game pause overlays, preventing duplicate fullscreen requests and keeping the UI workflow unified.
- Replaced the overworld movement box with the new world-map hero sprite sheet (idle + walking frames for all four facings) and taught `WorldController` to track facing/movement so the sprite animates only while traveling.

## 2025-11-13
- Added the dark Mist encounter transition: overworld snapshots are frozen, wisps curl inward, and the screen seals before combat loads to reinforce the lore beat that the Mist consumes everything.
- Built a dedicated `MistTransitionScene` (pulse → tendrils → portal phases) plus skippable input, and rerouted `WorldScene` encounters so battles now flow through the transition stack.
- Documented the feature in `README.md` so future contributors understand the encounter pacing hook.
- Debugged the WSL `npm install` failure (esbuild `spawnSync ... EPERM`); workaround is `npm install --ignore-scripts` followed by `node node_modules/esbuild/install.js || true`, then `npm run build` to verify.
- Fixed a crash in the new transition (non-finite values hitting `createRadialGradient`) by initializing the mist center/radius inside the constructor so the animation runs reliably.
- Hooked up a simple enemy AI pass: on each `ENEMY_TURN` every surviving foe randomly picks a living hero and swings, establishing the baseline we’ll expand with abilities/logic later.
- Corrected hero turn cycling so ATB-less encounters actually hand control to the enemy phase after the last acting hero (no wrap-around in `advanceHero`).
- Added a dedicated “current turn” triangle behind the active hero sprite and mirrored that highlight in the party HUD chips so it’s obvious who the player is commanding at any time.
- Locked the Mist encounter transition so it always plays to completion (no accidental skips from held movement keys).
- Added display settings: pause → Settings now includes integer resolution scaling (Fit/1×/2×/3×/4×) and a fullscreen toggle that uses the browser API and persists in saves.
- Introduced viewport presets (Classic 4:3, Widescreen 16:9, Cinematic 16:9) so we can render more world tiles without pillarboxing; changing the preset rebuilds the scenes with the new dimensions.
- Rebuilt the in-game menu: `I`/`P`/`C` now open a single tabbed overlay housing the redesigned Inventory panel plus the Party and Equipment tabs, keeping the backdrop consistent while jumping between systems.

## 2025-11-10
- Installed project dependencies (Vite/React) and fixed Windows/WSL shim issues.
- Added biome config + seeded world generator; rewired world UI and minimap to use biome palettes.
- Implemented kill-credit XP bonuses in combat rewards.
- Rebuilt battle HUD to FFVI layout: commands/target/party panels, hero/enemy formation, top log banner.
- Integrated new field background and hero/enemy sprites with auto white-stripping.
- Added targeting arrows (battlefield + HUD) and ensured target cycling works with WASD/arrow keys.

## Next Steps
1. Wire the new Settings toggles into battle pace (fast/pause/auto modes) and expose auto-resolve buttons in the combat HUD.
2. Expand audiovisual content: add biome-specific battle backgrounds, extra enemy sprites, and simple sprite/particle animations.
3. Layer in audio cues (attack/heal/victory stingers) tied to combat + overworld events.
4. Replace the placeholder shop interactions with real inventory transactions and NPC scripting hooks.

## 2025-11-11
- Refactored combat input into multi-tier menus (Attack / Skills / Spells / Items) with contextual prompts, revised targeting, and damage/heal popups.
- Added MP-aware ability data + loaders, new gear/inventory content, and shared bags so spells + consumables pull from actual resources.
- Implemented floating message feedback, HP/MP gauges, and party HP sync back to overworld after fights.
- Built full-screen character equipment overlay with hero tabs, slot map, inventory grid, drag + keyboard support, and live stat recalculations.
- Introduced equipment + derived stat helpers so gear bonuses feed combat (ATK/AGI/HP/MP) and are clamped on victory/level up.

## 2025-11-10 (later)
- Rebuilt battle visuals: defeater sprites, KO fade-outs, sprite-based hit flashes, targeting arrows synced with HUD + battlefield, hero portraits + overlays.
- Added Start menu, Pause menu, and in-game overlays for Inventory (`i`), Party (`p`), and Character (`c`).
- Introduced richer overworld generation driven by a noise-based heightmap: rivers flow downhill, forests/mountains/fields follow elevation bands, towns auto-connect via pathfinding roads.
- Hooked actual world tile sprites (grass, forest, road, mountain, town, water) with background colors so tiles sit edge-to-edge without gaps.
- Coasts temporarily removed until shoreline logic/tiles are ready.
## 2025-11-11 (later)
- Added an edge-transition pass to the overworld: new riverbank/coast tiles wrap rivers/lakes and forest borders gain tinted edging overlays so biomes blend instead of meeting abruptly.
- Reworked town placement so settlements form clusters connected by cleaner road networks, then seeded surrounding farm fields for visual context.
- Hooked the Inventory overlay into consumable logic (targeted healing, bag updates) and upgraded the Party overlay so players can toggle the active trio that actually enters combat/earns XP.
- Wired pause-menu Settings + Load: introduced adjustable world speed/encounter rates, automatic autosaves whenever pausing outside combat, and a load overlay that restores the saved world/party/bag from localStorage.

## 2025-11-12
- _Note: there was an unlogged session in between the previous entry and this one due to a crash/technical issue._
- Reworked the battle HUD layout so action/party panels now live inside the battlefield frame with controlled heights, while a slim enemy-summary strip sits directly above them.
- Added inline HP/MP bars to each party card (tabular numeric text + consistent bar columns) so vitals remain a quick glance even in the compact cards.
- Introduced the enemy HP summary row: each foe shows `Name: HP` plus a matching inline bar, scaled to the new 15 px strip for visual parity with hero vitals.
- Tuned panel spacings, padding, and fonts to keep text readable within the resized layout, and ensured enemy/panel bars share the same styling so the HUD looks cohesive.
