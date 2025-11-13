import { useEffect, useRef, useState, type RefObject } from 'react'

interface CanvasHookResult {
  canvasRef: RefObject<HTMLCanvasElement>
  containerRef: RefObject<HTMLDivElement>
  ctx: CanvasRenderingContext2D | null
}

type ScaleMode = 'fit' | 'fill' | number

interface CanvasHookOptions {
  scaleMode?: ScaleMode
}

/**
 * Handles fixed-resolution canvas sizing and integer CSS scaling.
 */
export function useCanvas(width: number, height: number, options: CanvasHookOptions = {}): CanvasHookResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const scaleMode = options.scaleMode ?? 'fit'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return
    context.imageSmoothingEnabled = false
    setCtx(context)

    const resize = () => {
      if (!canvas) return
      const parent = containerRef.current ?? canvas.parentElement
      if (scaleMode === 'fit') {
        if (!parent) return
        const scaleX = Math.floor(parent.clientWidth / width)
        const scaleY = Math.floor(parent.clientHeight / height)
        const scale = Math.max(1, Math.min(scaleX || 0, scaleY || 0))
        const applied = scale <= 1 ? 1 : scale
        canvas.style.width = `${width * applied}px`
        canvas.style.height = `${height * applied}px`
      } else if (scaleMode === 'fill') {
        if (!parent) return
        canvas.style.width = `${parent.clientWidth}px`
        canvas.style.height = `${parent.clientHeight}px`
      } else {
        const scale = Math.max(1, scaleMode)
        canvas.style.width = `${width * scale}px`
        canvas.style.height = `${height * scale}px`
      }
      ;['pixelated', 'crisp-edges'].forEach(v => {
        ;(canvas.style as any).setProperty('image-rendering', v)
      })
    }

    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [width, height, scaleMode])

  return { canvasRef, containerRef, ctx }
}
