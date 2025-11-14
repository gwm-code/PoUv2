import { TownDefinition } from './types'

const template = [
  'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGF',
  'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGF',
  'FGGG======GGGGGGGGGGGGGG======GF',
  'FGGG======GGRRRRRRRRGG======GGF',
  'FGGGGGGGGGGRRRRRRRRRGGGGGGGGGF',
  'FGGGGGGGGGRRHHHHRRRGGGGGGGGGGF',
  'FGGGGGGGGGRRHHHHRRRGGGGGGGGGGF',
  'FGGGGGGRRRRRRRRRRRRRRRRRGGGGGF',
  'FGGGGGRRHHHHGGRRGGHHHHRRGGGGGF',
  'FGGGGGRRHHHHGGRRGGHHHHRRGGGGGF',
  'FGGGGGGRRRRRRRRRRRRRRRRRGGGGGF',
  'FGGGGGGGGGRRHHHHRRRGGGGGGGGGGF',
  'FGGGGGGGGGGRRRRRRRGGGGGGGGGGGF',
  'FGGGGG====GRRRRRRRG====GGGGGGF',
  'FGGGGG====GRRRRRRRG====GGGGGGF',
  'FGGGGGGGGGGGGGRRRRGGGGGGGGGGGF',
  'FFFFFFFFFFFFFFRRRFFFFFFFFFFFFFF'
] as const

const width = template[0].length
const normalizedTemplate = template.map(row=>{
  if (row.length > width){
    throw new Error(`Town row width exceeds expected ${width}: got ${row.length}`)
  }
  if (row.length === width) return row
  const filler = row[row.length-1] ?? 'F'
  return row.padEnd(width, filler)
})

const glyphs:Record<string, number> = {
  F:5, // forest
  G:1, // grass
  '=':9, // tilled fields
  R:6, // road/plaza stone
  H:10 // townhouse roof tile (custom)
}

function mapRow(row:string){
  return row.split('').map(char=>glyphs[char] ?? 1)
}

const tiles = normalizedTemplate.map(mapRow)
const exitRowIndex = normalizedTemplate.length - 1
const exits = normalizedTemplate[exitRowIndex]
  .split('')
  .map((glyph, idx)=> glyph==='R' ? { x:idx, y:exitRowIndex } : undefined)
  .filter((entry):entry is {x:number;y:number}=> !!entry)

const fogwoodTown:TownDefinition = {
  id:'fogwood',
  name:'Fogwood Watch',
  biomeName:'Fogwood Ward',
  description:'Gate town built into the treeline, first refuge outside the Ironpeak foothills.',
  tiles,
  spawn:{ x:16, y:12 },
  exits,
  npcs:[
    {
      id:'elder-marla',
      name:'Elder Marla',
      x:14,
      y:9,
      dialog:[
        'Marla: The Mist presses closer each night.',
        'Marla: Bring any Mist shards to the chapel brazier.'
      ],
      facing:'right'
    },
    {
      id:'quartermaster',
      name:'Quartermaster Venn',
      x:19,
      y:10,
      dialog:[
        'Venn: Gear up before you march north.',
        'Venn: Our scouts swap field rations for mistling cores.'
      ],
      facing:'left'
    },
    {
      id:'scout-rowan',
      name:'Scout Rowan',
      x:16,
      y:15,
      dialog:[
        'Rowan: Press Enter near the south gate to step back onto the overworld.',
        'Rowan: Stick to the roads if the party is hurting.'
      ],
      facing:'down'
    }
  ]
}

export default fogwoodTown
