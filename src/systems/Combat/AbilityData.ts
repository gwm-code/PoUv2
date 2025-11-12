import abilityList from '@content/abilities.json'

export type AbilityTarget = 'enemy'|'ally'|'self'
export type AbilityKind = 'attack'|'heal'
export type AbilityCategory = 'skill'|'spell'

export interface AbilityDefinition {
  id:string
  hero:string
  name:string
  category:AbilityCategory
  kind:AbilityKind
  power:number
  cost?:number
  target:AbilityTarget
  description?:string
}

const abilities = abilityList as AbilityDefinition[]

const abilityMap = new Map<string, AbilityDefinition>()

for (const ability of abilities){
  abilityMap.set(ability.id, ability)
}

export function getHeroAbilities(heroId:string): AbilityDefinition[]{
  return abilities.filter(ability=>ability.hero===heroId)
}

export function getAbilityById(id:string): AbilityDefinition | undefined {
  return abilityMap.get(id)
}

export function getHeroAbilitiesByCategory(heroId:string, category:AbilityCategory): AbilityDefinition[] {
  return abilities.filter(ability=>ability.hero===heroId && ability.category===category)
}

export function abilityTargetTeam(target:AbilityTarget): 'heroes'|'enemies'|'self'{
  if (target==='enemy') return 'enemies'
  if (target==='ally') return 'heroes'
  return 'self'
}
