type Handler<T> = (data: T)=>void
export class EventBus<Topic extends string>{
  private map = new Map<Topic, Set<Handler<any>>>()
  on<K extends Topic>(k:K, fn: Handler<any>){ if(!this.map.has(k)) this.map.set(k, new Set()); this.map.get(k)!.add(fn) }
  off<K extends Topic>(k:K, fn: Handler<any>){ this.map.get(k)?.delete(fn) }
  emit<K extends Topic>(k:K, data:any){ this.map.get(k)?.forEach(fn=>fn(data)) }
}
