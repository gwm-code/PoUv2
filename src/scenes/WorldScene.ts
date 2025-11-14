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
import { averageTopHeroesLevel } from '@systems/Party/Party'

interface TransitionContext {
  world: WorldState
  ui: WorldUIState
}

export class WorldScene implements IScene {
  private controller:WorldController
  private ui:WorldUIState = createWorldUIState()
  constructor(
    private W:number,
    private H:number,
    private world: WorldState,
    private party: Hero[],
    private bag: Bag,
    private beginBattleTransition:(battle:BattleScene, ctx:TransitionContext)=>void,
    private popBattle:()=>void,
    private manualEncounterSwitch:()=>boolean,
    private enterTown:(townId:string)=>void,
    private enterDungeon:(dungeonId:string)=>void
  ){
    this.controller = new WorldController(world)
  }
  enter(){}
  exit(){}
  update(dt:number){
    const manualMode = this.manualEncounterSwitch()
    const result = this.controller.update(dt, this.ui, { manualEncounters: manualMode })
    if (typeof result.talkText !== 'undefined'){
      this.ui.talkText = result.talkText
    }
    if (result.enterTownId){
      this.ui.talkText = null
      this.enterTown(result.enterTownId)
      return
    }
    if (result.enterDungeonId){
      this.ui.talkText = null
      this.enterDungeon(result.enterDungeonId)
      return
    }
    const battleRequested = manualMode ? result.manualBattleRequested : result.encounterTriggered
    if (battleRequested){
      const partyLevel = averageTopHeroesLevel(this.party)
      const playerTile = this.world.playerTile()
      const tileType = this.world.tile[playerTile[1]]?.[playerTile[0]]
      const enc = makeEncounter(partyLevel, tileType)
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
      const battle = new BattleScene(this.W,this.H,enc,this.party,this.bag,(xp,gold,ups)=>{
        this.ui.equipOpen=false
        this.ui.shopOpen=false
        this.ui.talkText=null
        this.popBattle()
      })
      this.beginBattleTransition(battle, { world:this.world, ui:this.ui })
    }
  }
  draw(ctx:CanvasRenderingContext2D){
    renderWorld(ctx, this.W, this.H, this.world, this.ui)
  }
}
