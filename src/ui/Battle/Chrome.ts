// Accept both call styles: drawBattleChrome(ctx, W, H) or drawBattleChrome(W, H, ctx)
export function drawBattleChrome(a: any, b: any, c: any) {
  let ctx: CanvasRenderingContext2D;
  let W: number;
  let H: number;

  // If first arg looks like a CanvasRenderingContext2D (has strokeRect)
  if (a && typeof a.strokeRect === 'function') {
    ctx = a as CanvasRenderingContext2D;
    W = Number(b);
    H = Number(c);
  } else {
    // Assume (W, H, ctx)
    W = Number(a);
    H = Number(b);
    ctx = c as CanvasRenderingContext2D;
  }

  const margin = Math.max(6, Math.floor(Math.min(W, H) * 0.03))
  const outer = { x: margin, y: margin, w: W - margin*2, h: H - margin*2 };
  ctx.strokeStyle = 'rgba(216,194,255,0.6)';
  (ctx as any).lineWidth = 2;
  ctx.strokeRect(outer.x, outer.y, outer.w, outer.h);
  return { outer };
}
