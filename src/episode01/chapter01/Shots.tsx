import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {traditionalLods,approachProgress,lodForApproach} from '../traditionalLod';
import {
  W,H,BASE,INK,MUTED,MONO,BottomLine,RockModel,smooth,lerp,
} from './Visuals';
import {EPISODE_01_FPS,CHAPTER_01_SHOTS,type ShotId} from './Timeline';
import {CliffModel} from './CliffModel';
import {TeachingPatch} from './TeachingPatch';

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
  const captions=[
    '模型表面越复杂，通常就需要越多的三角形来表现。',
    '但当物体远离摄像机，很多细节在屏幕上已经难以分辨。',
    '这时，我们还需要为这些看不见的细节，保留全部三角形吗？',
  ];
  const beatDuration=duration/captions.length;
  const beat=Math.min(captions.length-1,Math.floor(time/beatDuration));
  const beatTime=time-beat*beatDuration;
  const opacity=smooth(0.2,0.7,beatTime)*
    (1-smooth(beatDuration-0.5,beatDuration,beatTime));
  return <Stage caption={captions[beat]}
    opacity={opacity}>{null}</Stage>;
};

/** 01. The same scanned rock, using its four author-supplied LOD meshes. */
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
            {traditionalLods[i].triangleCount}
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

/** 03. A scanned cliff, switching complete author-supplied LOD meshes. */
export const WholeMeshLimit:React.FC=()=>{
  const {u,time}=useShotTime('wall');
  const level=u<1/3?'coarse':'fine';
  const caption=u<1/3?
    '但同一块岩壁横跨远近，粗 LOD 也会降低近处的精度。':u<2/3?
    '换成细 LOD，近处清楚了，远处却也保留了大量三角形。':
    '能不能只增加近处需要的细节？';
  const nearWire=smooth(0.07,0.14,u)*(1-smooth(0.27,0.32,u))*0.42;
  const farWire=smooth(0.40,0.46,u)*(1-smooth(0.60,0.66,u))*0.34;
  return <Stage caption={caption}>
    <g opacity={smooth(0,1,time)}>
      <CliffModel level={level} nearWire={nearWire} farWire={farWire}/>
    </g>
  </Stage>;
};

/** 04. Pixel-grid is a brief illustrative overlay, not a performance claim. */
export const PixelBudget:React.FC=()=>{
  const {u}=useShotTime('pixels');
  const grid=smooth(0.08,0.22,u)*(1-smooth(0.55,0.78,u));
  return <Stage caption="Nanite 希望几何开销尽可能随屏幕所需的细节变化。">
    {/* The same surface stays opaque across consecutive shot boundaries. */}
    <CliffModel level="fine"/>
    <g opacity={grid*0.5}>
      {Array.from({length:24},(_,i)=><line key={'v'+i}
        x1={500+i*40} x2={500+i*40} y1={230} y2={790}
        stroke={INK} strokeOpacity={0.25} strokeWidth={0.85}/>)}
      {Array.from({length:15},(_,i)=><line key={'h'+i}
        x1={500} x2={1420} y1={230+i*40} y2={230+i*40}
        stroke={INK} strokeOpacity={0.25} strokeWidth={0.85}/>)}
    </g>
  </Stage>;
};

/** 05. From the wall to the cluster chapter: geometry is the subject. */
export const ClusteringBridge:React.FC=()=>{
  const {u}=useShotTime('clusters');
  const teaching=smooth(0.42,0.72,u);
  const caption=u<0.42?'这需要把几何组织成更小、可以独立选择的单元。':
    '接下来，用一块简化网格观察三角形如何分簇。';
  return <Stage caption={caption}>
    <g opacity={1-teaching}><CliffModel level="fine"/></g>
    <g opacity={teaching}><TeachingPatch/></g>
  </Stage>;
};
