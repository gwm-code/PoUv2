# Mistheart Modular – Developer Handbook

> **Note on history:** Between the last logged session (see `progress.md`) and this one we lost a set of notes due to a crash. Always skim both this README and the progress log before making changes so you know the current state.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Controls & UX](#controls--ux)
4. [Codebase Layout](#codebase-layout)
5. [Key Systems](#key-systems)
6. [Current Status (Nov 2025)](#current-status-nov-2025)
7. [Workflow & Logging](#workflow--logging)
8. [Troubleshooting](#troubleshooting)

---

## Project Overview
**Mistheart Spire** is a SNES-inspired tactical JRPG. This repository hosts the “modular” reimplementation: engine pieces (world gen, combat loop, UI overlays) are split into `engine/`, `systems/`, `scenes/`, and `ui/` packages to keep features swappable.

The current focus is polishing the battle HUD (React overlay atop the canvas) and iterating on world interactions. Narrative/roadmap context lives in `docs/`:
- `docs/premise.md` – high-level story + hero roster.
- `docs/roadmap.md` – milestone checklist (procedural work done, roster systems/encounter director outstanding).

---

## Getting Started
```bash
npm install         # install React + Vite deps
npm run dev         # start Vite with hot reload
npm run build       # type-check + production bundle
npm run preview     # serve the production build
```
The project uses Vite + React with TypeScript (strict mode). Imports rely on TS path aliases (see `tsconfig.json` / `vite.config.ts`).

---

## Controls & UX
| Context    | Keys / Actions                                                                    |
|------------|------------------------------------------------------------------------------------|
| Overworld  | Arrows / WASD move. `M` cycles minimap modes. `E` toggles equipment overlay, `O` toggles shop overlay, `Esc` closes overlays. |
| Interact   | Press `Enter` on scripted tiles (e.g., X102/Y100) to trigger shop/event handlers. |
| Battle     | `Enter/Z/Space` confirm, `Esc/X` cancel. Multi-tier menu (Attack / Skills / Spells / Items). Target selection with arrows/WASD; `Enter` commits, `Esc` backs out. |
| Overlays   | `I` Inventory; `P` Party management; `C` Character equipment. `Esc` closes. |
| Pause      | `Esc` toggles pause menu (resume/settings/load/quit). Autosave fires whenever you pause outside combat. |
| Start Menu | Click the gold speaker icon to mute/unmute the corridor theme (preference is saved). |

HUD Highlights (as of 2025‑11‑12):
- Action + Party panels tuck inside the battlefield frame.
- A slim enemy strip above the HUD summarises each foe (`Name: HP X/Y` + inline bar).
- Party cards show inline HP/MP bars and tabular numeric text for easy scanning.

### Display Settings & Audio
- Pause → Settings now exposes multiple viewports (**Classic 4:3**, **Widescreen 16:9**, **Cinematic 16:9**) that redraw the world/battle scenes with more tiles onscreen.
- Resolution Scale (Fit, 1×–4×) still controls pixel size, and the **Fullscreen** toggle requests the browser API; prefs persist with the autosave payload.
- `I`, `P`, or `C` now open a single **Game Menu** overlay with tabs for Inventory, Party, and Equipment, so you can swap between management screens without closing the menu.
- The title screen plays the “Into the Mistheart” theme on loop; the speaker toggle shares its mute state with later sessions so players aren’t surprised by auto-play audio.

---

## Codebase Layout
```
src/
  engine/     # lightweight scene stack, input wrapper, event bus
  systems/
    World/    # generator, controller, encounters, UI state
    Combat/   # state machine, resolver logic, data loaders
    Party/    # hero factories, stats, equipment, rewards
    Inventory/# bag helpers
    Equipment/# gear data
  scenes/
    WorldScene.ts  # orchestrates overworld controller + renderer
    BattleScene.ts # combat state machine driving the HUD overlay
  ui/
    Battle/    # React HUD overlay + renderer helpers
    Party/     # party management overlay
    Character/ # equipment overlay
    World/     # canvas renderers for map/minimap/NPC bubbles
  content/   # JSON data (heroes, enemies, items, gear, abilities)
hooks/       # canvas + game loop + keyboard hooks
assets/      # sprites, tiles, portraits, backgrounds
```
Supporting files:
- `progress.md` – chronological dev log (must update each session).
- `docs/` – narrative premise + roadmap.
- `vite.config.ts` / `tsconfig.json` – alias + compiler settings.

---

## Key Systems
### World
Noise-driven world generator with sector-based biomes, rivers, towns, and dungeon entrances. The overworld now generates at **1024×1024 tiles** independent of the viewport; a camera follows the party while the minimap samples the full terrain. `WorldState` manages player movement, encounter rolls, minimap, and tile metadata. `WorldController` consumes input and triggers encounters/events; `WorldRenderer` draws tile sprites and overlays.
- The overworld party marker now uses the dedicated world-map sprite sheet (4 directions, idle + walk cycle) so the squad feels grounded on the map instead of a placeholder box.
- Collision sampling checks the party’s entire footprint against surrounding tiles so you can’t “clip” into mountains/water when approaching from odd angles.

### Combat
`BattleScene` runs a deterministic state machine:
- `CombatState` holds battlers, menus, logs, reward tracking.
- `Resolve.ts` handles attack/ability/item resolutions (with kill-credit XP bonuses).
- `ui/Battle` folder draws the pixel battlefield and the React HUD overlay (actions, target list, party panel, summary).
- `ENEMY_TURN` currently drives a lightweight AI pass where each surviving foe picks a random living hero and performs a basic attack; this is the placeholder layer we’ll extend later for scripted behaviours.
Recent HUD work splits canvas rendering from overlay layout; the overlay gets normalized rects so it can mirror whatever geometry the renderer chooses.

### Encounter Flow
- When an overworld encounter triggers, the game now routes through a **Mist transition scene**: the world desaturates, charcoal wisps curl in from the screen edges, and a circular tear closes over the party before the battle HUD fades in. The transition lasts ~2 seconds, can be skipped with any key, and keeps the lore front-and-center (the Mist is literally swallowing the map).

### Party & Gear
`Party.ts` seeds the hero roster from `content/heroes.json`, tracks level/XP, and applies kill bonuses. `HeroStats.ts` aggregates equipment bonuses. `CharacterEquipmentOverlay` + `PartyOverlay` expose drag/drop and active-party selection.

### Towns
Interacting with a town tile (`8`) now loads a dedicated `TownScene`. The first slice, **Fogwood Watch**, is a 32×20 handcrafted layout with NPC dialogue hooks and a three-tile southern gate (stand on any of the road tiles and press Enter to leave). The Ashen Barrens now route to **Emberfall Crossing**, a forge-heavy town with lava-side NPC chatter. Towns reuse the overworld palette but swap in bespoke roof/farm/forge tiles so designers can sketch cozy hubs while combat systems continue evolving independently.

### Dungeons
`DungeonScene` handles handcrafted caverns with collision, random encounters, and exit tiles. **Gloomhollow Sink** is the first playable dungeon: traverse the tight corridors, trigger encounters (manual encounters respected here too), and press Enter on the glowing exit tiles to surface.

---

## Current Status (Nov 12, 2025)
High-level summary from the latest `progress.md` entry:
- **HUD Restructure:** Action/party panels moved into the battlefield frame; enemy summary added; height/padding tuned for readability.
- **Inline Bars:** Both heroes and enemies now display HP/MP bars inline with their text to keep vitals consistent across overlays.
- **Enemy Roster:** Early encounters now draw from a 22-creature Lv1–10 bestiary (foxes, imps, shamblers, corrupted villagers, etc.) with unique stat curves and dedicated sprite hooks so future areas can scale difficulty cleanly.
- **Dynamic Scaling:** The encounter factory now reads the average level of the roster’s top three heroes (so you can’t bench everyone to cheese) and picks enemies within that band, giving smooth difficulty bumps even before region-tiered maps land.
- **Sprite Fallbacks:** Battle rendering now looks up each enemy’s dedicated sprite filename (and falls back to Mistling/default geometry if the PNG is missing/corrupt) so you can drop new art without code changes.
- **Town Prototype:** Fogwood Watch is fully playable—press Enter on any overworld town tile to load the handcrafted hub, chat with three NPCs for lore/tips, then press Enter at the south gate (or Esc) to return to the world map.
- **Dungeon Debut:** Dungeon tiles now lead into Gloomhollow Sink, a multi-room battle crawl with manual encounter support and handcrafted collision.
- **Full Map & Camera:** The overworld now spans 1024×1024 tiles with a camera-follow renderer plus a down-sampled minimap, so larger handcrafted biomes fit without shrinking the viewport.
- **Second Hub & Collision Update:** Emberfall Crossing anchors the Ashen Barrens, and overworld collision now checks the party’s full footprint so mountains/water feel solid no matter the approach angle.
- **Manual Encounter Switch:** Settings now expose a Manual Battles toggle for testing—flip it on to disable overworld auto-encounters and fire fights manually with Enter/Space while you roam the map.
- **World/Combat Systems:** Stable seeded world gen, multi-tier battle menus, overlays for inventory/party/equipment, autosave on pause.
- **Missing Notes:** There was an unlogged session between Nov 11 and Nov 12 due to a crash. If something feels out of sync, check `git log` and the code rather than relying solely on the written log.

Open efforts (per `docs/roadmap.md` + `progress.md`):
- Roster systems (swapping, traits UI) and encounter director are next.
- Lifetime class perks, dungeon runs, and meta progression are still on the roadmap.

---

## Workflow & Logging
1. **Before coding:** Read this README and skim `progress.md` so you know the latest state.
2. **While coding:** Keep related changes grouped; prefer updating dedicated modules (`systems/**`, `ui/**`, etc.).
3. **After coding:** Append a dated section to `progress.md` capturing:
   - Feature/bugfix summary.
   - Any blocking issues or TODOs.
   - Note crashes or missing sessions explicitly.
4. **Run checks:** `npm run build` (tsc + vite build) before handing off.

---

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Vite fails with missing deps | Run `npm install`. |
| `npm install` fails with `esbuild ... spawnSync ... EPERM` on WSL/Win11 | Run `npm install --ignore-scripts`, then `node node_modules/esbuild/install.js || true`. The script may still print the EPERM warning but the binary lands correctly; afterwards `npm run build` succeeds. |
| Canvas overlay looks wrong | Remember both the canvas and React overlay are positioned; restart `npm run dev` to ensure new geometry loads. |
| Autosave/localStorage stale | Clear browser storage or delete `localStorage['mistheart_autosave']`. |
| Modules not resolving | Node 18+ is required; TS path aliases expect Vite’s dev server. |

If you’re stuck, document the problem in `progress.md` so the next session knows where to pick up.

---

Happy hacking – keep the Mistheart alive! 💜
