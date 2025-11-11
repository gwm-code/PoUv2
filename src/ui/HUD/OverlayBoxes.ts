export function drawBox(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number, title?:string){
  ctx.fillStyle='rgba(0,0,0,0.9)'; ctx.fillRect(x,y,w,h)
  ctx.strokeStyle='#bbb'; ctx.strokeRect(x,y,w,h)
  if (title){ ctx.fillStyle='#888'; ctx.font='14px "VT323", monospace'; ctx.fillText(title, x+8, y+18) }
}
