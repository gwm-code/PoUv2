import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Game } from '@engine/Game'
import { Input } from '@engine/Input'
import { WorldState } from '@systems/World/WorldState'
import heroesData from '@content/heroes.json'
import { createHeroes } from '@systems/Party/Party'
import type { Hero } from '@systems/Party/Types'
import { WorldScene } from '@scenes/WorldScene'
import { BattleScene } from '@scenes/BattleScene'
import { MistTransitionScene } from '@scenes/MistTransitionScene'
import { TownScene } from '@scenes/TownScene'
import { DungeonScene } from '@scenes/DungeonScene'
import type { Bag } from '@systems/Inventory/Inventory'
import { useCanvas } from './hooks/useCanvas'
import { useGameLoop } from './hooks/useGameLoop'
import { useKeyboardInput } from './hooks/useKeyboardInput'
import { CharacterEquipmentOverlay } from '@ui/CharacterEquipmentOverlay'
import { BattleHudOverlay } from '@ui/Battle/BattleHudOverlay'
import { TILE_SIZE, VIEWPORT_PRESETS, resolveViewport, type ViewportPresetKey } from '@config/display'
import { WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT } from '@config/world'
import { GameMenuOverlay, type GameMenuTab } from '@ui/Menu/GameMenuOverlay'
import frameTexture from './assets/frame.png'
import { getTown } from '@content/towns'
import { getDungeon, defaultDungeon } from '@content/dungeons'

const SAVE_KEY = 'mistheart_autosave'
const baseTextColor = 'var(--mh-gold, #cba76b)'

type Overlay = 'menu'|'settings'|'load'|null
export type ResolutionScale = 'fit'|'fill'|1|2|3|4

export interface GameSettings {
  worldSpeed:number
  encounterRate:number
  fullscreen:boolean
  resolutionScale:ResolutionScale
  viewportPreset:ViewportPresetKey
  manualEncounters:boolean
}

export const defaultSettings:GameSettings = {
  worldSpeed:1,
  encounterRate:1,
  fullscreen:false,
  resolutionScale:'fit',
  viewportPreset:'widescreen',
  manualEncounters:false
}

export const resolutionOptions:ResolutionScale[] = ['fit','fill',1,2,3,4]

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
    <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(5,4,12,0.65)', display:'flex', justifyContent:'center', alignItems:'center', color:baseTextColor, fontFamily:'VT323, monospace' }}>
      <div style={{ background:'rgba(8,6,12,0.4)', borderStyle:'solid', borderWidth:96, borderImageSource:`url(${frameTexture})`, borderImageSlice:'256 fill', borderImageRepeat:'stretch', padding:24, minWidth:240, color:baseTextColor, boxShadow:'0 0 25px rgba(0,0,0,0.8)' }}>
        <h2 style={{ marginTop:0, textAlign:'center', color:baseTextColor, textShadow:'0 0 6px rgba(0,0,0,0.7)' }}>Paused</h2>
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
  background:'transparent',
  border:'none',
  color:'#cba76b',
  fontSize:20,
  textTransform:'uppercase',
  cursor:'pointer',
  fontFamily:'VT323, monospace',
  letterSpacing:1,
  textShadow:'0 0 6px rgba(0,0,0,0.8)'
}

interface OverlayShellProps { title:string; children:React.ReactNode; onClose:()=>void }

const overlayContainer:React.CSSProperties = { position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(5,4,12,0.65)', display:'flex', justifyContent:'center', alignItems:'center', color:baseTextColor, fontFamily:'VT323, monospace', zIndex:5 }
const framedPanel:React.CSSProperties = {
  background:'rgba(8,6,12,0.45)',
  borderStyle:'solid',
  borderWidth:96,
  borderImageSource:`url(${frameTexture})`,
  borderImageSlice:'256 fill',
  borderImageRepeat:'stretch',
  padding:24,
  boxShadow:'0 0 30px rgba(0,0,0,0.75)',
  color:'#cba76b'
}

function OverlayShell({ title, children, onClose }:OverlayShellProps){
  return (
    <div style={overlayContainer}>
      <div style={{ ...framedPanel, minWidth:280, maxWidth:420 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h2 style={{ margin:0, color:baseTextColor, textShadow:'0 0 6px rgba(0,0,0,0.7)' }}>{title}</h2>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:baseTextColor, fontSize:20, cursor:'pointer', textShadow:'0 0 6px rgba(0,0,0,0.7)' }}>×</button>
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

export function SettingsOverlay({ settings, onChange, onClose }:{ settings:GameSettings; onChange:(next:GameSettings)=>void; onClose:()=>void }){
  const update = (patch:Partial<GameSettings>)=>{
    onChange({ ...settings, ...patch })
  }
  return (
    <OverlayShell title="Settings" onClose={onClose}>
      <div style={{ marginBottom:16 }}>
        <strong>Viewport</strong>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
          {Object.values(VIEWPORT_PRESETS).map(preset=>{
            const active = settings.viewportPreset===preset.key
            return (
              <button
                key={preset.key}
                onClick={()=>update({ viewportPreset:preset.key })}
                style={{
                  flex:'1 1 120px',
                  padding:'6px 8px',
                  border:'1px solid #7a6bff',
                  background: active ? '#332a63' : '#1a1530',
                  color:baseTextColor,
                  cursor:'pointer'
                }}
              >
                <div>{preset.label}</div>
                <div style={{ fontSize:11, color:'#cfd2ff' }}>{preset.description}</div>
              </button>
            )
          })}
        </div>
        <p style={{ fontSize:11, color:'#cfd2ff', marginTop:4 }}>Wider presets render more of the map and battles.</p>
      </div>
      <div style={{ marginBottom:16 }}>
        <strong>Movement Speed</strong>
        <div style={{ display:'flex', gap:8, marginTop:6 }}>
          <button
            onClick={()=>update({ worldSpeed:1 })}
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.worldSpeed===1?'#332a63':'#1a1530', color:baseTextColor, cursor:'pointer' }}
          >
            Normal
          </button>
          <button
            onClick={()=>update({ worldSpeed:1.5 })}
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.worldSpeed>1?'#332a63':'#1a1530', color:baseTextColor, cursor:'pointer' }}
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
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.encounterRate<1?'#332a63':'#1a1530', color:baseTextColor, cursor:'pointer' }}
          >
            Calm
          </button>
          <button
            onClick={()=>update({ encounterRate:1 })}
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.encounterRate===1?'#332a63':'#1a1530', color:baseTextColor, cursor:'pointer' }}
          >
            Normal
          </button>
          <button
            onClick={()=>update({ encounterRate:1.4 })}
            style={{ flex:1, padding:'6px 8px', border:'1px solid #7a6bff', background:settings.encounterRate>1?'#332a63':'#1a1530', color:baseTextColor, cursor:'pointer' }}
          >
            Frenzied
          </button>
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <strong>Testing</strong>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
          <button
            onClick={()=>update({ manualEncounters: !settings.manualEncounters })}
            style={{
              flex:'0 0 auto',
              padding:'6px 12px',
              border:'1px solid #7a6bff',
              background:settings.manualEncounters ? '#332a63' : '#1a1530',
              color:baseTextColor,
              cursor:'pointer'
            }}
          >
            Manual Battles: {settings.manualEncounters ? 'ON' : 'OFF'}
          </button>
          <span style={{ fontSize:11, color:'#cfd2ff' }}>ON = disables random encounters; press Enter/Space to spawn a battle.</span>
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <strong>Resolution Scale</strong>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
          {resolutionOptions.map(option=>{
            const label = option==='fit' ? 'Fit' : option==='fill' ? 'Fill' : `${option}×`
            const active = settings.resolutionScale===option
            return (
              <button
                key={option.toString()}
                onClick={()=>update({ resolutionScale: option })}
                style={{
                  flex:'1 1 70px',
                  padding:'6px 8px',
                  border:'1px solid #7a6bff',
                  background: active ? '#332a63' : '#1a1530',
                  color:baseTextColor,
                  cursor:'pointer'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        <p style={{ fontSize:11, color:'#cfd2ff', marginTop:6 }}>Fit = largest integer scale; Fill = stretch to window.</p>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:14 }}>
          <input
            type="checkbox"
            checked={settings.fullscreen}
            onChange={(e)=>update({ fullscreen:e.target.checked })}
            style={{ transform:'scale(1.1)' }}
          />
          Fullscreen
        </label>
        <p style={{ fontSize:11, color:'#cfd2ff', marginTop:4 }}>Some browsers require a user gesture to enter fullscreen.</p>
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
            style={{ width:'100%', padding:'10px 0', border:'1px solid #7a6bff', background:disabled?'#2a244a':'#3a2f6b', color:baseTextColor, cursor:disabled?'not-allowed':'pointer', marginTop:12 }}
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

interface MistheartGameProps {
  onQuit?:()=>void
  settings:GameSettings
  onChangeSettings:(next:GameSettings)=>void
}

export default function MistheartGame({ onQuit, settings, onChangeSettings }:MistheartGameProps){
  const [game, setGame] = useState<Game|null>(null)
  const [paused, setPaused] = useState(false)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [menuTab, setMenuTab] = useState<GameMenuTab>('inventory')
  const viewport = useMemo(()=>resolveViewport(settings.viewportPreset), [settings.viewportPreset])
  const { canvasRef, containerRef, ctx } = useCanvas(viewport.width, viewport.height, { scaleMode: settings.resolutionScale })
  const [cachedSave, setCachedSave] = useState<GameSave|null>(()=>readSave())
  const [, setDataTick] = useState(0)
  const overlayRef = useRef<Overlay>(null)
  const pausedRef = useRef(false)
  const gameRef = useRef<Game|null>(null)
  const worldRef = useRef<WorldState|null>(null)
  const inBattleRef = useRef(false)
  const settingsRef = useRef(settings)
  useEffect(()=>{ settingsRef.current = settings },[settings])
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
  const createWorldScene = useCallback((world:WorldState, party:Hero[], bag:Bag, dims = viewport)=>{
    const pushWorldBattle = (battle:BattleScene, ctx:{ world:WorldState; ui:any })=>{
      const transition = new MistTransitionScene(dims.width, dims.height, {
        world: ctx.world,
        ui: ctx.ui,
        onComplete: ()=>{
          const gameInstance = gameRef.current
          if (!gameInstance) return
          gameInstance.pop()
          inBattleRef.current = true
          gameInstance.push(battle)
        }
      })
      gameRef.current?.push(transition)
    }
    const popBattle = ()=>{
      inBattleRef.current = false
      gameRef.current?.pop()
    }
    const manualSwitch = ()=>settingsRef.current.manualEncounters
    const pushDungeonBattle = (battle:BattleScene)=>{
      const gameInstance = gameRef.current
      if (!gameInstance) return
      inBattleRef.current = true
      gameInstance.push(battle)
    }
    const openTown = (townId:string)=>{
      const town = getTown(townId)
      if (!town){
        console.warn(`Unknown town id ${townId}`)
        return
      }
      const townScene = new TownScene(
        dims.width,
        dims.height,
        town,
        ()=>{
          gameRef.current?.pop()
        }
      )
      gameRef.current?.push(townScene)
    }
    const openDungeon = (dungeonId:string)=>{
      const dungeonDef = getDungeon(dungeonId) ?? defaultDungeon
      if (!dungeonDef || !dungeonDef.spawn){
        console.warn(`No dungeon definition available (requested "${dungeonId}")`)
        return
      }
      const dungeonScene = new DungeonScene(
        dims.width,
        dims.height,
        dungeonDef,
        party,
        bag,
        pushDungeonBattle,
        popBattle,
        manualSwitch,
        ()=>{
          gameRef.current?.pop()
        }
      )
      gameRef.current?.push(dungeonScene)
    }
    return new WorldScene(
      dims.width,
      dims.height,
      world,
      party,
      bag,
      pushWorldBattle,
      popBattle,
      manualSwitch,
      openTown,
      openDungeon
    )
  },[viewport])
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
    const presetKey = save.settings?.viewportPreset ?? defaultSettings.viewportPreset
    const targetViewport = resolveViewport(presetKey)
    const world = new WorldState(WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT, { seed: save.seed })
    world.playerPx.x = save.player?.x ?? world.playerPx.x
    world.playerPx.y = save.player?.y ?? world.playerPx.y
    world.minimapMode = save.minimapMode ?? 0
    worldRef.current = world
    inBattleRef.current = false
    const scene = createWorldScene(world, heroes, bag, targetViewport)
    gameRef.current.replace(scene)
    onChangeSettings(save.settings ? { ...defaultSettings, ...save.settings, viewportPreset: presetKey } : defaultSettings)
    setOverlayState(null)
    setPausedState(false)
    markDataUpdated()
  },[createWorldScene, markDataUpdated, setOverlayState, setPausedState])

  useEffect(()=>{
    if (!ctx) return

    Input.attach()
    const gameInstance = new Game(viewport.width, viewport.height)
    const world = new WorldState(WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT)
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
  },[ctx, createWorldScene, viewport])

  useEffect(()=>{
    const world = worldRef.current
    if (!world) return
    world.speed = world.baseSpeed * settings.worldSpeed
    world.encounterModifier = settings.encounterRate
  },[settings])

  const fullscreenEnabled = settings.fullscreen

  useEffect(()=>{
    if (typeof document === 'undefined') return
    const container = containerRef.current
    if (!container) return
    if (fullscreenEnabled){
      if (document.fullscreenElement !== container){
        container.requestFullscreen().catch(()=>{
          const current = settingsRef.current
          if (current.fullscreen){
            onChangeSettings({ ...current, fullscreen:false })
          }
        })
      }
    } else if (document.fullscreenElement === container){
      document.exitFullscreen().catch(()=>{})
    }
  },[fullscreenEnabled, containerRef, onChangeSettings])

  useEffect(()=>{
    if (typeof document === 'undefined') return
    const handle = ()=>{
      const container = containerRef.current
      const active = document.fullscreenElement === container
      const current = settingsRef.current
      if (current.fullscreen===active) return
      onChangeSettings({ ...current, fullscreen: active })
    }
    document.addEventListener('fullscreenchange', handle)
    return ()=>document.removeEventListener('fullscreenchange', handle)
  },[onChangeSettings])

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
      if (key==='i') setMenuTab('inventory')
      if (key==='p') setMenuTab('party')
      if (key==='c') setMenuTab('equipment')
      setOverlayState('menu')
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
      {overlay==='menu' && (
        <GameMenuOverlay
          tab={menuTab}
          onChangeTab={setMenuTab}
          onClose={()=>setOverlayState(null)}
          heroes={partyRef.current}
          bag={inventoryRef.current}
          onPartyUpdated={markDataUpdated}
          onInventoryUpdated={markDataUpdated}
        />
      )}
      {overlay==='settings' && (
        <SettingsOverlay
          settings={settings}
          onChange={onChangeSettings}
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
