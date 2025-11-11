export type Bag = Record<string, number>
export const Inventory = {
  add(bag:Bag, id:string, qty=1){ bag[id]=(bag[id]||0)+qty },
  use(bag:Bag, id:string){ if(!bag[id]) return false; bag[id]-=1; if(bag[id]<=0) delete bag[id]; return true },
  list(bag:Bag){ return Object.entries(bag).map(([id,qty])=>({id,qty})) }
}
