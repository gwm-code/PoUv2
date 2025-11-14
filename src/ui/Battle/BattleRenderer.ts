import { setBattleHudState } from '@ui/Battle/hudState'

const battlefieldImage = new Image()
battlefieldImage.src = new URL('../../assets/backgrounds/fields.png', import.meta.url).toString()
const backgroundCache:Record<string, HTMLImageElement|null> = {
  default: battlefieldImage
}
type SpriteCache = Record<string, HTMLCanvasElement|HTMLImageElement|null>
const heroSprites:SpriteCache = {}
const enemySprites:SpriteCache = {}
const DEFAULT_ENEMY_SPRITE = 'mistling'
function loadSprite(type:'heroes'|'enemies', key:string, fileName?:string){
  const cacheKey = key.toLowerCase()
  const store = type==='heroes'?heroSprites:enemySprites
  if (Object.prototype.hasOwnProperty.call(store, cacheKey)){
    return store[cacheKey] ?? undefined
  }
  const img = new Image()
  img.onload = ()=>{ store[cacheKey] = stripWhiteBackground(img) }
  img.onerror = ()=>{
    console.warn(`[BattleRenderer] Failed to load ${type} sprite ${fileName ?? cacheKey}`)
    store[cacheKey] = null
  }
  const fileSegment = fileName ?? `${cacheKey}.png`
  img.src = new URL(`../../assets/sprites/${type}/${fileSegment}`, import.meta.url).toString()
  store[cacheKey] = img
  return img
}

interface Frame { x:number; y:number; w:number; h:number }

export function drawBattleRenderer(ctx: CanvasRenderingContext2D, state: any, frame: Frame) {
  const innerPad = Math.max(8, Math.round(Math.min(frame.w, frame.h)*0.03))
  const inner = { x: frame.x + innerPad, y: frame.y + innerPad, w: frame.w - innerPad*2, h: frame.h - innerPad*2 }
  drawBattlefield(ctx, inner, state.tileType)
  const topBannerHeight = 26
  const hudGap = 6
  const hudHeight = Math.max(92, inner.h * 0.34)
  const battlefieldHeight = inner.h - hudHeight - hudGap
  const battlefield = { x: inner.x, y: inner.y + topBannerHeight, w: inner.w, h: battlefieldHeight - topBannerHeight }
  ctx.save()
  ctx.fillStyle = 'rgba(6,4,20,0.22)'
  ctx.fillRect(battlefield.x, battlefield.y, battlefield.w, battlefield.h)
  ctx.strokeStyle = 'rgba(122,110,191,0.35)'
  ctx.lineWidth = 2
  ctx.strokeRect(battlefield.x + 1, battlefield.y + 1, battlefield.w - 2, battlefield.h - 2)
  ctx.restore()
  const hudY = battlefield.y + battlefield.h + hudGap

  const columnGap = 8
  const availableHeight = Math.max(88, (inner.y + inner.h) - hudY)
  const targetPanelHeight = Math.max(88, Math.min(hudHeight * 0.55, availableHeight))
  const panelHeight = Math.min(targetPanelHeight, availableHeight)
  const enemyPanelHeight = 15
  const enemyPanelGap = 4
  const enemyPanelY = Math.max(inner.y + topBannerHeight, hudY - enemyPanelHeight - enemyPanelGap)
  const availableWidth = inner.w - columnGap
  const minCommand = 140
  const minParty = 200
  let commandWidth = Math.max(minCommand, availableWidth * 0.45)
  if (commandWidth > availableWidth - minParty){
    commandWidth = Math.max(minCommand, availableWidth - minParty)
  }
  if (commandWidth < minCommand){
    commandWidth = Math.min(minCommand, availableWidth)
  }
  const partyWidth = availableWidth - commandWidth
  const commandPanel = { x: inner.x, y: hudY, w: commandWidth, h: panelHeight }
  const partyPanel = { x: commandPanel.x + commandPanel.w + columnGap, y: hudY, w: partyWidth, h: panelHeight }
  const enemyPanel = { x: inner.x, y: enemyPanelY, w: inner.w, h: enemyPanelHeight }

  decayEffects(state.effects, state.heroes, state.enemies)
  drawBattlefield(ctx, battlefield, state.tileType)
  drawEnemyLine(ctx, battlefield, state.enemies, state.cursor?.targetIdx, state.phase, state.effects, state.cursor?.targetTeam)
  drawHeroLine(ctx, battlefield, state.heroes, state.cursor?.heroIdx, state.effects, state.phase, state.cursor?.targetIdx, state.cursor?.targetTeam)
  syncHudOverlay(ctx.canvas, inner, enemyPanel, commandPanel, partyPanel, state)
}

function drawBattlefield(ctx:CanvasRenderingContext2D, area:Frame, tileType?:number){
  const bg = resolveBackground(tileType)
  if (bg && bg.complete && bg.naturalWidth){
    ctx.drawImage(bg, area.x, area.y, area.w, area.h)
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

function resolveBackground(tileType?:number){
  const key = typeof tileType === 'number' && Number.isInteger(tileType) ? String(tileType) : 'default'
  const cached = backgroundCache[key]
  if (cached !== undefined){
    return cached ?? backgroundCache.default ?? null
  }
  if (key !== 'default'){
    const img = new Image()
    img.onload = ()=>{ backgroundCache[key] = img }
    img.onerror = ()=>{
      console.warn(`[BattleRenderer] Missing background for tile type ${key}, falling back to default.`)
      backgroundCache[key] = backgroundCache.default ?? null
    }
    img.src = new URL(`../../assets/backgrounds/${key}.png`, import.meta.url).toString()
    backgroundCache[key] = img
    return img
  }
  return backgroundCache.default ?? null
}

function drawEnemyLine(ctx:CanvasRenderingContext2D, area:Frame, enemies:any[], targetIdx:number, phase:string, effects:Record<string,{hitTimer:number; koAlpha:number; popup?:any}>, targetTeam?:string){
  const rowY = area.y + area.h*0.62
  const spacing = 56
  const startX = area.x + 32
  const effectiveTarget = typeof targetIdx === 'number' && targetIdx>=0
    ? targetIdx
    : nextAliveIndex(enemies)
  const allowArrow = phase==='TARGET_SELECT' && targetTeam!=='heroes'
  enemies.forEach((enemy, i)=>{
    const x = startX + i*spacing
    const highlight = allowArrow && i===effectiveTarget
    drawBattlerSprite(ctx, x, rowY - 60, enemy, highlight, 'enemies', false, effects[enemy.id])
    if (highlight){
      drawTargetArrow(ctx, x+24, rowY - 48)
    }
  })
}

function drawHeroLine(ctx:CanvasRenderingContext2D, area:Frame, heroes:any[], heroIdx:number, effects:Record<string,{hitTimer:number; koAlpha:number; popup?:any}>, phase:string, targetIdx:number, targetTeam?:string){
  const baseX = area.x + area.w - 88
  const baseY = area.y + area.h*0.64
  const spacingX = 36
  const spacingY = 14
  heroes.forEach((hero, i)=>{
    const targeted = phase==='TARGET_SELECT' && targetTeam==='heroes' && i===targetIdx
    const posX = baseX - i*spacingX
    const posY = baseY + i*spacingY
    drawBattlerSprite(ctx, posX, posY - 60, hero, heroIdx===i, 'heroes', false, effects[hero.id])
    if (targeted){
      drawTargetArrow(ctx, posX + 24, posY - 86)
    }
  })
}

function drawBattlerSprite(ctx:CanvasRenderingContext2D, x:number, y:number, battler:any, highlight:boolean, type:'heroes'|'enemies', flip?:boolean, effect?:{hitTimer:number; koAlpha:number; popup?:{value:number; timer:number; mode:string; rise:number}}){
  const sprite = resolveBattlerSprite(battler, type)
  ctx.save()
  let drawn=false
  const yOffset = battler.alive ? 0 : 32
  if (highlight && battler.alive && type==='heroes'){
    drawTurnIndicator(ctx, x, y+yOffset)
  }
  if (sprite){
    drawn = drawSpriteImage(ctx, sprite, x, y+yOffset, flip)
  }
  if (!drawn){
    ctx.fillStyle = battler.alive ? '#f7d18b' : '#4b3c58'
    ctx.fillRect(x, y+yOffset, 40, 40)
    ctx.fillStyle = battler.alive ? '#2e1c34' : '#1f102a'
    ctx.fillRect(x+8, y+yOffset+8, 24, 12)
  }
  if (highlight && battler.alive && type==='heroes'){
    drawTurnIndicator(ctx, x, y+yOffset)
  }
  if (effect){
    if (effect.hitTimer>0 && sprite){
      ctx.save()
      ctx.globalCompositeOperation='lighter'
      ctx.globalAlpha = Math.min(0.7, effect.hitTimer*3)
      drawSpriteImage(ctx, sprite, x, y+yOffset, false)
      ctx.restore()
    }
    if (effect.popup && effect.popup.timer>0){
      ctx.save()
      ctx.font='14px "VT323", monospace'
      ctx.textAlign='center'
      ctx.fillStyle=effect.popup.mode==='heal' ? '#9bf6c1' : '#ffb347'
      ctx.globalAlpha = Math.min(1, effect.popup.timer/0.4)
      const prefix = effect.popup.mode==='heal' ? '+' : '-'
      ctx.fillText(`${prefix}${effect.popup.value}`, x+32, y - 8 - (effect.popup.rise ?? 0))
      ctx.restore()
      ctx.textAlign='left'
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

function resolveBattlerSprite(battler:any, type:'heroes'|'enemies'){
  const attempts = buildSpriteAttempts(battler, type)
  for (const attempt of attempts){
    if (!attempt) continue
    const sprite = loadSprite(type, attempt.key, attempt.file)
    if (sprite){
      return sprite
    }
  }
  return undefined
}

function buildSpriteAttempts(battler:any, type:'heroes'|'enemies'){
  const baseId = (battler.id || '').replace(/\d+$/,'')
  const aliveKey = baseId ? baseId.toLowerCase() : ''
  const deadKey = aliveKey ? `${aliveKey}-defeated` : ''
  const attempts:{key:string; file?:string}[] = []
  if (type==='enemies' && typeof battler.sprite === 'string' && battler.sprite.trim().length){
    const spriteFile = battler.alive ? battler.sprite : defeatedVariant(battler.sprite)
    const spriteKey = spriteFile ? spriteFile.replace(/\.[^.]+$/,'').toLowerCase() : ''
    if (spriteKey){
      attempts.push({ key:spriteKey, file:spriteFile })
    }
  }
  if (battler.alive && aliveKey){
    attempts.push({ key:aliveKey })
  } else if (!battler.alive && deadKey){
    attempts.push({ key:deadKey })
  }
  if (type==='enemies'){
    const fallback = battler.alive ? DEFAULT_ENEMY_SPRITE : `${DEFAULT_ENEMY_SPRITE}-defeated`
    attempts.push({ key:fallback })
  }
  return attempts
}

function defeatedVariant(fileName:string){
  if (!fileName) return fileName
  const idx = fileName.lastIndexOf('.')
  if (idx===-1) return `${fileName}-defeated`
  return `${fileName.slice(0, idx)}-defeated${fileName.slice(idx)}`
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

function drawSpriteImage(ctx:CanvasRenderingContext2D, sprite:HTMLImageElement|HTMLCanvasElement, x:number, y:number, flip?:boolean){
  try {
    if (flip){
      ctx.save()
      ctx.scale(-1,1)
      ctx.drawImage(sprite, -(x+64), y, 64, 64)
      ctx.restore()
    } else {
      ctx.drawImage(sprite, x, y, 64, 64)
    }
    return true
  } catch (err){
    console.warn('[BattleRenderer] Failed to draw sprite', err)
    return false
  }
}

function nextAliveIndex(units:any[]){
  for (let i=0;i<units.length;i++){
    if (units[i]?.alive) return i
  }
  return -1
}

function drawTurnIndicator(ctx:CanvasRenderingContext2D, x:number, y:number){
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const pulse = 0.4 + 0.4 * Math.sin(now / 260)
  ctx.save()
  const baseX = x + 32
  const baseY = y + 50
  ctx.globalAlpha = 0.45 + pulse * 0.35
  ctx.fillStyle = 'rgba(255,220,120,0.9)'
  ctx.shadowColor = 'rgba(255,220,150,0.4)'
  ctx.shadowBlur = 6 + pulse * 4
  ctx.beginPath()
  ctx.moveTo(baseX, baseY + 10)
  ctx.lineTo(baseX - 12, baseY - 10)
  ctx.lineTo(baseX + 12, baseY - 10)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#b57b1f'
  ctx.stroke()
  ctx.restore()
}

function syncHudOverlay(canvas:HTMLCanvasElement, inner:Frame, enemyPanel:Frame, commandPanel:Frame, partyPanel:Frame, state:any){
  const canvasW = canvas.width || 1
  const canvasH = canvas.height || 1
  const normalize = (rect:Frame):{x:number;y:number;w:number;h:number}=>({
    x: rect.x / canvasW,
    y: rect.y / canvasH,
    w: rect.w / canvasW,
    h: rect.h / canvasH
  })
  const primaryMenu = ['Attack','Skills','Spells','Items']
  const commands = (state.commands ?? []).map((entry:any)=>({
    id:entry.id,
    label:entry.label,
    detail:entry.detail,
    cost:entry.cost,
    qty:entry.qty,
    type:entry.type,
    disabled:entry.disabled
  }))
  const currentHeroIdx = typeof state.cursor?.heroIdx === 'number' ? state.cursor.heroIdx : -1
  const heroDisplays = (state.heroes ?? []).map((hero:any, idx:number)=>({
    id:hero.id,
    name:hero.name,
    level:hero.level ?? 1,
    hp:hero.hp ?? 0,
    maxHp:hero.maxHp ?? hero.hp ?? 0,
    mp:hero.mp ?? 0,
    maxMp:hero.maxMp ?? hero.mp ?? 0,
    alive:hero.alive,
    atb:hero.atb ?? 0,
    active: idx === currentHeroIdx
  }))
  const enemyDisplays = (state.enemies ?? []).map((enemy:any)=>({
    id:enemy.id,
    name:enemy.name,
    hp:enemy.hp ?? 0,
    maxHp:enemy.maxHp ?? enemy.hp ?? 0,
    alive:enemy.alive
  }))
  const selecting = state.phase==='TARGET_SELECT'
  const team = selecting ? (state.cursor?.targetTeam ?? 'enemies') : 'enemies'
  const selectedIndex = selecting ? (typeof state.cursor?.targetIdx==='number' ? state.cursor.targetIdx : -1) : -1
  const bannerHeight = 24
  const bannerRect:Frame = { x: inner.x, y: inner.y, w: inner.w, h: bannerHeight }
  const headline = state.prompt || (state.log?.[state.log.length-1]) || `Phase: ${state.phase}`
  setBattleHudState({
    visible:true,
    phase:state.phase,
    headline,
    panels:{
      enemy:normalize(enemyPanel),
      command:normalize(commandPanel),
      party:normalize(partyPanel),
      banner:normalize(bannerRect)
    },
    actions:{
      mode: state.commandMode ?? 'primary',
      primaryMenu,
      commands,
      cursorIndex: state.cursor?.menuIdx ?? 0
    },
    target:{
      team,
      selecting,
      selectedIndex,
      heroes:heroDisplays,
      enemies:enemyDisplays
    },
    party:{
      heroes:heroDisplays,
    },
    summary: state.phase==='SUMMARY'
      ? { visible:true, xp:state.reward?.xp ?? 0, gold:state.reward?.gold ?? 0 }
      : undefined
  })
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

function decayEffects(effects:Record<string,{hitTimer:number; koAlpha:number; popup?:{value:number; timer:number; mode:string; rise:number}}>, heroes:any[], enemies:any[]){
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
    if (entry.popup){
      entry.popup.timer = Math.max(0, entry.popup.timer - 1/30)
      entry.popup.rise = (entry.popup.rise ?? 0) + 0.5
      if (entry.popup.timer<=0){
        delete entry.popup
      }
    }
  }
}

// The remaining canvas HUD helpers intentionally left unused since the
// overlay now renders via React/CSS.
