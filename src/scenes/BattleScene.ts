import { IScene } from '@engine/Scene'
import { Input } from '@engine/Input'
import { drawBattleChrome } from '@ui/Battle/Chrome'
import { drawBattleRenderer } from '@ui/Battle/BattleRenderer'
import { clearBattleHudState } from '@ui/Battle/hudState'
import { CombatState } from '@systems/Combat/State'
import { attack, enemyTurn, useAbility, useItem } from '@systems/Combat/Resolve'
import { Hero } from '@systems/Party/Types'
import { gainRewards } from '@systems/Party/Party'
import { getAbilityById, abilityTargetTeam, getHeroAbilitiesByCategory } from '@systems/Combat/AbilityData'
import { getItemById, itemTargetTeam } from '@systems/Combat/ItemData'
import { Inventory, type Bag } from '@systems/Inventory/Inventory'

type BattleComplete = (xp:number, gold:number, levelUps:string[])=>void
const PRIMARY_MENU = ['Attack','Skills','Spells','Items'] as const

export class BattleScene implements IScene {
  private done=false
  constructor(
    private W:number,
    private H:number,
    private state:CombatState,
    private party:Hero[],
    private bag:Bag,
    private onComplete:BattleComplete
  ){}
  enter(){
    this.state.phase = 'INTRO'
    this.state.cursor.heroIdx = this.nextAliveHero(0)
    this.state.cursor.menuIdx = 0
    this.state.cursor.targetIdx = this.nextAliveEnemy(0)
    this.state.cursor.sub = 'actions'
    this.resetHeroMenu()
    this.syncItemsFromBag()
  }
  exit(){
    clearBattleHudState()
  }
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
    this.state.cursor.targetTeam = 'enemies'
    this.resetHeroMenu()
    this.state.prompt = undefined
  }
  private updateHeroMenu(){
    const mode = this.state.commandMode ?? 'primary'
    if (mode === 'primary'){
      const count = PRIMARY_MENU.length
      if (count){
        if (Input.consume('up')) this.state.cursor.menuIdx = this.wrap(this.state.cursor.menuIdx - 1, count)
        if (Input.consume('down')) this.state.cursor.menuIdx = this.wrap(this.state.cursor.menuIdx + 1, count)
      }
      if (Input.consume('right') || Input.consume('confirm')){
        this.handlePrimarySelection(this.state.cursor.menuIdx)
      }
      return
    }

    const commands = this.state.commands ?? []
    const count = commands.length
    if (Input.consume('left')){
      this.resetHeroMenu()
      return
    }
    if (count){
      if (Input.consume('up')) this.state.cursor.menuIdx = this.wrap(this.state.cursor.menuIdx - 1, count)
      if (Input.consume('down')) this.state.cursor.menuIdx = this.wrap(this.state.cursor.menuIdx + 1, count)
    } else {
      this.state.cursor.menuIdx = 0
    }
    if (Input.consume('confirm')){
      const entry = commands[this.state.cursor.menuIdx]
      if (!entry){
        this.state.log.push(mode==='items' ? 'No usable items' : 'No abilities ready')
        return
      }
      if (entry.disabled){
        this.state.log.push('Not enough MP')
        return
      }
      if (entry.type==='ability'){
        this.handleAbilitySelection(entry.id)
      } else {
        this.handleItemSelection(entry.id)
      }
    }
  }
  private updateTargeting(){
    const team = this.state.cursor.targetTeam ?? 'enemies'
    const list = team==='heroes' ? this.state.heroes : this.state.enemies
    let fallback = team==='heroes' ? this.nextAliveHero(0) : this.nextAliveEnemy(0)
    if (fallback===-1) fallback = 0
    let current = typeof this.state.cursor.targetIdx==='number' && this.state.cursor.targetIdx>=0
      ? this.state.cursor.targetIdx
      : fallback
    if (team==='heroes'){
      if (Input.consume('left') || Input.consume('up')){
        this.state.cursor.targetIdx = this.prevAliveHero(current-1)
      }
      if (Input.consume('right') || Input.consume('down')){
        this.state.cursor.targetIdx = this.nextAliveHero(current+1)
      }
    } else {
      if (Input.consume('left') || Input.consume('up')){
        this.state.cursor.targetIdx = this.prevAliveEnemy(current-1)
      }
      if (Input.consume('right') || Input.consume('down')){
        this.state.cursor.targetIdx = this.nextAliveEnemy(current+1)
      }
    }
    if (!list[this.state.cursor.targetIdx]){
      this.state.cursor.targetIdx = fallback
    }
    if (Input.consume('cancel')){
      this.state.pending=undefined
      this.state.phase='HERO_INPUT'
      this.state.prompt=undefined
      return
    }
    if (Input.consume('confirm')){
      this.state.phase='RESOLVE'
      this.state.prompt=undefined
    }
  }
  private resolvePending(){
    if (!this.state.pending){ this.advanceHero(); return }
    if (this.state.pending.type==='ability' && this.state.pending.abilityId){
      useAbility(this.state, this.state.cursor.heroIdx, this.state.cursor.targetIdx, this.state.pending.targetTeam ?? 'enemies', this.state.pending.abilityId)
    } else if (this.state.pending.type==='item' && this.state.pending.itemId){
      const success = useItem(this.state, this.state.cursor.heroIdx, this.state.cursor.targetIdx, this.state.pending.targetTeam ?? 'heroes', this.state.pending.itemId, this.bag)
      if (success){
        this.syncItemsFromBag()
        if (this.state.commandMode==='items'){
          this.state.commands = this.buildItemCommands()
          const maxIdx = Math.max(0, this.state.commands.length-1)
          this.state.cursor.menuIdx = Math.min(this.state.cursor.menuIdx, maxIdx)
        }
      }
    } else if (this.state.pending.type==='attack'){
      attack(this.state, this.state.cursor.heroIdx, this.state.cursor.targetIdx)
    }
    this.state.pending=undefined
    if (this.checkOutcome()) return
    this.advanceHero()
  }
  private advanceHero(){
    const next = this.nextAliveHero(this.state.cursor.heroIdx+1, false)
    if (next===-1){
      this.state.phase='ENEMY_TURN'
    } else {
      this.state.cursor.heroIdx = next
      this.state.cursor.menuIdx = 0
      this.state.cursor.sub = 'actions'
      this.resetHeroMenu()
      this.state.prompt = undefined
      this.state.phase='HERO_INPUT'
    }
  }
  private nextAliveHero(start:number, wrap=true){
    const heroes = this.state.heroes
    if (!heroes.length) return -1
    if (wrap){
      for (let i=0;i<heroes.length;i++){
        const idx = this.wrap(start+i, heroes.length)
        if (heroes[idx]?.alive) return idx
      }
      return -1
    }
    for (let idx=Math.max(0,start); idx<heroes.length; idx++){
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
  private prevAliveHero(start:number){
    const heroes=this.state.heroes
    if (!heroes.length) return -1
    for (let i=0;i<heroes.length;i++){
      const idx = this.wrap(start-i, heroes.length)
      if (heroes[idx]?.alive) return idx
    }
    return -1
  }
  private wrap(value:number, len:number){
    return ((value%len)+len)%len
  }
  private handlePrimarySelection(index:number){
    if (!PRIMARY_MENU.length) return
    const normalized = this.wrap(index, PRIMARY_MENU.length)
    const choice = PRIMARY_MENU[normalized]
    switch(choice){
      case 'Attack':
        this.prepareAttack()
        break
      case 'Skills':
        this.openAbilityMenu('skill')
        break
      case 'Spells':
        this.openAbilityMenu('spell')
        break
      case 'Items':
        this.openItemMenu()
        break
    }
  }
  private prepareAttack(){
    this.state.pending = { type:'attack', label:'Attack', targetTeam:'enemies' }
    this.prepareTargeting('enemies', 'Attack')
  }
  private openAbilityMenu(category:'skill'|'spell'){
    const commands = this.buildAbilityCommands(this.state.cursor.heroIdx, category)
    if (!commands.length){
      this.state.log.push(category==='skill' ? 'No skills learned yet.' : 'No spells prepared.')
      return
    }
    this.state.commandMode = category==='skill' ? 'skills' : 'spells'
    this.state.cursor.sub='actions'
    this.state.commands = commands
    this.state.cursor.menuIdx = 0
  }
  private openItemMenu(){
    this.syncItemsFromBag()
    if (!this.state.items.length){
      this.state.log.push('No usable items on hand')
      return
    }
    this.state.commandMode='items'
    this.state.cursor.sub='items'
    this.state.commands = this.buildItemCommands()
    this.state.cursor.menuIdx = 0
  }
  private resetHeroMenu(){
    this.state.commandMode='primary'
    this.state.commands = []
    this.state.cursor.menuIdx = 0
    this.state.cursor.sub='actions'
  }
  private handleAbilitySelection(id:string){
    const ability = getAbilityById(id)
    const hero = this.state.heroes[this.state.cursor.heroIdx]
    if (!ability || !hero){
      this.state.log.push('Ability data missing')
      return
    }
    const cost = ability.cost ?? 0
    if ((hero.mp ?? 0) < cost){
      this.state.log.push(`${hero.name} lacks the MP to use ${ability.name}`)
      return
    }
    const targetTeam = abilityTargetTeam(ability.target)
    this.state.pending = { type:'ability', abilityId:id, label:ability.name, targetTeam }
    this.prepareTargeting(targetTeam, ability.name)
  }
  private handleItemSelection(id:string){
    const item = getItemById(id)
    if (!item){
      this.state.log.push('Unknown item')
      return
    }
    const targetTeam = itemTargetTeam(item.target)
    this.state.pending = { type:'item', itemId:id, label:item.name, targetTeam }
    this.prepareTargeting(targetTeam, item.name)
  }
  private prepareTargeting(team:'heroes'|'enemies'|'self', label:string){
    if (team==='self'){
      this.state.cursor.targetTeam='self'
      this.state.cursor.targetIdx = this.state.cursor.heroIdx
      this.state.phase='RESOLVE'
      this.state.prompt=undefined
      return
    }
    this.state.cursor.targetTeam = team
    const seed = team==='enemies' ? this.nextAliveEnemy(this.state.cursor.targetIdx ?? 0) : this.nextAliveHero(this.state.cursor.heroIdx)
    this.state.cursor.targetIdx = seed === -1 ? 0 : seed
    this.state.phase='TARGET_SELECT'
    const audience = team==='enemies' ? 'an enemy' : 'an ally'
    this.state.prompt = `${label} – choose ${audience}`
  }
  private buildAbilityCommands(heroIdx:number, category:'skill'|'spell'){
    const hero = this.state.heroes[heroIdx]
    if (!hero) return []
    const abilities = getHeroAbilitiesByCategory(hero.id, category)
    const mpPool = hero.mp ?? 0
    return abilities.map(ability=>{
      const cost = ability.cost ?? 0
      const disabled = cost > mpPool
      const detailParts = []
      if (ability.description) detailParts.push(ability.description)
      if (cost>0) detailParts.push(`Cost ${cost} MP`)
      return {
        id:ability.id,
        label:ability.name,
        detail:detailParts.join(' · '),
        type:'ability' as const,
        cost,
        disabled
      }
    })
  }
  private buildItemCommands(){
    return this.state.items.map(entry=>{
      const meta = getItemById(entry.id)
      return {
        id:entry.id,
        label: meta?.name ?? entry.id,
        detail: meta?.description,
        type:'item' as const,
        qty: entry.qty
      }
    })
  }
  private syncItemsFromBag(){
    this.state.items = Inventory.list(this.bag)
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
    const activeRecipients = this.party.filter(h=>h.active !== false)
    const recipients = activeRecipients.length ? activeRecipients : this.party
    const ups = gainRewards(recipients, xp, this.state.killXp)
    this.onComplete(xp,gold,ups)
  }
  private syncPartyFromState(){
    const battlers = new Map(this.state.heroes.map(b=>[b.id,b]))
    for (const hero of this.party){
      const b = battlers.get(hero.id)
      if (!b) continue
      hero.hp = Math.max(0, Math.min(b.hp, hero.base.hp))
      const baseMp = hero.base.mp ?? hero.mp
      if (typeof b.mp === 'number' && typeof baseMp === 'number'){
        hero.mp = Math.max(0, Math.min(b.mp, baseMp))
      }
      hero.alive = b.alive
    }
  }
}
