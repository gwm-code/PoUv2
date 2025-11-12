export type Stat = 'hp'|'atk'|'agi'|'mp'
export type EquipmentSlot = 'head'|'torso'|'wield1'|'wield2'|'ring'|'amulet'|'legs'
export interface HeroBase { id:string; name:string; class:string; base: Record<Stat, number>; abilities?:string[] }
export interface Hero extends HeroBase {
  level:number
  xp:number
  hp:number
  mp:number
  alive:boolean
  equipment: Partial<Record<EquipmentSlot, string>>
  active?:boolean
}
