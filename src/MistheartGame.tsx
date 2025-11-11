import React, { useEffect, useRef, useState } from 'react'
import { Game } from '@engine/Game'
import { Input } from '@engine/Input'
import { WorldState } from '@systems/World/WorldState'
import heroesData from '@content/heroes.json'
import { createHeroes } from '@systems/Party/Party'
import type { Hero } from '@systems/Party/Types'
import { WorldScene } from '@scenes/WorldScene'
import { BattleScene } from '@scenes/BattleScene'

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

type Overlay = 'inventory'|'party'|'character'|null

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

function InventoryOverlay({ items, onClose }:{ items:string[]; onClose:()=>void }){
  return (
    <OverlayShell title="Inventory" onClose={onClose}>
      <ul style={{ listStyle:'square', paddingLeft:20 }}>
        {items.map(item=><li key={item} style={{ marginBottom:6 }}>{item}</li>)}
      </ul>
      <p style={{ fontSize:12, color:'#cfd2ff' }}>Inventory data placeholder.</p>
    </OverlayShell>
  )
}

function PartyOverlay({ heroes, onClose }:{ heroes:Hero[]; onClose:()=>void }){
  return (
    <OverlayShell title="Party Selection" onClose={onClose}>
      <ul style={{ listStyle:'none', padding:0, margin:0 }}>
        {heroes.map(hero=>(
          <li key={hero.id} style={{ marginBottom:8, padding:8, background:'#231f48', border:'1px solid #6a5dff' }}>
            <strong>{hero.name}</strong> – HP {hero.hp}/{hero.base.hp} | Lv {hero.level}
          </li>
        ))}
      </ul>
    </OverlayShell>
  )
}

function CharacterOverlay({ hero, onClose }:{ hero:Hero|undefined; onClose:()=>void }){
  return (
    <OverlayShell title="Character" onClose={onClose}>
      {hero ? (
        <div>
          <p>Name: {hero.name}</p>
          <p>Class: {hero.class}</p>
          <p>Level: {hero.level}</p>
          <p>Stats: HP {hero.hp}/{hero.base.hp} | ATK {hero.base.atk} | AGI {hero.base.agi}</p>
        </div>
      ) : <p>No hero data</p>}
    </OverlayShell>
  )
}

export default function MistheartGame({ onQuit }:{ onQuit?:()=>void }){
  const canvasRef = useRef<HTMLCanvasElement|null>(null)
  const containerRef = useRef<HTMLDivElement|null>(null)
  const [paused, setPaused] = useState(false)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const overlayRef = useRef<Overlay>(null)
  const pausedRef = useRef(false)
  const setPausedState = (value:boolean)=>{
    pausedRef.current = value
    setPaused(value)
  }
  const setOverlayState = (value:Overlay)=>{
    overlayRef.current = value
    setOverlay(value)
  }
  const partyRef = useRef<Hero[]>([])
  const [inventory] = useState<string[]>(['Potion x3','Ether x1','Antidote x2'])

  useEffect(()=>{
    const TILE=16, W=384, H=256
    const canvas = canvasRef.current!, ctx = canvas.getContext('2d')!

    // keep intrinsic size fixed; only CSS scales (integer)
    canvas.width = W; canvas.height = H

    const resize = () => {
      const el = containerRef.current
      if (!el) return
      const cw = Math.max(0, el.clientWidth)
      const ch = Math.max(0, el.clientHeight)
      const sx = Math.floor(cw / W)
      const sy = Math.floor(ch / H)
      const scale = Math.max(1, Math.min(sx, sy))
      const cssW = (W * scale) | 0
      const cssH = (H * scale) | 0
      canvas.style.setProperty('width', cssW + 'px')
      canvas.style.setProperty('height', cssH + 'px')
      ;(canvas.style as any).imageRendering = 'pixelated'
      ;(canvas.style as any).imageRendering = 'crisp-edges'
    }

    resize(); window.addEventListener('resize', resize)

    Input.attach()
    const game = new Game(W,H)
    const world = new WorldState(W/TILE, H/TILE)
    const party = createHeroes(heroesData as any)
    partyRef.current = party

    const pushBattle = (b: BattleScene)=> game.push(b)
    const popBattle  = ()=> game.pop()
    const worldScene = new WorldScene(W,H,world,party,pushBattle,popBattle)
    game.push(worldScene)

    let last=performance.now(), raf=0
    const loop=()=>{
      const now=performance.now(), dt=(now-last)/1000; last=now
      if (!pausedRef.current && !overlayRef.current){
        game.update(dt)
      }
      ctx.clearRect(0,0,W,H)
      game.draw(ctx)
      raf=requestAnimationFrame(loop)
    }
    raf=requestAnimationFrame(loop)

    const onKeyDown=(e:KeyboardEvent)=>{
      const key=e.key.toLowerCase()
      if (overlayRef.current){
        if (key==='escape'){
          setOverlayState(null)
          e.preventDefault()
          return
        }
      } else if (key==='i' || key==='p' || key==='c'){
        if (key==='i') setOverlayState('inventory')
        if (key==='p') setOverlayState('party')
        if (key==='c') setOverlayState('character')
        e.preventDefault()
        return
      } else if (key==='escape'){
        setPausedState(!pausedRef.current)
        e.preventDefault()
        return
      }
      if (!pausedRef.current && !overlayRef.current){
        game.onKeyDown(e)
      }
    }
    const onKeyUp=(e:KeyboardEvent)=> game.onKeyUp(e)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return ()=>{
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      Input.detach()
    }
  },[])

  return (
    <div ref={containerRef} style={{ width:'100vw', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#1a1a2e', padding:10, position:'relative' }}>
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
      {paused && !overlay && (
        <PauseMenu
          onResume={()=>setPausedState(false)}
          onSettings={()=>alert('Settings not implemented')}
          onLoad={()=>alert('Load not implemented')}
          onQuit={()=>{ setPausedState(false); onQuit?.() }}
        />
      )}
      {overlay==='inventory' && <InventoryOverlay items={inventory} onClose={()=>setOverlayState(null)} />}
      {overlay==='party' && <PartyOverlay heroes={partyRef.current} onClose={()=>setOverlayState(null)} />}
      {overlay==='character' && <CharacterOverlay hero={partyRef.current[0]} onClose={()=>setOverlayState(null)} />}
    </div>
  )
}
