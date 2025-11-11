import React, { useState } from 'react'
import MistheartGame from './MistheartGame'

type MenuOption = 'new'|'continue'|'load'|'settings'

function StartMenu({ onSelect }:{ onSelect:(option:MenuOption)=>void }){
  const options:MenuOption[]=['new','continue','load','settings']
  return (
    <div style={{ width:'100vw', height:'100vh', background:'#05030b', display:'flex', justifyContent:'center', alignItems:'center', color:'#fff', fontFamily:'VT323, monospace' }}>
      <div style={{ padding:32, border:'4px solid #7a6bff', background:'#14122b', minWidth:320 }}>
        <h1 style={{ marginTop:0, textAlign:'center', fontSize:32 }}>Mistheart Spire</h1>
        <ul style={{ listStyle:'none', padding:0, margin:0 }}>
          {options.map(opt=>(
            <li key={opt} style={{ marginBottom:10 }}>
              <button
                onClick={()=>onSelect(opt)}
                style={{
                  width:'100%',
                  padding:'10px 0',
                  background:'#1f1c3f',
                  border:'2px solid #7a6bff',
                  color:'#fff',
                  fontSize:18,
                  textTransform:'uppercase',
                  cursor:'pointer'
                }}
              >
                {opt==='new'?'New Game':opt==='continue'?'Continue':opt==='load'?'Load':'Settings'}
              </button>
            </li>
          ))}
        </ul>
        <p style={{ marginTop:20, fontSize:14, textAlign:'center', color:'#d3c9ff' }}>Press New Game to enter the prototype.</p>
      </div>
    </div>
  )
}

export default function App(){
  const [screen, setScreen] = useState<'menu'|'game'>('menu')
  return screen==='menu'
    ? <StartMenu onSelect={(opt)=>{ if (opt==='new'){ setScreen('game') } }} />
    : <MistheartGame onQuit={()=>setScreen('menu')} />
}
