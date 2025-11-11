export type Key = 'up'|'down'|'left'|'right'|'confirm'|'cancel'|'menu'|'minimap'|'equip'|'shop'|'items'
const map: Record<string, Key> = {
  ArrowUp:'up', w:'up', ArrowDown:'down', s:'down',
  ArrowLeft:'left', a:'left', ArrowRight:'right', d:'right',
  Enter:'confirm', ' ':'confirm', z:'confirm',
  Escape:'cancel', x:'cancel',
  m:'minimap', e:'equip', o:'shop', i:'items'
}
export const Input = (()=>{
  const held = new Set<Key>(); const pressed = new Set<Key>();
  const down = (e: KeyboardEvent)=>{ const key = map[e.key]||map[e.key.toLowerCase()]; if(!key) return; if(!held.has(key)) pressed.add(key); held.add(key); }
  const up = (e: KeyboardEvent)=>{ const key = map[e.key]||map[e.key.toLowerCase()]; if(!key) return; held.delete(key); }
  return {
    attach(){ window.addEventListener('keydown', down); window.addEventListener('keyup', up); },
    detach(){ window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); },
    isHeld:(k:Key)=> held.has(k),
    consume(k:Key){ const was = pressed.has(k); pressed.delete(k); return was; },
    flush(){ pressed.clear() }
  }
})()
