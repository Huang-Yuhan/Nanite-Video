import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {traditionalLods,approachProgress,lodForApproach} from '../traditionalLod';
import {wallMeshes,type WallMode} from '../ch01Geometry';
import {
  W,H,BASE,INK,MUTED,MONO,BottomLine,RockModel,TriangleSurface,
  ClusterEdges,viewAt,smooth,lerp,
} from './Visuals';
import {EPISODE_01_FPS,CHAPTER_01_SHOTS,type ShotId} from './Timeline';

const shotDuration=(id:ShotId)=>
  CHAPTER_01_SHOTS.find(s=>s.id===id)!.seconds;
const useShotTime=(id:ShotId)=>{
  const time=useCurrentFrame()/EPISODE_01_FPS;
  const duration=shotDuration(id);
  return {time,duration,u:Math.max(0,Math.min(1,time/duration))};
};
const Stage:React.FC<{children:React.ReactNode;caption:string;opacity?:number}>=
  ({children,caption,opacity=1})=>
  <AbsoluteFill style={{overflow:'hidden',background:BASE}}>
    <svg viewBox={'0 0 '+W+' '+H} width="100%" height="100%">
      {children}
      <BottomLine text={caption} opacity={opacity}/>
    </svg>
  </AbsoluteFill>;

/** 00. No image yet: the narration introduces the problem. */
export const Opening:React.FC=()=>{
  const {time,duration}=useShotTime('intro');
  const opacity=smooth(0.4,1.8,time)*(1-smooth(duration-0.7,duration,time));
  return <Stage caption="对于远处的物体，我们通常不需要它的全部几何细节。"
    opacity={opacity}>{null}</Stage>;
};

/** 01. The same parametric rock, at four decreasing triangle budgets. */
export const TraditionalVersions:React.FC=()=>{
  const {time,duration}=useShotTime('versions');
  const opacity=smooth(0,1.0,time)*(1-smooth(duration-0.7,duration,time));
  return <Stage caption="因此，传统 LOD 会为同一个模型准备多个精度版本。"
    opacity={opacity}>
    <g opacity={opacity}>
      {[0,1,2,3].map(i=>{
        const x=310+i*430;
        return <g key={i}>
          <RockModel level={i} cx={x} cy={489} size={142}/>
          <text x={x} y={733} fill={INK} fontFamily={MONO}
            textAnchor="middle" fontSize={29}>{'LOD'+i}</text>
          <text x={x} y={779} fill={MUTED} fontFamily={MONO}
            textAnchor="middle" fontSize={22}>
            {traditionalLods[i].triangleCount+' triangles'}
          </text>
        </g>;
      })}
    </g>
  </Stage>;
};

/** 02. Continuous dolly, discrete whole-object LOD switches. */
export const CameraAndLodList:React.FC=()=>{
  const {time,duration,u}=useShotTime('approach');
  const opacity=smooth(0,1.0,time)*(1-smooth(duration-0.8,duration,time));
  // Leave a short hold at each endpoint of the dolly.
  const progress=approachProgress((u-0.07)/0.86);
  const level=lodForApproach(progress);
  const size=lerp(95,345,progress);
  return <Stage caption="摄像机靠近时，整个模型在预先准备的版本之间切换。"
    opacity={opacity}>
    <g opacity={opacity}>
      <line x1={1280} y1={175} x2={1280} y2={850}
        stroke={MUTED} strokeWidth={1} opacity={0.38}/>
      <RockModel level={level} cx={660} cy={490} size={size}/>
      <text x={116} y={136} fill={MUTED} fontFamily={MONO}
        fontSize={22}>Camera</text>
      <text x={116} y={817} fill={MUTED} fontFamily={MONO}
        fontSize={22}>{'距离逐渐缩短   '+(16-12*progress).toFixed(1)}</text>
      <text x={1405} y={270} fill={MUTED} fontFamily={MONO}
        fontSize={25}>LOD List</text>
      {[0,1,2,3].map(i=>{
        const y=340+i*115;
        return <g key={i}>
          {level===i&&<rect x={1390} y={y} width={400} height={89}
            rx={8} fill={INK} fillOpacity={0.11}
            stroke={INK} strokeOpacity={0.64} strokeWidth={1.5}/>}
          <text x={1415} y={y+55} fill={level===i?INK:MUTED}
            fontFamily={MONO} fontSize={29}>{'LOD'+i}</text>
          <text x={1740} y={y+55} fill={level===i?INK:MUTED}
            fontFamily={MONO} fontSize={22} textAnchor="end">
            {traditionalLods[i].triangleCount}
          </text>
        </g>;
      })}
    </g>
  </Stage>;
};

const Wall:React.FC<{
  time:number;mode:WallMode;colorProgress?:number;gridOpacity?:number;
  partitionOpacity?:number;captionTop?:string;
}>=({time,mode,colorProgress=0,gridOpacity=0,partitionOpacity=0,captionTop})=>{
  const view=viewAt(time);
  return <>
    <TriangleSurface mode={mode} view={view} colorProgress={colorProgress}
      wireOpacity={0.62} glow={0}/>
    {partitionOpacity>0&&<ClusterEdges view={view} opacity={partitionOpacity}/>}
    {gridOpacity>0&&<g opacity={gridOpacity}>
      {Array.from({length:33},(_,i)=><line key={'v'+i}
        x1={320+i*40} x2={320+i*40} y1={255} y2={775}
        stroke={INK} strokeOpacity={0.17} strokeWidth={0.85}/>)}
      {Array.from({length:14},(_,i)=><line key={'h'+i}
        x1={320} x2={1600} y1={255+i*40} y2={255+i*40}
        stroke={INK} strokeOpacity={0.17} strokeWidth={0.85}/>)}
    </g>}
    {captionTop&&<text x={960} y={195} textAnchor="middle"
      fill={MUTED} fontFamily={MONO} fontSize={25}>{captionTop}</text>}
  </>;
};

/** 03. Use the same wall from the previous workprint. */
export const WholeMeshLimit:React.FC=()=>{
  const {u,duration,time}=useShotTime('wall');
  const phase=u<1/3?'coarse':u<2/3?'fine':'local';
  const caption=u<2/3?'但同一个 Mesh 通常只能整体选择一个 LOD。':
    '近处需要精细几何，远处却不必保留同样多的三角形。';
  const mode:WallMode=phase;
  const label=phase==='local'?'Local detail':'Whole Mesh';
  return <Stage caption={caption}>
    <g opacity={smooth(0,1,time)}>
      <Wall time={u*duration} mode={mode}
        colorProgress={phase==='local'?smooth(2/3,0.80,u)*0.48:0}
        captionTop={label+' · '+wallMeshes[mode].triCount+' triangles'}/>
    </g>
  </Stage>;
};

/** 04. Pixel-grid is a brief illustrative overlay, not a performance claim. */
export const PixelBudget:React.FC=()=>{
  const {u,time}=useShotTime('pixels');
  const grid=smooth(0.08,0.22,u)*(1-smooth(0.55,0.78,u));
  return <Stage caption="Nanite 希望几何开销尽可能随屏幕所需的细节变化。">
    <g opacity={smooth(0,0.8,time)}>
      <Wall time={21+u*13} mode="local" colorProgress={0.48}
        gridOpacity={grid}/>
    </g>
  </Stage>;
};

/** 05. From the wall to the cluster chapter: geometry is the subject. */
export const ClusteringBridge:React.FC=()=>{
  const {u,time}=useShotTime('clusters');
  return <Stage caption="这需要把几何组织成更小、可以独立选择的单元。">
    <g opacity={smooth(0,0.8,time)}>
      <Wall time={34+u*8} mode="local" colorProgress={0.48}
        partitionOpacity={smooth(0.08,0.58,u)*0.63}/>
    </g>
  </Stage>;
};
