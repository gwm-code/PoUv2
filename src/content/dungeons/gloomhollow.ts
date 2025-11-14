import { DungeonDefinition, DungeonTiles, parseDungeonTemplate } from './types'

const template = [
  '############################',
  '#............##...........##',
  '#..####......##......####.##',
  '#..#..#..............#..#.##',
  '#..#..################..#.##',
  '#..#......#........#....#.##',
  '#..######.#...F...#.####.#.#',
  '#........#...F...#......#.##',
  '#.######.#...F...#.######.##',
  '#.#....#.#...F...#.#....#.##',
  '#.#.##.#.#...F...#.#.##.#.##',
  '#.#....#.#...F...#.#....#.##',
  '#.######.#...F...#.######.##',
  '#........#...F...#........##',
  '#..######.#...F...#.####..##',
  '#..#......#...F...#....#..##',
  '#..#..####.fffff.####..#..##',
  '#..#..#............#..#..###',
  '#..####......##......####.##',
  '#............##............#',
  '#>>>>>>>>>>>>>>>>>>>>>>>>>>#',
  '############################'
] as const

const parsed = parseDungeonTemplate(template)

const gloomhollow: DungeonDefinition = {
  id:'gloomhollow',
  name:'Gloomhollow Sink',
  biomeName:'Subterranean',
  description:'First breach beneath the Mistheart Spire—cool caverns lit by fungal bloom.',
  tiles: parsed.tiles,
  spawn:{ x: 12, y: 2 },
  exits: parsed.exits,
  encounterSteps:[3,8],
  tileType:5
}

export default gloomhollow
