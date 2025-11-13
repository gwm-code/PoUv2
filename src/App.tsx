import React, { useEffect, useRef, useState } from 'react'
import MistheartGame, { defaultSettings, type GameSettings, SettingsOverlay } from './MistheartGame'
import startBackground from './assets/ui/Start Menu.png'
import frameTexture from './assets/frame.png'
import themeMusic from './assets/audio/Into the Mistheart.mp3'
import './styles/startMenu.css'

type MenuOption = 'new'|'continue'|'load'|'settings'

interface StartMenuProps {
  onSelect:(option:MenuOption)=>void
  settings:GameSettings
  onChangeSettings:(next:GameSettings)=>void
  musicMuted:boolean
  onToggleMusic:()=>void
}

const framePanel:React.CSSProperties = {
  padding:32,
  borderStyle:'solid',
  borderWidth:96,
  borderImageSource:`url(${frameTexture})`,
  borderImageSlice:'256 fill',
  borderImageRepeat:'stretch',
  boxShadow:'0 0 35px rgba(0,0,0,0.8)',
  background:'rgba(8,6,12,0.55)',
  minWidth:320,
  color:'#cba76b'
}

function StartMenu({ onSelect, settings, onChangeSettings, musicMuted, onToggleMusic }:StartMenuProps){
  const options:MenuOption[]=['new','continue','load','settings']
  const containerRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef(settings)

  useEffect(()=>{
    settingsRef.current = settings
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
  },[fullscreenEnabled, onChangeSettings])

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

  return (
    <div className="start-menu-root" ref={containerRef}>
      <button
        className="start-menu-audio-toggle"
        onClick={onToggleMusic}
        aria-label={musicMuted ? 'Unmute music' : 'Mute music'}
        title={musicMuted ? 'Unmute music' : 'Mute music'}
      >
        <svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 14H6L12 20V4L6 10H2V14Z" stroke="#cba76b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {!musicMuted && (
            <>
              <path d="M17 7.5C18.5 9 18.5 15 17 16.5" stroke="#cba76b" strokeWidth="2" strokeLinecap="round" />
              <path d="M21 4.5C23.8 7.8 23.8 16.2 21 19.5" stroke="#cba76b" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          {musicMuted && (
            <path d="M4 4L24 20" stroke="#cba76b" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>
      <div className="start-menu-bg" style={{ backgroundImage:`url(${startBackground})` }} />
      <div className="start-menu-fog" />
      <div className="start-menu-overlay">
        <div style={framePanel}>
        <h1 className="flicker" style={{ marginTop:0, textAlign:'center', fontSize:32, color:'#cba76b' }}>Mistheart Spire</h1>
        <ul style={{ listStyle:'none', padding:0, margin:0 }}>
          {options.map(opt=>(
            <li key={opt} style={{ marginBottom:10 }}>
              <button className="flicker"
                onClick={()=>onSelect(opt)}
                style={{
                  width:'100%',
                  padding:'10px 0',
                  background:'transparent',
                  border:'none',
                  color:'#cba76b',
                  fontSize:20,
                  textTransform:'uppercase',
                  cursor:'pointer',
                  fontFamily:'inherit',
                  letterSpacing:1,
                  textShadow:'0 0 8px rgba(0,0,0,0.85)'
                }}
              >
                {opt==='new'?'New Game':opt==='continue'?'Continue':opt==='load'?'Load':'Settings'}
              </button>
            </li>
          ))}
        </ul>
        </div>
      </div>
    </div>
  )
}

export default function App(){
  const [screen, setScreen] = useState<'menu'|'game'>('menu')
  const [settings, setSettings] = useState<GameSettings>(defaultSettings)
  const [musicMuted, setMusicMuted] = useState<boolean>(()=> {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem('mistheart_music_muted')
    return stored === 'true'
  })
  const [startOverlay, setStartOverlay] = useState<'settings'|null>(null)
  const audioRef = useRef<HTMLAudioElement|null>(null)
  const unlockHandlerRef = useRef<((event:PointerEvent)=>void)|null>(null)
  const prevScreenRef = useRef<'menu'|'game'>('menu')

  useEffect(()=>{
    if (typeof window === 'undefined') return
    window.localStorage.setItem('mistheart_music_muted', musicMuted ? 'true' : 'false')
  },[musicMuted])

  useEffect(()=>{
    const audio = new Audio(themeMusic)
    audio.loop = true
    audio.volume = 0.55
    audioRef.current = audio
    return ()=>{
      audio.pause()
      audioRef.current = null
      if (unlockHandlerRef.current){
        window.removeEventListener('pointerdown', unlockHandlerRef.current)
        unlockHandlerRef.current = null
      }
    }
  },[])

  useEffect(()=>{
    const audio = audioRef.current
    if (!audio) return
    const removeUnlockHandler = ()=>{
      if (unlockHandlerRef.current){
        window.removeEventListener('pointerdown', unlockHandlerRef.current)
        unlockHandlerRef.current = null
      }
    }
    const shouldPlay = screen==='menu' && !musicMuted
    if (shouldPlay){
      const tryPlay = ()=>{
        const promise = audio.play()
        promise?.catch(()=>{
          removeUnlockHandler()
          const handle = ()=>{
            removeUnlockHandler()
            if (screen==='menu' && !musicMuted){
              audio.play().catch(()=>{})
            }
          }
          unlockHandlerRef.current = handle
          window.addEventListener('pointerdown', handle, { once:true })
        })
      }
      tryPlay()
    } else {
      removeUnlockHandler()
      if (!audio.paused){
        audio.pause()
      }
      if (prevScreenRef.current==='menu' && screen!=='menu'){
        audio.currentTime = 0
      }
    }
    prevScreenRef.current = screen
    return removeUnlockHandler
  },[screen, musicMuted])

  const handleMenuSelect = (opt:MenuOption)=>{
    if (opt==='new'){
      setStartOverlay(null)
      setScreen('game')
    } else if (opt==='settings'){
      setStartOverlay('settings')
    }
  }

  if (screen==='menu'){
    return (
      <>
        <StartMenu
          onSelect={handleMenuSelect}
          settings={settings}
          onChangeSettings={setSettings}
          musicMuted={musicMuted}
          onToggleMusic={()=>setMusicMuted(m=>!m)}
        />
        {startOverlay==='settings' && (
          <SettingsOverlay
            settings={settings}
            onChange={setSettings}
            onClose={()=>setStartOverlay(null)}
          />
        )}
      </>
    )
  }

  return (
    <MistheartGame
      settings={settings}
      onChangeSettings={setSettings}
      onQuit={()=>setScreen('menu')}
    />
  )
}
