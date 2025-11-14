export function drawNPCBubble(ctx:CanvasRenderingContext2D, text:string, W:number, H:number){
  const lines = text.split('\n')
  const lineHeight = 16
  ctx.save()
  ctx.font='14px "VT323", monospace'
  const maxWidth = Math.max(180, ...lines.map(line=>ctx.measureText(line).width))
  const bh = lineHeight*lines.length + 12
  const bw = maxWidth + 20
  const bx=W/2-bw/2
  const by=H-70
  ctx.fillStyle='rgba(0,0,0,0.85)'
  ctx.fillRect(bx,by,bw,bh)
  ctx.strokeStyle='#bbb'
  ctx.strokeRect(bx,by,bw,bh)
  ctx.fillStyle='#fff'
  lines.forEach((line, idx)=>{
    ctx.fillText(line, bx+10, by+20 + idx*lineHeight)
  })
  ctx.restore()
}
