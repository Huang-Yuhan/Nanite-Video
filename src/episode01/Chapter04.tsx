import React from 'react';
import {useCurrentFrame} from 'remotion';
import {
  Scene,Guide,Cue,PatchGeometry,ClusterDag,Exterior,makeView,
  FINE_NODES,COARSE_NODES,COLOR,MONO,FONT,smooth,
} from './visuals';

export const CHAPTER_04_FPS=30;
export const CHAPTER_04_FRAMES=1500;

export const Episode01Chapter04:React.FC=()=>{
  const t=useCurrentFrame()/CHAPTER_04_FPS;
  const meshAlpha=1-smooth(4,9,t);
  const graphAlpha=smooth(5,11,t);
  const edgesAlpha=smooth(9,14,t);
  const wrong=smooth(19,21,t)*(1-smooth(28,30,t));
  const legal=smooth(30,32,t);
  const selected=t<35?'coarse':'fine';
  const swapFlash=Math.max(0,1-Math.abs(t-35)/1.0);
  const introView=makeView(415,960,486,t);
  return (
    <Scene>
      <Guide title="04   /   CLUSTER DEPENDENCY DAG · SINGLE GROUP EXAMPLE"/>
      <g opacity={meshAlpha}>
        <PatchGeometry level="fine" view={introView} colors wire/>
        <Exterior view={introView} opacity={0.5}/>
      </g>
      <g opacity={graphAlpha}>
        <ClusterDag selected={legal>0.3?selected:'none'}
          lineAlpha={edgesAlpha*0.52} emphasis={1}/>
      </g>
      <g opacity={graphAlpha} fontFamily={MONO} fontSize={27}
        textAnchor="middle">
        <text x={960} y={194} fill={COLOR.muted}>COARSE · LOW DETAIL</text>
        <text x={960} y={816} fill={COLOR.muted}>FINE · HIGH DETAIL</text>
      </g>
      {wrong>0&&(
        <g opacity={wrong}>
          <path d={'M'+FINE_NODES[0].x+' '+(FINE_NODES[0].y-36)+
            ' L'+COARSE_NODES[0].x+' '+(COARSE_NODES[0].y+53)}
            fill="none" stroke={COLOR.red} strokeWidth={9}
            strokeDasharray="15 14" strokeLinecap="round"/>
          <circle cx={FINE_NODES[0].x} cy={FINE_NODES[0].y}
            r={53} stroke={COLOR.red} strokeWidth={5} fill="none"/>
          <circle cx={COARSE_NODES[0].x} cy={COARSE_NODES[0].y}
            r={62} stroke={COLOR.red} strokeWidth={5} fill="none"/>
          <text x={1520} y={528} fill={COLOR.red}
            fontFamily={MONO} fontSize={29} textAnchor="middle">
            INVALID PARTIAL CUT
          </text>
          <text x={1520} y={571} fill={COLOR.muted}
            fontFamily={FONT} fontSize={26} textAnchor="middle">
            不能只替换一部分 Group
          </text>
        </g>
      )}
      {legal>0&&(
        <g opacity={legal} fontFamily={MONO} textAnchor="middle">
          <text x={960} y={898} fill={COLOR.gold} fontSize={29}>
            {selected==='coarse'?'SELECTED: C0 + C1':'SELECTED: F0 + F1 + F2 + F3'}
          </text>
          <path d={selected==='coarse'?'M700 270 H1240':'M460 736 H1480'}
            stroke={COLOR.gold} strokeWidth={5} strokeLinecap="round"
            fill="none" opacity={0.68}/>
        </g>
      )}
      {swapFlash>0&&(
        <rect x={0} y={0} width={1920} height={1080}
          fill={COLOR.gold} opacity={swapFlash*0.06}/>
      )}
      <Cue t={t} a={0} b={9}
        headline="FINE SET → COARSE SET"
        sub="一次简化：四个 Fine 共同生成两个 Coarse"/>
      <Cue t={t} a={9} b={19.5}
        headline="MANY-TO-MANY DEPENDENCIES"
        sub="这是一个 Group 的 4→2 多对多依赖示例，不代表完整多层 DAG"/>
      <Cue t={t} a={19.5} b={30.5}
        headline="LEGAL LOD CUT"
        sub="随意混用局部 Fine 和 Coarse，可能造成缺失或重叠"/>
      <Cue t={t} a={30.5} b={41.0}
        headline="GROUP-WIDE REPLACEMENT"
        sub="整个集合一起替换，得到覆盖正确的 Cut"/>
      <Cue t={t} a={41.0} b={50.1}
        headline="DAG IS AN OFFLINE DEPENDENCY"
        sub="有了层级，还需要衡量每次变粗究竟损失多少几何细节"/>
    </Scene>
  );
};
