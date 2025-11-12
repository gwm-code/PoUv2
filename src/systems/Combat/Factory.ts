import enemies from '@content/enemies.json'
import { CombatState, Team } from './State'
export function makeEncounter(): CombatState {
  // pick two enemies from data
  const pick = (enemies as any[]).slice(0,2)
  const es = pick.map((e,i)=>({ id:e.id+i, name:e.name, team:'enemies' as Team, hp:e.hp, maxHp:e.hp, atk:e.atk, agi:e.agi, alive:true, atb:0 }))
  const rewardXp = pick.reduce((a,e)=> a + (e.xp||0), 0)
  const rewardGold = pick.reduce((a,e)=> a + (e.gold||0), 0)
  const enemyXp:Record<string, number> = {}
  pick.forEach((e,i)=>{ enemyXp[es[i].id] = e.xp||0 })
  return {
    phase:'INTRO',
    heroes:[],
    enemies:es,
    log:['Enemies emerge from the Mist...'],
    cursor:{heroIdx:0,menuIdx:0,targetIdx:0,sub:'actions',targetTeam:'enemies'},
    reward:{xp: rewardXp, gold: rewardGold},
    enemyXp,
    killXp:{},
    effects: {},
    introFrames:60,
    victoryFrames:120,
    prompt:undefined,
    commandMode:'primary',
    commands:[],
    items:[]
  }
}
