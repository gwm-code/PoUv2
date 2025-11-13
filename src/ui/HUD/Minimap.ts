import { WorldState } from '@systems/World/WorldState'
export function drawMinimap(ctx:CanvasRenderingContext2D, W:number, H:number, world:WorldState){
  const scale = world.minimapMode===0?1: world.minimapMode===1?0.75:0.5
  const mw = Math.floor(96*scale), mh = Math.floor(72*scale)
  const x= W-mw-10, y= 10
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(x-3,y-3,mw+6,mh+6); ctx.strokeStyle='#7a6bff'; ctx.lineWidth=2; ctx.strokeRect(x-3,y-3,mw+6,mh+6)
  for(let r=0;r<world.height;r++){
    for(let c=0;c<world.width;c++){
      const t = world.tile[r][c]
      ctx.fillStyle = t===5?'#274f2a'
        : t===6?'#b99962'
        : t===7?'#f2d0a2'
        : t===8?'#e06b6b'
        : world.tileColorFor(c, r, t)
      const px = x + Math.floor(c*(mw/world.width))
      const py = y + Math.floor(r*(mh/world.height))
      ctx.fillRect(px,py,1,1)
    }
  }
  const px = x + Math.floor((world.playerPx.x/16)*(mw/world.width))
  const py = y + Math.floor((world.playerPx.y/16)*(mh/world.height))
  ctx.fillStyle='#fff'; ctx.fillRect(px-1,py-1,3,3)
  const coords = `X:${Math.floor(world.playerPx.x/16)} Y:${Math.floor(world.playerPx.y/16)}`
  ctx.font='12px "VT323", monospace'
  const textWidth = ctx.measureText(coords).width
  const textY = y+mh+18
  ctx.fillStyle='rgba(0,0,0,0.65)'
  ctx.fillRect(x-3, textY-13, textWidth+8, 16)
  ctx.fillStyle='#fff'
  ctx.fillText(coords, x, textY)
}
