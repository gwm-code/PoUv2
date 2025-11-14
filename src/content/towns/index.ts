import fogwoodTown from './fogwood'
import emberfallTown from './emberfall'
import type { TownDefinition } from './types'

const orderedTowns:TownDefinition[] = [
  fogwoodTown,
  emberfallTown
]

const registry:Record<string, TownDefinition> = orderedTowns.reduce((acc, town)=>{
  acc[town.id] = town
  return acc
}, {} as Record<string, TownDefinition>)

export const towns = registry
export const townOrder = orderedTowns.map(t=>t.id)

export function getTown(id:string):TownDefinition|undefined{
  return registry[id]
}
