import { Input } from '@engine/Input'
import type { IScene } from '@engine/Scene'
import { TILE_SIZE } from '@config/display'
import type { TownDefinition } from '@content/towns/types'
import { renderTown } from '@ui/Town/TownRenderer'

type Facing = 'up'|'down'|'left'|'right'

export class TownScene implements IScene {
  private playerPx:{ x:number; y:number }
  private playerFacing:Facing = 'up'
  private playerMoving = false
  private playerAnim = 0
  private dialogue:string|null = null
  private bounds:{ width:number; height:number }
  private exitTiles:{ x:number; y:number }[]

  constructor(
    private W:number,
    private H:number,
    private town:TownDefinition,
    private onExit:()=>void
  ){
    this.playerPx = {
      x: town.spawn.x * TILE_SIZE,
      y: town.spawn.y * TILE_SIZE
    }
    this.exitTiles = town.exits?.length ? town.exits : [{ ...town.spawn }]
    const widthTiles = Math.max(1, town.tiles[0]?.length ?? 1)
    const heightTiles = Math.max(1, town.tiles.length ?? 1)
    this.bounds = {
      width: widthTiles * TILE_SIZE,
      height: heightTiles * TILE_SIZE
    }
  }

  enter(){}
  exit(){}

  update(dt:number){
    this.applyMovement(dt)
    if (this.dialogue){
      if (Input.consume('confirm') || Input.consume('cancel')){
        this.dialogue = null
      }
      return
    }
    if (Input.consume('confirm')){
      if (this.tryNpcConversation()) return
      if (this.isOnExitTile()){
        this.onExit()
        return
      }
    }
  }

  draw(ctx:CanvasRenderingContext2D){
    renderTown(ctx, this.W, this.H, {
      town:this.town,
      player:{
        x:this.playerPx.x,
        y:this.playerPx.y,
        facing:this.playerFacing,
        moving:this.playerMoving,
        animTime:this.playerAnim
      },
      npcs:this.town.npcs,
      dialogue:this.dialogue ?? undefined,
      nearExit:this.isNearExitTile()
    })
  }

  private applyMovement(dt:number){
    let vx=0, vy=0
    if (Input.isHeld('up')) vy=-1
    if (Input.isHeld('down')) vy=+1
    if (Input.isHeld('left')) vx=-1
    if (Input.isHeld('right')) vx=+1
    const moving = vx!==0 || vy!==0
    if (moving){
      if (Math.abs(vy) >= Math.abs(vx) && vy!==0){
        this.playerFacing = vy<0 ? 'up' : 'down'
      } else if (vx!==0){
        this.playerFacing = vx<0 ? 'left' : 'right'
      }
    }
    const speed = 55
    const nx = this.playerPx.x + vx * speed * dt
    const ny = this.playerPx.y + vy * speed * dt
    const [tileX, tileY] = this.tileAtPx(nx, ny)
    if (this.isWalkable(tileX, tileY)){
      const maxX = Math.max(0, this.bounds.width - TILE_SIZE)
      const maxY = Math.max(0, this.bounds.height - TILE_SIZE)
      this.playerPx.x = clamp(nx, 0, maxX)
      this.playerPx.y = clamp(ny, 0, maxY)
    }
    this.playerMoving = moving
    this.playerAnim = moving ? this.playerAnim + dt : 0
  }

  private isWalkable(x:number, y:number){
    const tile = this.town.tiles[y]?.[x]
    if (tile===undefined) return false
    return tile===0 || tile===1 || tile===6 || this.exitTiles.some(t=>t.x===x && t.y===y)
  }

  private tileAtPx(px:number, py:number):[number, number]{
    const centerX = px + TILE_SIZE/2
    const footY = py + TILE_SIZE - 2
    return [
      Math.floor(centerX / TILE_SIZE),
      Math.floor(footY / TILE_SIZE)
    ]
  }

  private getFacingTile():[number, number]{
    const [cx, cy] = this.tileAtPx(this.playerPx.x, this.playerPx.y)
    if (this.playerFacing==='up') return [cx, cy-1]
    if (this.playerFacing==='down') return [cx, cy+1]
    if (this.playerFacing==='left') return [cx-1, cy]
    return [cx+1, cy]
  }

  private tryNpcConversation(){
    const [tx, ty] = this.getFacingTile()
    const npc = this.town.npcs.find(n=>n.x===tx && n.y===ty)
    if (!npc) return false
    this.dialogue = npc.dialog.join('\n')
    return true
  }

  private isOnExitTile(){
    const [cx, cy] = this.tileAtPx(this.playerPx.x, this.playerPx.y)
    return this.exitTiles.some(tile=>tile.x===cx && tile.y===cy)
  }

  private isNearExitTile(){
    const [cx, cy] = this.tileAtPx(this.playerPx.x, this.playerPx.y)
    return this.exitTiles.some(tile=>Math.abs(cx - tile.x) + Math.abs(cy - tile.y) <= 1)
  }
}

function clamp(value:number, min:number, max:number){
  return Math.max(min, Math.min(max, value))
}
