import type { Crossing } from '../geometry/WireRouter';
import type { Wire } from '../model/types';

/** Post-pass bridge painter. A crossing is insulated, never an implicit junction. */
export class CrossoverPainter {
  public draw(ctx:CanvasRenderingContext2D,crossings:readonly Crossing[],wires:readonly Wire[],paper:string):void {
    for(const crossing of crossings){
      const upper=wires.find(wire=>wire.id===crossing.wireId);
      const lower=wires.find(wire=>wire.id===crossing.verticalWireId);
      if(!upper||!lower)continue;
      this.paint(ctx,crossing,upper,lower,paper);
    }
  }
  private paint(ctx:CanvasRenderingContext2D,at:Crossing,upper:Wire,lower:Wire,paper:string):void {
    const radius=9;const direction=at.direction;
    ctx.save();ctx.setLineDash([]);ctx.lineCap='round';
    // Remove the horizontal segment beneath the arch and its intersecting vertical.
    ctx.strokeStyle=paper;ctx.lineWidth=Math.max(upper.width,lower.width)+5;
    ctx.beginPath();ctx.moveTo(at.x-radius*direction,at.y);ctx.lineTo(at.x+radius*direction,at.y);ctx.stroke();
    // Preserve the through conductor underneath the insulated bridge.
    ctx.strokeStyle=lower.color;ctx.lineWidth=lower.width;
    ctx.beginPath();ctx.moveTo(at.x,at.y-12);ctx.lineTo(at.x,at.y+12);ctx.stroke();
    // White halo prevents the crossing being mistaken for an electrical junction in print.
    this.arch(ctx,at,radius);
    ctx.strokeStyle=paper;ctx.lineWidth=upper.width+5;ctx.stroke();
    this.arch(ctx,at,radius);
    ctx.strokeStyle=upper.color;ctx.lineWidth=upper.width;ctx.stroke();
    ctx.restore();
  }
  private arch(ctx:CanvasRenderingContext2D,at:Crossing,radius:number):void {
    const s=at.direction;
    ctx.beginPath();ctx.moveTo(at.x-radius*s,at.y);
    ctx.bezierCurveTo(at.x-radius*s,at.y-13,at.x+radius*s,at.y-13,at.x+radius*s,at.y);
  }
}
