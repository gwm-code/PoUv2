import { IScene } from '@engine/Scene'
import { WorldState } from '@systems/World/WorldState'
import { WorldUIState } from '@systems/World/UIState'
import { renderWorld } from '@ui/World/WorldRenderer'

type Phase = 'PULSE'|'TENDRILS'|'PORTAL'|'HOLD'

interface PhaseConfig {
  key:Phase
  duration:number
}

interface MistTransitionSceneProps {
  world:WorldState
  ui:WorldUIState
  onComplete:()=>void
}

interface MistWisp {
  start:{ x:number; y:number }
  control:{ x:number; y:number }
  width:number
  delay:number
}

export class MistTransitionScene implements IScene {
  private elapsed = 0
  private finished = false
  private readonly phases:PhaseConfig[] = [
    { key:'PULSE', duration:0.35 },
    { key:'TENDRILS', duration:0.85 },
    { key:'PORTAL', duration:0.65 },
    { key:'HOLD', duration:0.35 }
  ]
  private readonly totalDuration = this.phases.reduce((sum, phase)=>sum+phase.duration, 0)
  private center:{ x:number; y:number } = { x:0, y:0 }
  private maxRadius = 0
  private readonly wisps: MistWisp[]

  constructor(
    private readonly W:number,
    private readonly H:number,
    private readonly props:MistTransitionSceneProps
  ){
    this.center = { x:this.W/2, y:this.H/2 }
    this.maxRadius = Math.hypot(this.W, this.H) * 0.6
    this.wisps = this.buildWisps(14)
  }

  enter():void{
    this.elapsed = 0
    this.finished = false
  }

  exit():void{}

  update(dt:number):void{
    if (this.finished) return
    this.elapsed += dt
    if (this.elapsed >= this.totalDuration){
      this.finish()
    }
  }

  draw(ctx:CanvasRenderingContext2D):void{
    renderWorld(ctx, this.W, this.H, this.props.world, this.props.ui)
    this.drawPulse(ctx)
    this.drawTendrils(ctx)
    this.drawPortal(ctx)
    this.drawNoise(ctx)
  }

  onKeyDown():void{}

  onKeyUp():void{}

  private drawPulse(ctx:CanvasRenderingContext2D){
    const progress = this.phaseProgress('PULSE')
    if (progress <= 0) return
    const eased = easeInOut(progress)

    ctx.save()
    ctx.fillStyle = `rgba(10,9,15,${0.25 + eased*0.35})`
    ctx.fillRect(0,0,this.W,this.H)

    const radius = this.maxRadius * (0.2 + 0.8*eased)
    const gradient = ctx.createRadialGradient(
      this.center.x,
      this.center.y,
      radius*0.15,
      this.center.x,
      this.center.y,
      radius
    )
    gradient.addColorStop(0, `rgba(110,100,140,${0.25 + 0.2*Math.sin(progress*Math.PI)})`)
    gradient.addColorStop(1, 'rgba(20,18,30,0)')
    ctx.globalCompositeOperation='lighter'
    ctx.fillStyle = gradient
    ctx.fillRect(0,0,this.W,this.H)
    ctx.restore()
  }

  private drawTendrils(ctx:CanvasRenderingContext2D){
    const progress = this.phaseProgress('TENDRILS')
    if (progress <= 0) return
    const eased = easeOut(progress)

    ctx.save()
    ctx.lineCap='round'
    ctx.globalCompositeOperation='lighter'
    this.wisps.forEach(wisp=>{
      const local = clamp((eased - wisp.delay)/(1 - wisp.delay), 0, 1)
      if (local <= 0) return
      const endX = wisp.start.x + (this.center.x - wisp.start.x)*local
      const endY = wisp.start.y + (this.center.y - wisp.start.y)*local
      ctx.strokeStyle = `rgba(48,48,56,${0.5*(1-local)+0.35})`
      ctx.lineWidth = wisp.width * (1.1 - 0.4*local)
      ctx.beginPath()
      ctx.moveTo(wisp.start.x, wisp.start.y)
      ctx.quadraticCurveTo(wisp.control.x, wisp.control.y, endX, endY)
      ctx.stroke()
    })
    ctx.restore()
  }

  private drawPortal(ctx:CanvasRenderingContext2D){
    const progress = this.phaseProgress('PORTAL')
    if (progress <= 0) return
    const eased = easeIn(progress)
    const radius = Math.max(0, this.maxRadius * (1 - eased))

    ctx.save()
    ctx.fillStyle = `rgba(5,5,10,${0.85*eased + 0.05})`
    ctx.fillRect(0,0,this.W,this.H)
    ctx.globalCompositeOperation='destination-out'
    ctx.beginPath()
    ctx.arc(this.center.x, this.center.y, radius, 0, Math.PI*2)
    ctx.fill()
    ctx.restore()
  }

  private drawNoise(ctx:CanvasRenderingContext2D){
    const hold = this.phaseProgress('HOLD')
    const tendrils = this.phaseProgress('TENDRILS')
    if (hold <= 0 && tendrils <= 0) return
    const strength = Math.max(hold, tendrils)
    const alpha = 0.04 + strength*0.18

    ctx.save()
    ctx.globalAlpha = alpha
    for (let y=0;y<this.H;y+=6){
      for (let x=0;x<this.W;x+=6){
        const noise = (Math.sin((x + this.elapsed*90)*0.15) + Math.cos((y - this.elapsed*60)*0.2))*0.5 + 0.5
        ctx.fillStyle = `rgba(30,30,35,${0.3 + noise*0.5})`
        ctx.fillRect(x,y,6,6)
      }
    }
    ctx.restore()
  }

  private finish(){
    if (this.finished) return
    this.finished = true
    this.props.onComplete()
  }

  private buildWisps(count:number):MistWisp[]{
    const wisps:MistWisp[] = []
    for (let i=0;i<count;i++){
      const edge = Math.floor(Math.random()*4)
      const start = this.edgePosition(edge)
      const control = {
        x: this.center.x + (Math.random()-0.5)*this.W*0.6,
        y: this.center.y + (Math.random()-0.5)*this.H*0.6
      }
      wisps.push({
        start,
        control,
        width: 6 + Math.random()*10,
        delay: Math.random()*0.4
      })
    }
    return wisps
  }

  private edgePosition(edge:number){
    switch(edge){
      case 0: return { x: Math.random()*this.W, y:-20 }
      case 1: return { x: this.W+20, y: Math.random()*this.H }
      case 2: return { x: Math.random()*this.W, y: this.H+20 }
      default: return { x:-20, y: Math.random()*this.H }
    }
  }

  private phaseProgress(key:Phase){
    let cursor = 0
    for (const phase of this.phases){
      if (phase.key === key){
        const local = (this.elapsed - cursor)/phase.duration
        return clamp(local, 0, 1)
      }
      cursor += phase.duration
    }
    return this.elapsed >= this.totalDuration ? 1 : 0
  }
}

function clamp(value:number, min:number, max:number){
  return Math.max(min, Math.min(max, value))
}

function easeInOut(t:number){
  return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2
}

function easeOut(t:number){
  return 1 - Math.pow(1-t, 3)
}

function easeIn(t:number){
  return t*t
}
