# Mistheart Spire – Implementation Roadmap

## Immediate (Now → Prototype)
1. **Scene Architecture**
   - Turn `BattleScene` into an `IScene` with ATB loop, menu input, resolver hooks.
   - Split `WorldScene` into controller (input + world state), renderer (tilemap/HUD), and event/encounter modules.
2. **Procedural Foundations**
   - ~~Introduce a seeded generator for overworld + dungeon layout data.~~ ✅ Seeded overworld + dungeon layouts now come from `WorldState` (Nov 10).
   - ~~Create biome configs (encounters, palette, encounter rate ranges).~~ ✅ Biome palette + encounter data lives in `src/content/biomes.ts`.
3. **Combat Hooks**
   - ~~Wire possession status, trait choices, and kill XP bonuses into `@systems/Combat`.~~ ✅ Kill XP bonuses now reward finishing blows; possession/traits still pending.

## Near-Term (Prototype → Alpha)
- **Roster Systems:** Implement 7-hero roster management, party swaps, and trait unlock UI.
- **Lifetime Class Content:** Hook Blacksmith/Alchemist/Hunter perks into town services and loot tables.
- **Encounter Director:** Region-aware enemy pools, elite variants, and boss definitions.
- **Dungeon Runs:** Randomized room graphs with event hooks (ambush, puzzle, shrine).

## Mid-Term (Alpha → Beta)
- **Meta Progression:** Shared vault, run history, unlockable modifiers.
- **Narrative Beats:** Mystery clues for the Arch-Mage identity, branching town quests.
- **Audio/Visual Pass:** Cohesive palettes, shaders, and music triggers per biome.

## Guidelines
- Every new system should live under `src/systems/**` with data in `src/content/**`.
- Scenes stay thin: they orchestrate systems and call into `src/ui/**` for rendering.
- Update this roadmap as priorities shift so future contributors stay aligned.
