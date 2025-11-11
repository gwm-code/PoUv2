import { CombatState } from './State'
export function attack(s:CombatState, heroIdx:number, targetIdx:number){
  const h = s.heroes[heroIdx], t = s.enemies[targetIdx]
  if (!h || !t || !t.alive) return
  const dmg = Math.max(1, h.atk - 0)
  t.hp -= dmg; s.log.push(`${h.name} hits ${t.name} for ${dmg}`)
  registerHitEffect(s, t.id, t.hp<=0)
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
  h.hp = Math.min(h.maxHp, h.hp+val)
  s.log.push(`${h.name} heals ${val}`)
}
export function enemyTurn(s:CombatState){
  const enemy = s.enemies.find(e=>e.alive)
  const target = s.heroes.find(h=>h.alive)
  if (!enemy || !target) return
  const dmg = Math.max(1, enemy.atk-0)
  target.hp -= dmg; s.log.push(`${enemy.name} hits ${target.name} for ${dmg}`)
  registerHitEffect(s, target.id, target.hp<=0)
  if (target.hp<=0){ target.alive=false; s.log.push(`${target.name} falls`) }
}

function creditKill(state:CombatState, heroId:string, enemyId:string){
  if (!heroId) return
  const xp = state.enemyXp[enemyId] ?? 0
  state.killXp[heroId] = (state.killXp[heroId] ?? 0) + xp
}

function registerHitEffect(state:CombatState, id:string, ko:boolean){
  const entry = state.effects[id] || (state.effects[id]={ hitTimer:0, koAlpha:1 })
  entry.hitTimer = 0.2
  if (ko) entry.koAlpha = 1
}
