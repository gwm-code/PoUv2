export interface IScene {
  enter(): void
  exit(): void
  update(dt: number): void
  draw(ctx: CanvasRenderingContext2D): void
  onKeyDown?(e: KeyboardEvent): void
  onKeyUp?(e: KeyboardEvent): void
}
