import React from 'react'
import type { Hero } from '@systems/Party/Types'
import type { Bag } from '@systems/Inventory/Inventory'
import { InventoryPanel } from './InventoryPanel'
import { PartyPanel } from '@ui/Party/PartyOverlay'
import { CharacterEquipmentPanel } from '@ui/CharacterEquipmentOverlay'
import frameTexture from '../../assets/frame.png'

export type GameMenuTab = 'inventory'|'party'|'equipment'

interface GameMenuOverlayProps {
  tab:GameMenuTab
  onChangeTab:(tab:GameMenuTab)=>void
  onClose:()=>void
  heroes:Hero[]
  bag:Bag
  onPartyUpdated:()=>void
  onInventoryUpdated:()=>void
}

const overlayRoot:React.CSSProperties = {
  position:'absolute',
  top:0,
  left:0,
  width:'100%',
  height:'100%',
  background:'rgba(5,4,12,0.78)',
  display:'flex',
  justifyContent:'center',
  alignItems:'center',
  color:'#fff',
  fontFamily:'VT323, monospace',
  zIndex:40
}

const shell:React.CSSProperties = {
  background:'rgba(8,6,12,0.45)',
  borderStyle:'solid',
  borderWidth:96,
  borderImageSource:`url(${frameTexture})`,
  borderImageSlice:'256 fill',
  borderImageRepeat:'stretch',
  width:'92%',
  maxWidth:1100,
  height:'90%',
  display:'flex',
  flexDirection:'column',
  boxShadow:'0 0 35px rgba(0,0,0,0.8)',
  color:'#cba76b'
}

const tabBar:React.CSSProperties = {
  display:'flex',
  alignItems:'center',
  padding:'12px 18px',
  borderBottom:'1px solid rgba(255,255,255,0.15)',
  gap:12
}

const tabButton = (active:boolean):React.CSSProperties=>({
  background: active ? 'rgba(203,167,107,0.12)' : 'transparent',
  border: active ? '2px solid #cba76b' : '1px solid rgba(203,167,107,0.4)',
  color:'#cba76b',
  padding:'6px 18px',
  fontSize:16,
  cursor:'pointer',
  fontFamily:'inherit'
})

const body:React.CSSProperties = {
  flex:1,
  padding:18,
  overflow:'hidden',
  display:'flex'
}

export function GameMenuOverlay({
  tab,
  onChangeTab,
  onClose,
  heroes,
  bag,
  onPartyUpdated,
  onInventoryUpdated
}:GameMenuOverlayProps){
  return (
    <div style={overlayRoot}>
      <div style={shell}>
        <div style={tabBar}>
          {tabs.map(entry=>(
            <button
              key={entry.key}
              style={tabButton(tab===entry.key)}
              onClick={()=>onChangeTab(entry.key)}
            >
              {entry.label}
            </button>
          ))}
          <button
            onClick={onClose}
            style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#cba76b', fontSize:24, cursor:'pointer', fontFamily:'inherit', textShadow:'0 0 6px rgba(0,0,0,0.7)' }}
          >
            ×
          </button>
        </div>
        <div style={body}>
          {tab==='inventory' && (
            <InventoryPanel bag={bag} heroes={heroes} onUpdated={onInventoryUpdated} />
          )}
          {tab==='party' && (
            <PartyPanel heroes={heroes} maxActive={3} minActive={1} onUpdated={onPartyUpdated} />
          )}
          {tab==='equipment' && (
            <CharacterEquipmentPanel heroes={heroes} bag={bag} onClose={onClose} embedded />
          )}
        </div>
      </div>
    </div>
  )
}

const tabs:{ key:GameMenuTab; label:string }[] = [
  { key:'inventory', label:'Inventory' },
  { key:'party', label:'Party' },
  { key:'equipment', label:'Equipment' }
]
