import { IScene } from '@engine/Scene'
import { WorldState } from '@systems/World/WorldState'
import { makeEncounter } from '@systems/Combat/Factory'
import { Hero } from '@systems/Party/Types'
import { BattleScene } from './BattleScene'
import { WorldController } from '@systems/World/Controller'
import { createWorldUIState, WorldUIState } from '@systems/World/UIState'
import { renderWorld } from '@ui/World/WorldRenderer'
import { type Bag } from '@systems/Inventory/Inventory'
import { computeHeroStats } from '@systems/Party/HeroStats'

export class WorldScene implements IScene {
  private controller:WorldController
  private ui:WorldUIState = createWorldUIState()
  constructor(
    private W:number,
    private H:number,
    private world: WorldState,
    private party: Hero[],
    private bag: Bag,
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
      let lineup = this.party.filter(h=>h.active !== false)
      if (!lineup.length){
        lineup = this.party.slice(0,3)
      } else if (lineup.length>3){
        lineup = lineup.slice(0,3)
      }
      enc.heroes = lineup.map(h=>{
        const derived = computeHeroStats(h)
        const hp = Math.min(h.hp, derived.hp)
        const mp = Math.min(h.mp, derived.mp)
        h.hp = hp
        h.mp = mp
        return {
          id:h.id,
          name:h.name,
          team:'heroes',
          hp,
          maxHp:derived.hp,
          mp,
          maxMp:derived.mp,
          atk:derived.atk,
          agi:derived.agi,
          alive:h.alive,
          atb:0
        }
      })
      this.pushBattle(new BattleScene(this.W,this.H,enc,this.party,this.bag,(xp,gold,ups)=>{
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
