import { Inventory, type Bag } from '@systems/Inventory/Inventory'
import { getGearItem } from '@systems/Equipment/GearData'
import { clampHeroVitals } from './HeroStats'
import type { EquipmentSlot, Hero } from './Types'

export function equipGear(hero:Hero, slot:EquipmentSlot, gearId:string, bag:Bag):boolean {
  const gear = getGearItem(gearId)
  if (!gear || gear.slot !== slot) return false
  if (!Inventory.use(bag, gearId)) return false
  hero.equipment = hero.equipment ?? {}
  const previous = hero.equipment[slot]
  if (previous){
    Inventory.add(bag, previous, 1)
  }
  hero.equipment[slot] = gearId
  clampHeroVitals(hero)
  return true
}

export function unequipGear(hero:Hero, slot:EquipmentSlot, bag:Bag):boolean {
  const current = hero.equipment?.[slot]
  if (!current) return false
  delete hero.equipment![slot]
  Inventory.add(bag, current, 1)
  clampHeroVitals(hero)
  return true
}
