import { BiomeConfig, BiomeId, biomes, getBiome } from '@content/biomes'
import { DungeonLayout, generateWorld } from './Generator'

export interface WorldStateOptions {
  seed?: number|string
}

export class WorldState {
  width:number
  height:number
  tile:number[][]
  biomeMap:BiomeId[][]
  dungeons:DungeonLayout[]
  seed:number
  // Player in pixels for smooth movement
  playerPx = { x: 0, y: 0 }
  speed = 60 // px/sec
  minimapMode=0
  private biomeCache = new Map<BiomeId, BiomeConfig>()

  constructor(w:number,h:number, options:WorldStateOptions = {}){
    this.width=w; this.height=h
    const generated = generateWorld(w, h, { seed: options.seed })
    this.tile = generated.tiles
    this.biomeMap = generated.biomeMap
    this.dungeons = generated.dungeons
    this.seed = generated.seed
    this.playerPx = this.spawnPoint()
  }
  isWalkable(c:number,r:number){ const t=this.tile[r]?.[c]??-1; return t===0||t===1||t===4||t===5||t===6||t===7||t===8 }
  isWalkableTile(tile:[number,number]){ return this.isWalkable(tile[0], tile[1]) }
  tileAtPx(px:number, py:number): [number,number]{ return [Math.floor(px/16), Math.floor(py/16)] }
  playerTile(){ return this.tileAtPx(this.playerPx.x, this.playerPx.y) }
  playerAt(cx:number,cy:number){ const [tx,ty]=this.playerTile(); return tx===cx && ty===cy }
  encounterRange():[number, number]{
    const biome = this.getBiomeAtTile(this.playerTile())
    return biome.encounterSteps
  }
  biomeNameAtPlayer(){
    return this.getBiomeAtTile(this.playerTile()).name
  }
  getBiomeAtTile(tile:[number, number]):BiomeConfig{
    const id = this.biomeMap[tile[1]]?.[tile[0]] ?? this.biomeMap[0]?.[0] ?? biomes[0].id
    return this.getBiome(id)
  }
  tileColorFor(c:number, r:number, tileType:number){
    const biome = this.getBiome(this.biomeMap[r]?.[c] ?? this.biomeMap[0]?.[0] ?? biomes[0].id)
    if (tileType===2) return biome.palette.water
    if (tileType===3) return biome.palette.mountain
    if (tileType===0) return biome.palette.alternate
    if (tileType===5) return shade(biome.palette.alternate, -20)
    if (tileType===6) return '#cfa76b'
    if (tileType===7) return '#f2d0a2'
    if (tileType===8) return '#d66f6f'
    if (tileType===4) return '#d9c074'
    return biome.palette.ground
  }
  private getBiome(id:BiomeId):BiomeConfig{
    if (!this.biomeCache.has(id)){
      this.biomeCache.set(id, getBiome(id))
    }
    return this.biomeCache.get(id)!
  }
  private spawnPoint(){
    const center = { x: Math.floor(this.width/2), y: Math.floor(this.height/2) }
    const spiralLimit = Math.max(this.width, this.height)
    for (let radius=0; radius<=spiralLimit; radius++){
      for (let dx=-radius; dx<=radius; dx++){
        for (let dy=-radius; dy<=radius; dy++){
          const cx = center.x+dx
          const cy = center.y+dy
          if (!this.isWalkable(cx, cy)) continue
          return { x: cx*16, y: cy*16 }
        }
      }
    }
    return { x:0, y:0 }
  }
}

function shade(hex:string, percent:number){
  const num = parseInt(hex.slice(1),16)
  const r = Math.min(255, Math.max(0, ((num>>16)&255)+percent))
  const g = Math.min(255, Math.max(0, ((num>>8)&255)+percent))
  const b = Math.min(255, Math.max(0, (num&255)+percent))
  return `rgb(${r},${g},${b})`
}
