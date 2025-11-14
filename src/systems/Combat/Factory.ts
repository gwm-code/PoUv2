import enemies from '@content/enemies.json'
import { CombatState, Team } from './State'

interface EnemyData {
  id:string
  name:string
  level?:number
  hp:number
  atk:number
  agi:number
  xp:number
  gold:number
  sprite?:string
}

export function makeEncounter(partyLevel:number, tileType?:number): CombatState {
  const pool = enemies as EnemyData[]
  const candidates = resolveEnemyCandidates(pool, partyLevel, 2)
  const pick = sampleEnemies(candidates, 2)
  const es = pick.map((e,i)=>({
    id:`${e.id}_${i}`,
    name:e.name,
    team:'enemies' as Team,
    hp:e.hp,
    maxHp:e.hp,
    atk:e.atk,
    agi:e.agi,
    alive:true,
    atb:0,
    sprite:e.sprite
  }))
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
    items:[],
    tileType
  }
}

function sampleEnemies(pool:EnemyData[], count:number){
  if (!pool.length) throw new Error('Enemy pool is empty')
  const remaining = [...pool]
  const picks:EnemyData[] = []
  for (let i=0; i<count && remaining.length; i++){
    const idx = Math.floor(Math.random()*remaining.length)
    picks.push(remaining.splice(idx,1)[0])
  }
  while (picks.length < count){
    picks.push(pool[pool.length-1])
  }
  return picks
}

function resolveEnemyCandidates(pool:EnemyData[], partyLevel:number, desiredCount:number){
  if (!pool.length) throw new Error('Enemy pool is empty')
  const normalizedLevel = Math.max(1, Number.isFinite(partyLevel) ? partyLevel : 1)
  const maxEnemyLevel = pool.reduce((max, enemy)=> Math.max(max, enemy.level ?? 1), 1)
  let spread = 0
  while (spread <= maxEnemyLevel){
    const minLevel = Math.max(1, Math.floor(normalizedLevel - spread))
    const maxLevel = Math.min(maxEnemyLevel, Math.ceil(normalizedLevel + spread))
    const subset = pool.filter(enemy=>{
      const level = enemy.level ?? 1
      return level >= minLevel && level <= maxLevel
    })
    if (subset.length >= desiredCount){
      return subset
    }
    spread++
  }
  return pool
}
