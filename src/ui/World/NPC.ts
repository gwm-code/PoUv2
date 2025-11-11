export function drawNPCBubble(ctx:CanvasRenderingContext2D, text:string, W:number, H:number){
  const bx=W/2-120, by=H-60, bw=240, bh=40
  ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(bx,by,bw,bh); ctx.strokeStyle='#bbb'; ctx.strokeRect(bx,by,bw,bh)
  ctx.fillStyle='#fff'; ctx.font='14px "VT323", monospace'; ctx.fillText(text, bx+10, by+24)
}
