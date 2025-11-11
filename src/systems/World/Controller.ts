import { Input } from '@engine/Input'
import { WorldState } from './WorldState'
import { WorldUIState } from './UIState'
import { WorldEventResult, handleTileInteraction } from './Events'

export interface WorldUpdateResult {
  encounterTriggered?: boolean
  talkText?: string|null
}

export class WorldController {
  private stepPixelsAcc=0
  private nextEncounterSteps=0
  constructor(
    private world:WorldState
  ){
    this.rollNextEncounter()
  }
  update(dt:number, ui:WorldUIState): WorldUpdateResult {
    const res:WorldUpdateResult = {}
    this.applyMovement(dt)
    this.handleUiToggles(ui, res)
    if (this.nextEncounterSteps<=0){
      res.encounterTriggered = true
      this.rollNextEncounter()
    }
    return res
  }
  private applyMovement(dt:number){
    let vx=0, vy=0
    if (Input.isHeld('up')) vy=-1
    if (Input.isHeld('down')) vy=+1
    if (Input.isHeld('left')) vx=-1
    if (Input.isHeld('right')) vx=+1
    const speed = this.world.speed
    const nx = this.world.playerPx.x + vx*speed*dt
    const ny = this.world.playerPx.y + vy*speed*dt
    const nextTile = this.world.tileAtPx(nx, ny)
    if (this.world.isWalkable(nextTile[0], nextTile[1])){
      const dx = nx - this.world.playerPx.x
      const dy = ny - this.world.playerPx.y
      this.world.playerPx.x = nx; this.world.playerPx.y = ny
      this.stepPixelsAcc += Math.abs(dx)+Math.abs(dy)
      while (this.stepPixelsAcc >= 16){
        this.stepPixelsAcc -= 16
        this.nextEncounterSteps--
      }
    }
  }
  private handleUiToggles(ui:WorldUIState, res:WorldUpdateResult){
    if (Input.consume('minimap')) this.world.minimapMode=(this.world.minimapMode+1)%3
    if (Input.consume('equip')) ui.equipOpen=!ui.equipOpen
    if (Input.consume('shop')) ui.shopOpen=!ui.shopOpen
    if (Input.consume('confirm')){
      const ev = handleTileInteraction(this.world, ui)
      this.applyEvent(ev, ui, res)
    }
    if (Input.consume('cancel')){
      ui.talkText=null
      res.talkText=null
    }
  }
  private applyEvent(ev:WorldEventResult|undefined, ui:WorldUIState, res:WorldUpdateResult){
    if (!ev) return
    if (typeof ev.talkText !== 'undefined'){
      ui.talkText = ev.talkText
      res.talkText = ev.talkText
    }
    if (ev.toggleShop) ui.shopOpen=!ui.shopOpen
  }
  private rollNextEncounter(){
    const [min,max] = this.world.encounterRange()
    const span = Math.max(0, max-min)
    this.nextEncounterSteps = min + Math.floor(Math.random()*(span+1))
  }
}
