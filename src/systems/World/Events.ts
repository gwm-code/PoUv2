import { WorldState } from './WorldState'
import { WorldUIState } from './UIState'

export interface WorldEventResult {
  talkText?: string|null
  toggleShop?: boolean
}

export function handleTileInteraction(world:WorldState, _ui:WorldUIState): WorldEventResult | undefined {
  const [tx,ty] = world.playerTile()
  if (tx===100 && ty===100) return { talkText: 'Eyla: Press Enter to heal in battle.' }
  if (tx===101 && ty===100) return { talkText: 'Greyor: Defend to brace against the Mist.' }
  if (tx===102 && ty===100) return { toggleShop:true }
  return undefined
}
