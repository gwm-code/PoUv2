import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Game } from '@engine/Game'
import { Input } from '@engine/Input'
import { WorldState } from '@systems/World/WorldState'
import heroesData from '@content/heroes.json'
import { createHeroes } from '@systems/Party/Party'
import type { Hero } from '@systems/Party/Types'
import { WorldScene } from '@scenes/WorldScene'
import { BattleScene } from '@scenes/BattleScene'
import { Inventory, type Bag } from '@systems/Inventory/Inventory'
import { getItemById } from '@systems/Combat/ItemData'
import { computeHeroStats } from '@systems/Party/HeroStats'
import { useCanvas } from './hooks/useCanvas'
import { useGameLoop } from './hooks/useGameLoop'
import { useKeyboardInput } from './hooks/useKeyboardInput'
import { CharacterEquipmentOverlay } from '@ui/CharacterEquipmentOverlay'
import { BattleHudOverlay } from '@ui/Battle/BattleHudOverlay'
import { PartyOverlay } from '@ui/Party/PartyOverlay'

const VIEW_W = 384
const VIEW_H = 256
const TILE_SIZE = 16
const SAVE_KEY = 'mistheart_autosave'

type Overlay = 'inventory'|'party'|'character'|'settings'|'load'|null

interface GameSettings {
  worldSpeed:number
  encounterRate:number
}

const defaultSettings:GameSettings = { worldSpeed:1, encounterRate:1 }

interface GameSave {
  timestamp:number
  seed:number
  player:{ x:number; y:number }
  minimapMode:number
  heroes:Hero[]
  bag:Bag
  settings:GameSettings
}

interface PauseMenuProps {
  onResume:()=>void
  onSettings:()=>void
  onLoad:()=>void
  onQuit:()=>void
}

function PauseMenu({ onResume, onSettings, onLoad, onQuit }:PauseMenuProps){
  return (
    <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(5,4,12,0.8)', display:'flex', justifyContent:'center', alignItems:'center', color:'#fff', fontFamily:'VT323, monospace' }}>
      <div style={{ background:'#181438', border:'4px solid #7a6bff', padding:24, minWidth:240 }}>
        <h2 style={{ marginTop:0, textAlign:'center' }}>Paused</h2>
        <button style={pauseBtn} onClick={onResume}>Resume</button>
        <button style={pauseBtn} onClick={onSettings}>Settings</button>
        <button style={pauseBtn} onClick={onLoad}>Load</button>
        <button style={pauseBtn} onClick={onQuit}>Quit</button>
      </div>
    </div>
  )
}

const pauseBtn:React.CSSProperties = {
  display:'block',
  width:'100%',
  margin:'10px 0',
  padding:'10px 0',
  background:'#1f1c3f',
  border:'2px solid #7a6bff',
  color:'#fff',
  fontSize:18,
  cursor:'pointer'
}

interface OverlayShellProps { title:string; children:React.ReactNode; onClose:()=>void }

const overlayContainer:React.CSSProperties = { position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(5,4,12,0.7)', display:'flex', justifyContent:'center', alignItems:'center', color:'#fff', fontFamily:'VT323, monospace' }

function OverlayShell({ title, children, onClose }:OverlayShellProps){
  return (
    <div style={overlayContainer}>
      <div style={{ background:'#181438', border:'4px solid #7a6bff', padding:24, minWidth:280, maxWidth:420 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h2 style={{ margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#fff', fontSize:20, cursor:'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function cloneHero(hero:Hero):Hero {
  return {
    ...hero,
    base:{ ...hero.base },
    equipment:{ ...(hero.equipment ?? {}) }
  }
}

function cloneHeroes(heroes:Hero[]):Hero[]{
  return heroes.map(cloneHero)
}

function cloneBag(bag:Bag):Bag{
  return Object.fromEntries(Object.entries(bag)) as Bag
}

function readSave():GameSave|null{
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(SAVE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as GameSave
    return parsed
  } catch {
    return null
  }
}

function writeSave(data:GameSave){
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

function InventoryOverlay({ bag, heroes, onClose, onUpdated }:{ bag:Bag; heroes:Hero[]; onClose:()=>void; onUpdated:()=>void }){
  const entries = Inventory.list(bag)
  const [selected, setSelected] = useState(0)
  const [message, setMessage] = useState<string|null>(null)
  const [, force] = useState(0)
  useEffect(()=>{
    if (selected >= entries.length && entries.length>0){
      setSelected(entries.length-1)
    }
  },[entries.length, selected])
  const selectedEntry = entries[selected]
  const selectedItem = selectedEntry ? getItemById(selectedEntry.id) : undefined

  const handleUse = (hero:Hero)=>{
    if (!selectedEntry || !selectedItem){
      setMessage('Select an item first.')
      return
    }
    if (selectedItem.kind !== 'heal' || selectedItem.target!=='ally'){
      setMessage('This item cannot be used outside battle.')
      return
    }
    const derived = computeHeroStats(hero)
    if (hero.hp >= derived.hp){
      setMessage(`${hero.name} is already at full HP.`)
      return
    }
    if (!Inventory.use(bag, selectedEntry.id)){
      setMessage(`You are out of ${selectedItem.name}.`)
      force(x=>x+1)
      onUpdated()
      return
    }
    const before = hero.hp
    hero.hp = Math.min(derived.hp, hero.hp + selectedItem.amount)
    const delta = hero.hp - before
    setMessage(`${selectedItem.name} restored ${delta} HP to ${hero.name}.`)
    force(x=>x+1)
    onUpdated()
  }

  return (
    <OverlayShell title="Inventory" onClose={onClose}>
      {entries.length ? (
        <div style={{ display:'flex', gap:12 }}>
          <ul style={{ listStyle:'none', padding:0, margin:0, minWidth:160 }}>
            {entries.map((entry, idx)=>{
              const meta = getItemById(entry.id)
              const active = idx===selected
              return (
                <li
                  key={entry.id}
                  style={{
                    marginBottom:8,
                    padding:8,
                    border:'1px solid #6a5dff',
                    background: active ? '#342b63' : '#231f48',
                    cursor:'pointer'
                  }}
                  onClick={()=>{ setSelected(idx); setMessage(null) }}
                >
                  <strong>{meta?.name ?? entry.id}</strong> × {entry.qty}
                  <div style={{ fontSize:12, color:'#cfd2ff' }}>{meta?.description ?? 'Consumable'}</div>
                </li>
              )
            })}
          </ul>
          <div style={{ flex:1 }}>
            {selectedItem ? (
              <>
                <h3 style={{ marginTop:0 }}>{selectedItem.name}</h3>
                <p style={{ marginTop:0 }}>{selectedItem.description}</p>
                {selectedItem.kind==='heal' ? (
                  <div>
                    <p style={{ fontSize:12, color:'#cfd2ff' }}>Choose a hero to receive {selectedItem.amount} HP.</p>
                    <div style={{ maxHeight:160, overflowY:'auto' }}>
                      {heroes.map(hero=>{
                        const derived = computeHeroStats(hero)
                        const atCap = hero.hp >= derived.hp
                        return (
                          <div key={hero.id} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, padding:6, border:'1px solid #6a5dff', background:'#1a1734' }}>
                            <div>
                              <strong>{hero.name}</strong>
                              <div style={{ fontSize:12 }}>HP {hero.hp}/{derived.hp}</div>
                            </div>
                            <button
                              onClick={()=>handleUse(hero)}
                              disabled={atCap}
                              style={{ background:'#4e447b', border:'1px solid #9b8bff', color:'#fff', cursor:atCap?'not-allowed':'pointer', padding:'4px 12px' }}
                            >
                              Use
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize:12, color:'#f8c67c' }}>Damage items can only be used in combat.</p>
                )}
              </>
            ) : (
              <p style={{ fontSize:12 }}>Select an item to see details.</p>
            )}
            {message && <p style={{ fontSize:12, color:'#9be09b', marginTop:12 }}>{message}</p>}
          </div>
        </div>
      ) : (
        <p style={{ fontSize:14 }}>No usable items.</p>
      )}
    </OverlayShell>
  )
}

function SettingsOverlay({ settings, onChange, onClose }:{ settings:GameSettings; onChange:(next:GameSettings)=>void; onClose:()=>void }){
  const update = (patch:Partial<GameSettings>)=>{
    onChange({ ...settings, ...patch })
  }
  return (
    <OverlayShell title="Settings" onClose={onClose}>
      <div style={{ marginBottom:16 }}>
        <strong>Movement Speed</strong>
        <div style={{ display:'flex', gap:8, marginTop:6 }}>
          <button
            onClick={()=>update({ worldSpeed:1 })}
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.worldSpeed===1?'#332a63':'#1a1530', color:'#fff', cursor:'pointer' }}
          >
            Normal
          </button>
          <button
            onClick={()=>update({ worldSpeed:1.5 })}
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.worldSpeed>1?'#332a63':'#1a1530', color:'#fff', cursor:'pointer' }}
          >
            Fast
          </button>
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <strong>Encounter Rate</strong>
        <div style={{ display:'flex', gap:8, marginTop:6 }}>
          <button
            onClick={()=>update({ encounterRate:0.7 })}
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.encounterRate<1?'#332a63':'#1a1530', color:'#fff', cursor:'pointer' }}
          >
            Calm
          </button>
          <button
            onClick={()=>update({ encounterRate:1 })}
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.encounterRate===1?'#332a63':'#1a1530', color:'#fff', cursor:'pointer' }}
          >
            Normal
          </button>
          <button
            onClick={()=>update({ encounterRate:1.4 })}
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.encounterRate>1?'#332a63':'#1a1530', color:'#fff', cursor:'pointer' }}
          >
            Frenzied
          </button>
        </div>
      </div>
      <p style={{ fontSize:12, color:'#cfd2ff' }}>Applies immediately to overworld movement and encounter rolls.</p>
    </OverlayShell>
  )
}

function LoadOverlay({ save, disabled, onLoad, onClose }:{ save:GameSave|null; disabled:boolean; onLoad:(save:GameSave)=>void; onClose:()=>void }){
  return (
    <OverlayShell title="Load Game" onClose={onClose}>
      {save ? (
        <>
          <p style={{ marginTop:0 }}>Last saved: {new Date(save.timestamp).toLocaleString()}</p>
          <p style={{ fontSize:12, color:'#cfd2ff' }}>Seed #{save.seed} · Minimap mode {save.minimapMode}</p>
          <ul style={{ listStyle:'none', padding:0, margin:'8px 0' }}>
            {save.heroes.slice(0,4).map(hero=>(
              <li key={hero.id} style={{ fontSize:12 }}>{hero.name} Lv {hero.level} – HP {hero.hp}/{hero.base.hp}</li>
            ))}
            {save.heroes.length>4 && <li style={{ fontSize:12, color:'#cfd2ff' }}>…and {save.heroes.length-4} more</li>}
          </ul>
          <button
            onClick={()=>onLoad(save)}
            disabled={disabled}
            style={{ width:'100%', padding:'10px 0', border:'1px solid #7a6bff', background:disabled?'#2a244a':'#3a2f6b', color:'#fff', cursor:disabled?'not-allowed':'pointer', marginTop:12 }}
          >
            {disabled ? 'Cannot Load During Battle' : 'Load Save'}
          </button>
          {disabled && <p style={{ fontSize:11, color:'#f5a6a6', marginTop:8 }}>Finish the current battle before loading.</p>}
        </>
      ) : (
        <p style={{ fontSize:14 }}>No autosave data found yet.</p>
      )}
    </OverlayShell>
  )
}

export default function MistheartGame({ onQuit }:{ onQuit?:()=>void }){
  const { canvasRef, containerRef, ctx } = useCanvas(VIEW_W, VIEW_H)
  const [game, setGame] = useState<Game|null>(null)
  const [paused, setPaused] = useState(false)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [settings, setSettings] = useState<GameSettings>(defaultSettings)
  const [cachedSave, setCachedSave] = useState<GameSave|null>(()=>readSave())
  const [, setDataTick] = useState(0)
  const overlayRef = useRef<Overlay>(null)
  const pausedRef = useRef(false)
  const gameRef = useRef<Game|null>(null)
  const worldRef = useRef<WorldState|null>(null)
  const inBattleRef = useRef(false)
  const setPausedState = useCallback((value:boolean)=>{
    pausedRef.current = value
    setPaused(value)
  },[])
  const setOverlayState = useCallback((value:Overlay)=>{
    overlayRef.current = value
    setOverlay(value)
  },[])
  const markDataUpdated = useCallback(()=>setDataTick(t=>t+1),[])
  const partyRef = useRef<Hero[]>([])
  const inventoryRef = useRef<Bag>({
    potion:3,
    'mist-bomb':1,
    'iron-helm':1,
    'mistwarden-mail':1,
    'ember-splitter':1,
    'runed-focus':1,
    'stormband':1,
    'aether-amulet':1,
    'scout-greaves':1
  })
  const createWorldScene = useCallback((world:WorldState, party:Hero[], bag:Bag)=>{
    return new WorldScene(
      VIEW_W,
      VIEW_H,
      world,
      party,
      bag,
      (battle:BattleScene)=>{
        inBattleRef.current = true
        gameRef.current?.push(battle)
      },
      ()=>{
        inBattleRef.current = false
        gameRef.current?.pop()
      }
    )
  },[])
  const buildSavePayload = useCallback(()=>{
    const world = worldRef.current
    if (!world) return null
    return {
      timestamp: Date.now(),
      seed: world.seed,
      player:{ x: world.playerPx.x, y: world.playerPx.y },
      minimapMode: world.minimapMode,
      heroes: cloneHeroes(partyRef.current),
      bag: cloneBag(inventoryRef.current),
      settings
    } satisfies GameSave
  },[settings])
  const persistSave = useCallback(()=>{
    const payload = buildSavePayload()
    if (!payload) return
    writeSave(payload)
    setCachedSave(payload)
  },[buildSavePayload])
  const performLoad = useCallback((save:GameSave)=>{
    if (!gameRef.current) return
    const bag = cloneBag(save.bag)
    inventoryRef.current = bag
    const heroes = cloneHeroes(save.heroes)
    partyRef.current = heroes
    const world = new WorldState(VIEW_W / TILE_SIZE, VIEW_H / TILE_SIZE, { seed: save.seed })
    world.playerPx.x = save.player?.x ?? world.playerPx.x
    world.playerPx.y = save.player?.y ?? world.playerPx.y
    world.minimapMode = save.minimapMode ?? 0
    worldRef.current = world
    inBattleRef.current = false
    const scene = createWorldScene(world, heroes, bag)
    gameRef.current.replace(scene)
    setSettings(save.settings ?? defaultSettings)
    setOverlayState(null)
    setPausedState(false)
    markDataUpdated()
  },[createWorldScene, markDataUpdated, setOverlayState, setPausedState])

  useEffect(()=>{
    if (!ctx) return

    Input.attach()
    const gameInstance = new Game(VIEW_W, VIEW_H)
    const world = new WorldState(VIEW_W / TILE_SIZE, VIEW_H / TILE_SIZE)
    worldRef.current = world
    const party = createHeroes(heroesData as any)
    partyRef.current = party

    const worldScene = createWorldScene(world, party, inventoryRef.current)
    gameInstance.push(worldScene)

    gameRef.current = gameInstance
    setGame(gameInstance)

    return ()=>{
      inBattleRef.current = false
      worldRef.current = null
      gameRef.current = null
      setGame(null)
      Input.detach()
    }
  },[ctx, createWorldScene])

  useEffect(()=>{
    const world = worldRef.current
    if (!world) return
    world.speed = world.baseSpeed * settings.worldSpeed
    world.encounterModifier = settings.encounterRate
  },[settings])

  useEffect(()=>{
    if (!paused) return
    if (inBattleRef.current) return
    persistSave()
  },[paused, persistSave])

  useEffect(()=>{
    if (overlay === 'load'){
      setCachedSave(readSave())
    }
  },[overlay])

  const handleKeyDown = useCallback((e:KeyboardEvent)=>{
    const key=e.key.toLowerCase()
    if (overlayRef.current){
      if (key==='escape'){
        setOverlayState(null)
        e.preventDefault()
      }
      return
    }

    if (key==='i' || key==='p' || key==='c'){
      if (key==='i') setOverlayState('inventory')
      if (key==='p') setOverlayState('party')
      if (key==='c') setOverlayState('character')
      e.preventDefault()
      return
    }

    if (key==='escape'){
      setPausedState(!pausedRef.current)
      e.preventDefault()
      return
    }

    if (!pausedRef.current && !overlayRef.current){
      gameRef.current?.onKeyDown(e)
    }
  },[setOverlayState, setPausedState])

  const handleKeyUp = useCallback((e:KeyboardEvent)=>{
    if (!pausedRef.current && !overlayRef.current){
      gameRef.current?.onKeyUp(e)
    }
  },[])

  useKeyboardInput(handleKeyDown, handleKeyUp, Boolean(game))

  const shouldUpdate = !paused && overlay === null
  useGameLoop(ctx, game, shouldUpdate)

  return (
    <div ref={containerRef} style={{ width:'100vw', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#1a1a2e', padding:10, position:'relative' }}>
      <div style={{ position:'relative', display:'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={384}
          height={256}
          style={{
            border:'4px solid #4e447b',
            boxShadow:'0 0 20px rgba(78,68,123,0.8)',
            background:'#2c2541'
          }}
        />
        <BattleHudOverlay />
      </div>
      {paused && !overlay && (
        <PauseMenu
          onResume={()=>setPausedState(false)}
          onSettings={()=>setOverlayState('settings')}
          onLoad={()=>setOverlayState('load')}
          onQuit={()=>{ setPausedState(false); onQuit?.() }}
        />
      )}
      {overlay==='inventory' && (
        <InventoryOverlay
          bag={inventoryRef.current}
          heroes={partyRef.current}
          onClose={()=>setOverlayState(null)}
          onUpdated={markDataUpdated}
        />
      )}
      {overlay==='party' && (
        <PartyOverlay
          heroes={partyRef.current}
          maxActive={3}
          minActive={1}
          onClose={()=>setOverlayState(null)}
          onUpdated={markDataUpdated}
        />
      )}
      {overlay==='character' && (
        <CharacterEquipmentOverlay
          heroes={partyRef.current}
          bag={inventoryRef.current}
          onClose={()=>setOverlayState(null)}
        />
      )}
      {overlay==='settings' && (
        <SettingsOverlay
          settings={settings}
          onChange={setSettings}
          onClose={()=>setOverlayState(null)}
        />
      )}
      {overlay==='load' && (
        <LoadOverlay
          save={cachedSave}
          disabled={inBattleRef.current}
          onLoad={performLoad}
          onClose={()=>setOverlayState(null)}
        />
      )}
    </div>
  )
}
