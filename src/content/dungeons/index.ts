import gloomhollow from './gloomhollow'
import type { DungeonDefinition } from './types'

const ordered:DungeonDefinition[] = [
  gloomhollow
]

export const dungeons = ordered.reduce<Record<string, DungeonDefinition>>((acc, dungeon)=>{
  acc[dungeon.id] = dungeon
  return acc
}, {})

export const dungeonOrder = ordered.map(d=>d.id)
export const defaultDungeon = ordered[0]

export function getDungeon(id:string):DungeonDefinition|undefined{
  return dungeons[id]
}
