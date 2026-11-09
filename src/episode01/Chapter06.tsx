import React from 'react';
import {useCurrentFrame} from 'remotion';
import {projectedTeachingError} from './Chapter05';
import {
  Scene,Guide,Cue,PatchGeometry,ClusterDag,Exterior,makeView,
  COLOR,MONO,FONT,smooth,mix,clamp,FINE_NODES,COARSE_NODES,
} from './visuals';

export const CHAPTER_06_FPS=30;
export const CHAPTER_06_FRAMES=1800; // Workprint, 60 seconds.

function CameraIcon({x,y,opacity=1}:{
  x:number;y:number;opacity?:number;
}){
  return <g transform={'translate('+x+' '+y+')'} opacity={opacity}>
    <path d="M-42 -25 H13 Q24 -25 24 -11 V11 Q24 25 13 25 H-42 Z"
      stroke={COLOR.gold} strokeWidth={3.2} fill="#1a3047"/>
    <path d="M24 -12 L53 -31 V30 L24 12 Z"
      stroke={COLOR.gold} strokeWidth={3.2} fill="#1a3047"/>
    <circle cx={-13} cy={0} r={9} fill={COLOR.cyan}/>
  </g>;
}
const stages=[
  ['MESH','Geometry'],['GRAPH','Adjacency'],['GROUP','Replacement'],
  ['DAG','Dependencies'],['ERROR','Bounds'],
] as const;

export const Episode01Chapter06:React.FC=()=>{
  const t=useCurrentFrame()/CHAPTER_06_FPS;
  const timeline=smooth(0,15,t);
  const cameraProgress=smooth(18,42,t);
  const cameraDist=mix(16,3.3,cameraProgress);
  const screenError=projectedTeachingError(cameraDist);
  const fineSelected=screenError>1;
  const sceneAppear=smooth(14,17,t)*(1-smooth(48,51,t));
  const meshView=makeView(mix(360,445,cameraProgress),645,530,t);
  const zoomed=0;
  const diagramCenter={
    fine:FINE_NODES.map((p)=>({x:(p.x-960)*0.58+1390,y:(p.y-505)*0.73+555})),
    coarse:COARSE_NODES.map((p)=>({x:(p.x-960)*0.58+1390,y:(p.y-505)*0.73+555})),
  };
  const end=smooth(48,52,t);
  const title=smooth(51,54,t);
  return <Scene>
    <Guide title="06   /   FROM OFFLINE BUILD TO RUNTIME LOD"
      progress={1-smooth(52,56,t)}/>
    <g opacity={1-smooth(12,16,t)}>
      <PatchGeometry level="fine" view={makeView(435,960,488,t)} opacity={1} colors/>
      <Exterior view={makeView(435,960,488,t)} opacity={0.35}/>
      {stages.map(([id,label],i)=>{
        const progress=clamp((timeline*5-i)*1.9);
        const x=335+i*308;
        return <g key={id} opacity={progress}>
          <circle cx={x} cy={188} r={progress*29}
            stroke={i===4?COLOR.gold:COLOR.cyan}
            strokeWidth={3} fill={COLOR.bg}/>
          <text x={x} y={198} textAnchor="middle" fontFamily={MONO}
            fill={COLOR.white} fontSize={18}>{i+1}</text>
          <text x={x} y={257} textAnchor="middle" fill={COLOR.white}
            fontFamily={MONO} fontSize={22}>{id}</text>
          <text x={x} y={288} textAnchor="middle" fill={COLOR.muted}
            fontSize={18}>{label}</text>
          {i<4&&<line x1={x+40} y1={188} x2={x+260} y2={188}
            stroke={COLOR.gold} strokeWidth={2} opacity={0.45*progress}/>}
        </g>;
      })}
    </g>
    {sceneAppear>0.001&&(
      <g opacity={sceneAppear}>
        <PatchGeometry level={fineSelected?'fine':'coarse'} view={meshView}
          colors wire glow={zoomed}/>
        <Exterior view={meshView} opacity={0.5}/>
        <g opacity={smooth(17,22,t)}>
          <ClusterDag fine={diagramCenter.fine} coarse={diagramCenter.coarse}
            selected={fineSelected?'fine':'coarse'}
            opacity={1} lineAlpha={0.42}/>
        </g>
        <CameraIcon x={mix(130,400,cameraProgress)}
          y={mix(721,648,cameraProgress)}/>
        <g opacity={smooth(20,23,t)}>
          <path d={'M'+mix(175,447,cameraProgress)+' '+
            mix(709,642,cameraProgress)+' Q 560 595 655 523'}
            stroke={COLOR.gold} strokeWidth={2} strokeDasharray="8 11"
            fill="none" opacity={0.45}/>
          <text x={1405} y={169} fontFamily={MONO} textAnchor="middle"
            fontSize={22} fill={COLOR.muted}>Cluster DAG</text>
          <text x={647} y={171} fontFamily={MONO} textAnchor="middle"
            fontSize={22} fill={COLOR.muted}>Camera / Geometry</text>
          <text x={1470} y={844} fill={fineSelected?COLOR.gold:COLOR.cyan}
            fontFamily={MONO} textAnchor="middle" fontSize={26}>
            {fineSelected?'4 FINE CLUSTERS':'2 COARSE CLUSTERS'}
          </text>
          <text x={910} y={846} fill={COLOR.white}
            fontFamily={MONO} textAnchor="middle" fontSize={27}>
            {'ERROR '+screenError.toFixed(2)+' px'}
          </text>
          <text x={910} y={890} fill={COLOR.muted}
            fontFamily={MONO} textAnchor="middle" fontSize={20}>
            {'THRESHOLD 1.00 px · DISTANCE '+cameraDist.toFixed(1)}
          </text>
        </g>
      </g>
    )}
    {end>0&&(
      <g opacity={end}>
        <rect width={1920} height={1080} fill={COLOR.bg} opacity={0.95}/>
        <g opacity={title} textAnchor="middle">
          <text x={960} y={340} fill={COLOR.muted}
            fontFamily={MONO} fontSize={23} letterSpacing={2}>
            Nanite / 01
          </text>
          <text x={960} y={470} fill={COLOR.white}
            fontFamily={FONT} fontSize={60} fontWeight={500}>
            从 Mesh 到 Cluster DAG
          </text>
          <text x={960} y={618} fill={COLOR.muted}
            fontFamily={FONT} fontSize={26}>
            下一期：Hierarchy、Culling 与 Rasterization
          </text>
        </g>
      </g>
    )}
    <Cue t={t} a={0} b={14}
      headline="OFFLINE BUILD"
      sub="Mesh → Triangle Graph → Group → DAG → Error / Bounds"/>
    <Cue t={t} a={14} b={25}
      headline="ONE CAMERA, MANY LOCAL LODS"
      sub="Camera 改变，Projected Error 跟着变化"/>
    <Cue t={t} a={25} b={43}
      headline="A LEGAL GROUP CUT"
      sub="一旦 Coarse 超出阈值，整组 Fine 作为合法集合接替"/>
    <Cue t={t} a={43} b={50}
      headline="WHY, NOT HOW"
      sub="这里只解释选择的原因；GPU 的高效执行留给第二期"/>
  </Scene>;
};
