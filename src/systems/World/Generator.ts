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
}

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
  addTownsAndRoads(tiles, rng)
  carveRivers(tiles, heightMap, rng)
  addTownsAndRoads(tiles, rng)
  return { seed, tiles, biomeMap, dungeons }
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
  const height = tiles.length
  const width = tiles[0]?.length ?? 0
  const townCount = Math.max(2, Math.floor((width*height)/400))
  const towns:{x:number;y:number}[] = []
  for (let i=0;i<townCount;i++){
    let attempts=0
    while (attempts++<200){
      const x = Math.floor(rng()*width)
      const y = Math.floor(rng()*height)
      const tile = tiles[y]?.[x]
      if (tile===1 || tile===0 || tile===5){
        tiles[y][x] = 8 // town
        towns.push({x,y})
        break
      }
    }
  }
  for (let i=1;i<towns.length;i++){
    carveRoad(tiles, towns[i-1], towns[i])
  }
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
        digRiver(tiles,heightMap,x,y)
        break
      }
    }
  }
}

function digRiver(tiles:number[][], heightMap:number[][], sx:number, sy:number){
  const height=tiles.length
  const width=tiles[0]?.length ?? 0
  let x=sx, y=sy
  for (let steps=0; steps<width+height; steps++){
    if (x<0||y<0||x>=width||y>=height) break
    tiles[y][x]=2
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
      const dir=neighbors[Math.floor(Math.random()*neighbors.length)]
      x+=dir[0]; y+=dir[1]
    } else {
      x=nextX; y=nextY
    }
    if (x<=1||y<=1||x>=width-2||y>=height-2) break
  }
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
