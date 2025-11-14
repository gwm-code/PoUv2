import type { DungeonDefinition, DungeonTile } from '@content/dungeons/types'
import { DungeonTiles } from '@content/dungeons/types'
import playerWorldSprite from '../../assets/world/player-worldmap.png'

const TILE_PIXELS = 16
const playerImage = new Image()
playerImage.src = playerWorldSprite

interface RenderPlayer {
  x:number
  y:number
  facing:'up'|'down'|'left'|'right'
  moving:boolean
  animTime:number
}

export interface DungeonRenderState {
  dungeon:DungeonDefinition
  player:RenderPlayer
  nearExit:boolean
  manualMode:boolean
}

export function renderDungeon(ctx:CanvasRenderingContext2D, W:number, H:number, state:DungeonRenderState){
  ctx.fillStyle = '#05030b'
  ctx.fillRect(0,0,W,H)
  const rows = state.dungeon.tiles.length
  const cols = state.dungeon.tiles[0]?.length ?? 0
  if (!rows || !cols) return
  const mapWidth = cols*TILE_PIXELS
  const mapHeight = rows*TILE_PIXELS
  const padding = 48
  const viewWidth = Math.max(120, W - padding*2)
  const viewHeight = Math.max(120, H - padding*2)
  const cameraX = clamp(state.player.x + TILE_PIXELS/2 - viewWidth/2, 0, Math.max(0, mapWidth - viewWidth))
  const cameraY = clamp(state.player.y + TILE_PIXELS/2 - viewHeight/2, 0, Math.max(0, mapHeight - viewHeight))
  const viewportX = (W - viewWidth)/2
  const viewportY = (H - viewHeight)/2
  drawTiles(ctx, state.dungeon.tiles, viewportX, viewportY, cameraX, cameraY, viewWidth, viewHeight)
  drawPlayer(ctx, state.player, viewportX, viewportY, cameraX, cameraY)
  drawHUD(ctx, W, H, state)
}

function drawTiles(ctx:CanvasRenderingContext2D, tiles:DungeonTile[][], viewportX:number, viewportY:number, cameraX:number, cameraY:number, viewWidth:number, viewHeight:number){
  const startCol = Math.max(0, Math.floor(cameraX / TILE_PIXELS))
  const endCol = Math.min(tiles[0]?.length ?? 0, Math.ceil((cameraX + viewWidth)/TILE_PIXELS))
  const startRow = Math.max(0, Math.floor(cameraY / TILE_PIXELS))
  const endRow = Math.min(tiles.length, Math.ceil((cameraY + viewHeight)/TILE_PIXELS))
  for (let y=startRow; y<endRow; y++){
    for (let x=startCol; x<endCol; x++){
      const tile = tiles[y][x]
      const px = viewportX + x*TILE_PIXELS - cameraX
      const py = viewportY + y*TILE_PIXELS - cameraY
      switch(tile){
        case DungeonTiles.Wall:
          ctx.fillStyle='#1c1626'
          ctx.fillRect(px, py, TILE_PIXELS, TILE_PIXELS)
          ctx.fillStyle='#2e2438'
          ctx.fillRect(px+2, py+2, TILE_PIXELS-4, TILE_PIXELS-4)
          break
        case DungeonTiles.Hazard:
          const gradient = ctx.createLinearGradient(px, py, px, py+TILE_PIXELS)
          gradient.addColorStop(0, '#7a2a1c')
          gradient.addColorStop(1, '#d25c2b')
          ctx.fillStyle = gradient
          ctx.fillRect(px, py, TILE_PIXELS, TILE_PIXELS)
          break
        case DungeonTiles.Exit:
          ctx.fillStyle='#173945'
          ctx.fillRect(px, py, TILE_PIXELS, TILE_PIXELS)
          ctx.fillStyle='#47c7ff'
          ctx.fillRect(px+3, py+3, TILE_PIXELS-6, TILE_PIXELS-6)
          break
        default:
          ctx.fillStyle='#0f0c18'
          ctx.fillRect(px, py, TILE_PIXELS, TILE_PIXELS)
          ctx.fillStyle='rgba(255,255,255,0.05)'
          ctx.fillRect(px, py, TILE_PIXELS, 1)
          ctx.fillRect(px, py, 1, TILE_PIXELS)
          break
      }
    }
  }
}

function drawPlayer(ctx:CanvasRenderingContext2D, player:RenderPlayer, viewportX:number, viewportY:number, cameraX:number, cameraY:number){
  const px = viewportX + player.x - cameraX
  const py = viewportY + player.y - cameraY
  if (!playerImage.complete || playerImage.naturalWidth===0){
    ctx.fillStyle='#f7d18b'
    ctx.fillRect(px+2, py+2, TILE_PIXELS-4, TILE_PIXELS-4)
    return
  }
  const cols = 9
  const rows = 4
  const frameW = playerImage.naturalWidth / cols
  const frameH = playerImage.naturalHeight / rows
  const facingMap:{[k in RenderPlayer['facing']]:number} = { up:0, left:1, down:2, right:3 }
  const facingRow = facingMap[player.facing] ?? 2
  const walkFrames = [1,2,3,4,5,6,7,8]
  const frameIdx = player.moving ? walkFrames[Math.floor((player.animTime/0.09)%walkFrames.length)] : 0
  const sx = frameIdx * frameW
  const sy = facingRow * frameH
  const destH = Math.round(frameH * 0.8)
  const destW = Math.round(frameW * 0.8)
  const destX = Math.round(px + (TILE_PIXELS - destW)/2)
  const destY = Math.round(py + TILE_PIXELS - destH)
  ctx.save()
  ctx.imageSmoothingEnabled=false
  ctx.drawImage(
    playerImage,
    sx, sy, frameW, frameH,
    destX,
    destY,
    destW,
    destH
  )
  ctx.restore()
}

function drawHUD(ctx:CanvasRenderingContext2D, W:number, H:number, state:DungeonRenderState){
  const label = state.dungeon.name
  ctx.save()
  ctx.font='18px "VT323", monospace'
  ctx.fillStyle='#f6d9b6'
  ctx.fillText(label, 12, 28)
  const instructions = state.nearExit
    ? 'Enter: Ascend to the overworld'
    : state.manualMode
      ? 'Enter: Trigger manual battle'
      : 'Battles will trigger as you explore'
  ctx.font='14px "VT323", monospace'
  const textWidth = ctx.measureText(instructions).width + 14
  const bx = (W - textWidth)/2
  const by = H - 32
  ctx.fillStyle='rgba(0,0,0,0.55)'
  ctx.fillRect(bx, by-18, textWidth, 24)
  ctx.fillStyle='#fff'
  ctx.fillText(instructions, bx+7, by-2)
  ctx.restore()
}

function clamp(value:number, min:number, max:number){
  if (max <= min) return min
  return Math.max(min, Math.min(max, value))
}
