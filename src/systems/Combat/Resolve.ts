import { CombatState, TargetTeam } from './State'
import { getAbilityById } from './AbilityData'
import { getItemById } from './ItemData'
import { Inventory, type Bag } from '@systems/Inventory/Inventory'

export function attack(s:CombatState, heroIdx:number, targetIdx:number){
  const h = s.heroes[heroIdx], t = s.enemies[targetIdx]
  if (!h || !t || !t.alive) return
  const dmg = Math.max(1, h.atk - 0)
  t.hp -= dmg; s.log.push(`${h.name} hits ${t.name} for ${dmg}`)
  registerHitEffect(s, t.id, t.hp<=0, dmg, 'damage')
  if (t.hp<=0){
    t.alive=false
    s.log.push(`${t.name} is defeated`)
    creditKill(s, h.id, t.id)
  }
}
export function defend(s:CombatState, heroIdx:number){
  s.log.push(`${s.heroes[heroIdx].name} defends`)
}
export function heal(s:CombatState, heroIdx:number){
  const h=s.heroes[heroIdx]
  const val = 10
  const before = h.hp
  h.hp = Math.min(h.maxHp, h.hp+val)
  const gained = h.hp - before
  if (gained>0){
    s.log.push(`${h.name} heals ${gained}`)
    registerHitEffect(s, h.id, false, gained, 'heal')
  } else {
    s.log.push(`${h.name} is already at full health`)
  }
}
export function enemyTurn(s:CombatState){
  const attackers = s.enemies.filter(e=>e.alive)
  if (!attackers.length) return
  for (const enemy of attackers){
    const targetIdx = pickRandomAliveHeroIndex(s)
    if (targetIdx === -1) break
    const target = s.heroes[targetIdx]
    const dmg = Math.max(1, enemy.atk)
    target.hp -= dmg
    s.log.push(`${enemy.name} hits ${target.name} for ${dmg}`)
    registerHitEffect(s, target.id, target.hp<=0, dmg, 'damage')
    if (target.hp<=0){
      target.alive=false
      s.log.push(`${target.name} falls`)
    }
    if (!s.heroes.some(h=>h.alive)) break
  }
}

export function useAbility(state:CombatState, heroIdx:number, targetIdx:number, targetTeam:TargetTeam, abilityId:string){
  const ability = getAbilityById(abilityId)
  const user = state.heroes[heroIdx]
  if (!ability || !user || !user.alive) return
  const cost = ability.cost ?? 0
  const mpPool = user.mp ?? 0
  if (mpPool < cost){
    state.log.push(`${user.name} lacks the MP to use ${ability.name}`)
    return
  }
  if (cost>0){
    user.mp = mpPool - cost
  }
  const target = resolveTarget(state, targetTeam, targetIdx, heroIdx)
  if (!target) return
  if (ability.kind === 'attack'){
    const dmg = Math.max(1, user.atk + ability.power)
    target.hp -= dmg
    state.log.push(`${user.name} uses ${ability.name} on ${target.name} for ${dmg}`)
    registerHitEffect(state, target.id, target.hp<=0, dmg, 'damage')
    if (target.hp<=0){
      target.alive=false
      state.log.push(`${target.name} is defeated`)
      if (target.team==='enemies'){
        creditKill(state, user.id, target.id)
      }
    }
    return
  }
  if (ability.kind === 'heal'){
    const before = target.hp
    const healAmount = Math.max(1, ability.power + Math.floor(user.atk*0.5))
    target.hp = Math.min(target.maxHp, target.hp + healAmount)
    const delta = Math.max(0, target.hp - before)
    state.log.push(`${user.name} casts ${ability.name} on ${target.name} (+${delta})`)
    if (delta>0){
      registerHitEffect(state, target.id, false, delta, 'heal')
    }
  }
}

export function useItem(state:CombatState, heroIdx:number, targetIdx:number, targetTeam:TargetTeam, itemId:string, bag:Bag):boolean{
  const item = getItemById(itemId)
  const user = state.heroes[heroIdx]
  if (!item || !user || !user.alive) return false
  if (!Inventory.use(bag, itemId)){
    state.log.push(`No ${item.name} left!`)
    return false
  }
  const target = resolveTarget(state, targetTeam, targetIdx, heroIdx)
  if (!target) return false
  if (item.kind==='damage'){
    const dmg = Math.max(1, item.amount)
    target.hp -= dmg
    state.log.push(`${user.name} throws ${item.name} at ${target.name} for ${dmg}`)
    registerHitEffect(state, target.id, target.hp<=0, dmg, 'damage')
    if (target.hp<=0){
      target.alive=false
      state.log.push(`${target.name} is defeated`)
      if (target.team==='enemies'){
        creditKill(state, user.id, target.id)
      }
    }
  } else if (item.kind==='heal'){
    const before = target.hp
    target.hp = Math.min(target.maxHp, target.hp + item.amount)
    const delta = Math.max(0, target.hp - before)
    state.log.push(`${user.name} uses ${item.name} on ${target.name} (+${delta})`)
    if (delta>0){
      registerHitEffect(state, target.id, false, delta, 'heal')
    }
  }
  return true
}

function creditKill(state:CombatState, heroId:string, enemyId:string){
  if (!heroId) return
  const xp = state.enemyXp[enemyId] ?? 0
  state.killXp[heroId] = (state.killXp[heroId] ?? 0) + xp
}

function registerHitEffect(state:CombatState, id:string, ko:boolean, value?:number, mode:'damage'|'heal'='damage'){
  const entry = state.effects[id] || (state.effects[id]={ hitTimer:0, koAlpha:1 })
  entry.hitTimer = 0.2
  if (ko) entry.koAlpha = 1
  if (typeof value==='number'){
    entry.popup = { value, timer:0.75, mode, rise:0 }
  }
}

function resolveTarget(state:CombatState, team:TargetTeam, targetIdx:number, fallbackHeroIdx:number){
  if (team==='self'){
    return state.heroes[fallbackHeroIdx]
  }
  const list = team==='heroes' ? state.heroes : state.enemies
  return list[targetIdx] ?? list.find(unit=>unit?.alive)
}

function pickRandomAliveHeroIndex(state:CombatState){
  const alive = state.heroes
    .map((hero, idx)=>hero.alive ? idx : -1)
    .filter(idx=>idx>=0)
  if (!alive.length) return -1
  const choice = Math.floor(Math.random()*alive.length)
  return alive[choice]
}
