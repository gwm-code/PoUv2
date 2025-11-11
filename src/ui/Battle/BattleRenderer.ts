const battlefieldImage = new Image()
battlefieldImage.src = new URL('../../assets/backgrounds/fields.png', import.meta.url).toString()
type SpriteCache = Record<string, HTMLCanvasElement|HTMLImageElement>
const heroSprites:SpriteCache = {}
const enemySprites:SpriteCache = {}
function loadSprite(type:'heroes'|'enemies', id:string){
  const key = id.toLowerCase()
  const store = type==='heroes'?heroSprites:enemySprites
  if (!store[key]){
    const img = new Image()
    img.onload = ()=>{ store[key] = stripWhiteBackground(img) }
    img.src = new URL(`../../assets/sprites/${type}/${key}.png`, import.meta.url).toString()
    store[key]=img
  }
  return store[key]
}

interface Frame { x:number; y:number; w:number; h:number }

export function drawBattleRenderer(ctx: CanvasRenderingContext2D, state: any, frame: Frame) {
  const innerPad = Math.max(8, Math.round(Math.min(frame.w, frame.h)*0.03))
  const inner = { x: frame.x + innerPad, y: frame.y + innerPad, w: frame.w - innerPad*2, h: frame.h - innerPad*2 }
  const topBannerHeight = 26
  const hudGap = 6
  const hudHeight = Math.max(92, inner.h * 0.34)
  const battlefieldHeight = inner.h - hudHeight - hudGap
  const battlefield = { x: inner.x, y: inner.y + topBannerHeight, w: inner.w, h: battlefieldHeight - topBannerHeight }
  const hudY = battlefield.y + battlefield.h + hudGap

  const columnGap = 6
  const minCommand = 120
  const minTarget = 120
  const minParty = 150
  let commandWidth = Math.max(minCommand, inner.w * 0.3)
  let targetWidth = Math.max(minTarget, inner.w * 0.26)
  let partyWidth = Math.max(minParty, inner.w * 0.36)
  const desired = commandWidth + targetWidth + partyWidth + columnGap*2
  const available = inner.w - columnGap*2
  if (desired !== inner.w){
    const scale = available / (commandWidth + targetWidth + partyWidth)
    commandWidth = Math.max(minCommand, commandWidth*scale)
    targetWidth = Math.max(minTarget, targetWidth*scale)
    partyWidth = Math.max(minParty, available - commandWidth - targetWidth)
    if (partyWidth < minParty){
      const deficit = minParty - partyWidth
      const pull = deficit/2
      commandWidth = Math.max(minCommand, commandWidth - pull)
      targetWidth = Math.max(minTarget, targetWidth - pull)
      partyWidth = available - commandWidth - targetWidth
    }
  }
  const commandPanel = { x: inner.x, y: hudY, w: commandWidth, h: hudHeight }
  const targetPanel = { x: commandPanel.x + commandPanel.w + columnGap, y: hudY, w: targetWidth, h: hudHeight }
  const partyPanel = { x: targetPanel.x + targetPanel.w + columnGap, y: hudY, w: inner.x + inner.w - (targetPanel.x + targetPanel.w + columnGap) - 2, h: hudHeight }

  decayEffects(state.effects, state.heroes, state.enemies)
  drawBattlefield(ctx, battlefield)
  drawEnemyLine(ctx, battlefield, state.enemies, state.cursor?.targetIdx, state.phase, state.effects)
  drawHeroLine(ctx, battlefield, state.heroes, state.cursor?.heroIdx, state.effects)
  drawCommandPanel(ctx, commandPanel, state)
  drawTargetPanel(ctx, targetPanel, state, state.phase)
  drawPartyPanel(ctx, partyPanel, state.heroes)
  drawTopBanner(ctx, inner, state.phase, state.log)
  if (state.phase === 'SUMMARY'){
    drawSummary(ctx, frame, state)
  }
}

function drawBattlefield(ctx:CanvasRenderingContext2D, area:Frame){
  if (battlefieldImage.complete && battlefieldImage.naturalWidth){
    ctx.drawImage(battlefieldImage, area.x, area.y, area.w, area.h)
    return
  }
  const sky = ctx.createLinearGradient(area.x, area.y, area.x, area.y + area.h)
  sky.addColorStop(0, '#4d77c7')
  sky.addColorStop(0.45, '#9ec2ef')
  sky.addColorStop(0.6, '#7fc27f')
  sky.addColorStop(1, '#4a8637')
  ctx.fillStyle = sky
  ctx.fillRect(area.x, area.y, area.w, area.h)
  ctx.fillStyle='#3e612a'
  ctx.fillRect(area.x, area.y + area.h*0.55, area.w, area.h*0.45)
}

function drawEnemyLine(ctx:CanvasRenderingContext2D, area:Frame, enemies:any[], targetIdx:number, phase:string, effects:Record<string,{hitTimer:number; koAlpha:number}>){
  const rowY = area.y + area.h*0.62
  const spacing = 56
  const startX = area.x + 32
  const effectiveTarget = typeof targetIdx === 'number' && targetIdx>=0
    ? targetIdx
    : nextAliveIndex(enemies)
  enemies.forEach((enemy, i)=>{
    const x = startX + i*spacing
    const highlight = phase==='TARGET_SELECT' && i===effectiveTarget
    drawBattlerSprite(ctx, x, rowY - 60, enemy, highlight, 'enemies', false, effects[enemy.id])
    if (highlight){
      drawTargetArrow(ctx, x+24, rowY - 48)
    }
  })
}

function drawHeroLine(ctx:CanvasRenderingContext2D, area:Frame, heroes:any[], heroIdx:number, effects:Record<string,{hitTimer:number; koAlpha:number}>){
  const rowY = area.y + area.h*0.62
  const spacing = 56
  const startX = area.x + area.w - 120
  heroes.forEach((hero, i)=>{
    const x = startX - i*spacing
    drawBattlerSprite(ctx, x, rowY - 60, hero, heroIdx===i, 'heroes', false, effects[hero.id])
  })
}

function drawBattlerSprite(ctx:CanvasRenderingContext2D, x:number, y:number, battler:any, highlight:boolean, type:'heroes'|'enemies', flip?:boolean, effect?:{hitTimer:number; koAlpha:number}){
  const baseId = (battler.id || '').replace(/\d+$/,'')
  const spriteKey = battler.alive ? baseId : `${baseId}-defeated`
  const sprite = spriteKey ? loadSprite(type, spriteKey) : undefined
  ctx.save()
  let drawn=false
  const yOffset = battler.alive ? 0 : 32
  if (sprite){
    if (sprite instanceof HTMLImageElement){
      if (sprite.complete && sprite.naturalWidth){
        if (flip){
          ctx.save()
          ctx.scale(-1,1)
          ctx.drawImage(sprite, -(x+64), y+yOffset, 64, 64)
          ctx.restore()
        } else {
          ctx.drawImage(sprite, x, y+yOffset, 64, 64)
        }
        drawn=true
      }
    } else {
      if (flip){
        ctx.save()
        ctx.scale(-1,1)
        ctx.drawImage(sprite, -(x+64), y+yOffset, 64, 64)
        ctx.restore()
      } else {
        ctx.drawImage(sprite, x, y+yOffset, 64, 64)
      }
      drawn=true
    }
  }
  if (!drawn){
    ctx.fillStyle = battler.alive ? '#f7d18b' : '#4b3c58'
    ctx.fillRect(x, y+yOffset, 40, 40)
    ctx.fillStyle = battler.alive ? '#2e1c34' : '#1f102a'
    ctx.fillRect(x+8, y+yOffset+8, 24, 12)
  }
  if (effect){
    if (effect.hitTimer>0 && sprite){
      ctx.save()
      ctx.globalCompositeOperation='lighter'
      ctx.globalAlpha = Math.min(0.7, effect.hitTimer*3)
      ctx.drawImage(sprite, x, y+yOffset, 64, 64)
      ctx.restore()
    }
    if (!battler.alive){
      const alpha = Math.max(0, effect.koAlpha ?? 0)
      ctx.save()
      ctx.globalAlpha = 0.4*alpha
      ctx.fillStyle='#000'
      ctx.beginPath()
      ctx.ellipse(x+32, y+60, 24, 6, 0, 0, Math.PI*2)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.restore()
}

function drawTargetArrow(ctx:CanvasRenderingContext2D, x:number, y:number){
  ctx.fillStyle='#ffe382'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x-8, y-12)
  ctx.lineTo(x+8, y-12)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle='#b78c2a'
  ctx.stroke()
}

function nextAliveIndex(units:any[]){
  for (let i=0;i<units.length;i++){
    if (units[i]?.alive) return i
  }
  return -1
}

function stripWhiteBackground(img:HTMLImageElement){
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const g = canvas.getContext('2d')!
  g.drawImage(img,0,0)
  const data = g.getImageData(0,0,canvas.width,canvas.height)
  const buf = data.data
  for(let i=0;i<buf.length;i+=4){
    if (buf[i]>245 && buf[i+1]>245 && buf[i+2]>245){
      buf[i+3]=0
    }
  }
  g.putImageData(data,0,0)
  return canvas
}

function decayEffects(effects:Record<string,{hitTimer:number; koAlpha:number}>, heroes:any[], enemies:any[]){
  const all = [...heroes, ...enemies]
  for (const unit of all){
    const id = unit.id
    if (!id) continue
    const entry = effects[id] ?? (effects[id]={ hitTimer:0, koAlpha: unit.alive?1:0 })
    entry.hitTimer = Math.max(0, entry.hitTimer - 1/30)
    if (!unit.alive){
      entry.koAlpha = Math.max(0, (entry.koAlpha ??1) - 0.02)
    } else {
      entry.koAlpha = 1
    }
  }
}

function drawCommandPanel(ctx:CanvasRenderingContext2D, panel:Frame, state:any){
  drawHudPanel(ctx, panel)
  const menu = ['Attack','Defend','Heal','Items']
  ctx.font='14px "VT323", monospace'
  menu.forEach((label, idx)=>{
    const rowY = panel.y + 12 + idx*18
    const isActive = idx===state.cursor?.menuIdx
    const iconX = panel.x+10
    const textX = panel.x+28
    ctx.fillStyle=isActive?'#ffe082':'rgba(255,255,255,0.2)'
    ctx.beginPath()
    ctx.arc(iconX, rowY+4, 4, 0, Math.PI*2)
    ctx.fill()
    ctx.strokeStyle='rgba(255,255,255,0.3)'
    ctx.stroke()
    ctx.fillStyle=isActive?'#ffe082':'#fefefe'
    ctx.fillText(label, textX, rowY+8)
  })
  drawArrow(ctx, panel.x + panel.w - 20, panel.y + panel.h - 16)
}

function drawTargetPanel(ctx:CanvasRenderingContext2D, panel:Frame, state:any, phase:string){
  drawHudPanel(ctx, panel)
  ctx.fillStyle='#f5f5ff'
  ctx.font='15px "VT323", monospace'
  ctx.fillText('Enemy', panel.x+12, panel.y+18)
  const enemies = state.enemies
  const showArrow = phase==='TARGET_SELECT'
  const selected = showArrow
    ? (typeof state.cursor?.targetIdx==='number' && state.cursor.targetIdx>=0 ? state.cursor.targetIdx : nextAliveIndex(enemies))
    : -1
  ctx.font='12px "VT323", monospace'
  const rowH=16
  enemies.forEach((enemy:any, idx:number)=>{
    const y = panel.y + 32 + idx*rowH
    if (y+rowH>panel.y+panel.h) return
    const arrow = showArrow && idx===selected ? '▶ ' : '  '
    ctx.fillStyle = showArrow && idx===selected ? '#ffe082' : '#fefefe'
    const info = `${enemy.name}  HP ${Math.max(0,enemy.hp)}/${enemy.maxHp}`
    renderClampedText(ctx, arrow + info, panel.x+10, y, panel.w-20)
  })
}

function drawPartyPanel(ctx:CanvasRenderingContext2D, panel:Frame, heroes:any[]){
  drawHudPanel(ctx, panel)
  ctx.fillStyle='#f5f5ff'
  ctx.font='15px "VT323", monospace'
  ctx.fillText('Party', panel.x+12, panel.y+18)
  const rowHeight = 18
  ctx.font='12px "VT323", monospace'
  const maxRows = Math.floor((panel.h - 36) / (rowHeight+10))
  heroes.slice(0, maxRows).forEach((hero:any, idx:number)=>{
    const baseY = panel.y + 34 + idx*(rowHeight+10)
    ctx.fillStyle= hero.alive ? '#fefefe' : '#9da0b7'
    renderClampedText(ctx, hero.name, panel.x+12, baseY, panel.w - 80)
    ctx.fillStyle='#dfe3ff'
    ctx.fillText(`${Math.max(0,hero.hp)}/${hero.maxHp}`, panel.x+12, baseY+12)
    const gaugeW = Math.max(36, Math.min(54, panel.w - 110))
    const gaugeX = panel.x + panel.w - gaugeW - 12
    const hpPct = hero.maxHp ? hero.hp/hero.maxHp : 0
    drawGauge(ctx, gaugeX, baseY-4, gaugeW, 5, hpPct, '#ffd24c')
    const atb = (hero as any).atb ?? 0
    drawGauge(ctx, gaugeX, baseY+5, gaugeW, 4, Math.max(0, Math.min(1, atb)), '#6bd0ff')
  })
}

function drawGauge(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number, pct:number, color:string){
  ctx.fillStyle='rgba(0,0,0,0.4)'
  ctx.fillRect(x, y, w, h)
  const width = Math.max(0, Math.min(1, pct))
  ctx.fillStyle=color
  ctx.fillRect(x, y, Math.round(w*width), h)
  ctx.strokeStyle='rgba(255,255,255,0.25)'
  ctx.strokeRect(x, y, w, h)
}

function drawHudPanel(ctx:CanvasRenderingContext2D, panel:Frame){
  const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y+panel.h)
  grad.addColorStop(0, '#18235a')
  grad.addColorStop(1, '#0b1034')
  ctx.fillStyle=grad
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h)
  ctx.strokeStyle='rgba(255,255,255,0.35)'
  ctx.lineWidth=2
  ctx.strokeRect(panel.x, panel.y, panel.w, panel.h)
  ctx.strokeStyle='rgba(15,18,42,0.85)'
  ctx.lineWidth=1
  ctx.strokeRect(panel.x+2, panel.y+2, panel.w-4, panel.h-4)
}

function renderClampedText(ctx:CanvasRenderingContext2D, text:string, x:number, y:number, maxWidth:number){
  const metrics = ctx.measureText(text)
  if (metrics.width <= maxWidth){ ctx.fillText(text, x, y) }
  else {
    let str = text
    while (ctx.measureText(str + '…').width > maxWidth && str.length>0){
      str = str.slice(0, -1)
    }
    ctx.fillText(str + '…', x, y)
  }
}

function renderCenteredClampedText(ctx:CanvasRenderingContext2D, text:string, centerX:number, y:number, maxWidth:number){
  if (ctx.measureText(text).width <= maxWidth){
    ctx.fillText(text, centerX, y)
    return
  }
  let str = text
  while (ctx.measureText(str + '…').width > maxWidth && str.length>0){
    str = str.slice(0,-1)
  }
  ctx.fillText(str + '…', centerX, y)
}

function drawArrow(ctx:CanvasRenderingContext2D, x:number, y:number){
  ctx.fillStyle='rgba(255,255,255,0.8)'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x+8, y+6)
  ctx.lineTo(x, y+12)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle='rgba(255,255,255,0.3)'
  ctx.stroke()
}

function drawIconButton(ctx:CanvasRenderingContext2D, centerX:number, centerY:number, type:'fast'|'pause'|'auto'){
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.fillStyle='rgba(53,69,173,0.95)'
  ctx.strokeStyle='#c2ceff'
  ctx.lineWidth=1
  const size = 16
  ctx.beginPath()
  const rr = (ctx as any).roundRect
  if (typeof rr === 'function'){
    rr.call(ctx, -size/2, -size/2, size, size, 3)
  } else {
    ctx.rect(-size/2, -size/2, size, size)
  }
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle='#fff'
  if (type==='fast'){
    ctx.beginPath()
    ctx.moveTo(-4, -4); ctx.lineTo(1, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(2, -4); ctx.lineTo(7, 0); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill()
  } else if (type==='pause'){
    ctx.fillRect(-4, -4, 3, 8)
    ctx.fillRect(1, -4, 3, 8)
  } else {
    ctx.beginPath()
    ctx.arc(0, 0, 4, -Math.PI/2, Math.PI/2)
    ctx.lineTo(6,0)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawTopBanner(ctx:CanvasRenderingContext2D, inner:Frame, phase:string, log:string[]){
  const padding = 20
  const width = Math.max(140, inner.w - padding*2)
  const bannerHeight = 22
  const x = inner.x + (inner.w - width)/2
  const y = inner.y
  const gradient = ctx.createLinearGradient(x, y, x, y+bannerHeight)
  gradient.addColorStop(0, '#546bcf')
  gradient.addColorStop(1, '#29347b')
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, width, bannerHeight)
  ctx.strokeStyle='#9fb3ff'
  ctx.lineWidth=1.5
  ctx.strokeRect(x, y, width, bannerHeight)
  drawIconButton(ctx, x - 24, y + bannerHeight/2, 'fast')
  drawIconButton(ctx, x - 6, y + bannerHeight/2, 'pause')
  drawIconButton(ctx, x + width + 18, y + bannerHeight/2, 'auto')
  ctx.fillStyle='#fff'
  ctx.font='12px "VT323", monospace'
  ctx.textAlign='center'
  const headline = log[log.length-1] || `Phase: ${phase}`
  renderCenteredClampedText(ctx, headline, x + width/2, y + bannerHeight/2 + 4, width-28)
  ctx.textAlign='left'
}

function drawSummary(ctx:CanvasRenderingContext2D, frame:Frame, state:any){
  const pad = 16
  const bw = frame.w - pad*2
  const bh = Math.min(frame.h - pad*2, 130)
  const bx = frame.x + pad
  const by = frame.y + (frame.h - bh)/2
  ctx.fillStyle='rgba(5,5,15,0.94)'
  ctx.fillRect(bx, by, bw, bh)
  ctx.strokeStyle='#d6c2ff'
  ctx.strokeRect(bx, by, bw, bh)
  ctx.fillStyle='#fff'
  ctx.font='18px "VT323", monospace'
  ctx.fillText('Battle Results', bx+16, by+28)
  ctx.font='14px "VT323", monospace'
  ctx.fillText(`XP Earned: ${state.reward?.xp ?? 0}`, bx+16, by+54)
  ctx.fillText(`Gold: ${state.reward?.gold ?? 0}`, bx+16, by+72)
  ctx.fillText('Press Enter to continue', bx+16, by+bh-18)
}
