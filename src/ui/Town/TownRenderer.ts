import { TILE_SIZE } from '@config/display'
import type { TownDefinition, TownNPC } from '@content/towns/types'
import { drawNPCBubble } from '@ui/World/NPC'
import playerWorldSprite from '../../assets/world/player-worldmap.png'

export interface TownRenderState {
  town:TownDefinition
  player:{
    x:number
    y:number
    facing:'up'|'down'|'left'|'right'
    moving:boolean
    animTime:number
  }
  npcs:TownNPC[]
  dialogue?:string|null
  nearExit?:boolean
}

const tileImages:Record<number, HTMLCanvasElement|HTMLImageElement> = {}
const playerImage = new Image()
playerImage.src = playerWorldSprite

export function renderTown(ctx:CanvasRenderingContext2D, W:number, H:number, state:TownRenderState){
  ctx.save()
  ctx.fillStyle='#120a18'
  ctx.fillRect(0,0,W,H)
  ctx.restore()
  drawTiles(ctx, state.town)
  drawNpcs(ctx, state.npcs)
  drawPlayer(ctx, state.player)
  drawTownLabel(ctx, W, H, state.town.name)
  drawInstruction(ctx, W, H, state.nearExit ?? false)
  if (state.dialogue){
    drawNPCBubble(ctx, state.dialogue, W, H)
  }
}

function drawTiles(ctx:CanvasRenderingContext2D, town:TownDefinition){
  for (let y=0; y<town.tiles.length; y++){
    for (let x=0; x<town.tiles[y].length; x++){
      const tile = town.tiles[y][x]
      const img = getTileImage(tile)
      if (!img) continue
      const dx = x*TILE_SIZE
      const dy = y*TILE_SIZE
      if (img instanceof HTMLImageElement){
        if (img.complete){
          ctx.drawImage(img, dx, dy, TILE_SIZE, TILE_SIZE)
        }
      } else {
        ctx.drawImage(img, dx, dy, TILE_SIZE, TILE_SIZE)
      }
    }
  }
}

function drawNpcs(ctx:CanvasRenderingContext2D, npcs:TownNPC[]){
  ctx.save()
  ctx.fillStyle='#f8c18c'
  npcs.forEach(npc=>{
    const dx = npc.x*TILE_SIZE
    const dy = npc.y*TILE_SIZE - 4
    ctx.fillStyle='#f8c18c'
    ctx.fillRect(dx+2, dy+2, TILE_SIZE-4, TILE_SIZE+2)
    ctx.fillStyle='#5c2e2e'
    ctx.fillRect(dx+4, dy+2, TILE_SIZE-8, TILE_SIZE/2)
  })
  ctx.restore()
}

function drawPlayer(ctx:CanvasRenderingContext2D, player:TownRenderState['player']){
  if (!playerImage.complete || playerImage.naturalWidth===0){
    ctx.fillStyle='#f7d18b'
    ctx.fillRect(player.x+2, player.y+2, TILE_SIZE-4, TILE_SIZE-4)
    return
  }
  const cols = 9
  const rows = 4
  const frameW = playerImage.naturalWidth / cols
  const frameH = playerImage.naturalHeight / rows
  const facingRowMap:{[key in 'up'|'down'|'left'|'right']:number} = { up:0, left:1, down:2, right:3 }
  const facingRow = facingRowMap[player.facing] ?? 2
  const walkFrames = [1,2,3,4,5,6,7,8]
  const frameIdx = player.moving ? walkFrames[Math.floor((player.animTime/0.09)%walkFrames.length)] : 0
  const sx = frameIdx * frameW
  const sy = facingRow * frameH
  const targetSize = 32
  const scale = targetSize / Math.max(frameW, frameH)
  const destW = Math.round(frameW * scale)
  const destH = Math.round(frameH * scale)
  const destX = player.x + (TILE_SIZE - destW)/2
  const destY = player.y + TILE_SIZE - destH
  ctx.save()
  ctx.imageSmoothingEnabled=false
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

function drawTownLabel(ctx:CanvasRenderingContext2D, W:number, H:number, name:string){
  ctx.save()
  ctx.fillStyle='rgba(0,0,0,0.55)'
  ctx.fillRect(4,4, ctx.measureText(name).width + 12, 20)
  ctx.fillStyle='#f6d9b6'
  ctx.font='16px "VT323", monospace'
  ctx.fillText(name, 10, 20)
  ctx.restore()
}

function drawInstruction(ctx:CanvasRenderingContext2D, W:number, H:number, nearExit:boolean){
  const text = nearExit ? 'Press Enter at the gate to return outside.' : 'Enter to talk with townsfolk.'
  ctx.save()
  ctx.font='12px "VT323", monospace'
  const width = ctx.measureText(text).width + 12
  ctx.fillStyle='rgba(0,0,0,0.65)'
  ctx.fillRect(W/2 - width/2, H-22, width, 18)
  ctx.fillStyle='#fff'
  ctx.fillText(text, W/2 - width/2 + 6, H-10)
  ctx.restore()
}

function getTileImage(type:number){
  if (tileImages[type]) return tileImages[type]
  if (type===9){
    tileImages[type] = createFieldTile()
    return tileImages[type]
  }
  if (type===10){
    tileImages[type] = createHouseTile()
    return tileImages[type]
  }
  const worldMap:{[key:number]:string} = {
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
  const asset = worldMap[type]
  if (!asset) return undefined
  const img = new Image()
  img.onload = ()=>{
    const canvas = document.createElement('canvas')
    canvas.width = TILE_SIZE
    canvas.height = TILE_SIZE
    const g = canvas.getContext('2d')!
    g.imageSmoothingEnabled=false
    g.drawImage(img,0,0,TILE_SIZE,TILE_SIZE)
    tileImages[type]=canvas
  }
  img.src = new URL(`../../assets/world/${asset}.png`, import.meta.url).toString()
  tileImages[type]=img
  return img
}

function createFieldTile(){
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE
  canvas.height = TILE_SIZE
  const g = canvas.getContext('2d')!
  g.clearRect(0,0,TILE_SIZE,TILE_SIZE)
  for(let y=0;y<TILE_SIZE;y+=3){
    g.fillStyle = y%6===0 ? 'rgba(101,64,20,0.85)' : 'rgba(140,88,33,0.7)'
    g.fillRect(0,y,TILE_SIZE,2)
  }
  g.strokeStyle='rgba(255,230,180,0.25)'
  g.lineWidth=1
  g.beginPath()
  for(let x=0;x<=TILE_SIZE;x+=4){
    g.moveTo(x,0)
    g.lineTo(x,TILE_SIZE)
  }
  g.stroke()
  return canvas
}

function createHouseTile(){
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE
  canvas.height = TILE_SIZE
  const g = canvas.getContext('2d')!
  g.fillStyle='#5a2b29'
  g.fillRect(0,0,TILE_SIZE,TILE_SIZE/2)
  g.fillStyle='#cfa76b'
  g.fillRect(0,TILE_SIZE/2,TILE_SIZE,TILE_SIZE/2)
  g.fillStyle='#8d4c3f'
  g.fillRect(2,TILE_SIZE/2+2,TILE_SIZE-4,TILE_SIZE/2-4)
  g.fillStyle='#41201f'
  g.fillRect(TILE_SIZE/2-2,TILE_SIZE/2+4,4,TILE_SIZE/2-6)
  return canvas
}
