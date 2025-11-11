# Mistheart Modular – Full Conversion Scaffold
Generated 2025-11-08T08:56:35.215061Z

## Controls
- Move: Arrow keys / WASD (one tile with slight repeat delay)
- M: Cycle minimap sizes (3)
- E: Equip overlay (placeholder), O: Shop overlay (placeholder), Esc closes
- Enter at X:102, Y:100: toggle Shop overlay
- Confirm: Enter/Z/Space, Cancel: Esc/X
- Battle menu: Attack / Defend / Heal; Items submenu (Potion/Antidote/Back)
- Target select: arrows to change, Enter to confirm, Esc to cancel
- Victory banner -> Summary; press Enter to return to world

## Run
```bash
npm i
npm run dev
```

## Structure
See `src/` folders: engine, systems, ui, scenes, content.
This mirrors your previous game state but split into modules.
