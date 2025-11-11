import { IScene } from '@engine/Scene'
import { Input } from '@engine/Input'
import { drawBattleChrome } from '@ui/Battle/Chrome'
import { drawBattleRenderer } from '@ui/Battle/BattleRenderer'
import { CombatState } from '@systems/Combat/State'
import { attack, defend, enemyTurn, heal } from '@systems/Combat/Resolve'
import { Hero } from '@systems/Party/Types'
import { gainRewards } from '@systems/Party/Party'

type BattleComplete = (xp:number, gold:number, levelUps:string[])=>void

export class BattleScene implements IScene {
  private done=false
  constructor(
    private W:number,
    private H:number,
    private state:CombatState,
    private party:Hero[],
    private onComplete:BattleComplete
  ){}
  enter(){
    this.state.phase = 'INTRO'
    this.state.cursor.heroIdx = this.nextAliveHero(0)
    this.state.cursor.menuIdx = 0
    this.state.cursor.targetIdx = this.nextAliveEnemy(0)
    this.state.cursor.sub = 'actions'
  }
  exit(){}
  update(_dt:number){
    switch(this.state.phase){
      case 'INTRO':
        if(--this.state.introFrames<=0) this.beginHeroInput()
        break
      case 'HERO_INPUT':
        this.updateHeroMenu()
        break
      case 'TARGET_SELECT':
        this.updateTargeting()
        break
      case 'RESOLVE':
        this.resolvePending()
        break
      case 'ENEMY_TURN':
        enemyTurn(this.state)
        if (this.checkOutcome()) break
        this.beginHeroInput()
        break
      case 'VICTORY':
        if(--this.state.victoryFrames<=0) this.state.phase='SUMMARY'
        break
      case 'DEFEAT':
        this.state.phase='SUMMARY'
        break
      case 'SUMMARY':
        if (Input.consume('confirm')) this.finishBattle()
        break
    }
  }
  draw(ctx:CanvasRenderingContext2D){
    const chrome = drawBattleChrome(ctx, this.W, this.H)
    drawBattleRenderer(ctx, this.state, chrome.outer)
  }
  private beginHeroInput(){
    const idx = this.nextAliveHero(0)
    if (idx===-1){ this.state.phase='DEFEAT'; return }
    this.state.phase = 'HERO_INPUT'
    this.state.cursor.heroIdx = idx
    this.state.cursor.menuIdx = 0
    this.state.cursor.sub = 'actions'
  }
  private updateHeroMenu(){
    if (Input.consume('up')) this.state.cursor.menuIdx = (this.state.cursor.menuIdx+3)%4
    if (Input.consume('down')) this.state.cursor.menuIdx = (this.state.cursor.menuIdx+1)%4
    if (Input.consume('confirm')){
      const menu = this.state.cursor.menuIdx
      if (menu===0){
        this.state.pending={type:'attack'}
        this.state.phase='TARGET_SELECT'
        const seed = typeof this.state.cursor.targetIdx==='number' && this.state.cursor.targetIdx>=0
          ? this.state.cursor.targetIdx
          : this.nextAliveEnemy(0)
        this.state.cursor.targetIdx = seed
      } else if (menu===1){
        defend(this.state, this.state.cursor.heroIdx)
        this.advanceHero()
      } else if (menu===2){
        heal(this.state, this.state.cursor.heroIdx)
        this.advanceHero()
      } else {
        this.state.log.push('Items not implemented')
        this.advanceHero()
      }
    }
  }
  private updateTargeting(){
    const fallback = this.nextAliveEnemy(0)
    let current = typeof this.state.cursor.targetIdx==='number' && this.state.cursor.targetIdx>=0
      ? this.state.cursor.targetIdx
      : fallback
    if (current===-1) current = 0
    if (Input.consume('left') || Input.consume('up')){
      this.state.cursor.targetIdx = this.prevAliveEnemy(current-1)
    }
    if (Input.consume('right') || Input.consume('down')){
      this.state.cursor.targetIdx = this.nextAliveEnemy(current+1)
    }
    if (Input.consume('cancel')){
      this.state.phase='HERO_INPUT'
      return
    }
    if (Input.consume('confirm')){
      this.state.phase='RESOLVE'
    }
  }
  private resolvePending(){
    if (!this.state.pending){ this.advanceHero(); return }
    if (this.state.pending.type==='attack'){
      attack(this.state, this.state.cursor.heroIdx, this.state.cursor.targetIdx)
    }
    this.state.pending=undefined
    if (this.checkOutcome()) return
    this.advanceHero()
  }
  private advanceHero(){
    const next = this.nextAliveHero(this.state.cursor.heroIdx+1)
    if (next===-1){
      this.state.phase='ENEMY_TURN'
    } else {
      this.state.cursor.heroIdx = next
      this.state.cursor.menuIdx = 0
      this.state.phase='HERO_INPUT'
    }
  }
  private nextAliveHero(start:number){
    const heroes = this.state.heroes
    if (!heroes.length) return -1
    for (let i=0;i<heroes.length;i++){
      const idx = this.wrap(start+i, heroes.length)
      if (heroes[idx]?.alive) return idx
    }
    return -1
  }
  private nextAliveEnemy(start:number){
    const enemies=this.state.enemies
    if (!enemies.length) return -1
    for (let i=0;i<enemies.length;i++){
      const idx = this.wrap(start+i, enemies.length)
      if (enemies[idx]?.alive) return idx
    }
    return -1
  }
  private prevAliveEnemy(start:number){
    const enemies=this.state.enemies
    if (!enemies.length) return -1
    for (let i=0;i<enemies.length;i++){
      const idx = this.wrap(start-i, enemies.length)
      if (enemies[idx]?.alive) return idx
    }
    return -1
  }
  private wrap(value:number, len:number){
    return ((value%len)+len)%len
  }
  private checkOutcome(){
    if (this.state.enemies.every(e=>!e.alive)){
      this.state.phase='VICTORY'
      this.state.victoryFrames = Math.max(1,this.state.victoryFrames)
      this.state.log.push('Victory!')
      return true
    }
    if (this.state.heroes.every(h=>!h.alive)){
      this.state.phase='DEFEAT'
      this.state.log.push('The party falls...')
      return true
    }
    return false
  }
  private finishBattle(){
    if (this.done) return
    this.done=true
    this.syncPartyFromState()
    const xp=this.state.reward.xp
    const gold=this.state.reward.gold
    const ups = gainRewards(this.party, xp, this.state.killXp)
    this.onComplete(xp,gold,ups)
  }
  private syncPartyFromState(){
    const battlers = new Map(this.state.heroes.map(b=>[b.id,b]))
    for (const hero of this.party){
      const b = battlers.get(hero.id)
      if (!b) continue
      hero.hp = Math.max(0, Math.min(b.hp, hero.base.hp))
      hero.alive = b.alive
    }
  }
}
