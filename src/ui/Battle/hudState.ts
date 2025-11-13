import { useSyncExternalStore } from 'react'

export interface RectFraction {
  x:number
  y:number
  w:number
  h:number
}

export interface CommandEntry {
  id?:string
  label:string
  detail?:string
  cost?:number
  qty?:number
  type?:string
  disabled?:boolean
}

export interface UnitDisplay {
  id?:string
  name:string
  hp:number
  maxHp:number
  mp?:number
  maxMp?:number
  level?:number
  alive?:boolean
  atb?:number
  active?:boolean
}

export interface BattleHudState {
  visible:boolean
  phase?:string
  headline?:string
  panels?:{
    enemy?:RectFraction
    command?:RectFraction
    target?:RectFraction
    party?:RectFraction
    banner?:RectFraction
  }
  actions?:{
    mode:'primary'|'skills'|'spells'|'items'
    primaryMenu:string[]
    commands:CommandEntry[]
    cursorIndex:number
  }
  target?:{
    team:'heroes'|'enemies'
    selecting:boolean
    selectedIndex:number
    heroes:UnitDisplay[]
    enemies:UnitDisplay[]
  }
  party?:{
    heroes:UnitDisplay[]
  }
  summary?:{
    visible:boolean
    xp:number
    gold:number
  }
}

const defaultState:BattleHudState = { visible:false }

type Listener = ()=>void
const listeners = new Set<Listener>()
let state:BattleHudState = defaultState

function emit(){
  for (const fn of listeners){
    fn()
  }
}

export function setBattleHudState(next:BattleHudState){
  state = next
  emit()
}

export function clearBattleHudState(){
  if (!state.visible) return
  state = defaultState
  emit()
}

export function useBattleHudState(){
  return useSyncExternalStore(
    (listener)=>{
      listeners.add(listener)
      return ()=>listeners.delete(listener)
    },
    ()=>state
  )
}
