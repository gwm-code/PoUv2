export type Stat = 'hp'|'atk'|'agi'
export interface HeroBase { id:string; name:string; class:string; base: Record<Stat, number>; }
export interface Hero extends HeroBase { level:number; xp:number; hp:number; alive:boolean; }
