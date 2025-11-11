export interface BiomeConfig {
  id:string
  name:string
  palette:{
    ground:string
    alternate:string
    water:string
    mountain:string
  }
  encounterSteps:[number, number]
  encounterTable:string[]
}

export const biomes:BiomeConfig[] = [
  {
    id:'foothills',
    name:'Ironpeak Foothills',
    palette:{
      ground:'#6AA84F',
      alternate:'#38761D',
      water:'#4A86E8',
      mountain:'#A6A6A6'
    },
    encounterSteps:[2,20],
    encounterTable:['mistling','shambler']
  },
  {
    id:'ashen',
    name:'Ashen Barrens',
    palette:{
      ground:'#8E695C',
      alternate:'#5C4033',
      water:'#5E7E9A',
      mountain:'#3A2F2A'
    },
    encounterSteps:[3,18],
    encounterTable:['shambler']
  },
  {
    id:'mire',
    name:'Verdigris Mire',
    palette:{
      ground:'#3C6E47',
      alternate:'#1F4F2F',
      water:'#2E4053',
      mountain:'#6B6E70'
    },
    encounterSteps:[1,14],
    encounterTable:['mistling']
  }
]

export type BiomeId = typeof biomes[number]['id']

export function getBiome(id:string):BiomeConfig{
  const found = biomes.find(b=>b.id===id)
  if (!found) throw new Error(`Unknown biome ${id}`)
  return found
}
