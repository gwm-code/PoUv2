export function drawVictoryBanner(ctx:CanvasRenderingContext2D, W:number, H:number){
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H)
  ctx.fillStyle='#0f0'; ctx.font='24px "VT323", monospace'; ctx.fillText('VICTORY!', W/2-50, H/2)
}
export function drawSummary(ctx:CanvasRenderingContext2D, W:number, H:number, xp:number, gold:number){
  ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(0,0,W,H)
  ctx.fillStyle='#fff'; ctx.font='16px "VT323", monospace'
  ctx.fillText('Battle Results', W/2-50, H/2-20)
  ctx.fillText(`XP: ${xp}   Gold: ${gold}`, W/2-60, H/2+4)
  ctx.fillText('(Press Enter)', W/2-40, H/2+28)
}
