import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  hierarchyVertices, hierarchyFineTriangles, hierarchyCoarseTriangles,
  hierarchyFineIds, hierarchyCoarseIds, type TriIndex,
} from './ch03Hierarchy';
import type {Vec3} from './ch01Geometry';

export const W=1920, H=1080;
export const COLOR={
  bg:'#0d111e', white:'#e8edf8', muted:'#8da1bb', cyan:'#59d3e8',
  gold:'#ffcf70', orange:'#ffa663', red:'#ff6f83',
  blue:'#5bb8ed', green:'#70cc9e', purple:'#b794ef',
};
export const FINE_COLORS=[COLOR.blue,COLOR.green,COLOR.orange,COLOR.purple];
export const COARSE_COLORS=[COLOR.blue,COLOR.orange];
export const FONT="'Inter', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
export const MONO="'JetBrains Mono', 'Cascadia Code', monospace";
export type XY={x:number,y:number};
export const clamp=(t:number)=>Math.max(0,Math.min(1,t));
export const smooth=(a:number,b:number,t:number)=>{
  if(b===a)return t>=b?1:0;
  const u=clamp((t-a)/(b-a));
  return u*u*(3-2*u);
};
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;

const bounds=hierarchyVertices.reduce((a,p)=>({
  minX:Math.min(a.minX,p[0]),maxX:Math.max(a.maxX,p[0]),
  minY:Math.min(a.minY,p[1]),maxY:Math.max(a.maxY,p[1]),
}),{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});
export const localCenter:Vec3=[
  (bounds.minX+bounds.maxX)/2,
  (bounds.minY+bounds.maxY)/2,
  hierarchyVertices.reduce((sum,p)=>sum+p[2],0)/hierarchyVertices.length,
];

export type LocalCamera={cx:number,cy:number,scale:number,yaw:number,pitch:number};
export function projectLocal(p:Vec3,{
  cx,cy,scale,yaw,pitch,
}:LocalCamera):XY {
  const x=p[0]-localCenter[0],y=p[1]-localCenter[1],z=p[2]-localCenter[2];
  const xx=x*Math.cos(yaw)+z*Math.sin(yaw);
  const zz=-x*Math.sin(yaw)+z*Math.cos(yaw);
  const yy=y*Math.cos(pitch)-zz*Math.sin(pitch);
  const dep=y*Math.sin(pitch)+zz*Math.cos(pitch);
  const perspective=6.5/(6.5-dep*0.24);
  return {x:cx+xx*scale*perspective,y:cy-yy*scale*perspective};
}
export const makeView=(scale=580,cx=960,cy=515,t=0):LocalCamera=>({
  cx,cy,scale,yaw:0.18+Math.sin(t*0.08)*0.06,pitch:-0.30,
});
const overrideVertex=(id:number,moving?:{
  from:number,to:number,progress:number,
}):Vec3=>{
  if(!moving||id!==moving.from)return hierarchyVertices[id];
  const a=hierarchyVertices[moving.from],b=hierarchyVertices[moving.to];
  return [mix(a[0],b[0],moving.progress),mix(a[1],b[1],moving.progress),
    mix(a[2],b[2],moving.progress)];
};
export const pathFor=(tri:TriIndex,view:LocalCamera,moving?:{
  from:number,to:number,progress:number,
})=>tri.map(id=>{
  const p=projectLocal(overrideVertex(id,moving),view);
  return p.x.toFixed(1)+','+p.y.toFixed(1);
}).join(' ');

export function PatchGeometry({
  level='fine',view,opacity=1,colors=true,wire=true,moving,glow=0,
}:{
  level?:'fine'|'coarse';view:LocalCamera;opacity?:number;
  colors?:boolean;wire?:boolean;moving?:{from:number,to:number,progress:number};
  glow?:number;
}) {
  const tris=level==='fine'?hierarchyFineTriangles:hierarchyCoarseTriangles;
  const ids=level==='fine'?hierarchyFineIds:hierarchyCoarseIds;
  const palette=level==='fine'?FINE_COLORS:COARSE_COLORS;
  return (
    <g opacity={opacity}>
      {tris.map((tri,i)=>(
        <polygon key={level+'-'+i} points={pathFor(tri,view,moving)}
          fill={colors?palette[ids[i]]:'#23394d'}
          fillOpacity={colors?0.36+glow*0.10:0.7}
          stroke={COLOR.white} strokeWidth={wire?2.15:0}
          strokeOpacity={wire?0.73:0}
          strokeLinejoin="round"/>
      ))}
    </g>
  );
}
export const boundaryLoop=[0,1,2,3,4,9,14,19,24,23,22,21,20,15,10,5];
export function Exterior({
  view,opacity=1,color=COLOR.gold,strokeWidth=4,
}:{
  view:LocalCamera;opacity?:number;color?:string;strokeWidth?:number;
}){
  const d=boundaryLoop.map((v,i)=>{
    const p=projectLocal(hierarchyVertices[v],view);
    return (i===0?'M':'L')+p.x.toFixed(1)+' '+p.y.toFixed(1);
  }).join(' ')+' Z';
  return <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth}
    strokeLinejoin="round" opacity={opacity}/>;
}
export const FINE_NODES:XY[]=[
  {x:540,y:675},{x:825,y:675},{x:1110,y:675},{x:1395,y:675},
];
export const COARSE_NODES:XY[]=[{x:790,y:335},{x:1150,y:335}];
export function ClusterDag({
  fine=FINE_NODES,coarse=COARSE_NODES,selected='coarse',opacity=1,
  labels=true,emphasis=1,lineAlpha=0.40,
}:{
  fine?:XY[];coarse?:XY[];selected?:'fine'|'coarse'|'none';opacity?:number;
  labels?:boolean;emphasis?:number;lineAlpha?:number;
}){
  return (
    <g opacity={opacity}>
      {fine.flatMap((a,i)=>coarse.map((b,j)=>(
        <line key={i+'-'+j} x1={a.x} y1={a.y-29}
          x2={b.x} y2={b.y+30} stroke={COLOR.muted}
          strokeWidth={2.3} opacity={lineAlpha}/>
      )))}
      {fine.map((p,i)=>{
        const active=selected==='fine';
        return <g key={'F'+i}>
          <circle cx={p.x} cy={p.y} r={active?45:36} fill={COLOR.bg}
            stroke={FINE_COLORS[i]} strokeWidth={active?5:3}
            opacity={active?1:0.60}/>
          {active&&<circle cx={p.x} cy={p.y} r={9} fill={COLOR.gold}
            opacity={emphasis}/>}
          {labels&&<text x={p.x} y={p.y+71} textAnchor="middle"
            fill={active?COLOR.white:COLOR.muted} fontFamily={MONO}
            fontSize={29}>{'F'+i}</text>}
        </g>;
      })}
      {coarse.map((p,i)=>{
        const active=selected==='coarse';
        return <g key={'C'+i}>
          <circle cx={p.x} cy={p.y} r={active?53:42} fill={COLOR.bg}
            stroke={COARSE_COLORS[i]} strokeWidth={active?5:3}
            opacity={active?1:0.60}/>
          {active&&<circle cx={p.x} cy={p.y} r={10} fill={COLOR.gold}
            opacity={emphasis}/>}
          {labels&&<text x={p.x} y={p.y-65} textAnchor="middle"
            fill={active?COLOR.white:COLOR.muted} fontFamily={MONO}
            fontSize={29}>{'C'+i}</text>}
        </g>;
      })}
    </g>
  );
}

export const Scene:React.FC<{children:React.ReactNode}>=({children})=>(
  <AbsoluteFill style={{
    overflow:'hidden',color:COLOR.white,fontFamily:FONT,
    background:'radial-gradient(ellipse at 49% 44%, #19283c 0%, #0d111e 72%)',
  }}>
    <svg viewBox={'0 0 '+W+' '+H} width="100%" height="100%">
      <defs>
        <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5"/>
        </filter>
        <linearGradient id="gold-trace" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLOR.gold} stopOpacity=".12"/>
          <stop offset="50%" stopColor={COLOR.gold} stopOpacity=".95"/>
          <stop offset="100%" stopColor={COLOR.gold} stopOpacity=".12"/>
        </linearGradient>
      </defs>
      {children}
    </svg>
  </AbsoluteFill>
);
export function Cue({headline,sub,t,a=0,b=999}:{
  headline:string;sub:string;t:number;a?:number;b?:number;
}){
  const alpha=smooth(a,a+0.55,t)*(1-smooth(b-0.5,b,t));
  return (
    <g opacity={alpha} textAnchor="middle">
      <text x={960} y={934} fontFamily={MONO} fontSize={26}
        letterSpacing={3.5} fill={COLOR.cyan}>{headline}</text>
      <text x={960} y={1002} fontSize={39} fill={COLOR.white}>{sub}</text>
    </g>
  );
}
export const Guide:React.FC<{title:string;progress?:number}>=({title,progress=1})=>(
  <g opacity={progress}>
    <text x={104} y={96} fill={COLOR.muted} fontFamily={MONO}
      fontSize={22} letterSpacing={2.7}>{title}</text>
  </g>
);
