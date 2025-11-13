import React, { useMemo, useState } from 'react'
import type { Hero } from '@systems/Party/Types'
import { computeHeroStats } from '@systems/Party/HeroStats'

const portraitImports = import.meta.glob('../../assets/portraits/*.png', { eager: true, import: 'default' }) as Record<string, string>

function getPortraitFor(heroId:string):string|undefined {
  const key = `../../assets/portraits/${heroId}.png`
  return portraitImports[key]
}

const overlayRoot:React.CSSProperties = { position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(5,4,12,0.78)', display:'flex', justifyContent:'center', alignItems:'center' }

const panelStyle:React.CSSProperties = {
  color:'#fff',
  fontFamily:'VT323, monospace',
  width:'100%',
  height:'100%',
  display:'grid',
  gridTemplateColumns:'1.1fr 280px',
  gridTemplateRows:'minmax(180px, auto) 1fr',
  gap:18,
  padding:'4px 6px'
}

const headerText:React.CSSProperties = { fontSize:18, textTransform:'uppercase', letterSpacing:1, marginBottom:8, color:'#d3c9ff' }
const card = (selected:boolean):React.CSSProperties=>({
  border:'2px solid #4e447b',
  background:selected ? '#2c2548' : '#181438',
  padding:12,
  display:'flex',
  gap:12,
  alignItems:'center',
  cursor:'pointer',
  minHeight:96
})

const portraitBox:React.CSSProperties = {
  width:72,
  height:72,
  border:'2px solid #7a6bff',
  background:'#080713',
  display:'flex',
  alignItems:'center',
  justifyContent:'center',
  overflow:'hidden'
}

const reserveListStyle:React.CSSProperties = { border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.03)', overflowY:'auto', maxHeight:240, padding:6 }

const statusPanel:React.CSSProperties = {
  border:'1px solid rgba(255,255,255,0.2)',
  background:'rgba(255,255,255,0.04)',
  padding:16,
  borderRadius:6
}

const bar = (value:number, max:number, color:string):React.CSSProperties=>{
  const pct = max>0 ? Math.max(0, Math.min(100, Math.round((value/max)*100))) : 0
  return {
    height:10,
    width:'100%',
    background:'#241f3d',
    border:'1px solid #51407c',
    marginBottom:6,
    position:'relative',
    overflow:'hidden'
  }
}

const barFill = (value:number, max:number, color:string):React.CSSProperties=>{
  const pct = max>0 ? Math.max(0, Math.min(100, (value/max)*100)) : 0
  return {
    position:'absolute',
    top:0,
    left:0,
    width:`${pct}%`,
    height:'100%',
    background:color
  }
}

interface PartyPanelProps {
  heroes:Hero[]
  maxActive:number
  minActive:number
  onUpdated:()=>void
}

export interface PartyOverlayProps extends PartyPanelProps {
  onClose:()=>void
}

export function PartyPanel({ heroes, maxActive, minActive, onUpdated }:PartyPanelProps){
  const [selection, setSelection] = useState<{ group:'active'|'reserve'; index:number }>({ group:'active', index:0 })
  const activeHeroes = heroes.filter(h=>h.active !== false)
  const reserveHeroes = heroes.filter(h=>h.active === false)

  const activeSlots = useMemo(()=>{
    const slots:(Hero|null)[] = []
    for (let i=0;i<maxActive;i++){
      slots.push(activeHeroes[i] ?? null)
    }
    return slots
  }, [activeHeroes, maxActive])

  const currentHero = selection.group==='active'
    ? activeSlots[selection.index] ?? null
    : reserveHeroes[selection.index] ?? null
  const derived = currentHero ? computeHeroStats(currentHero) : null

  const message = currentHero?.active !== false ? 'Send to reserves' : 'Make active'

  const toggleHero = (hero:Hero|null)=>{
    if (!hero) return
    const currentlyActive = hero.active !== false
    if (currentlyActive){
      if (activeHeroes.length <= minActive) return
      hero.active = false
    } else {
      if (activeHeroes.length >= maxActive) return
      hero.active = true
    }
    onUpdated()
  }

  const renderSlot = (hero:Hero|null, idx:number)=>{
    const sel = selection.group==='active' && selection.index===idx
    return (
      <div key={`active-${idx}`} style={card(sel)} onClick={()=>{
        setSelection({ group:'active', index:idx })
        if (hero){
          toggleHero(hero)
        }
      }}>
        <div style={portraitBox}>
          {hero
            ? <Portrait id={hero.id} name={hero.name} />
            : <span style={{ color:'#6f67a1', fontSize:14 }}>Empty</span>}
        </div>
        <div>
          <div style={{ fontSize:16, color:'#fff' }}>{hero ? hero.name : '- Empty -'}</div>
          <div style={{ fontSize:13, color:'#cfd2ff' }}>{hero ? hero.class : 'Slot available'}</div>
        </div>
      </div>
    )
  }

  const renderReserve = (hero:Hero, idx:number)=>{
    const sel = selection.group==='reserve' && selection.index===idx
    return (
      <div
        key={hero.id}
        style={{ ...card(sel), borderBottom:'1px solid #2f2850', minHeight:72 }}
        onClick={()=>{
          setSelection({ group:'reserve', index:idx })
          toggleHero(hero)
        }}
      >
        <div style={portraitBox}><Portrait id={hero.id} name={hero.name} /></div>
        <div>
          <div style={{ fontSize:16 }}>{hero.name}</div>
          <div style={{ fontSize:13, color:'#cfd2ff' }}>{hero.class}</div>
        </div>
      </div>
    )
  }

  return (
      <div style={panelStyle}>
        <div style={{ gridColumn:'1 / span 2' }}>
          <div style={headerText}>Active Party ({activeHeroes.length}/{maxActive})</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
            {activeSlots.map(renderSlot)}
          </div>
          <div style={{ fontSize:12, color:'#cfd2ff', marginTop:4 }}>Click a slot to toggle; at least {minActive} hero must remain active.</div>
        </div>

        <div>
          <div style={headerText}>Reserve Party</div>
          <div style={reserveListStyle}>
            {reserveHeroes.length ? reserveHeroes.map(renderReserve) : <div style={{ padding:16, color:'#9da0d1' }}>No reserves available.</div>}
          </div>
        </div>

        <div>
          <div style={headerText}>Status</div>
          <div style={statusPanel}>
            {currentHero ? (
              <>
                <div style={{ display:'flex', gap:12, marginBottom:12 }}>
                  <div style={portraitBox}><Portrait id={currentHero.id} name={currentHero.name} /></div>
                  <div>
                    <div style={{ fontSize:18 }}>{currentHero.name}</div>
                    <div style={{ fontSize:14, color:'#cfd2ff' }}>{currentHero.class}</div>
                    <div style={{ fontSize:13 }}>Lv {currentHero.level}</div>
                  </div>
                </div>
                <div style={{ fontSize:13, marginBottom:8 }}>HP {currentHero.hp}/{derived?.hp ?? currentHero.base.hp}</div>
                <div style={{ ...bar(currentHero.hp, derived?.hp ?? currentHero.base.hp, '#ff8a65') }}>
                  <div style={barFill(currentHero.hp, derived?.hp ?? currentHero.base.hp, '#ff8a65')} />
                </div>
                <div style={{ fontSize:13, marginTop:8, marginBottom:8 }}>MP {currentHero.mp}/{derived?.mp ?? currentHero.base.mp ?? 0}</div>
                <div style={{ ...bar(currentHero.mp, derived?.mp ?? currentHero.base.mp ?? 0, '#4fc3f7') }}>
                  <div style={barFill(currentHero.mp, derived?.mp ?? currentHero.base.mp ?? 0, '#4fc3f7')} />
                </div>
                {derived && (
                  <div style={{ marginTop:12, fontSize:13, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:4 }}>
                    <StatLine label="ATK" value={derived.atk} />
                    <StatLine label="AGI" value={derived.agi} />
                    <StatLine label="HP" value={derived.hp} />
                    <StatLine label="MP" value={derived.mp} />
                  </div>
                )}
                <button
                  onClick={()=>toggleHero(currentHero)}
                  style={{ marginTop:16, width:'100%', padding:'8px 0', background:'#4e447b', border:'1px solid #9b8bff', color:'#fff', cursor:'pointer' }}
                >
                  {message}
                </button>
              </>
            ) : (
              <p style={{ color:'#cfd2ff' }}>Select a hero to view details.</p>
            )}
          </div>
        </div>
      </div>
  )
}

export function PartyOverlay({ onClose, ...rest }:PartyOverlayProps){
  return (
    <div style={overlayRoot}>
      <PartyPanel {...rest} />
      <button
        onClick={onClose}
        style={{ position:'absolute', top:24, right:32, background:'transparent', border:'none', color:'#fff', fontSize:28, cursor:'pointer' }}
      >
        ×
      </button>
    </div>
  )
}

function Portrait({ id, name }:{ id:string; name:string }){
  const src = getPortraitFor(id)
  if (src){
    return <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
  }
  return (
    <span style={{ fontSize:14, color:'#cfd2ff' }}>
      {name.slice(0,2).toUpperCase()}
    </span>
  )
}

function StatLine({ label, value }:{ label:string; value:number }){
  return (
    <div style={{ display:'flex', justifyContent:'space-between' }}>
      <span style={{ color:'#9da0d1' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
