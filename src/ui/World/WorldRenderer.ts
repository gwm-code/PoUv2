import { WorldState } from '@systems/World/WorldState'
import { WorldUIState } from '@systems/World/UIState'
import { drawMinimap } from '@ui/HUD/Minimap'
import { drawBox } from '@ui/HUD/OverlayBoxes'
import { drawNPCBubble } from '@ui/World/NPC'
import playerWorldSprite from '../../assets/world/player-worldmap.png'

const PLAYER_COLS = 9
const PLAYER_ROWS = 4
const WALK_FRAMES = [1,2,3,4,5,6,7,8]
const WALK_FRAME_DURATION = 0.09
const facingRowMap:{[key in 'up'|'down'|'left'|'right']:number} = {
  up:0,
  left:1,
  down:2,
  right:3
}

const playerImage = new Image()
playerImage.src = playerWorldSprite

export function renderWorld(ctx:CanvasRenderingContext2D, W:number, H:number, world:WorldState, ui:WorldUIState){
  const camera = computeCamera(world, W, H)
  drawTilemap(ctx,W,H,world, camera.x, camera.y)
  drawPlayer(ctx, world, camera.x, camera.y)
  ctx.save()
  ctx.font='12px "VT323", monospace'
  ctx.fillStyle='rgba(0,0,0,0.6)'
  ctx.fillRect(2, H-18, ctx.measureText(world.biomeNameAtPlayer()).width + 8, 16)
  ctx.fillStyle='#fff'
  ctx.fillText(world.biomeNameAtPlayer(), 6, H-6)
  ctx.restore()
  drawMinimap(ctx, W, H, world)
  if (ui.equipOpen){ drawBox(ctx, W/2-60, H/2-40, 120, 80, 'Equip (Esc)') }
  if (ui.shopOpen){ drawBox(ctx, W/2-70, H/2-50, 140, 100, 'Shop (Esc/O)') }
  if (ui.talkText) drawNPCBubble(ctx, ui.talkText, W, H)
}

const tileImages:Record<number, HTMLCanvasElement|HTMLImageElement> = {}
function getTileImage(type:number){
  if (tileImages[type]) return tileImages[type]
  if (type===9){
    const canvas = createFieldTile()
    tileImages[type]=canvas
    return canvas
  }
  if (type===4){
    const canvas = createDungeonTile()
    tileImages[type]=canvas
    return canvas
  }
  const map:{[key:number]:string} = {
    0:'alternategrass',
    1:'grass',
    2:'water',
    3:'mountains',
    4:'grass',
    5:'forest',
    6:'road',
    7:'coast',
    8:'townmarker'
  }
  const name = map[type]
  if (!name) return undefined
  const img = new Image()
  img.onload = ()=>{
    const canvas = document.createElement('canvas')
    canvas.width = 16; canvas.height = 16
    const g = canvas.getContext('2d')!
    g.imageSmoothingEnabled=false
    g.drawImage(img,0,0,16,16)
    tileImages[type]=canvas
  }
  img.src = new URL(`../../assets/world/${name}.png`, import.meta.url).toString()
  tileImages[type]=img
  return img
}

function stripWhite(img:HTMLImageElement){
  const canvas=document.createElement('canvas')
  canvas.width=img.width; canvas.height=img.height
  const g=canvas.getContext('2d')!
  g.drawImage(img,0,0)
  const data=g.getImageData(0,0,canvas.width,canvas.height)
  const buf=data.data
  for(let i=0;i<buf.length;i+=4){
    if (buf[i]>245 && buf[i+1]>245 && buf[i+2]>245) buf[i+3]=0
  }
  g.putImageData(data,0,0)
  return canvas
}

function createFieldTile(){
  const canvas=document.createElement('canvas')
  canvas.width=16; canvas.height=16
  const g=canvas.getContext('2d')!
  g.clearRect(0,0,16,16)
  for(let y=0;y<16;y+=3){
    g.fillStyle = y%6===0 ? 'rgba(101,64,20,0.85)' : 'rgba(140,88,33,0.7)'
    g.fillRect(0,y,16,2)
  }
  g.strokeStyle='rgba(255,230,180,0.25)'
  g.lineWidth=1
  g.beginPath()
  for (let x=0;x<=16;x+=4){
    g.moveTo(x,0)
    g.lineTo(x,16)
  }
  g.stroke()
  return canvas
}

function createDungeonTile(){
  const canvas=document.createElement('canvas')
  canvas.width=16; canvas.height=16
  const g=canvas.getContext('2d')!
  g.fillStyle='#2f1a2f'
  g.fillRect(0,0,16,16)
  g.fillStyle='#6c3c84'
  g.fillRect(2,2,12,12)
  g.fillStyle='#f3f2ff'
  g.fillRect(6,2,4,12)
  g.fillRect(2,6,12,4)
  g.fillStyle='rgba(255,240,180,0.4)'
  g.fillRect(4,4,8,8)
  return canvas
}

function drawTilemap(ctx:CanvasRenderingContext2D, W:number, H:number, world:WorldState, cameraX:number, cameraY:number){
  const TILE=16
  const startCol = Math.max(0, Math.floor(cameraX / TILE))
  const endCol = Math.min(world.width, Math.ceil((cameraX + W)/TILE))
  const startRow = Math.max(0, Math.floor(cameraY / TILE))
  const endRow = Math.min(world.height, Math.ceil((cameraY + H)/TILE))
  for(let r=startRow;r<endRow;r++){
    for(let c=startCol;c<endCol;c++){
      const t = world.tile[r]?.[c]??1
      const img = getTileImage(t)
      if (!img) continue
      const px = Math.round(c*TILE - cameraX)
      const py = Math.round(r*TILE - cameraY)
      if (img instanceof HTMLImageElement){
        if (img.complete) ctx.drawImage(img, px, py, TILE, TILE)
      } else {
        ctx.drawImage(img, px, py, TILE, TILE)
      }
    }
  }
}

function drawPlayer(ctx:CanvasRenderingContext2D, world:WorldState, cameraX:number, cameraY:number){
  if (!playerImage.complete || playerImage.naturalWidth===0){
    const x=world.playerPx.x - cameraX
    const y=world.playerPx.y - cameraY
    ctx.fillStyle='#FFD700'; ctx.fillRect(x+2,y+4,12,12)
    return
  }
  const frameW = playerImage.naturalWidth / PLAYER_COLS
  const frameH = playerImage.naturalHeight / PLAYER_ROWS
  const facingRow = facingRowMap[world.playerFacing] ?? facingRowMap.down
  const walkIndex = world.playerMoving
    ? WALK_FRAMES[Math.floor((world.playerAnimTime / WALK_FRAME_DURATION)) % WALK_FRAMES.length]
    : 0
  const sx = walkIndex * frameW
  const sy = facingRow * frameH
  const targetSize = 32
  const scale = targetSize / Math.max(frameW, frameH)
  const destW = Math.round(frameW * scale)
  const destH = Math.round(frameH * scale)
  const destX = world.playerPx.x - cameraX + (16 - destW)/2
  const destY = world.playerPx.y - cameraY + 16 - destH
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    playerImage,
    sx, sy, frameW, frameH,
    Math.round(destX),
    Math.round(destY),
    destW,
    destH
  )
  ctx.restore()
}

function drawForestBorder(ctx:CanvasRenderingContext2D, x:number, y:number, mask:number){
  const thickness = 3
  ctx.fillStyle='rgba(24,48,32,0.8)'
  if (mask & 1) ctx.fillRect(x, y, 16, thickness)
  if (mask & 4) ctx.fillRect(x, y+16-thickness, 16, thickness)
  if (mask & 8) ctx.fillRect(x, y, thickness, 16)
  if (mask & 2) ctx.fillRect(x+16-thickness, y, thickness, 16)
}

function drawRiverBank(ctx:CanvasRenderingContext2D, x:number, y:number, mask:number){
  const thickness = 2
  ctx.fillStyle='rgba(173, 216, 230, 0.55)'
  if (mask & 1) ctx.fillRect(x, y, 16, thickness)
  if (mask & 4) ctx.fillRect(x, y+16-thickness, 16, thickness)
  if (mask & 8) ctx.fillRect(x, y, thickness, 16)
  if (mask & 2) ctx.fillRect(x+16-thickness, y, thickness, 16)
}

function computeCamera(world:WorldState, viewWidth:number, viewHeight:number){
  const tileSize = 16
  const mapWidth = world.width * tileSize
  const mapHeight = world.height * tileSize
  const halfW = viewWidth/2
  const halfH = viewHeight/2
  const centerX = world.playerPx.x + tileSize/2
  const centerY = world.playerPx.y + tileSize/2
  const x = clamp(centerX - halfW, 0, Math.max(0, mapWidth - viewWidth))
  const y = clamp(centerY - halfH, 0, Math.max(0, mapHeight - viewHeight))
  return { x, y }
}

function clamp(value:number, min:number, max:number){
  if (max <= min) return min
  return Math.max(min, Math.min(max, value))
}
