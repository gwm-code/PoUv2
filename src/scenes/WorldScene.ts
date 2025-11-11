import { IScene } from '@engine/Scene'
import { WorldState } from '@systems/World/WorldState'
import { makeEncounter } from '@systems/Combat/Factory'
import { Hero } from '@systems/Party/Types'
import { BattleScene } from './BattleScene'
import { WorldController } from '@systems/World/Controller'
import { createWorldUIState, WorldUIState } from '@systems/World/UIState'
import { renderWorld } from '@ui/World/WorldRenderer'

export class WorldScene implements IScene {
  private controller:WorldController
  private ui:WorldUIState = createWorldUIState()
  constructor(
    private W:number,
    private H:number,
    private world: WorldState,
    private party: Hero[],
    private pushBattle:(s:BattleScene)=>void,
    private popBattle:()=>void
  ){
    this.controller = new WorldController(world)
  }
  enter(){}
  exit(){}
  update(dt:number){
    const result = this.controller.update(dt, this.ui)
    if (result.encounterTriggered){
      const enc = makeEncounter()
      enc.heroes = this.party.map(h=>({ id:h.id, name:h.name, team:'heroes', hp:h.hp, maxHp:h.base.hp, atk:h.base.atk, agi:h.base.agi, alive:h.alive, atb:0 }))
      this.pushBattle(new BattleScene(this.W,this.H,enc,this.party,(xp,gold,ups)=>{
        this.ui.equipOpen=false
        this.ui.shopOpen=false
        this.ui.talkText=null
        this.popBattle()
      }))
    }
    if (typeof result.talkText !== 'undefined'){
      this.ui.talkText = result.talkText
    }
  }
  draw(ctx:CanvasRenderingContext2D){
    renderWorld(ctx, this.W, this.H, this.world, this.ui)
  }
}
