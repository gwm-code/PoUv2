import { WorldState } from './WorldState'
import { WorldUIState } from './UIState'
import { townOrder } from '@content/towns'
import { dungeonOrder } from '@content/dungeons'

export interface WorldEventResult {
  talkText?: string|null
  toggleShop?: boolean
  enterTownId?: string
  enterDungeonId?: string
}

export function handleTileInteraction(world:WorldState, _ui:WorldUIState): WorldEventResult | undefined {
  const [tx,ty] = world.playerTile()
  if (tx===100 && ty===100) return { talkText: 'Eyla: Press Enter to heal in battle.' }
  if (tx===101 && ty===100) return { talkText: 'Greyor: Defend to brace against the Mist.' }
  if (tx===102 && ty===100) return { toggleShop:true }
  const townMatch = lookupTownTile(world, tx, ty)
  if (townMatch){
    return { enterTownId: townMatch }
  }
  const dungeonMatch = lookupDungeonTile(world, tx, ty)
  if (dungeonMatch){
    return { enterDungeonId: dungeonMatch }
  }
  return undefined
}

function forwardTile(world:WorldState, x:number, y:number){
  const facing = world.playerFacing
  let fx = x
  let fy = y
  if (facing==='up') fy -= 1
  else if (facing==='down') fy += 1
  else if (facing==='left') fx -= 1
  else if (facing==='right') fx += 1
  if (fx<0 || fy<0 || fy>=world.height || fx>=world.width) return undefined
  return { x:fx, y:fy }
}

function lookupTownTile(world:WorldState, x:number, y:number){
  const here = world.townIdAt(x, y)
  if (here) return here
  const ahead = forwardTile(world, x, y)
  if (ahead){
    const next = world.townIdAt(ahead.x, ahead.y)
    if (next) return next
  }
  return undefined
}

function lookupDungeonTile(world:WorldState, x:number, y:number){
  const here = world.dungeonIdAt(x, y)
  if (here) return here
  const ahead = forwardTile(world, x, y)
  if (ahead){
    const next = world.dungeonIdAt(ahead.x, ahead.y)
    if (next) return next
  }
  return undefined
}
