export type DungeonTile = 0|1|2|3

export const DungeonTiles = {
  Floor: 0,
  Wall: 1,
  Hazard: 2,
  Exit: 3
} as const

export const WALKABLE_DUNGEON_TILES = new Set<DungeonTile>([
  DungeonTiles.Floor,
  DungeonTiles.Exit
])

export interface DungeonDefinition {
  id:string
  name:string
  biomeName?:string
  description?:string
  tiles:DungeonTile[][]
  spawn:{ x:number; y:number }
  exits:{ x:number; y:number }[]
  encounterSteps:[number, number]
  tileType:number
}

const defaultLegend:Record<string, DungeonTile> = {
  '.': DungeonTiles.Floor,
  ' ': DungeonTiles.Floor,
  '=': DungeonTiles.Floor,
  '_': DungeonTiles.Floor,
  '#': DungeonTiles.Wall,
  'M': DungeonTiles.Wall,
  'P': DungeonTiles.Wall,
  '~': DungeonTiles.Hazard,
  'f': DungeonTiles.Hazard,
  'L': DungeonTiles.Hazard,
  '>': DungeonTiles.Exit,
  'S': DungeonTiles.Exit
}

export function parseDungeonTemplate(template:readonly string[]):{ tiles:DungeonTile[][]; exits:{x:number;y:number}[] }{
  const tiles:DungeonTile[][] = []
  const exits:{x:number;y:number}[] = []
  template.forEach((row, y)=>{
    const line:DungeonTile[] = []
    for (let x=0; x<row.length; x++){
      const glyph = row[x]
      const tile = defaultLegend[glyph] ?? DungeonTiles.Floor
      line.push(tile)
      if (tile === DungeonTiles.Exit){
        exits.push({ x, y })
      }
    }
    tiles.push(line)
  })
  return { tiles, exits }
}
