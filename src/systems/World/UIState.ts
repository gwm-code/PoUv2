export interface WorldUIState {
  equipOpen:boolean
  shopOpen:boolean
  talkText:string|null
}

export function createWorldUIState(): WorldUIState {
  return { equipOpen:false, shopOpen:false, talkText:null }
}
