import itemList from '@content/items.json'

export type ItemTarget = 'ally'|'enemy'
export type ItemKind = 'heal'|'damage'

export interface ItemDefinition {
  id:string
  name:string
  description:string
  kind:ItemKind
  target:ItemTarget
  amount:number
}

const items = itemList as ItemDefinition[]

const itemMap = new Map<string, ItemDefinition>()

for (const item of items){
  itemMap.set(item.id, item)
}

export function getItemById(id:string): ItemDefinition | undefined {
  return itemMap.get(id)
}

export function getItemName(id:string): string {
  return itemMap.get(id)?.name ?? id
}

export function itemTargetTeam(target:ItemTarget): 'heroes'|'enemies'{
  return target==='enemy' ? 'enemies' : 'heroes'
}
