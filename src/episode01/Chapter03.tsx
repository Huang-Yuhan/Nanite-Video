import React from 'react';
import {useCurrentFrame} from 'remotion';
import {
  collapseSequence,hierarchySnapshots,hierarchyFineTriangles,
  hierarchyCoarseTriangles,hierarchyVertices,
} from './ch03Hierarchy';
import {
  Scene,Guide,Cue,PatchGeometry,Exterior,pathFor,projectLocal,makeView,
  COLOR,FINE_COLORS,COARSE_COLORS,MONO,smooth,mix,
} from './visuals';

export const CHAPTER_03_FRAMES=1650;
export const CHAPTER_03_FPS=30;

export const Episode01Chapter03:React.FC=()=>{
  const t=useCurrentFrame()/CHAPTER_03_FPS;
  const view=makeView(615,960,498,t);
  const fineAlpha=(1-smooth(11.5,13,t))*smooth(0,1.2,t);
  const simplifyAlpha=smooth(11.5,13,t)*(1-smooth(32,34.6,t));
  const coarseAlpha=smooth(32.1,34.5,t);
  const groupAlpha=smooth(5.3,7.9,t)*(1-smooth(41,45,t));
  const clusterAlpha=smooth(2.6,4.5,t)*(1-smooth(10.5,12.5,t));
  const progressStep=Math.max(0,(t-13.2)/2.35);
  const step=Math.min(collapseSequence.length,Math.floor(progressStep));
  const stepPhase=progressStep-Math.floor(progressStep);
  const moving=step<collapseSequence.length?{
    from:collapseSequence[step].from,
    to:collapseSequence[step].to,
    progress:smooth(0.08,0.86,stepPhase),
  }:undefined;
  const count=hierarchySnapshots[step].length;
  const fineLabels=[0,1,2,3].map(id=>{
    const ids=hierarchyFineTriangles
      .filter((_,i)=>i%32>=0);
    // Chapter 02's spatial quad groups are ordered in 2x2 blocks.
    const verts=[...new Set(ids.filter((tri,i)=>
      ((Math.floor(i/8)/2|0)*2+((Math.floor(i%8/2)/2)|0))===id)
      .flatMap(tri=>[...tri]))];
    return verts.length>0?verts[0]:[6,8,16,18][id];
  });
  const c1=projectLocal(hierarchyVertices[7],view);
  const c2=projectLocal(hierarchyVertices[17],view);
  const visibleCounter=smooth(13,14.2,t)*(1-smooth(33,35,t));
  return (
    <Scene>
      <Guide title="03   /   CLUSTER GROUP   •   SIMPLIFICATION" />
      <g opacity={fineAlpha}>
        <PatchGeometry level="fine" view={view} wire colors/>
      </g>
      <g opacity={simplifyAlpha}>
        {hierarchySnapshots[step].map((tri,i)=>(
          <polygon key={'collapsed-'+step+'-'+i} points={pathFor(tri,view,moving)}
            fill="#314962" fillOpacity={0.78}
            stroke={COLOR.white} strokeWidth={2.1} strokeOpacity={0.72}
            strokeLinejoin="round"/>
        ))}
      </g>
      {coarseAlpha>0 && (
        <PatchGeometry level="coarse" view={view} opacity={coarseAlpha}
          wire colors glow={smooth(33,35.5,t)}/>
      )}
      <Exterior view={view} opacity={groupAlpha} strokeWidth={5}/>
      {clusterAlpha>0.01&&(
        <g opacity={clusterAlpha} textAnchor="middle" fontFamily={MONO} fontSize={28}
          paintOrder="stroke" stroke={COLOR.bg} strokeWidth={6}>
          {['F0','F1','F2','F3'].map((id,i)=>{
            const pt=projectLocal(hierarchyVertices[[6,8,16,18][i]],view);
            return <text key={id} x={pt.x} y={pt.y} fill={FINE_COLORS[i]}>{id}</text>;
          })}
        </g>
      )}
      {simplifyAlpha>0.01&&moving&&(
        <g opacity={simplifyAlpha}>
          {(()=>{
            const p=projectLocal(hierarchyVertices[moving.from],view);
            const q=projectLocal(hierarchyVertices[moving.to],view);
            const x=mix(p.x,q.x,moving.progress);
            const y=mix(p.y,q.y,moving.progress);
            return <>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                stroke={COLOR.gold} strokeWidth={6} strokeLinecap="round"
                opacity={0.82}/>
              <circle cx={x} cy={y} r={13} fill={COLOR.gold}/>
              <circle cx={q.x} cy={q.y} r={17} fill="none"
                stroke={COLOR.gold} strokeWidth={2.5}/>
            </>;
          })()}
        </g>
      )}
      <g opacity={visibleCounter} textAnchor="end" fontFamily={MONO}>
        <text x={1650} y={172} fontSize={23} fill={COLOR.muted}>TRIANGLES</text>
        <text x={1650} y={248} fontSize={66} fill={COLOR.gold}>{count}</text>
        <text x={1650} y={284} fontSize={21} fill={COLOR.muted}>−2 / EDGE COLLAPSE</text>
      </g>
      <g opacity={smooth(35.5,37,t)*(1-smooth(47,49,t))}
        fontFamily={MONO} textAnchor="middle" fontSize={31}
        stroke={COLOR.bg} strokeWidth={6} paintOrder="stroke">
        <text x={c1.x} y={c1.y} fill={COARSE_COLORS[0]}>C0</text>
        <text x={c2.x} y={c2.y} fill={COARSE_COLORS[1]}>C1</text>
      </g>
      <g opacity={smooth(43,46,t)} fontFamily={MONO} fontSize={29}
        textAnchor="middle">
        <text x={960} y={173} fill={COLOR.muted}>FINE 4 CLUSTERS</text>
        <text x={960} y={231} fill={COLOR.gold}>GROUP MERGE → EDGE COLLAPSE → REPARTITION</text>
        <text x={960} y={290} fill={COLOR.muted}>COARSE 2 CLUSTERS</text>
      </g>
      <Cue t={t} a={0} b={5.8}
        headline="SHARED BOUNDARIES"
        sub="如果各个 Cluster 独立简化，接缝可能不再匹配"/>
      <Cue t={t} a={5.8} b={13}
        headline="LOCK THE GROUP EXTERIOR"
        sub="先分组，只保护 Group 的外边界"/>
      <Cue t={t} a={13} b={33}
        headline="MERGE & SIMPLIFY"
        sub="内部执行合法 Edge Collapse，逐步减少三角形"/>
      <Cue t={t} a={33} b={43}
        headline="SPLIT BACK INTO CLUSTERS"
        sub="原先 4 个 Fine Cluster，被一组 2 个 Coarse Cluster 替代"/>
      <Cue t={t} a={43} b={55}
        headline="ONE GROUP-WIDE REPLACEMENT"
        sub="下一步：如何保存这组多对多的层级依赖？"/>
    </Scene>
  );
};
