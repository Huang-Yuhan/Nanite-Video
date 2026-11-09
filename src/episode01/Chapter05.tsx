import React from 'react';
import {useCurrentFrame} from 'remotion';
import {
  hierarchyVertices,collapseSequence, hierarchySnapshots,
  fineLODBounds,coarseLODBounds,hierarchyError,type Sphere,
} from './ch03Hierarchy';
import {
  Scene,Guide,Cue,PatchGeometry,Exterior,makeView,projectLocal,pathFor,
  COLOR,MONO,FONT,smooth,mix,clamp,
} from './visuals';

export const CHAPTER_05_FPS=30;
export const CHAPTER_05_FRAMES=2160; // 72s workprint: pacing is revisable.

function ErrorSphere({sphere,view,color,opacity=1,strokeWidth=3,label}:{
  sphere:Sphere;view:ReturnType<typeof makeView>;color:string;
  opacity?:number;strokeWidth?:number;label?:string;
}) {
  const p=projectLocal(sphere.center,view);
  const edge:readonly [number,number,number]=[
    sphere.center[0]+sphere.radius,sphere.center[1],sphere.center[2]];
  const r=Math.abs(projectLocal(edge,view).x-p.x);
  return <g opacity={opacity}>
    <circle cx={p.x} cy={p.y} r={r} stroke={color} strokeWidth={strokeWidth}
      fill={color} fillOpacity={0.025} strokeDasharray="11 11"/>
    <circle cx={p.x} cy={p.y} r={5} fill={color}/>
    {label&&<text x={p.x} y={p.y-r-18} fill={color}
      fontSize={22} fontFamily={MONO} textAnchor="middle">{label}</text>}
  </g>;
}
const radius=coarseLODBounds.radius;
const worldErr=hierarchyError.parent;
const K=(0.3*Math.max(0.25,16-radius))/Math.max(worldErr,0.0001);
export const projectedTeachingError=(distance:number)=>
  (K*worldErr)/Math.max(0.25,distance-radius);

function CameraErrorProof({t}: {t:number}) {
  const show=smooth(43,46,t);
  const move=smooth(48,65,t);
  const cameraDist=mix(16,3.3,move);
  const error=projectedTeachingError(cameraDist);
  const hasRefined=error>1;
  const x=mix(600,1030,move);
  const color=hasRefined?COLOR.gold:COLOR.cyan;
  return (
    <g opacity={show}>
      <path d="M450 580 H1120" stroke={COLOR.muted} strokeWidth={2}
        strokeDasharray="10 14" opacity={0.35} fill="none"/>
      <circle cx={350} cy={570} r={130} fill="#21374f"
        stroke={COLOR.gold} strokeWidth={3} opacity={0.9}/>
      <text x={350} y={576} textAnchor="middle" fill={COLOR.white}
        fontFamily={MONO} fontSize={25}>GROUP</text>
      <g transform={'translate('+x+' 572)'}>
        <path d="M-34 -21 H14 Q24 -21 24 -10 V11 Q24 21 13 21 H-34 Z"
          fill="#20354b" stroke={COLOR.cyan} strokeWidth={3}/>
        <path d="M24 -10 L56 -29 V28 L24 10 Z"
          fill="#20354b" stroke={COLOR.cyan} strokeWidth={3}/>
      </g>
      <g fontFamily={MONO} textAnchor="middle">
        <text x={960} y={252} fill={COLOR.muted} fontSize={29}>
          WORLD ERROR: CONSTANT
        </text>
        <text x={960} y={321} fill={COLOR.white} fontSize={54}>
          {worldErr.toFixed(3)}
        </text>
        <text x={960} y={388} fill={COLOR.muted} fontSize={27}>
          PROJECTED ERROR
        </text>
        <text x={960} y={465} fill={color} fontSize={70}>
          {error.toFixed(2)+' px'}
        </text>
        <text x={960} y={758} fill={COLOR.muted} fontSize={24}>
          {'TEACHING THRESHOLD 1.00 px  ·  CAMERA DISTANCE '+cameraDist.toFixed(1)}
        </text>
        <text x={960} y={811} fill={color} fontSize={29}>
          {hasRefined?'COARSE EXCEEDS THRESHOLD → REFINE':'COARSE ERROR ACCEPTABLE'}
        </text>
      </g>
    </g>
  );
}

export const Episode01Chapter05:React.FC=()=>{
  const t=useCurrentFrame()/CHAPTER_05_FPS;
  const view=makeView(395,900,545,t);
  const first=smooth(0,1,t)*(1-smooth(15,18,t));
  const bounds=smooth(14,18,t)*(1-smooth(39,43,t));
  const childAlpha=smooth(22,25,t)*(1-smooth(35,40,t));
  const parentAlpha=smooth(28,33,t)*(1-smooth(39,43,t));
  const simplifyT=smooth(4,12,t);
  const moving={
    from:collapseSequence[0].from,to:collapseSequence[0].to,progress:simplifyT,
  };
  const sourceTris=hierarchySnapshots[0];
  return <Scene>
    <Guide title="05   /   GEOMETRIC ERROR & LOD BOUNDS"/>
    <g opacity={first}>
      {sourceTris.map((tri,i)=>(
        <polygon key={i} points={pathFor(tri,view,moving)}
          fill="#27405b" fillOpacity={0.62}
          stroke={COLOR.white} strokeWidth={1.9} strokeOpacity={0.76}/>
      ))}
      {(()=>{
        const a=projectLocal(hierarchyVertices[moving.from],view);
        const b=projectLocal(hierarchyVertices[moving.to],view);
        const p={x:mix(a.x,b.x,moving.progress),y:mix(a.y,b.y,moving.progress)};
        return <>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={COLOR.gold} strokeWidth={5} opacity={0.9}/>
          <circle cx={p.x} cy={p.y} r={14} fill={COLOR.gold}/>
          <path d={'M'+p.x+' '+p.y+' L'+p.x+' '+(p.y-110)}
            stroke={COLOR.cyan} strokeWidth={3} strokeDasharray="9 8"/>
          <text x={p.x+32} y={p.y-116} fill={COLOR.cyan}
            fontFamily={MONO} fontSize={24}>PLANE DISTANCE</text>
        </>;
      })()}
    </g>
    <g opacity={bounds}>
      <PatchGeometry level="fine" view={view} wire colors/>
      <Exterior view={view} opacity={0.5}/>
      {fineLODBounds.map((sphere,i)=>
        <ErrorSphere key={i} sphere={sphere} view={view}
          color={[COLOR.blue,COLOR.green,COLOR.orange,COLOR.purple][i]}
          opacity={childAlpha} strokeWidth={2}/>
      )}
      <ErrorSphere sphere={coarseLODBounds} view={view}
        color={COLOR.gold} opacity={parentAlpha}
        strokeWidth={4} label="GROUP LOD BOUNDS"/>
      <g fontFamily={MONO} textAnchor="middle"
        opacity={smooth(29,34,t)}>
        <text x={960} y={194} fontSize={25} fill={COLOR.muted}>
          PARENT ERROR = MAX(CHILD ERRORS, SIMPLIFY ERROR)
        </text>
        <text x={960} y={253} fontSize={43} fill={COLOR.gold}>
          {'MAX(0, '+hierarchyError.simplifyStep.toFixed(3)+') = '+
            hierarchyError.parent.toFixed(3)}
        </text>
        <text x={960} y={828} fontSize={20} fill={COLOR.muted}>
          TEACHING SAMPLE ERROR · UE 5.8.4 BUILDER USES SIMPLIFIER ERROR
        </text>
      </g>
    </g>
    {t>=40&&<CameraErrorProof t={t}/>}
    {t>=39&&t<45&&(
      <g opacity={smooth(39,41,t)*(1-smooth(43,45,t))}
        fontFamily={MONO} textAnchor="middle">
        <text x={960} y={350} fill={COLOR.gold} fontSize={35}>
          e(parent) ≥ e(child)
        </text>
        <text x={960} y={418} fill={COLOR.white} fontSize={35}>
          B(parent) ⊇ B(child)
        </text>
        <text x={960} y={492} fill={COLOR.cyan} fontSize={27}>
          ⇒ projected error stays ordered in the simplified model
        </text>
      </g>
    )}
    <Cue t={t} a={0} b={14}
      headline="QUADRIC ERROR METRIC · INTUITION"
      sub="Edge Collapse 要选择较低代价的位置，但 QEM 代价不是像素误差"/>
    <Cue t={t} a={14} b={27}
      headline="CHILD ERRORS + GROUP BOUNDS"
      sub="已有的误差球需要被父级保守包围"/>
    <Cue t={t} a={27} b={40}
      headline="FORCE PROJECTED MONOTONICITY"
      sub="父级 Error 不降低，LODBounds 包含子级误差球"/>
    <Cue t={t} a={40} b={51}
      headline="WORLD ERROR ≠ SCREEN ERROR"
      sub="距离摄像机越近，同样的空间偏差通常越显眼"/>
    <Cue t={t} a={51} b={65}
      headline="SCREEN-SPACE THRESHOLD"
      sub="投影误差超过阈值，粗粒度几何就需要细化"/>
    <Cue t={t} a={65} b={72}
      headline="OFFLINE METADATA → RUNTIME DECISION"
      sub="为什么记录 Error 和 Bounds？现在终于有了答案"/>
  </Scene>;
};
