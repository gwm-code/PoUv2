import React, { useEffect, useMemo, useState } from 'react'
import type { Hero, EquipmentSlot } from '@systems/Party/Types'
import type { Bag } from '@systems/Inventory/Inventory'
import { Inventory } from '@systems/Inventory/Inventory'
import { getGearItem } from '@systems/Equipment/GearData'
import { computeHeroStats } from '@systems/Party/HeroStats'
import { equipGear, unequipGear } from '@systems/Party/Equipment'

interface CharacterEquipmentOverlayProps {
  heroes:Hero[]
  bag:Bag
  onClose:()=>void
}

const slotOrder:EquipmentSlot[] = ['head','torso','wield1','wield2','ring','amulet','legs']
const slotLabels:Record<EquipmentSlot,string> = {
  head:'Head',
  torso:'Torso',
  wield1:'Wield 1',
  wield2:'Wield 2',
  ring:'Ring',
  amulet:'Amulet',
  legs:'Legs'
}

export function CharacterEquipmentOverlay({ heroes, bag, onClose }:CharacterEquipmentOverlayProps){
  const [heroIndex, setHeroIndex] = useState(0)
  const [selection, setSelection] = useState<{area:'slots'|'inventory'; index:number}>({ area:'inventory', index:0 })
  const [pendingItem, setPendingItem] = useState<string|null>(null)
  const [refresh, setRefresh] = useState(0)

  const hero = heroes[heroIndex] ?? heroes[0]
  useEffect(()=>{
    if (!hero && heroes.length){
      setHeroIndex(0)
    }
  }, [heroes, hero])

  const gearEntries = useMemo(()=>{
    return Inventory
      .list(bag)
      .filter(entry=>Boolean(getGearItem(entry.id)))
  }, [bag, refresh])

  const slotEntries = useMemo(()=>{
    if (!hero) return []
    return slotOrder.map(slot=>{
      const id = hero.equipment?.[slot] ?? null
      return { slot, gearId:id, gear: id ? getGearItem(id) : undefined }
    })
  }, [hero, refresh])

  const derivedStats = hero ? computeHeroStats(hero) : null

  useEffect(()=>{
    const handleKey = (event:KeyboardEvent)=>{
      const key = event.key.toLowerCase()
      const isArrow = key.startsWith('arrow')
      if (['w','arrowup'].includes(key)){
        moveSelection(-1)
        event.preventDefault()
      } else if (['s','arrowdown'].includes(key)){
        moveSelection(1)
        event.preventDefault()
      } else if (['a','arrowleft'].includes(key)){
        moveHorizontal('left')
        event.preventDefault()
      } else if (['d','arrowright'].includes(key)){
        moveHorizontal('right')
        event.preventDefault()
      } else if (key==='enter' || key===' '){
        event.preventDefault()
        activateSelection()
      } else if (key==='q' || key==='['){
        cycleHero(-1)
        event.preventDefault()
      } else if (key==='e' || key===']'){
        cycleHero(1)
        event.preventDefault()
      } else if (key==='escape'){
        onClose()
      }
      if (isArrow) event.preventDefault()
    }
    window.addEventListener('keydown', handleKey)
    return ()=>window.removeEventListener('keydown', handleKey)
  }, [selection, gearEntries.length, slotEntries.length, pendingItem, heroIndex, heroes.length])

  const cycleHero = (delta:number)=>{
    if (!heroes.length) return
    setHeroIndex(prev=>{
      const next = (prev + delta + heroes.length) % heroes.length
      return next
    })
    setSelection({ area:'inventory', index:0 })
    setPendingItem(null)
    setRefresh(r=>r+1)
  }

  const triggerRefresh = ()=>{
    setRefresh(r=>r+1)
  }

  const moveSelection = (delta:number)=>{
    setSelection(prev=>{
      const length = prev.area==='slots' ? slotEntries.length : gearEntries.length
      if (!length) return prev
      const next = ((prev.index + delta) % length + length) % length
      return { ...prev, index: next }
    })
  }

  const moveHorizontal = (direction:'left'|'right')=>{
    setSelection(prev=>{
      if (direction==='right' && prev.area==='inventory'){
        return { area:'slots', index:0 }
      }
      if (direction==='left' && prev.area==='slots'){
        return { area:'inventory', index: Math.min(prev.index, Math.max(gearEntries.length-1, 0)) }
      }
      return prev
    })
  }

  const activateSelection = ()=>{
    if (selection.area==='inventory'){
      const entry = gearEntries[selection.index]
      if (!entry) return
      setPendingItem(entry.id)
      setSelection({ area:'slots', index:0 })
      return
    }
    const slotEntry = slotEntries[selection.index]
    if (!slotEntry || !hero) return
    if (pendingItem){
      attemptEquip(slotEntry.slot, pendingItem)
      return
    }
    if (slotEntry.gearId){
      unequipSlot(slotEntry.slot)
    }
  }

  const attemptEquip = (slot:EquipmentSlot, gearId:string)=>{
    if (!hero) return
    const equipped = equipGear(hero, slot, gearId, bag)
    if (equipped){
      setPendingItem(null)
      triggerRefresh()
    }
  }

  const unequipSlot = (slot:EquipmentSlot)=>{
    if (!hero) return
    if (unequipGear(hero, slot, bag)){
      triggerRefresh()
    }
  }

  const handleSlotDrop = (event:React.DragEvent<HTMLDivElement>, slot:EquipmentSlot)=>{
    event.preventDefault()
    const gearId = event.dataTransfer.getData('application/x-gear')
    if (gearId){
      attemptEquip(slot, gearId)
    }
  }

  const handleDragStart = (event:React.DragEvent<HTMLDivElement>, gearId:string)=>{
    event.dataTransfer.setData('application/x-gear', gearId)
    setPendingItem(gearId)
  }

  if (!hero){
    return (
      <div style={overlayRoot}>
        <div style={panel}>
          <p>No heroes available.</p>
          <button style={closeButton} onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayRoot}>
      <div style={fullPanel}>
        <div style={headerRow}>
          <div style={tabRow}>
            {heroes.map((h, idx)=>(
              <button
                key={h.id}
                style={idx===heroIndex ? activeTab : tab}
                onClick={()=>{ setHeroIndex(idx); setSelection({ area:'inventory', index:0 }); setPendingItem(null); triggerRefresh() }}
              >
                {h.name}
              </button>
            ))}
          </div>
          <button style={closeButton} onClick={onClose}>×</button>
        </div>
        <div style={contentRow}>
          <div style={inventoryColumn}>
            <div style={inventoryHeader}>
              <h3 style={{ margin:0 }}>Gear Inventory</h3>
              <span style={{ fontSize:12, color:'#cfd2ff' }}>Total items: {gearEntries.length}</span>
            </div>
            <div style={inventoryGrid}>
              {gearEntries.length ? gearEntries.map((entry, idx)=>{
                const gear = getGearItem(entry.id)!
                const isSelected = selection.area==='inventory' && selection.index===idx
                const isPending = pendingItem === entry.id
                return (
                  <div
                    key={entry.id}
                    style={{
                      ...inventoryCard,
                      borderColor: isSelected ? '#ffe082' : 'rgba(255,255,255,0.2)',
                      boxShadow: isPending ? '0 0 10px rgba(255,224,130,0.7)' : 'none'
                    }}
                    onClick={()=>handleInventoryClick(entry.id)}
                    draggable
                    onDragStart={(event)=>handleDragStart(event, entry.id)}
                  >
                    <div style={{ fontWeight:600 }}>{gear.name}</div>
                    <div style={{ fontSize:12, color:'#cfd2ff' }}>{slotLabels[gear.slot]}</div>
                    <div style={{ fontSize:12, marginTop:4 }}>{gearBonusesText(gear)}</div>
                    <div style={{ fontSize:12, marginTop:6 }}>x{entry.qty}</div>
                  </div>
                )
              }) : (
                <p style={{ color:'#c9ccf5' }}>No gear stored in the inventory.</p>
              )}
            </div>
            <p style={controlsNote}>
              WASD/Arrow keys move focus · Enter selects · → highlights slots · ← returns to inventory · Drag gear onto slots · Q/E swap heroes.
            </p>
          </div>
          <div style={detailColumn}>
            <div style={silhouetteCard}>
              <div style={silhouetteWrapper}>
                <div style={silhouette}/>
                {slotEntries.map((entry, idx)=>{
                  const isSelected = selection.area==='slots' && selection.index===idx
                  const isPendingTarget = pendingItem && isSelected
                  const pos = slotPositions[entry.slot]
                  return (
                    <div
                      key={entry.slot}
                      onClick={()=> selection.area==='slots' && selection.index===idx && pendingItem ? attemptEquip(entry.slot, pendingItem) : handleSlotClick(entry.slot)}
                      onDragOver={event=>event.preventDefault()}
                      onDrop={event=>handleSlotDrop(event, entry.slot)}
                      style={{
                        ...slotBadge,
                        ...pos,
                        borderColor: isSelected ? '#ffe082' : 'rgba(255,255,255,0.3)',
                        boxShadow: isPendingTarget ? '0 0 8px rgba(255,224,130,0.8)' : 'none'
                      }}
                    >
                      <div style={slotLabel}>{slotLabels[entry.slot]}</div>
                      <div style={{ fontSize:12, color: entry.gear ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                        {entry.gear ? entry.gear.name : 'Empty'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={statsCard}>
              <h3 style={{ marginTop:0 }}>Stats</h3>
              {derivedStats && (
                <ul style={statList}>
                  <li>HP: {hero.hp}/{derivedStats.hp}</li>
                  <li>MP: {hero.mp}/{derivedStats.mp}</li>
                  <li>ATK: {derivedStats.atk}</li>
                  <li>AGI: {derivedStats.agi}</li>
                </ul>
              )}
              {pendingItem && (
                <div style={{ fontSize:12, color:'#ffe082' }}>
                  Selected item: {getGearItem(pendingItem)?.name ?? pendingItem} – choose a slot.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  function handleSlotClick(slot:EquipmentSlot){
    if (pendingItem){
      attemptEquip(slot, pendingItem)
      return
    }
    if (hero.equipment?.[slot]){
      unequipSlot(slot)
    }
  }

  function handleInventoryClick(id:string){
    setPendingItem(id)
    setSelection({ area:'slots', index:0 })
  }
}

function gearBonusesText(gear:ReturnType<typeof getGearItem>){
  if (!gear?.bonuses) return 'No bonuses'
  return Object.entries(gear.bonuses)
    .map(([stat, value])=> `${stat.toUpperCase()} +${value}`)
    .join(' · ')
}

const overlayRoot:React.CSSProperties = {
  position:'absolute',
  top:0,
  left:0,
  width:'100%',
  height:'100%',
  background:'rgba(3,3,8,0.95)',
  display:'flex',
  justifyContent:'center',
  alignItems:'center',
  zIndex:20,
  color:'#fff',
  fontFamily:'VT323, monospace'
}

const panel:React.CSSProperties = {
  background:'#181438',
  border:'4px solid #7a6bff',
  padding:24,
  minWidth:300
}

const fullPanel:React.CSSProperties = {
  ...panel,
  width:'90%',
  maxWidth:900,
  height:'85%',
  display:'flex',
  flexDirection:'column'
}

const headerRow:React.CSSProperties = {
  display:'flex',
  justifyContent:'space-between',
  alignItems:'center',
  marginBottom:12
}

const tabRow:React.CSSProperties = {
  display:'flex',
  gap:12
}

const tab:React.CSSProperties = {
  background:'transparent',
  color:'#cfd2ff',
  border:'1px solid #4e4fa4',
  padding:'6px 14px',
  cursor:'pointer'
}

const activeTab:React.CSSProperties = {
  ...tab,
  borderColor:'#ffe082',
  color:'#ffe082'
}

const closeButton:React.CSSProperties = {
  background:'transparent',
  border:'none',
  color:'#fff',
  fontSize:24,
  cursor:'pointer'
}

const contentRow:React.CSSProperties = {
  display:'flex',
  flex:1,
  gap:24,
  overflow:'hidden'
}

const inventoryColumn:React.CSSProperties = {
  flex:1,
  display:'flex',
  flexDirection:'column',
  overflow:'hidden',
  paddingRight:16
}

const detailColumn:React.CSSProperties = {
  flex:'0 0 40%',
  display:'flex',
  flexDirection:'column',
  gap:16
}

const silhouetteCard:React.CSSProperties = {
  background:'#1f2150',
  border:'1px solid rgba(255,255,255,0.15)',
  padding:16,
  flex:1
}

const silhouetteWrapper:React.CSSProperties = {
  position:'relative',
  height:'100%'
}

const silhouette:React.CSSProperties = {
  height:'100%',
  border:'1px dashed rgba(255,255,255,0.3)',
  background:'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.07))'
}

const slotBadge:React.CSSProperties = {
  position:'absolute',
  width:140,
  border:'1px solid rgba(255,255,255,0.3)',
  padding:'6px 8px',
  background:'rgba(4,4,12,0.65)',
  cursor:'pointer'
}

const slotLabel:React.CSSProperties = {
  fontSize:11,
  textTransform:'uppercase',
  color:'#9da0d7'
}

const statsCard:React.CSSProperties = {
  background:'#1f2150',
  border:'1px solid rgba(255,255,255,0.15)',
  padding:16
}

const statList:React.CSSProperties = {
  listStyle:'none',
  padding:0,
  margin:0,
  display:'grid',
  gridTemplateColumns:'repeat(2, minmax(0, 1fr))',
  gap:8
}

const inventoryGrid:React.CSSProperties = {
  flex:1,
  overflowY:'auto',
  display:'grid',
  gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',
  gap:12,
  paddingRight:8
}

const inventoryCard:React.CSSProperties = {
  border:'1px solid rgba(255,255,255,0.2)',
  padding:12,
  minHeight:100,
  cursor:'pointer',
  background:'rgba(255,255,255,0.02)'
}

const controlsNote:React.CSSProperties = {
  fontSize:11,
  color:'#cfd2ff',
  marginTop:12
}

const inventoryHeader:React.CSSProperties = {
  display:'flex',
  justifyContent:'space-between',
  alignItems:'center',
  marginBottom:8
}

const slotPositions:Record<EquipmentSlot, React.CSSProperties> = {
  head:{ top:12, left:'50%', transform:'translateX(-50%)' },
  torso:{ top:70, left:'50%', transform:'translateX(-50%)' },
  wield1:{ top:130, left:'5%' },
  wield2:{ top:130, right:'5%' },
  ring:{ bottom:80, left:'10%' },
  amulet:{ bottom:80, right:'10%' },
  legs:{ bottom:20, left:'50%', transform:'translateX(-50%)' }
}
