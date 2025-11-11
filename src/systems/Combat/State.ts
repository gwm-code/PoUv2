export type Team = 'heroes'|'enemies'
export interface Battler { id:string; name:string; team:Team; hp:number; maxHp:number; atk:number; agi:number; alive:boolean; atb:number }
export interface CombatState {
  phase: 'INTRO'|'HERO_INPUT'|'TARGET_SELECT'|'RESOLVE'|'ENEMY_TURN'|'VICTORY'|'DEFEAT'|'SUMMARY'
  heroes: Battler[]
  enemies: Battler[]
  log: string[]
  cursor: { heroIdx:number; menuIdx:number; targetIdx:number; sub:'actions'|'items' }
  pending?: { type:'attack'|'defend'|'heal'|'item', power?:number }
  reward: { xp:number; gold:number }
  enemyXp: Record<string, number>
  killXp: Record<string, number>
  effects: Record<string, { hitTimer:number; koAlpha:number }>
  introFrames: number
  victoryFrames: number
}
