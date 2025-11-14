export type Team = 'heroes'|'enemies'
export type TargetTeam = Team|'self'
export interface Battler { id:string; name:string; team:Team; hp:number; maxHp:number; mp?:number; maxMp?:number; atk:number; agi:number; alive:boolean; atb:number }
export interface CommandEntry { id:string; label:string; detail?:string; type:'ability'|'item'; qty?:number; cost?:number; disabled?:boolean }
export interface FloatingPopup { value:number; timer:number; mode:'damage'|'heal'; rise:number }
export interface CombatEffectState { hitTimer:number; koAlpha:number; popup?:FloatingPopup }
export type PendingAction =
  | { type:'attack'; label?:string; targetTeam?:TargetTeam }
  | { type:'defend' }
  | { type:'heal'; power?:number }
  | { type:'item'; itemId:string; label:string; targetTeam:TargetTeam }
  | { type:'ability'; abilityId:string; label:string; targetTeam:TargetTeam }
export interface CombatState {
  phase: 'INTRO'|'HERO_INPUT'|'TARGET_SELECT'|'RESOLVE'|'ENEMY_TURN'|'VICTORY'|'DEFEAT'|'SUMMARY'
  heroes: Battler[]
  enemies: Battler[]
  log: string[]
  cursor: { heroIdx:number; menuIdx:number; targetIdx:number; sub:'actions'|'items'; targetTeam?:TargetTeam }
  pending?: PendingAction
  reward: { xp:number; gold:number }
  enemyXp: Record<string, number>
  killXp: Record<string, number>
  effects: Record<string, CombatEffectState>
  introFrames: number
  victoryFrames: number
  prompt?:string
  commandMode:'primary'|'skills'|'spells'|'items'
  commands: CommandEntry[]
  items: { id:string; qty:number }[]
  tileType?: number
}
