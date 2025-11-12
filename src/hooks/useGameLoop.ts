import { useEffect, useRef } from 'react'
import type { Game } from '@engine/Game'

/**
 * Runs the requestAnimationFrame loop, updating and drawing the game.
 */
export function useGameLoop(
  ctx: CanvasRenderingContext2D | null,
  game: Game | null,
  shouldUpdate: boolean
): void {
  const lastTimeRef = useRef<number>(performance.now())

  useEffect(() => {
    if (!ctx || !game) return

    let rafId = 0
    lastTimeRef.current = performance.now()

    const loop = () => {
      const now = performance.now()
      const dt = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      if (shouldUpdate) {
        game.update(dt)
      }

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      game.draw(ctx)
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [ctx, game, shouldUpdate])
}
