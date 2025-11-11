import { IScene } from './Scene'
import { Input } from './Input'
export class Game {
  private stack: IScene[] = []
  constructor(public readonly W:number, public readonly H:number){}
  push(scene: IScene){ this.stack.push(scene); scene.enter() }
  pop(){ const s=this.stack.pop(); s?.exit() }
  replace(scene: IScene){ const s=this.stack.pop(); s?.exit(); this.stack.push(scene); scene.enter() }
  update(dt:number){ this.top()?.update(dt); Input.flush() }
  draw(ctx:CanvasRenderingContext2D){ this.top()?.draw(ctx) }
  onKeyDown(e:KeyboardEvent){ this.top()?.onKeyDown?.(e) }
  onKeyUp(e:KeyboardEvent){ this.top()?.onKeyUp?.(e) }
  private top(){ return this.stack[this.stack.length-1] }
}
