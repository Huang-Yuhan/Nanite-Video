/**
 * Poly Haven Moon Rock 02: the author's four existing LOD meshes.
 * Shared coordinate normalization only; no mesh simplification.
 */
import asset from './assets/moonRockLods.json' with {type:'json'};
export type LodVertex = readonly [number,number,number];
export type LodUv = readonly [number,number];
export type LodTriangle = readonly [number,number,number];
export type TraditionalLodMesh = {
  level:number; positions:readonly LodVertex[];
  triangles:readonly LodTriangle[]; triangleCount:number;
  uv:readonly (readonly [LodUv,LodUv,LodUv])[];
};
export const traditionalLods:readonly TraditionalLodMesh[]=
  asset.lods.map(lod=>({
    level:lod.level, positions:lod.positions as unknown as LodVertex[],
    triangles:lod.triangles as unknown as LodTriangle[],
    uv:lod.uv as unknown as [LodUv,LodUv,LodUv][],
    triangleCount:lod.triangles.length,
  }));
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
    const lod=traditionalLods[i];
    if(lod.level!==i||n!==[3304,1652,826,412][i])
      throw new Error('Author-supplied LOD identity/count changed');
    if(lod.positions.some(v=>v.length!==3||v.some(x=>!Number.isFinite(x))))
      throw new Error('Invalid model coordinates');
    if(lod.uv.length!==n)throw new Error('Missing face UVs');
    for(const [j,tri] of lod.triangles.entries()){
      if(tri.length!==3||new Set(tri).size!==3||tri.some(v=>
        !Number.isInteger(v)||v<0||v>=lod.positions.length))
        throw new Error('Invalid triangle indices');
      if(lod.uv[j].length!==3||lod.uv[j].some(v=>
        v.length!==2||v.some(x=>!Number.isFinite(x))))throw new Error('Invalid UVs');
      const [a,b,c]=tri.map(v=>lod.positions[v]);
      const ab=b.map((v,k)=>v-a[k]),ac=c.map((v,k)=>v-a[k]);
      if(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],
        ab[0]*ac[1]-ab[1]*ac[0])<1e-10)throw new Error('Degenerate triangle');
    }
    if(n<=0||!Number.isInteger(n))throw new Error('Invalid triangle count');
    if(i>0&&n>=traditionalLods[i-1].triangleCount)
      throw new Error('Triangle count must decrease as LOD index grows');
  }
  if([0,0.24,0.26,0.51,0.76,1].map(lodForApproach).join(',')!==
      '3,3,2,1,0,0')throw new Error('LOD transition regression');
}
validateTraditionalLods();
