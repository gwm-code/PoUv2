export interface TownNPC {
  id:string
  name:string
  x:number
  y:number
  facing?:'up'|'down'|'left'|'right'
  dialog:string[]
}

export interface TownDefinition {
  id:string
  name:string
  biomeName?:string
  description?:string
  tiles:number[][]
  spawn:{ x:number; y:number }
  exits:{ x:number; y:number }[]
  npcs:TownNPC[]
}
