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
    g.drawImage(stripWhite(img),0,0,16,16)
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

function drawTilemap(ctx:CanvasRenderingContext2D, W:number, H:number, world:WorldState){
  const TILE=16
  for(let r=0;r<H/TILE;r++){
    for(let c=0;c<W/TILE;c++){
      const t = world.tile[r]?.[c]??1
      const baseColor = world.tileColorFor(c, r, t)
      ctx.fillStyle = baseColor
      ctx.fillRect(c*TILE,r*TILE,TILE,TILE)
      const img = getTileImage(t)
      if (img){
        if (img instanceof HTMLImageElement){
          if (img.complete) ctx.drawImage(img, c*TILE, r*TILE, TILE, TILE)
        } else {
          ctx.drawImage(img, c*TILE, r*TILE, TILE, TILE)
        }
      }
    }
  }
}

function drawPlayer(ctx:CanvasRenderingContext2D, world:WorldState){
  const x=world.playerPx.x, y=world.playerPx.y
  ctx.fillStyle='#FFD700'; ctx.fillRect(x+2,y+4,12,12)
}
