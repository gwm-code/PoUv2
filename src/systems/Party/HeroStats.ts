import { Hero, Stat } from './Types'
import { getGearItem } from '@systems/Equipment/GearData'

export interface DerivedStats {
  hp:number
  mp:number
  atk:number
  agi:number
}

export function computeHeroStats(hero:Hero): DerivedStats {
  const totals:DerivedStats = {
    hp: hero.base.hp,
    mp: hero.base.mp ?? 0,
    atk: hero.base.atk,
    agi: hero.base.agi
  }
  const equipment = hero.equipment ?? {}
  for (const gearId of Object.values(equipment)){
    if (!gearId) continue
    const gear = getGearItem(gearId)
    if (!gear?.bonuses) continue
    for (const [stat, bonus] of Object.entries(gear.bonuses) as [Stat, number][]){
      if (typeof bonus !== 'number') continue
      if (stat === 'hp' || stat === 'mp' || stat === 'atk' || stat === 'agi'){
        totals[stat] = (totals[stat] ?? 0) + bonus
      }
    }
  }
  return totals
}

export function clampHeroVitals(hero:Hero): DerivedStats {
  const totals = computeHeroStats(hero)
  hero.hp = Math.min(hero.hp, totals.hp)
  hero.mp = Math.min(hero.mp, totals.mp)
  return totals
}
