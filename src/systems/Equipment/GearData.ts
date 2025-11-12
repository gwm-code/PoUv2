import gearData from '@content/gear.json'
import type { EquipmentSlot, Stat } from '@systems/Party/Types'

export interface GearDefinition {
  id:string
  name:string
  slot:EquipmentSlot
  bonuses?:Partial<Record<Stat, number>>
}

const gearList = gearData as GearDefinition[]
const gearMap = new Map<string, GearDefinition>()

for (const gear of gearList){
  gearMap.set(gear.id, gear)
}

export function getGearItem(id:string): GearDefinition | undefined {
  return gearMap.get(id)
}

export function getAllGear(): GearDefinition[] {
  return gearList
}
