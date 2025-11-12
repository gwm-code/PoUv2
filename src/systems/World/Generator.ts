import { BiomeId, biomes } from '@content/biomes'

export interface DungeonRoom {
  id:string
  kind:'battle'|'event'|'rest'|'boss'
  connections:string[]
}

export interface DungeonLayout {
  id:string
  biome:BiomeId
  entrance:{ x:number; y:number }
  rooms:DungeonRoom[]
}

export interface WorldGenerationOptions {
  seed?: number|string
  dungeonCount?: number
}

export interface GeneratedWorld {
  seed:number
  tiles:number[][]
  biomeMap:BiomeId[][]
  dungeons:DungeonLayout[]
  forestEdges:number[][]
  riverBanks:number[][]
}

const FIELD_TILE = 9

export function generateWorld(width:number, height:number, opts:WorldGenerationOptions = {}):GeneratedWorld {
  const seed = normalizeSeed(opts.seed)
  const rng = mulberry32(seed)
  const biomeMap:BiomeId[][] = []
  const tiles:number[][] = []
  const heightMap = createHeightMap(width, height, rng)
  const sectorCols = Math.max(1, Math.floor(width / 4))
  const sectorRows = Math.max(1, Math.floor(height / 4))
  const sectorW = Math.max(1, Math.floor(width / sectorCols))
  const sectorH = Math.max(1, Math.floor(height / sectorRows))
  const sectorBiomes:BiomeId[][] = []

  for (let sr=0; sr<sectorRows; sr++){
    const row:BiomeId[] = []
    for (let sc=0; sc<sectorCols; sc++){
      row.push(pick(biomes, rng).id)
    }
    sectorBiomes.push(row)
  }

  for (let r=0; r<height; r++){
    const rowBiome:BiomeId[] = []
    const rowTiles:number[] = []
    for (let c=0; c<width; c++){
      const sectorIdxC = Math.min(sectorCols-1, Math.floor(c/sectorW))
      const sectorIdxR = Math.min(sectorRows-1, Math.floor(r/sectorH))
      const biomeId = sectorBiomes[sectorIdxR]?.[sectorIdxC] ?? biomes[0].id
      rowBiome.push(biomeId)
      rowTiles.push(tileFromHeight(heightMap[r][c], rng))
    }
    biomeMap.push(rowBiome)
    tiles.push(rowTiles)
  }

  const dungeonCount = opts.dungeonCount ?? 3
  const dungeons = Array.from({length:dungeonCount}, (_,i)=>makeDungeon(`dng-${i}`, width, height, biomeMap, tiles, rng))
  const towns = addTownsAndRoads(tiles, rng)
  carveRivers(tiles, heightMap, rng)
  connectTownNetwork(tiles, towns)
  growFieldsNearTowns(tiles, towns, rng)
  const forestEdges = computeForestEdges(tiles)
  const riverBanks = computeRiverBanks(tiles)
  return { seed, tiles, biomeMap, dungeons, forestEdges, riverBanks }
}

function tileFromHeight(h:number, rng:()=>number){
  if (h < 0.25) return 2 // deep water
  if (h < 0.32) return 1 // wetlands (will get forest/alt via overlay)
  if (h > 0.78) return 3 // high mountain
  if (h > 0.65) return rng()<0.5?3:0
  if (h > 0.4 && rng()<0.35) return 5 // forest bands
  if (rng()<0.15) return 0
  return 1
}

function makeDungeon(id:string, width:number, height:number, biomeMap:BiomeId[][], tiles:number[][], rng:()=>number):DungeonLayout{
  const entrance = {
    x: Math.floor(rng()*width),
    y: Math.floor(rng()*height)
  }
  const biome = biomeMap[entrance.y]?.[entrance.x] ?? biomes[0].id
  tiles[entrance.y][entrance.x] = 4
  const roomCount = 4 + Math.floor(rng()*3)
  const rooms:DungeonRoom[] = []
  for (let i=0;i<roomCount;i++){
    rooms.push({
      id:`${id}-room-${i}`,
      kind: pick(['battle','event','rest'] as const, rng),
      connections:[]
    })
  }
  rooms[roomCount-1].kind='boss'
  for (let i=1;i<rooms.length;i++){
    rooms[i-1].connections.push(rooms[i].id)
    rooms[i].connections.push(rooms[i-1].id)
  }
  if (rooms.length>=4){
    const a = rooms[Math.floor(rng()*rooms.length)]
    const b = rooms[Math.floor(rng()*rooms.length)]
    if (a !== b && !a.connections.includes(b.id)){
      a.connections.push(b.id)
      b.connections.push(a.id)
    }
  }
  return { id, biome, entrance, rooms }
}

function pick<T>(arr:readonly T[], rng:()=>number):T{
  return arr[Math.floor(rng()*arr.length)]
}

function addTownsAndRoads(tiles:number[][], rng:()=>number){
  const towns = placeTownClusters(tiles, rng)
  connectTownNetwork(tiles, towns)
  return towns
}

function placeTownClusters(tiles:number[][], rng:()=>number){
  const height = tiles.length
  const width = tiles[0]?.length ?? 0
  const townCount = Math.max(2, Math.floor((width*height)/400))
  const clusterCount = Math.max(1, Math.floor(townCount/2))
  const clusters:{x:number;y:number}[] = []
  let guard=0
  while (clusters.length<clusterCount && guard++<500){
    const x = Math.floor(rng()*width)
    const y = Math.floor(rng()*height)
    if (isTownCandidate(tiles, x, y)){
      clusters.push({x,y})
    }
  }
  if (!clusters.length){
    clusters.push({ x: Math.floor(width/2), y: Math.floor(height/2) })
  }
  const towns:{x:number;y:number}[] = []
  for (let i=0;i<townCount;i++){
    const cluster = clusters[Math.floor(rng()*clusters.length)]
    const spot = findTownSpotNear(cluster, tiles, rng, towns, width, height)
    if (spot){
      tiles[spot.y][spot.x] = 8
      towns.push(spot)
    }
  }
  return towns
}

function isTownCandidate(tiles:number[][], x:number, y:number){
  const tile = tiles[y]?.[x]
  return tile===0 || tile===1 || tile===5 || tile===FIELD_TILE
}

function findTownSpotNear(center:{x:number;y:number}, tiles:number[][], rng:()=>number, placed:{x:number;y:number}[], width:number, height:number){
  let attempts=0
  let radius = 3
  while (attempts++<250){
    const angle = rng()*Math.PI*2
    const distance = radius + rng()*4
    const x = Math.max(0, Math.min(width-1, Math.round(center.x + Math.cos(angle)*distance + rng()*2-1)))
    const y = Math.max(0, Math.min(height-1, Math.round(center.y + Math.sin(angle)*distance + rng()*2-1)))
    if (!isTownCandidate(tiles, x, y)) continue
    if (placed.some(p=>Math.abs(p.x-x)+Math.abs(p.y-y) < 3)) continue
    return { x, y }
  }
  return undefined
}

function connectTownNetwork(tiles:number[][], towns:{x:number;y:number}[]){
  if (towns.length<2) return
  const remaining = towns.slice(1)
  const connected = [towns[0]]
  while (remaining.length){
    let bestA=connected[0], bestB=remaining[0], bestDist=Number.MAX_SAFE_INTEGER
    for (const a of connected){
      for (const b of remaining){
        const dist = Math.abs(a.x-b.x)+Math.abs(a.y-b.y)
        if (dist<bestDist){
          bestDist = dist; bestA = a; bestB = b
        }
      }
    }
    carveRoad(tiles, bestA, bestB)
    const idx = remaining.indexOf(bestB)
    if (idx>=0){
      connected.push(bestB)
      remaining.splice(idx,1)
    } else {
      break
    }
  }
}

function growFieldsNearTowns(tiles:number[][], towns:{x:number;y:number}[], rng:()=>number){
  const height = tiles.length
  const width = tiles[0]?.length ?? 0
  for (const town of towns){
    const radius = 3 + Math.floor(rng()*2)
    for (let dy=-radius; dy<=radius; dy++){
      for (let dx=-radius; dx<=radius; dx++){
        const x = town.x + dx
        const y = town.y + dy
        if (x<0||y<0||x>=width||y>=height) continue
        if (dx===0 && dy===0) continue
        const current = tiles[y][x]
        if (!isFieldCandidate(current)) continue
        const distance = Math.abs(dx)+Math.abs(dy)
        const falloff = distance<=1 ? 0.9 : distance===2 ? 0.7 : 0.45
        if (rng() < falloff){
          tiles[y][x] = FIELD_TILE
        }
      }
    }
  }
}

function isFieldCandidate(tile:number){
  return tile===0 || tile===1 || tile===5
}

function computeForestEdges(tiles:number[][]){
  const height = tiles.length
  const width = tiles[0]?.length ?? 0
  const mask = Array.from({length:height}, ()=>Array(width).fill(0))
  for (let y=0;y<height;y++){
    for (let x=0;x<width;x++){
      if (tiles[y][x]!==5) continue
      let bits=0
      if (isForestEdge(tiles, x, y-1)) bits|=1
      if (isForestEdge(tiles, x+1, y)) bits|=2
      if (isForestEdge(tiles, x, y+1)) bits|=4
      if (isForestEdge(tiles, x-1, y)) bits|=8
      if (bits) mask[y][x]=bits
    }
  }
  return mask
}

function isForestEdge(tiles:number[][], x:number, y:number){
  const tile = tiles[y]?.[x]
  if (typeof tile === 'undefined') return true
  return tile!==5 && tile!==2 && tile!==3
}

function computeRiverBanks(tiles:number[][]){
  const height = tiles.length
  const width = tiles[0]?.length ?? 0
  const mask = Array.from({length:height}, ()=>Array(width).fill(0))
  for (let y=0;y<height;y++){
    for (let x=0;x<width;x++){
      const tile = tiles[y][x]
      if (!isBankCandidate(tile)) continue
      let bits=0
      if (isWater(tiles, x, y-1)) bits|=1
      if (isWater(tiles, x+1, y)) bits|=2
      if (isWater(tiles, x, y+1)) bits|=4
      if (isWater(tiles, x-1, y)) bits|=8
      if (bits) mask[y][x]=bits
    }
  }
  return mask
}

function isBankCandidate(tile:number){
  return tile===0 || tile===1 || tile===FIELD_TILE
}

function isWater(tiles:number[][], x:number, y:number){
  return tiles[y]?.[x]===2
}

function carveRoad(tiles:number[][], from:{x:number;y:number}, to:{x:number;y:number}){
  const height=tiles.length, width=tiles[0]?.length??0
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]]
  const queue=[from]
  const came=new Map<string,{x:number;y:number}>()
  const key=(x:number,y:number)=>`${x},${y}`
  const passable=(x:number,y:number)=>{
    const t=tiles[y]?.[x]
    return t!==undefined && t!==2 && t!==3
  }
  came.set(key(from.x,from.y), {x:-1,y:-1})
  while(queue.length){
    const cur=queue.shift()!
    if (cur.x===to.x && cur.y===to.y) break
    for(const [dx,dy] of dirs){
      const nx=cur.x+dx, ny=cur.y+dy
      if(nx<0||ny<0||nx>=width||ny>=height) continue
      const k=key(nx,ny)
      if (!passable(nx,ny) || came.has(k)) continue
      came.set(k,cur)
      queue.push({x:nx,y:ny})
    }
  }
  let cur=to
  while(cur.x!==-1 && cur.y!==-1){
    if (tiles[cur.y][cur.x]!==8) tiles[cur.y][cur.x]=6
    const prev=came.get(key(cur.x,cur.y))
    if(!prev) break
    cur=prev
  }
}

function createHeightMap(width:number, height:number, rng:()=>number){
  const map = Array.from({length:height}, ()=>Array(width).fill(0))
  for (let y=0;y<height;y++){
    for (let x=0;x<width;x++){
      const nx = x/width - 0.5
      const ny = y/height - 0.5
      const distance = Math.sqrt(nx*nx + ny*ny)
      const base = 1 - distance
      const noise = (smoothNoise(x*0.1, y*0.1) + smoothNoise(x*0.05, y*0.05)*0.5)/1.5
      map[y][x] = Math.min(1, Math.max(0, base*0.7 + noise*0.5))
    }
  }
  return map
}

function smoothNoise(x:number, y:number){
  const xi=Math.floor(x), yi=Math.floor(y)
  let total=0, div=0
  for (let dy=0;dy<=1;dy++){
    for (let dx=0;dx<=1;dx++){
      total += hash(xi+dx, yi+dy)
      div++
    }
  }
  return total/div
}

function hash(x:number, y:number){
  const seed = Math.sin(x*12.9898 + y*78.233) * 43758.5453
  return seed - Math.floor(seed)
}

function carveRivers(tiles:number[][], heightMap:number[][], rng:()=>number){
  const height=tiles.length
  const width=tiles[0]?.length ?? 0
  const rivers = Math.max(2, Math.floor((width*height)/2000))
  for (let i=0;i<rivers;i++){
    let attempts=0
    while(attempts++<300){
      const x=Math.floor(rng()*width)
      const y=Math.floor(rng()*height)
      if (heightMap[y][x]>0.75){
        digRiver(tiles,heightMap,x,y,rng)
        break
      }
    }
  }
}

function digRiver(tiles:number[][], heightMap:number[][], sx:number, sy:number, rng:()=>number){
  const height=tiles.length
  const width=tiles[0]?.length ?? 0
  let x=sx, y=sy
  for (let steps=0; steps<width+height; steps++){
    if (x<0||y<0||x>=width||y>=height) break
    if (!isProtectedTile(tiles[y][x])){
      tiles[y][x]=2
    }
    const neighbors=[[1,0],[-1,0],[0,1],[0,-1]]
    let best=heightMap[y][x], nextX=x, nextY=y
    for (const [dx,dy] of neighbors){
      const nx=x+dx, ny=y+dy
      if (nx<0||ny<0||nx>=width||ny>=height) continue
      const h=heightMap[ny][nx]
      if (h<best){
        best=h; nextX=nx; nextY=ny
      }
    }
    if (nextX===x && nextY===y){
      const dir=neighbors[Math.floor(rng()*neighbors.length)]
      x+=dir[0]; y+=dir[1]
    } else {
      x=nextX; y=nextY
    }
    if (x<=1||y<=1||x>=width-2||y>=height-2) break
  }
}

function isProtectedTile(tile:number){
  return tile===8 || tile===4
}


function normalizeSeed(seed?:number|string){
  if (typeof seed === 'number') return seed >>> 0
  if (typeof seed === 'string'){
    let h=2166136261
    for (let i=0;i<seed.length;i++){
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }
  return (Date.now() & 0xffffffff) >>> 0
}

function mulberry32(a:number){
  return function(){
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
