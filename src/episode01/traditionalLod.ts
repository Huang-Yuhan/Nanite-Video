/**
 * Synthetic rock-like teaching mesh, independent from the rock-wall asset.
 * All four LODs sample the same deterministic parametric surface.
 * Not a captured or cooked Unreal Engine mesh.
 */
export type LodVertex = readonly [number,number,number];
export type LodTriangle = readonly [LodVertex,LodVertex,LodVertex];
export type TraditionalLodMesh = {
  level:number; triangles:readonly LodTriangle[]; triangleCount:number;
};
const subdivisions = [[32,16],[24,12],[16,8],[8,4]] as const;
function surface(theta:number,phi:number):LodVertex {
  const ripple=Math.sin(theta*5+phi*2.1)*Math.cos(phi*7)*0.095+
    Math.sin(theta*11-phi*3.2)*Math.sin(phi*5)*0.045+
    Math.cos(theta*3+phi*4)*0.08;
  const r=1+ripple;
  return [r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi)*1.15,
    r*Math.sin(phi)*Math.sin(theta)*0.85];
}
function build(level:number):TraditionalLodMesh {
  const [longitude,latitude]=subdivisions[level];
  const triangles:LodTriangle[]=[];
  for(let y=0;y<latitude;y++) {
    for(let x=0;x<longitude;x++) {
      const a=surface(x*2*Math.PI/longitude,y*Math.PI/latitude);
      const b=surface((x+1)*2*Math.PI/longitude,y*Math.PI/latitude);
      const c=surface((x+1)*2*Math.PI/longitude,(y+1)*Math.PI/latitude);
      const d=surface(x*2*Math.PI/longitude,(y+1)*Math.PI/latitude);
      if(y!==0)triangles.push([a,b,c]);
      if(y!==latitude-1)triangles.push([a,c,d]);
    }
  }
  return {level,triangles,triangleCount:triangles.length};
}
export const traditionalLods:readonly TraditionalLodMesh[]=
  subdivisions.map((_,level)=>build(level));
/** Continuous camera motion with discrete LOD selection. */
export const approachProgress=(t:number):number=>{
  const s=Math.max(0,Math.min(1,t));
  return s*s*(3-2*s);
};
export function lodForApproach(progress:number):number {
  return progress<0.25?3:progress<0.50?2:progress<0.75?1:0;
}
export function validateTraditionalLods():void {
  if(traditionalLods.length!==4)throw new Error('Need exactly four levels');
  for(let i=0;i<4;i++) {
    const n=traditionalLods[i].triangleCount;
    if(n<=0||!Number.isInteger(n))throw new Error('Invalid triangle count');
    if(i>0&&n>=traditionalLods[i-1].triangleCount)
      throw new Error('Triangle count must decrease as LOD index grows');
  }
  if([0,0.24,0.26,0.51,0.76,1].map(lodForApproach).join(',')!==
      '3,3,2,1,0,0')throw new Error('LOD transition regression');
}
validateTraditionalLods();
