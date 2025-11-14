import { Input } from '@engine/Input'
import { WorldState } from './WorldState'
import { WorldUIState } from './UIState'
import { WorldEventResult, handleTileInteraction } from './Events'

export interface WorldUpdateResult {
  encounterTriggered?: boolean
  talkText?: string|null
  manualBattleRequested?: boolean
  enterTownId?: string
  enterDungeonId?: string
}

interface WorldControllerOptions {
  manualEncounters?: boolean
}

export class WorldController {
  private static readonly TILE_SIZE = 16
  private stepPixelsAcc=0
  private nextEncounterSteps=0
  constructor(
    private world:WorldState
  ){
    this.rollNextEncounter()
  }
  update(dt:number, ui:WorldUIState, options:WorldControllerOptions = {}): WorldUpdateResult {
    const res:WorldUpdateResult = {}
    const manualMode = !!options.manualEncounters
    this.applyMovement(dt, manualMode)
    this.handleUiToggles(ui, res, manualMode)
    if (!manualMode && this.nextEncounterSteps<=0){
      res.encounterTriggered = true
      this.rollNextEncounter()
    }
    return res
  }
  private applyMovement(dt:number, manualMode:boolean){
    let vx=0, vy=0
    if (Input.isHeld('up')) vy=-1
    if (Input.isHeld('down')) vy=+1
    if (Input.isHeld('left')) vx=-1
    if (Input.isHeld('right')) vx=+1
    const moving = vx!==0 || vy!==0
    if (moving){
      if (Math.abs(vy) >= Math.abs(vx) && vy!==0){
        this.world.playerFacing = vy<0 ? 'up' : 'down'
      } else if (vx!==0){
        this.world.playerFacing = vx<0 ? 'left' : 'right'
      }
    }
    this.world.playerMoving = moving
    if (moving){
      this.world.playerAnimTime += dt
    } else {
      this.world.playerAnimTime = 0
    }
    const speed = this.world.speed
    const prevX = this.world.playerPx.x
    const prevY = this.world.playerPx.y
    let nextX = prevX
    let nextY = prevY
    if (vx!==0){
      const proposedX = clamp(prevX + vx*speed*dt, 0, (this.world.width-1)*WorldController.TILE_SIZE)
      if (this.canOccupy(proposedX, nextY)){
        nextX = proposedX
      }
    }
    if (vy!==0){
      const proposedY = clamp(prevY + vy*speed*dt, 0, (this.world.height-1)*WorldController.TILE_SIZE)
      if (this.canOccupy(nextX, proposedY)){
        nextY = proposedY
      }
    }
    const dx = nextX - prevX
    const dy = nextY - prevY
    if (dx!==0 || dy!==0){
      this.world.playerPx.x = nextX
      this.world.playerPx.y = nextY
      this.stepPixelsAcc += Math.abs(dx)+Math.abs(dy)
      while (this.stepPixelsAcc >= WorldController.TILE_SIZE){
        this.stepPixelsAcc -= WorldController.TILE_SIZE
        if (!manualMode){
          this.nextEncounterSteps--
        }
      }
    }
  }
  private handleUiToggles(ui:WorldUIState, res:WorldUpdateResult, manualMode:boolean){
    if (Input.consume('minimap')) this.world.minimapMode=(this.world.minimapMode+1)%3
    if (Input.consume('equip')) ui.equipOpen=!ui.equipOpen
    if (Input.consume('shop')) ui.shopOpen=!ui.shopOpen
    if (Input.consume('confirm')){
      const ev = handleTileInteraction(this.world, ui)
      const eventHandled = this.applyEvent(ev, ui, res)
      if (manualMode && !eventHandled){
        res.manualBattleRequested = true
      }
    }
    if (Input.consume('cancel')){
      ui.talkText=null
      res.talkText=null
    }
  }
  private applyEvent(ev:WorldEventResult|undefined, ui:WorldUIState, res:WorldUpdateResult){
    if (!ev) return false
    if (typeof ev.talkText !== 'undefined'){
      ui.talkText = ev.talkText
      res.talkText = ev.talkText
    }
    if (ev.toggleShop) ui.shopOpen=!ui.shopOpen
    if (ev.enterTownId){
      res.enterTownId = ev.enterTownId
    }
    if (ev.enterDungeonId){
      res.enterDungeonId = ev.enterDungeonId
    }
    return true
  }
  private rollNextEncounter(){
    const [min,max] = this.world.encounterRange()
    const span = Math.max(0, max-min)
    this.nextEncounterSteps = min + Math.floor(Math.random()*(span+1))
  }

  private canOccupy(px:number, py:number){
    const inset = 2
    const maxX = (this.world.width)*WorldController.TILE_SIZE - inset - 1
    const maxY = (this.world.height)*WorldController.TILE_SIZE - inset - 1
    if (px< -inset || py< -inset || px>maxX || py>maxY) return false
    const corners:[number,number][] = [
      [px+inset, py+inset],
      [px+WorldController.TILE_SIZE-inset, py+inset],
      [px+inset, py+WorldController.TILE_SIZE-inset],
      [px+WorldController.TILE_SIZE-inset, py+WorldController.TILE_SIZE-inset]
    ]
    for (const [cx, cy] of corners){
      const [tx, ty] = this.world.tileAtPx(cx, cy)
      if (!this.world.isWalkable(tx, ty)) return false
    }
    return true
  }
}

function clamp(value:number, min:number, max:number){
  return Math.max(min, Math.min(max, value))
}
