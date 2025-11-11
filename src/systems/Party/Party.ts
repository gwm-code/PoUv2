import { Hero, HeroBase } from './Types'
export function createHeroes(bases: HeroBase[]): Hero[] {
  return bases.map(h=>({ ...h, level:1, xp:0, hp:h.base.hp, alive:true }))
}
export function gainRewards(heroes:Hero[], xp:number, killXp:Record<string, number> = {}){
  const ups:string[] = []
  const eligible = heroes.filter(h=>h.alive)
  if (!eligible.length) return ups
  const baseShare = Math.floor(xp / eligible.length)
  let remainder = xp - baseShare * eligible.length
  for (const h of eligible){
    let grant = baseShare
    if (remainder>0){ grant++; remainder-- }
    const bonus = killXp[h.id] ?? 0
    grant += bonus*2
    applyXpGain(h, grant, ups)
  }
  return ups
}

function applyXpGain(hero:Hero, amount:number, ups:string[]){
  hero.xp += amount
  while (hero.xp >= 20*hero.level){
    hero.xp -= 20*hero.level
    hero.level++
    hero.base.hp += 2
    hero.base.atk += 1
    hero.hp = hero.base.hp
    ups.push(`${hero.name} leveled up! Lv ${hero.level}`)
  }
}
