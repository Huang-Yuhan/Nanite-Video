import React from 'react';
import {dagEdges,teachingCuts,type DagId} from './lodDagTeaching';
import {useCurrentFrame} from 'remotion';
import {
  Scene,Guide,Cue,PatchGeometry,ClusterDag,Exterior,makeView,
  FINE_NODES,COARSE_NODES,COLOR,MONO,FONT,smooth,
} from './visuals';


/** A separate synthetic multi-level example, not the mesh built in Chapter 03. */
const MultiLevelCut:React.FC<{t:number}>=({t})=>{
  const alpha=smooth(38,41,t);
  const phase=t<43?'coarse':t<46?'middle':'locallyRefined';
  const chosen:readonly DagId[]=teachingCuts[phase];
  const nodes:Record<string,{x:number;y:number}>={
    ...Object.fromEntries(Array.from({length:8},(_,i)=>['F'+i,{x:215+i*213,y:750}])),
    ...Object.fromEntries(Array.from({length:4},(_,i)=>['M'+i,{x:330+i*420,y:505}])),
    C0:{x:750,y:245},C1:{x:1170,y:245},
  };
  return <g opacity={alpha} fontFamily={MONO}>
    <text x={960} y={137} fontSize={29} fill={COLOR.muted} textAnchor="middle">
      SYNTHETIC THREE-LEVEL DAG · TWO LOWER GROUPS
    </text>
    {dagEdges.map(([a,b],i)=>{
      const from=nodes[a],to=nodes[b];
      return <line key={i} x1={from.x} y1={from.y-29}
        x2={to.x} y2={to.y+29} stroke={COLOR.muted}
        strokeWidth={2} opacity={0.30}/>;
    })}
    {Object.entries(nodes).map(([id,p])=>{
      const active=chosen.includes(id as DagId);
      const col=id.startsWith('C')?COLOR.gold:id.startsWith('M')?COLOR.cyan:COLOR.green;
      return <g key={id}>
        <circle cx={p.x} cy={p.y} r={active?37:30}
          fill={COLOR.bg} stroke={col} strokeWidth={active?5:2}
          opacity={active?1:0.57}/>
        <text x={p.x} y={p.y+8} fontSize={23} textAnchor="middle"
          fill={active?COLOR.white:COLOR.muted}>{id}</text>
      </g>;
    })}
    <path d="M 125 622 V 827 H 1000 V 622" fill="none"
      stroke={COLOR.green} opacity={phase==='locallyRefined'?0.75:0.15}
      strokeDasharray="8 9" strokeWidth={2}/>
    <text x={960} y={891} fontSize={27} fill={COLOR.gold}
      textAnchor="middle">
      {phase==='coarse'?'CUT: 2 COARSE':phase==='middle'?
        'CUT: 4 INTERMEDIATE':'CUT: 4 FINE (LEFT) + 2 INTERMEDIATE (RIGHT)'}
    </text>
  </g>;
};

export const CHAPTER_04_FPS=30;
export const CHAPTER_04_FRAMES=1500;

export const Episode01Chapter04:React.FC=()=>{
  const t=useCurrentFrame()/CHAPTER_04_FPS;
  const meshAlpha=1-smooth(4,9,t);
  const originalFade=1-smooth(37,40,t);
  const graphAlpha=smooth(5,11,t)*originalFade;
  const edgesAlpha=smooth(9,14,t);
  const wrong=smooth(19,21,t)*(1-smooth(28,30,t));
  const legal=smooth(30,32,t)*originalFade;
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
      {t>=38&&<MultiLevelCut t={t}/>}
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
        headline="GROUP CUTS COMPOSE ACROSS LEVELS"
        sub="多级 DAG 可在不同 Group 选择不同精度；此图是教学构造，不是 UE 实测"/>
    </Scene>
  );
};
