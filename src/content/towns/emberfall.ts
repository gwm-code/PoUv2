import { TownDefinition } from './types'

const template = [
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'MGGGGGGGGGGGGGGGGGGGGGGGGGGGGGM',
  'MGGGGGGGGGGGGGGGGGGGGGGGGGGGGGM',
  'MGGGGG====GGGRRRRGGG====GGGGGGM',
  'MGGGGG====GGGRRRRGGG====GGGGGGM',
  'MGGGGGGGGGGGRRRRGGGGGGGGGGGGGM',
  'MGGGGGGGGGRRFFFFRRRGGGGGGGGGGM',
  'MGGGGGGGGGRRFFFFRRRGGGGGGGGGGM',
  'MGGGGGGRRRRRRRRRRRRRRRGGGGGGGM',
  'MGGGGGRRFFFRRFFRRFFFRRRGGGGGGM',
  'MGGGGGRRFFFRRFFRRFFFRRRGGGGGGM',
  'MGGGGGGRRRRRRRRRRRRRRRGGGGGGGM',
  'MGGGGGGGGGRRFFFFRRRGGGGGGGGGGM',
  'MGGGGGGGGGGGRRRRGGGGGGGGGGGGGM',
  'MGGGGG====GGGRRRRGGG====GGGGGGM',
  'MGGGGG====GGGRRRRGGG====GGGGGGM',
  'MGGGGGGGGGGGGRRRRGGGGGGGGGGGGM',
  'MMMMMMMMMMMMMMRRRMMMMMMMMMMMMMM'
] as const

const width = template[0].length
const normalizedTemplate = template.map(row=>{
  if (row.length>width) throw new Error(`Town row width exceeds expected ${width}: got ${row.length}`)
  if (row.length === width) return row
  return row.padEnd(width, row[row.length-1] ?? 'M')
})

const glyphMap:Record<string, number> = {
  G:1,
  '=':9,
  R:6,
  F:10,
  M:5
}

const tiles = normalizedTemplate.map(row=> row.split('').map(char=>glyphMap[char] ?? 1))
const exitRowIndex = normalizedTemplate.length-1
const exits = normalizedTemplate[exitRowIndex]
  .split('')
  .map((glyph, idx)=> glyph==='R' ? { x:idx, y:exitRowIndex } : undefined)
  .filter((entry):entry is {x:number;y:number}=> !!entry)

const emberfall:TownDefinition = {
  id:'emberfall',
  name:'Emberfall Crossing',
  biomeName:'Ashen Barrens',
  description:'Charcoal forges hugging the lava gullies; mercs refuel here before riding the firebreak.',
  tiles,
  spawn:{ x:16, y:12 },
  exits,
  npcs:[
    {
      id:'foreman-kael',
      name:'Foreman Kael',
      x:12,
      y:9,
      facing:'right',
      dialog:[
        'Kael: Rivers run orange beyond the ridge.',
        'Kael: Bring basalt cores if you expect fresh blades.'
      ]
    },
    {
      id:'smith-jorra',
      name:'Smith Jorra',
      x:18,
      y:9,
      facing:'left',
      dialog:[
        'Jorra: Emberfall hammers never cool.',
        'Jorra: I’ll swap ore for surplus mist shards.'
      ]
    },
    {
      id:'scout-haldrin',
      name:'Scout Haldrin',
      x:16,
      y:15,
      facing:'down',
      dialog:[
        'Haldrin: Enter the northern gate to return to the wastes.',
        'Haldrin: Watch for molten fissures—they crack without warning.'
      ]
    }
  ]
}

export default emberfall
