import { IScene } from '@engine/Scene'
import { Input } from '@engine/Input'
import type { DungeonDefinition } from '@content/dungeons/types'
import { DungeonTiles, WALKABLE_DUNGEON_TILES } from '@content/dungeons/types'
import type { Hero } from '@systems/Party/Types'
import type { Bag } from '@systems/Inventory/Inventory'
import { renderDungeon } from '@ui/Dungeon/DungeonRenderer'
import { averageTopHeroesLevel } from '@systems/Party/Party'
import { computeHeroStats } from '@systems/Party/HeroStats'
import { makeEncounter } from '@systems/Combat/Factory'
import { BattleScene } from './BattleScene'

const TILE_SIZE = 16

export class DungeonScene implements IScene {
  private playerPx = { x:0, y:0 }
  private facing:'up'|'down'|'left'|'right' = 'up'
  private moving = false
  private animTime = 0
  private stepPixelsAcc = 0
  private nextEncounterSteps = 0
  private readonly mapPixelWidth:number
  private readonly mapPixelHeight:number

  constructor(
    private W:number,
    private H:number,
    private dungeon:DungeonDefinition,
    private party:Hero[],
    private bag:Bag,
    private pushBattle:(battle:BattleScene)=>void,
    private popBattle:()=>void,
    private manualEncounterSwitch:()=>boolean,
    private onExit:()=>void
  ){
    this.playerPx = {
      x: this.dungeon.spawn.x * TILE_SIZE,
      y: this.dungeon.spawn.y * TILE_SIZE
    }
    this.mapPixelWidth = (this.dungeon.tiles[0]?.length ?? 0) * TILE_SIZE
    this.mapPixelHeight = this.dungeon.tiles.length * TILE_SIZE
    this.rollNextEncounter()
  }

  enter(){}
  exit(){}

  update(dt:number){
    const manualMode = this.manualEncounterSwitch()
    const confirmPressed = Input.consume('confirm')
    this.applyMovement(dt, manualMode)
    if (confirmPressed){
      if (this.isOnExitTile()){
        this.close()
        return
      }
      if (manualMode){
        this.triggerBattle()
        return
      }
    }
    if (!manualMode && this.nextEncounterSteps<=0){
      this.triggerBattle()
    }
  }

  draw(ctx:CanvasRenderingContext2D){
    renderDungeon(ctx, this.W, this.H, {
      dungeon:this.dungeon,
      player:{
        x:this.playerPx.x,
        y:this.playerPx.y,
        facing:this.facing,
        moving:this.moving,
        animTime:this.animTime
      },
      nearExit:this.isNearExitTile(),
      manualMode:this.manualEncounterSwitch()
    })
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
        this.facing = vy<0 ? 'up' : 'down'
      } else if (vx!==0){
        this.facing = vx<0 ? 'left' : 'right'
      }
    }
    this.moving = moving
    this.animTime = moving ? this.animTime + dt : 0
    if (!moving) return
    const speed = 48
    const prevX = this.playerPx.x
    const prevY = this.playerPx.y
    let nextX = prevX
    let nextY = prevY
    if (vx!==0){
      const proposed = clamp(prevX + vx*speed*dt, 0, Math.max(0, this.mapPixelWidth - TILE_SIZE))
      if (this.canOccupy(proposed, nextY)){
        nextX = proposed
      }
    }
    if (vy!==0){
      const proposed = clamp(prevY + vy*speed*dt, 0, Math.max(0, this.mapPixelHeight - TILE_SIZE))
      if (this.canOccupy(nextX, proposed)){
        nextY = proposed
      }
    }
    const dx = nextX - prevX
    const dy = nextY - prevY
    if (dx===0 && dy===0) return
    this.playerPx.x = nextX
    this.playerPx.y = nextY
    this.stepPixelsAcc += Math.abs(dx)+Math.abs(dy)
    while (!manualMode && this.stepPixelsAcc >= TILE_SIZE){
      this.stepPixelsAcc -= TILE_SIZE
      this.nextEncounterSteps--
    }
  }

  private canOccupy(px:number, py:number){
    const inset = 2
    const corners:[number, number][] = [
      [px+inset, py+inset],
      [px+TILE_SIZE-inset, py+inset],
      [px+inset, py+TILE_SIZE-inset],
      [px+TILE_SIZE-inset, py+TILE_SIZE-inset]
    ]
    for (const [cx, cy] of corners){
      const [tileX, tileY] = this.tileAtPx(cx, cy)
      if (!this.isWalkableTile(tileX, tileY)) return false
    }
    return true
  }

  private isWalkableTile(x:number, y:number){
    const tile = this.dungeon.tiles[y]?.[x]
    if (tile === undefined) return false
    return tile === DungeonTiles.Floor || tile === DungeonTiles.Exit
  }

  private tileAtPx(px:number, py:number):[number, number]{
    const clampedX = clamp(px, 0, Math.max(0, this.mapPixelWidth - 1))
    const clampedY = clamp(py, 0, Math.max(0, this.mapPixelHeight - 1))
    return [
      Math.floor(clampedX / TILE_SIZE),
      Math.floor(clampedY / TILE_SIZE)
    ]
  }

  private triggerBattle(){
    const partyLevel = averageTopHeroesLevel(this.party)
    const encounter = makeEncounter(partyLevel, this.dungeon.tileType)
    let lineup = this.party.filter(h=>h.active !== false)
    if (!lineup.length){
      lineup = this.party.slice(0,3)
    } else if (lineup.length>3){
      lineup = lineup.slice(0,3)
    }
    encounter.heroes = lineup.map(h=>{
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
    const battle = new BattleScene(this.W, this.H, encounter, this.party, this.bag, ()=>{
      this.popBattle()
      this.rollNextEncounter()
    })
    this.pushBattle(battle)
  }

  private rollNextEncounter(){
    const [min,max] = this.dungeon.encounterSteps
    const span = Math.max(0, max-min)
    this.nextEncounterSteps = min + Math.floor(Math.random()*(span+1))
    this.stepPixelsAcc = 0
  }

  private isOnExitTile(){
    const [x,y] = this.tileAtPx(this.playerPx.x + TILE_SIZE/2, this.playerPx.y + TILE_SIZE - 2)
    return this.dungeon.tiles[y]?.[x] === DungeonTiles.Exit
  }

  private isNearExitTile(){
    const [x,y] = this.tileAtPx(this.playerPx.x + TILE_SIZE/2, this.playerPx.y + TILE_SIZE - 2)
    return this.dungeon.exits.some(exit=>Math.abs(exit.x - x) + Math.abs(exit.y - y) <= 1)
  }

  private close(){
    this.onExit()
  }
}

function clamp(value:number, min:number, max:number){
  return Math.max(min, Math.min(max, value))
}
