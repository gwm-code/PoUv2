import React, { useMemo, useState } from 'react'
import type { Hero } from '@systems/Party/Types'
import type { Bag } from '@systems/Inventory/Inventory'
import { Inventory } from '@systems/Inventory/Inventory'
import { getItemById } from '@systems/Combat/ItemData'
import { computeHeroStats } from '@systems/Party/HeroStats'

interface InventoryEntry {
  id:string
  qty:number
  name:string
  description:string
  kind?:string
  amount?:number
  target?:string
}

interface InventoryPanelProps {
  bag:Bag
  heroes:Hero[]
  onUpdated:()=>void
}

export function InventoryPanel({ bag, heroes, onUpdated }:InventoryPanelProps){
  const entries = useMemo<InventoryEntry[]>(()=>{
    return Inventory.list(bag)
      .map(entry=>{
        const meta = getItemById(entry.id)
        return {
          id: entry.id,
          qty: entry.qty,
          name: meta?.name ?? entry.id,
          description: meta?.description ?? 'Unknown item',
          kind: meta?.kind,
          amount: meta?.amount,
          target: meta?.target
        }
      })
      .sort((a,b)=>a.name.localeCompare(b.name))
  },[bag])

  const [selected, setSelected] = useState(0)
  const [message, setMessage] = useState<string|null>(null)
  const selectedEntry = entries[selected]

  const handleUse = (hero:Hero)=>{
    if (!selectedEntry){
      setMessage('Select an item first.')
      return
    }
    const meta = getItemById(selectedEntry.id)
    if (!meta){
      setMessage('Unknown item.')
      return
    }
    if (meta.kind!=='heal' || meta.target!=='ally'){
      setMessage(`${meta.name} cannot be used outside battle.`)
      return
    }
    const derived = computeHeroStats(hero)
    if (hero.hp >= derived.hp){
      setMessage(`${hero.name} is already at full HP.`)
      return
    }
    if (!Inventory.use(bag, selectedEntry.id)){
      setMessage(`You are out of ${meta.name}.`)
      onUpdated()
      return
    }
    const before = hero.hp
    hero.hp = Math.min(derived.hp, hero.hp + (meta.amount ?? 0))
    const delta = hero.hp - before
    setMessage(`${meta.name} restored ${delta} HP to ${hero.name}.`)
    onUpdated()
  }

  return (
    <div style={panelShell}>
      <div style={listColumn}>
        <div style={columnHeader}>
          <span>Items</span>
          <span style={{ fontSize:12, color:'#b7baff' }}>{entries.length} types</span>
        </div>
        <div style={itemList}>
          {entries.length ? entries.map((entry, idx)=>(
            <button
              key={entry.id}
              style={itemCard(idx===selected)}
              onClick={()=>{ setSelected(idx); setMessage(null) }}
            >
              <div>
                <div style={{ fontSize:16, color:'#ffe082' }}>{entry.name}</div>
                <div style={{ fontSize:12, color:'#cfd2ff' }}>{entry.description}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:14 }}>×{entry.qty}</div>
                {entry.kind && <span style={pill}>{entry.kind}</span>}
              </div>
            </button>
          )) : (
            <div style={{ padding:16, color:'#b7baff' }}>Bag is empty.</div>
          )}
        </div>
      </div>

      <div style={detailColumn}>
        {selectedEntry ? (
          <>
            <h3 style={{ marginTop:0 }}>{selectedEntry.name}</h3>
            <p style={{ marginTop:0, color:'#cfd2ff' }}>{selectedEntry.description}</p>
            {selectedEntry.kind==='heal' && selectedEntry.target==='ally' ? (
              <>
                <p style={{ fontSize:12, color:'#cfd2ff' }}>Choose a hero to receive {selectedEntry.amount ?? 0} HP.</p>
                <div style={heroGrid}>
                  {heroes.map(hero=>{
                    const derived = computeHeroStats(hero)
                    const atCap = hero.hp >= derived.hp
                    return (
                      <div key={hero.id} style={heroCard}>
                        <div style={{ fontSize:15 }}>{hero.name}</div>
                        <div style={{ fontSize:12, color:'#cfd2ff' }}>HP {hero.hp}/{derived.hp}</div>
                        <button
                          style={{ ...heroButton, opacity: atCap ? 0.5 : 1 }}
                          disabled={atCap}
                          onClick={()=>handleUse(hero)}
                        >
                          {atCap ? 'Full' : 'Use'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p style={{ fontSize:12, color:'#f8c67c' }}>This item is only usable during battle.</p>
            )}
          </>
        ) : (
          <p style={{ color:'#cfd2ff' }}>Select an item to view details.</p>
        )}
        {message && <p style={{ fontSize:12, color:'#9be09b', marginTop:12 }}>{message}</p>}
      </div>
    </div>
  )
}

const panelShell:React.CSSProperties = {
  display:'grid',
  gridTemplateColumns:'1.1fr 0.9fr',
  gap:24,
  width:'100%',
  height:'100%',
  color:'#fff',
  fontFamily:'VT323, monospace',
  padding:'4px 2px'
}

const listColumn:React.CSSProperties = {
  display:'flex',
  flexDirection:'column',
  overflow:'hidden'
}

const detailColumn:React.CSSProperties = {
  paddingRight:4,
  overflowY:'auto'
}

const columnHeader:React.CSSProperties = {
  display:'flex',
  justifyContent:'space-between',
  alignItems:'center',
  padding:'4px 0 10px',
  fontSize:18,
  borderBottom:'1px solid rgba(255,255,255,0.1)'
}

const itemList:React.CSSProperties = {
  flex:1,
  overflowY:'auto',
  paddingRight:12,
  display:'flex',
  flexDirection:'column',
  gap:10
}

const itemCard = (active:boolean):React.CSSProperties=>({
  border:'1px solid rgba(255,255,255,0.15)',
  background: active ? 'rgba(255,224,130,0.08)' : 'rgba(255,255,255,0.03)',
  padding:10,
  textAlign:'left',
  display:'flex',
  justifyContent:'space-between',
  gap:12,
  cursor:'pointer',
  transition:'border-color 150ms',
  fontFamily:'inherit'
})

const pill:React.CSSProperties = {
  display:'inline-block',
  marginTop:6,
  padding:'2px 8px',
  borderRadius:12,
  fontSize:11,
  background:'rgba(255,255,255,0.12)'
}

const heroGrid:React.CSSProperties = {
  display:'grid',
  gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))',
  gap:12,
  marginTop:12
}

const heroCard:React.CSSProperties = {
  border:'1px solid rgba(255,255,255,0.15)',
  background:'rgba(255,255,255,0.04)',
  padding:10,
  borderRadius:6
}

const heroButton:React.CSSProperties = {
  marginTop:8,
  width:'100%',
  padding:'6px 0',
  border:'1px solid #9b8bff',
  background:'#4e447b',
  color:'#fff',
  cursor:'pointer',
  fontFamily:'inherit'
}
