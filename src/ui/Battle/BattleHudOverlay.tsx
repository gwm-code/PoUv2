import React, { useEffect, useState } from 'react'
import { useBattleHudState, RectFraction, UnitDisplay, CommandEntry } from './hudState'

const overlayRoot:React.CSSProperties = {
  position:'absolute',
  inset:0,
  pointerEvents:'none',
  fontFamily:'VT323, monospace',
  color:'#fff'
}

const panelBase:React.CSSProperties = {
  background:'#181438',
  border:'2px solid #7a6bff',
  boxSizing:'border-box',
  padding:'10px 14px',
  display:'flex',
  flexDirection:'column',
  gap:10,
  overflow:'hidden'
}

export function BattleHudOverlay(){
  const hud = useBattleHudState()
  const [hoveredIdx, setHoveredIdx] = useState<number|undefined>(undefined)
  useEffect(()=>{
    setHoveredIdx(undefined)
  }, [hud.actions?.mode, hud.actions?.commands.length])
  if (!hud.visible) return null

  return (
    <div style={overlayRoot}>
      {hud.panels?.banner && (
        <div style={{ ...rectStyle(hud.panels.banner), ...bannerStyle }}>
          <span style={{ fontSize:12 }}>{hud.headline ?? ''}</span>
        </div>
      )}
      {hud.panels?.enemy && (
        <div style={{ ...rectStyle(hud.panels.enemy), ...enemyPanelStyle }}>
          <EnemySummary enemies={hud.target?.enemies ?? []} />
        </div>
      )}
      {hud.panels?.command && hud.actions && (
        <div style={{ ...rectStyle(hud.panels.command), ...panelBase, pointerEvents:'auto' }}>
          <div style={sectionHeading}>Actions</div>
          <ActionList actions={hud.actions} onHover={setHoveredIdx} />
          {hud.actions.mode!=='primary' && currentDetail(hud.actions, hoveredIdx) && (
            <div style={{ fontSize:12, color:'#cfd2ff', marginTop:6 }}>{currentDetail(hud.actions, hoveredIdx)}</div>
          )}
        </div>
      )}
      {hud.panels?.target && hud.target && (
        <div style={{ ...rectStyle(hud.panels.target), ...panelBase }}>
          <div style={sectionHeading}>{hud.target.team==='heroes'?'Allies':'Enemy'}</div>
          <TargetList target={hud.target} />
        </div>
      )}
      {hud.panels?.party && hud.party && (
        <div style={{ ...rectStyle(hud.panels.party), ...panelBase }}>
          <div style={sectionHeading}>Party</div>
          <PartyList heroes={hud.party.heroes} />
        </div>
      )}
      {hud.summary?.visible && (
        <div style={summaryShell}>
          <div style={summaryCard}>
            <div style={{ fontSize:20, marginBottom:10 }}>Battle Results</div>
            <div style={{ fontSize:14 }}>XP Earned: {hud.summary.xp}</div>
            <div style={{ fontSize:14, marginBottom:12 }}>Gold: {hud.summary.gold}</div>
            <div style={{ fontSize:12, color:'#cfd2ff' }}>Press Enter to continue</div>
          </div>
        </div>
      )}
    </div>
  )
}

function rectStyle(rect:RectFraction):React.CSSProperties{
  return {
    position:'absolute',
    left:`${rect.x*100}%`,
    top:`${rect.y*100}%`,
    width:`${rect.w*100}%`,
    height:`${rect.h*100}%`
  }
}

const bannerStyle:React.CSSProperties = {
  background:'linear-gradient(180deg, #546bcf 0%, #28347b 100%)',
  border:'1.5px solid #9fb3ff',
  display:'flex',
  alignItems:'center',
  justifyContent:'center'
}

const sectionHeading:React.CSSProperties = {
  fontSize:14,
  color:'#ffe082'
}

function ActionList({ actions, onHover }: { actions:{ mode:'primary'|'skills'|'spells'|'items'; primaryMenu:string[]; commands:CommandEntry[]; cursorIndex:number; hoveredIndex?:number }; onHover:(idx:number|undefined)=>void }){
  if (actions.mode==='primary'){
    return (
      <ul style={listStyle}>
        {actions.primaryMenu.map((label, idx)=>(
          <li key={label} style={primaryRow(actions.cursorIndex===idx)}>
            {label}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul style={{ ...listStyle, maxHeight:'100%', overflowY:'hidden' }}>
      {actions.commands.length ? actions.commands.slice(0,4).map((entry, idx)=>(
        <li
          key={`${entry.id ?? entry.label}-${idx}`}
          style={commandRow(actions.cursorIndex===idx, entry.disabled)}
          onMouseEnter={()=>onHover(idx)}
          onMouseLeave={()=>onHover(undefined)}
        >
          <span>{entry.label}{typeof entry.qty==='number' ? ` ×${entry.qty}` : ''}</span>
          <span style={{ color:'#9ed0ff' }}>{typeof entry.cost==='number' ? `${entry.cost} MP` : ''}</span>
        </li>
      )) : (
        <li style={{ color:'rgba(255,255,255,0.65)', fontSize:12 }}>No options available</li>
      )}
    </ul>
  )
}

function TargetList({ target }:{ target:{ team:'heroes'|'enemies'; selecting:boolean; selectedIndex:number; heroes:UnitDisplay[]; enemies:UnitDisplay[] } }){
  const list = target.team==='heroes' ? target.heroes : target.enemies
  if (target.team==='enemies'){
    return (
      <ul style={enemyListStyle}>
        {list.map((unit, idx)=>(
          <li key={`${unit.id ?? unit.name}-${idx}`} style={enemyCard(target.selecting && idx===target.selectedIndex)}>
            <div style={{ fontSize:13, color:'#ffe082' }}>{unit.name}</div>
            <div style={{ fontSize:12, color:'#a7d7ff' }}>HP {Math.max(0,unit.hp)}/{unit.maxHp}</div>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul style={listStyle}>
      {list.map((unit, idx)=>(
        <li key={`${unit.id ?? unit.name}-${idx}`} style={targetRow(target.selecting && idx===target.selectedIndex)}>
          <div>
            <span>{unit.name}</span>
            <span style={{ color:'#a7d7ff', marginLeft:6 }}>HP {Math.max(0,unit.hp)}/{unit.maxHp}</span>
            {typeof unit.maxMp==='number' && (
              <span style={{ color:'#8fc8ff', marginLeft:6 }}>MP {Math.max(0,unit.mp ?? 0)}/{unit.maxMp}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function PartyList({ heroes }:{ heroes:UnitDisplay[] }){
  return (
    <div style={partyRow}>
      {heroes.map(hero=>(
        <div key={hero.id ?? hero.name} style={partyChip(hero.alive)}>
          <strong style={{ marginRight:4 }}>{hero.name}</strong>
          <StatRow label="HP" value={hero.hp} max={hero.maxHp} color="#ff8b8b" />
          {typeof hero.maxMp==='number' && (
            <StatRow label="MP" value={hero.mp ?? 0} max={hero.maxMp ?? 0} color="#6fb7ff" />
          )}
        </div>
      ))}
    </div>
  )
}

function EnemySummary({ enemies }:{ enemies:UnitDisplay[] }){
  if (!enemies.length){
    return <span style={{ fontSize:12, color:'#cfd2ff' }}>No enemies detected.</span>
  }
  return (
    <div style={enemySummaryRow}>
      {enemies.map(enemy=>(
        <div key={enemy.id ?? enemy.name} style={enemySummaryChip(enemy.alive)}>
          <span>{enemy.name}: HP {Math.max(0,enemy.hp)}/{enemy.maxHp}</span>
          <InlineBar value={enemy.hp ?? 0} max={enemy.maxHp ?? enemy.hp ?? 0} color="#ff8b8b" height={6} width={70} />
        </div>
      ))}
    </div>
  )
}

const listStyle:React.CSSProperties = {
  listStyle:'none',
  padding:0,
  margin:0,
  display:'flex',
  flexDirection:'column',
  gap:6,
  fontSize:13
}

const primaryRow = (active:boolean):React.CSSProperties=>({
  color: active ? '#ffe082' : '#dfe3ff',
  fontSize:14
})

const commandRow = (active:boolean, disabled?:boolean):React.CSSProperties=>({
  display:'flex',
  justifyContent:'space-between',
  color: disabled ? 'rgba(255,255,255,0.35)' : (active ? '#ffe082' : '#fefefe'),
  fontSize:13
})

const targetRow = (active:boolean):React.CSSProperties=>({
  color: active ? '#ffe082' : '#dfe3ff',
  fontSize:12
})

const enemyListStyle:React.CSSProperties = {
  listStyle:'none',
  padding:0,
  margin:0,
  display:'flex',
  gap:8,
  height:'100%'
}

const enemyCard = (active:boolean):React.CSSProperties=>({
  flex:1,
  border:'1px solid rgba(255,255,255,0.3)',
  padding:'6px 8px',
  background: active ? 'rgba(255,232,130,0.12)' : 'transparent',
  display:'flex',
  flexDirection:'column',
  justifyContent:'center'
})

const partyRow:React.CSSProperties = {
  display:'grid',
  gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))',
  gap:8,
  fontSize:13
}

const partyChip = (alive?:boolean):React.CSSProperties=>({
  display:'flex',
  flexDirection:'column',
  gap:4,
  padding:'8px 10px',
  border:'1px solid rgba(255,255,255,0.2)',
  borderRadius:4,
  background: alive === false ? 'rgba(40,32,54,0.6)' : 'rgba(30,26,52,0.85)',
  color:'#e7e3ff'
})

const enemyPanelStyle:React.CSSProperties = {
  background:'#181438',
  border:'2px solid #7a6bff',
  boxSizing:'border-box',
  padding:'4px 10px',
  display:'flex',
  alignItems:'center',
  overflow:'hidden'
}

const enemySummaryRow:React.CSSProperties = {
  display:'flex',
  gap:12,
  flexWrap:'wrap',
  fontSize:12
}

const enemySummaryChip = (alive?:boolean):React.CSSProperties=>({
  display:'flex',
  alignItems:'center',
  gap:8,
  minWidth:180,
  color: alive === false ? '#f5a6a6' : '#ffe082'
})

function StatRow({ label, value, max, color }:{ label:string; value:number; max:number; color:string }){
  const normalized = max>0 ? Math.max(0, Math.min(1, value/max)) : 0
  return (
    <div style={{ display:'grid', gridTemplateColumns:'90px 1fr', alignItems:'center', columnGap:8, fontSize:12 }}>
      <span style={{ fontVariantNumeric:'tabular-nums' }}>{label} {Math.max(0,value)}/{max}</span>
      <InlineBar value={value} max={max} color={color} />
    </div>
  )
}

function InlineBar({ value, max, color, height=6, width='100%' }:{ value:number; max:number; color:string; height?:number; width?:number|string }){
  const normalized = max>0 ? Math.max(0, Math.min(1, value/max)) : 0
  return (
    <div style={{ position:'relative', height, width, background:'rgba(255,255,255,0.2)', borderRadius:3, overflow:'hidden', boxShadow:'inset 0 0 3px rgba(0,0,0,0.35)' }}>
      <div style={{ position:'absolute', top:0, left:0, width:`${normalized*100}%`, height:'100%', background:color }} />
    </div>
  )
}

function currentDetail(actions:{ mode:string; commands:CommandEntry[]; cursorIndex:number; hoveredIndex?:number }, hoveredIdx?:number){
  const idx = typeof hoveredIdx==='number' ? hoveredIdx : actions.cursorIndex
  return actions.commands[idx]?.detail
}

const summaryShell:React.CSSProperties = {
  position:'absolute',
  inset:0,
  background:'rgba(5,4,12,0.75)',
  display:'flex',
  alignItems:'center',
  justifyContent:'center'
}

const summaryCard:React.CSSProperties = {
  background:'#181438',
  border:'2px solid #cdbaff',
  padding:'18px 28px',
  textAlign:'center'
}
