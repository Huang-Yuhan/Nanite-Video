import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {type Vec3} from './ch01Geometry';
import {projectTeachingPatch} from './chapter01/TeachingPatch';
import {
  triangleGraphNodes, triangleGraphEdges,
  stridedPartition, compactPartition, COMPACT_LABELS,
  type PartitionStats,
} from './ch02Graph';

export const CHAPTER_02_FPS = 30;
export const CHAPTER_02_FRAMES = 1080; // Workprint 36 s, not a final video timing lock.

const W = 1920;
const H = 1080;
const BACKGROUND = '#0d111e';
const WHITE = '#e8edf8';
const GOLD = '#ffcf70';
const SOFT = '#8fa5bb';
const CYAN = '#59d3e8';
const GROUPS = ['#5bb8ed', '#70cc9e', '#f2ad62', '#b794ef'];
const FONT = "'Noto Sans CJK SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
const MONO = "'JetBrains Mono', 'Cascadia Code', monospace";

type P2 = {x: number; y: number};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a));
  return x*x*(3-2*x);
};
const mix = (a: number, b: number, p: number) => a + (b-a)*p;
const easing = (t: number) => ({
  zoom: smooth(2.2, 6.9, t),
  graph: smooth(7.2, 11.3, t) * (1-smooth(26, 30, t)),
  naive: smooth(12.8, 14.3, t) * (1-smooth(18.2, 20.2, t)),
  compact: smooth(18.2, 20.2, t),
  back: smooth(26, 30.2, t),
});
/**
 * A shared projection keeps the small teaching patch continuous with the
 * Chapter 01 bridge. Nodes and triangles always use the same coordinates.
 */
function patchProject(p: Vec3, zoomProgress: number): P2 {
  return projectTeachingPatch(p,zoomProgress);
}

function meshPolygon(corners: readonly Vec3[], center: Vec3, zoom: number, collapse: number) {
  const c = patchProject(center, zoom);
  return corners.map((p) => {
    const s = patchProject(p, zoom);
    return [mix(s.x,c.x,collapse).toFixed(2), mix(s.y,c.y,collapse).toFixed(2)].join(',');
  }).join(' ');
}

function PatchMesh({t}: {t: number}) {
  const {zoom, graph, back} = easing(t);
  const opacity = 1-smooth(9.9, 11.7, t) + back;
  const colorOpacity = smooth(27, 32, t);
  return (
    <g opacity={Math.min(1,opacity)}>
      {triangleGraphNodes.map((node) => (
        <g key={node.id}>
          <polygon
            points={meshPolygon(node.triangle.corners, node.center, zoom, graph)}
            fill="#25303a"
            stroke={WHITE}
            strokeWidth={1.5}
            strokeOpacity={0.60}
            strokeLinejoin="round"
          />
          <polygon
            points={meshPolygon(node.triangle.corners, node.center, zoom, graph)}
            fill={GROUPS[COMPACT_LABELS[node.id]]}
            fillOpacity={colorOpacity * 0.52}
          />
        </g>
      ))}
    </g>
  );
}

function GraphView({t}: {t: number}) {
  const {zoom, graph, naive, compact} = easing(t);
  const visible = smooth(8, 10.7, t) * (1-smooth(26.4, 30, t));
  const points = triangleGraphNodes.map((node) => patchProject(node.center, zoom));

  const renderPartition = (stats: PartitionStats, opacity: number) =>
    <g key={stats.kind} opacity={opacity}>
      {triangleGraphEdges.map((edge) => {
        const cut = stats.labels[edge.a] !== stats.labels[edge.b];
        const a = points[edge.a];
        const b = points[edge.b];
        return (
          <line key={edge.a + '-' + edge.b}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={cut ? GOLD : SOFT}
            strokeWidth={cut ? 4.0 : 1.5}
            strokeOpacity={cut ? 0.92 : 0.33}
          />
        );
      })}
      {triangleGraphNodes.map((node) => {
        const p = points[node.id];
        return (
          <circle key={node.id} cx={p.x} cy={p.y} r={10.5}
            fill={GROUPS[stats.labels[node.id]]}
            stroke={BACKGROUND} strokeWidth={2.6}
          />
        );
      })}
    </g>;

  const initialOpacity = 1-smooth(12.8, 14.3, t);
  return (
    <g opacity={visible}>
      <g opacity={initialOpacity}>
        {triangleGraphEdges.map((edge) => {
          const a=points[edge.a], b=points[edge.b];
          return (
            <line key={edge.a+'-'+edge.b} x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke={SOFT} strokeWidth={2.0} strokeOpacity={0.7}/>
          );
        })}
        {points.map((p,i) => (
          <circle key={i} cx={p.x} cy={p.y} r={10}
            fill="#29445e" stroke={WHITE} strokeWidth={2.2}/>
        ))}
      </g>
      {renderPartition(stridedPartition, naive)}
      {renderPartition(compactPartition, compact * smooth(12.8,14.3,t))}
      {graph > 0.1 && (
        <text x={960} y={156} textAnchor="middle"
          fill={SOFT} fontSize={24} fontFamily={MONO}
          opacity={smooth(9.2, 10, t) * (1-smooth(26.8,29.5,t))}>
          32 TRIANGLES · 40 SHARED EDGES
        </text>
      )}
    </g>
  );
}

function CompactLabels({t}: {t:number}) {
  const opacity = smooth(28.6, 31.8, t);
  if(opacity<=0.001) return null;
  return (
    <g opacity={opacity} fontFamily={MONO} fontSize={29}
      textAnchor="middle" paintOrder="stroke">
      {GROUPS.map((color,id) => {
        const nodes=triangleGraphNodes.filter((n)=>COMPACT_LABELS[n.id]===id);
        const center:Vec3 = [
          nodes.reduce((a,n)=>a+n.center[0],0)/nodes.length,
          nodes.reduce((a,n)=>a+n.center[1],0)/nodes.length,
          nodes.reduce((a,n)=>a+n.center[2],0)/nodes.length,
        ];
        const p=patchProject(center,1);
        return (
          <text key={id} x={p.x} y={p.y} fill={color}
            stroke={BACKGROUND} strokeWidth={7}>C{id}</text>
        );
      })}
    </g>
  );
}

function AnimationCaption({t}: {t:number}) {
  const sections=[
    {a:0,b:4.5,title:'FROM MESH TO TRIANGLES',sub:'沿用刚才的简化网格，观察三角形之间的连接'},
    {a:4.5,b:9,title:'TRIANGLE ADJACENCY',sub:'共享边连接相邻三角形'},
    {a:9,b:13.0,title:'MESH → GRAPH',sub:'Triangle 变成 Node，共享边变成 Edge'},
    {a:13,b:18.5,title:'NAIVE PARTITION',sub:'虽然大小相同，却切断大量邻接边'},
    {a:18.5,b:25.5,title:'GRAPH PARTITIONING',sub:'在三角形预算内，减少跨 Cluster 边界'},
    {a:25.5,b:36.5,title:'GRAPH → CLUSTERS',sub:'图结构重新变回几何，得到连续的 Cluster'},
  ];
  const cue=sections.find(s=>s.a<=t&&t<s.b) ?? sections[sections.length-1];
  const opacity=smooth(cue.a,cue.a+0.42,t)*(1-smooth(cue.b-0.4,cue.b,t));
  return (
    <g opacity={opacity} textAnchor="middle">
      <text x={960} y={1000} fill={WHITE} fontSize={38}
        fontFamily={FONT}>{cue.sub}</text>
    </g>
  );
}

function CutScore({t}: {t:number}) {
  const naive=smooth(13.5,14.7,t)*(1-smooth(18.1,20.4,t));
  const compact=smooth(18.4,20.7,t)*(1-smooth(26.3,28.8,t));
  const textProps={x:960, y:828, textAnchor:'middle' as const, fontFamily:MONO, fontSize:29};
  return (
    <g>
      <g opacity={naive}>
        <text {...textProps} fill={GOLD}>
          {'CUT EDGES  '+stridedPartition.cutEdges+'   ·   4 × 8 TRIANGLES'}
        </text>
        <text x={960} y={866} textAnchor="middle" fill={SOFT}
          fontFamily={MONO} fontSize={20}>STRIDED / DISCONNECTED · DIDACTIC EXAMPLE</text>
      </g>
      <g opacity={compact}>
        <text {...textProps} fill={GOLD}>
          {'CUT EDGES  '+compactPartition.cutEdges+'   ·   4 × 8 TRIANGLES'}
        </text>
        <text x={960} y={866} textAnchor="middle" fill={SOFT}
          fontFamily={MONO} fontSize={20}>EDGE-CONNECTED PARTITION · NOT METIS OUTPUT</text>
      </g>
    </g>
  );
}

export const Episode01Chapter02: React.FC=()=>{
  const frame=useCurrentFrame();
  const t=frame/CHAPTER_02_FPS;
  return (
    <AbsoluteFill style={{
      overflow:'hidden',
      background:'#101319',
      fontFamily:FONT,color:WHITE,
    }}>
      <svg width="100%" height="100%" viewBox={'0 0 '+W+' '+H}>
        <PatchMesh t={t}/>
        <GraphView t={t}/>
        <CompactLabels t={t}/>
        <CutScore t={t}/>
        <AnimationCaption t={t}/>
      </svg>
    </AbsoluteFill>
  );
};
