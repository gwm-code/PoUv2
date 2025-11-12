import { useEffect } from 'react'

/**
 * Registers global keyboard listeners while the hook is active.
 */
export function useKeyboardInput(
  onKeyDown: (event: KeyboardEvent) => void,
  onKeyUp: (event: KeyboardEvent) => void,
  active: boolean
): void {
  useEffect(() => {
    if (!active) return

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [onKeyDown, onKeyUp, active])
}
