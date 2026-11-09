/**
 * One verified transition for the exact Chapter 02 topology:
 *   4 fine clusters (32 tris) -> 1 group -> 8 legal internal
 *   collapses (16 tris) -> 2 coarse clusters.
 *
 * This is a compact teaching model. UE 5.8.4's FMeshSimplifier uses
 * weighted quadrics and additional constraints; this is NOT its output.
 */
import {triangleGraphNodes, COMPACT_LABELS} from './ch02Graph.ts';
import type {Vec3} from './ch01Geometry.ts';

export type TriIndex = readonly [number, number, number];
export type Sphere = {center: Vec3; radius: number};
export type Collapse = {from: number; to: number};
const vertexKey = (p: Vec3) => p.map((x) => x.toFixed(8)).join(',');

const uniqueX = [...new Set(triangleGraphNodes.flatMap((n) =>
  n.triangle.corners.map((p) => p[0])))].sort((a,b)=>a-b);
const uniqueY = [...new Set(triangleGraphNodes.flatMap((n) =>
  n.triangle.corners.map((p) => p[1])))].sort((a,b)=>a-b);
if (uniqueX.length !== 5 || uniqueY.length !== 5) {
  throw new Error('Expected a 5x5 vertex grid from Chapter 02');
}
const fromSource = new Map<string, Vec3>();
for (const node of triangleGraphNodes) {
  for (const p of node.triangle.corners) fromSource.set(vertexKey(p), p);
}
const sourceVertices = Array.from({length:25},(_,id) => {
  const x=uniqueX[id%5], y=uniqueY[Math.floor(id/5)];
  const p=[...fromSource.values()].find((v)=>
    Math.abs(v[0]-x)<1e-7 && Math.abs(v[1]-y)<1e-7);
  if (!p) throw new Error('Missing Chapter 02 grid vertex');
  return p;
});
const indexFromVertex = new Map(sourceVertices.map((p,i)=>[vertexKey(p),i]));
const firstTriangles: TriIndex[] = triangleGraphNodes.map((n)=>{
  const ids=n.triangle.corners.map((p)=>{
    const index=indexFromVertex.get(vertexKey(p));
    if (index===undefined) throw new Error('Triangle vertex missing');
    return index;
  });
  return [ids[0], ids[1], ids[2]];
});

/**
 * Textbook Garland–Heckbert QEM for a fixed target position.
 * Each incident face contributes its normalized plane equation.
 * This is for explaining the metric, NOT the weighted/attribute-aware
 * UE 5.8.4 simplifier or the collapse selection used by this trace.
 */
export function quadricCostAtVertex(vertexId:number, target:Vec3):number {
  let cost=0;
  for(const [a,b,c] of firstTriangles) {
    if(a!==vertexId && b!==vertexId && c!==vertexId)continue;
    const A=sourceVertices[a],B=sourceVertices[b],C=sourceVertices[c];
    const ab=[B[0]-A[0],B[1]-A[1],B[2]-A[2]];
    const ac=[C[0]-A[0],C[1]-A[1],C[2]-A[2]];
    const n=[
      ab[1]*ac[2]-ab[2]*ac[1],
      ab[2]*ac[0]-ab[0]*ac[2],
      ab[0]*ac[1]-ab[1]*ac[0],
    ];
    const length=Math.hypot(...n);
    if(length<1e-12)throw new Error('Degenerate input triangle');
    const signedDistance=(
      n[0]*(target[0]-A[0])+
      n[1]*(target[1]-A[1])+
      n[2]*(target[2]-A[2])
    )/length;
    cost+=signedDistance*signedDistance;
  }
  return cost;
}
export const firstCollapseQEM=(()=>{
  const from=6,to=12;
  const target=sourceVertices[to];
  // Q(from)+Q(to), evaluated at the kept endpoint.
  return quadricCostAtVertex(from,target)+quadricCostAtVertex(to,target);
})();

export const hierarchyVertices: readonly Vec3[] = sourceVertices;
export const collapseSequence: readonly Collapse[] = [
  {from:6,to:12},{from:7,to:12},{from:11,to:12},{from:13,to:12},
  {from:8,to:12},{from:17,to:12},{from:16,to:12},{from:18,to:12},
];

const edgeKey=(a:number,b:number)=>[Math.min(a,b),Math.max(a,b)].join(':');
const neighbours=(tris: readonly TriIndex[],v:number):Set<number>=>{
  const result=new Set<number>();
  for(const tri of tris)if(tri.includes(v))
    for(const item of tri)if(item!==v)result.add(item);
  return result;
};
const area2=([a,b,c]:TriIndex)=>{
  const A=sourceVertices[a],B=sourceVertices[b],C=sourceVertices[c];
  return (B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]);
};
const boundary=(v:number)=>v%5===0 || v%5===4 || Math.floor(v/5)===0 || Math.floor(v/5)===4;
const boundaryEdges=(tris:readonly TriIndex[])=>{
  const counts=new Map<string,number>();
  for(const [a,b,c] of tris)
    for(const [u,v] of [[a,b],[b,c],[c,a]]){
      const k=edgeKey(u,v);
      counts.set(k,(counts.get(k)??0)+1);
    }
  if([...counts.values()].some((n)=>n>2))throw new Error('Non manifold');
  return [...counts.entries()].filter(([,n])=>n===1).map(([k])=>k).sort();
};
const initialBoundary=boundaryEdges(firstTriangles);

function collapse(tris:readonly TriIndex[], op:Collapse):TriIndex[]{
  const {from,to}=op;
  if(boundary(from)||boundary(to)) throw new Error('Attempt to collapse group exterior');
  const linked=tris.filter(t=>t.includes(from)&&t.includes(to));
  if(linked.length!==2)throw new Error('Collapse must be internal manifold edge');
  const common=[...neighbours(tris,from)].filter(v=>neighbours(tris,to).has(v)).sort((a,b)=>a-b);
  const opposite=linked.flatMap(t=>t.filter(v=>v!==from&&v!==to)).sort((a,b)=>a-b);
  if(common.join(':')!==opposite.join(':'))throw new Error('Link condition violated');
  const result=tris.map((tri)=>
    tri.map(v=>v===from?to:v) as unknown as TriIndex)
    .filter(tri=>new Set(tri).size===3);
  if(result.length!==tris.length-2 || result.some(t=>area2(t)<=0))
    throw new Error('Triangle flip or unexpected count');
  if(boundaryEdges(result).join('|')!==initialBoundary.join('|'))
    throw new Error('Group exterior changed');
  return result;
}

export const hierarchySnapshots: readonly (readonly TriIndex[])[]=(()=>{
  const result:TriIndex[][]=[firstTriangles];
  for(const op of collapseSequence) result.push(collapse(result.at(-1)!,op));
  return result;
})();
export const hierarchyFineTriangles=hierarchySnapshots[0];
export const hierarchyCoarseTriangles=hierarchySnapshots.at(-1)!;

const midX=uniqueX[2];
export const hierarchyFineIds:readonly number[]=COMPACT_LABELS;
export const hierarchyCoarseIds:readonly number[]=hierarchyCoarseTriangles.map((tri)=>{
  const center=tri.reduce((sum,id)=>sum+sourceVertices[id][0],0)/3;
  return center < midX ? 0 : 1;
});

function sphereFor(positions:readonly Vec3[]):Sphere{
  const center=[0,1,2].map((k)=>
    (Math.min(...positions.map(p=>p[k]))+Math.max(...positions.map(p=>p[k])))/2) as unknown as Vec3;
  return {
    center,
    radius:Math.max(...positions.map(p=>Math.hypot(
      p[0]-center[0],p[1]-center[1],p[2]-center[2]))),
  };
}
const vertexIds=(tris:readonly TriIndex[])=>[...new Set(tris.flatMap(t=>[...t]))];
export const fineLODBounds:readonly Sphere[]=Array.from({length:4},(_,id)=>{
  const tris=firstTriangles.filter((_,i)=>hierarchyFineIds[i]===id);
  return sphereFor(vertexIds(tris).map(v=>sourceVertices[v]));
});

function enclosingSphere(spheres:readonly Sphere[]):Sphere{
  const low=[0,1,2].map(k=>Math.min(...spheres.map(s=>s.center[k]-s.radius)));
  const high=[0,1,2].map(k=>Math.max(...spheres.map(s=>s.center[k]+s.radius)));
  const center:[number,number,number]=[0,1,2].map(k=>(low[k]+high[k])/2) as [number,number,number];
  const radius=Math.max(...spheres.map(s=>
    Math.hypot(...s.center.map((x,k)=>x-center[k]))+s.radius));
  return {center,radius};
}
export const coarseLODBounds=enclosingSphere(fineLODBounds);

// Educational geometric error: max vertical deviation at each original
// sampled vertex from the new piecewise-linear surface. It is NOT QEM
// collapse cost or UE's actual max simplification error.
function interpolateHeight(p:Vec3, tri:TriIndex):number | undefined{
  const [a,b,c]=tri.map(i=>sourceVertices[i]);
  const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(det)<1e-12)return undefined;
  const u=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/det;
  const v=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/det;
  const w=1-u-v;
  if(Math.min(u,v,w)<-1e-7)return undefined;
  return u*a[2]+v*b[2]+w*c[2];
}
const sampledError=Math.max(...sourceVertices.map(p=>{
  const sample=hierarchyCoarseTriangles
    .map(t=>interpolateHeight(p,t)).find(v=>v!==undefined);
  if(sample===undefined)throw new Error('Simplified surface misses original vertex');
  return Math.abs(p[2]-sample);
}));

export const hierarchyError={
  children: [0,0,0,0] as readonly number[],
  simplifyStep:sampledError,
  // Matches the shape of the verified UE5.8.4 Builder rule,
  // but the simplifyStep itself is the educational proxy above.
  parent:Math.max(sampledError,0),
};
export const hierarchyTransition={
  group:'G0',
  fineIds:['F0','F1','F2','F3'] as readonly string[],
  coarseIds:['C0','C1'] as readonly string[],
};

export function validateHierarchy(){
  if(hierarchySnapshots.length!==9 ||
      hierarchyFineTriangles.length!==32 ||
      hierarchyCoarseTriangles.length!==16)
    throw new Error('Unexpected hierarchy triangle counts');
  if(hierarchySnapshots.some((tris,i)=>tris.length!==32-i*2))
    throw new Error('Bad collapse sequence length');
  for(const id of [0,1,2,3])
    if(hierarchyFineIds.filter(x=>x===id).length!==8)
      throw new Error('Fine groups should be four times eight triangles');
  for(const id of [0,1])
    if(hierarchyCoarseIds.filter(x=>x===id).length!==8)
      throw new Error('Coarse groups should be two times eight triangles');
  for(const sphere of fineLODBounds){
    const separation=Math.hypot(...sphere.center.map((x,k)=>x-coarseLODBounds.center[k]));
    if(separation+sphere.radius>coarseLODBounds.radius+1e-5)
      throw new Error('Parent LOD sphere must enclose child LOD spheres');
  }
  if(!Number.isFinite(firstCollapseQEM)||firstCollapseQEM<0)
    throw new Error('Invalid demonstration QEM cost');\n  if(!Number.isFinite(hierarchyError.parent)||hierarchyError.parent<=0)
    throw new Error('No meaningful sample-based geometric error');
}
validateHierarchy();
