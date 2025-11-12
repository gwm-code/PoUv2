import { WorldState } from '@systems/World/WorldState'
import { WorldUIState } from '@systems/World/UIState'
import { drawMinimap } from '@ui/HUD/Minimap'
import { drawBox } from '@ui/HUD/OverlayBoxes'
import { drawNPCBubble } from '@ui/World/NPC'

export function renderWorld(ctx:CanvasRenderingContext2D, W:number, H:number, world:WorldState, ui:WorldUIState){
  drawTilemap(ctx,W,H,world)
  drawPlayer(ctx, world)
  ctx.fillStyle='#fff'; ctx.font='10px "VT323", monospace'; ctx.fillText(world.biomeNameAtPlayer(), 5, H-5)
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

function drawTilemap(ctx:CanvasRenderingContext2D, W:number, H:number, world:WorldState){
  const TILE=16
  for(let r=0;r<H/TILE;r++){
    for(let c=0;c<W/TILE;c++){
      const t = world.tile[r]?.[c]??1
      const img = getTileImage(t)
      if (img){
        if (img instanceof HTMLImageElement){
          if (img.complete) ctx.drawImage(img, c*TILE, r*TILE, TILE, TILE)
        } else {
          ctx.drawImage(img, c*TILE, r*TILE, TILE, TILE)
        }
      }
      // Overlays disabled per art direction (edge tiles will be real sprites later)
      // const forestMask = world.forestEdges?.[r]?.[c] ?? 0
      // if (forestMask){
      //   drawForestBorder(ctx, c*TILE, r*TILE, forestMask)
      // }
      // const riverMask = world.riverBanks?.[r]?.[c] ?? 0
      // if (riverMask){
      //   drawRiverBank(ctx, c*TILE, r*TILE, riverMask)
      // }
    }
  }
}

function drawPlayer(ctx:CanvasRenderingContext2D, world:WorldState){
  const x=world.playerPx.x, y=world.playerPx.y
  ctx.fillStyle='#FFD700'; ctx.fillRect(x+2,y+4,12,12)
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
