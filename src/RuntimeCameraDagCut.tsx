import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {perimeter, type Tri, type Vec3} from './demoData';
import {
  ERROR_THRESHOLD_PX, PATCHES, RUNTIME_FPS,
  getRuntimeFrame, patchTriangles, patchVertices, clusterIdFor,
  type Patch, type GroupCut,
} from './runtimeCutData';

/**
 * Educational camera / LOD-dependency DAG cut sequence.
 *
 * The left mesh and the right selected nodes consume the *same* RuntimeFrame.
 * Right side is the LOD DAG, NOT Nanite's runtime hierarchy / BVH.
 * The projected-error equation is explicitly an educational surrogate.
 *
 * This SVG split-view is a temporary synchronized explanation scene,
 * not a persistent slide layout used throughout the video.
 */
const WIDTH = 1920;
const HEIGHT = 1080;
const BKG = '#0d111e';
const INK = '#e8edf8';
const MUTED = '#8ea3b9';
const GOLD = '#ffcf70';
const CYAN = '#59d3e8';
const FINE = ['#5bb8ed', '#70cc9e', '#f2ad62', '#b794ef'];
const COARSE = ['#5bb8ed', '#f2ad62'];
const FONT = "'Inter', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
const MONO = "'JetBrains Mono', 'Cascadia Code', monospace";

type Pt = {x: number; y: number};
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (from: number, to: number, t: number) => {
  const k = clamp((t - from) / (to - from));
  return k * k * (3 - 2 * k);
};

const project = ([x, y, z]: Vec3, zoom: number): Pt => ({
  x: 525 + x * zoom,
  y: 492 - y * zoom * 0.71 - z * zoom * 1.13 + x * 4,
});

const points = (tri: Tri, verts: readonly Vec3[], zoom: number): string =>
  tri.map((id) => {
    const p = project(verts[id], zoom);
    return p.x.toFixed(2) + ',' + p.y.toFixed(2);
  }).join(' ');

function PatchMesh({patch, cut, zoom, flash}: {
  patch: Patch;
  cut: GroupCut;
  zoom: number;
  flash: number;
}) {
  const verts = patchVertices(patch);
  const triangles = patchTriangles(cut.detail);
  const colors = cut.detail === 'fine' ? FINE : COARSE;
  const triangleColors = triangles.map((tri) => {
    const id = clusterIdFor(patch, cut.detail, tri);
    if (!cut.selectedIds.includes(id)) throw new Error('Mesh / DAG selection mismatch');
    const suffix = Number(id.charAt(id.length - 1));
    return colors[suffix];
  });

  const boundary = perimeter.map(([x, y], idx) => {
    const pt = project([x + patch.originX, y, 0], zoom);
    return (idx === 0 ? 'M' : 'L') + pt.x.toFixed(2) + ' ' + pt.y.toFixed(2);
  }).join(' ') + ' Z';

  return (
    <g>
      {triangles.map((tri, i) => (
        <polygon
          key={patch.id + '-' + cut.detail + '-' + i}
          points={points(tri, verts, zoom)}
          fill={triangleColors[i]}
          fillOpacity={0.26 + flash * 0.15}
          stroke={INK}
          strokeOpacity={cut.detail === 'fine' ? 0.58 : 0.46}
          strokeWidth={cut.detail === 'fine' ? 1.85 : 2.2}
          strokeLinejoin="round"
        />
      ))}
      <path d={boundary} stroke={patch.id === 'A' ? GOLD : MUTED}
        strokeWidth={patch.id === 'A' ? 3 : 2}
        strokeOpacity={patch.id === 'A' ? 0.88 : 0.32}
        fill="none" strokeLinejoin="round"/>
      <text x={project([patch.originX, -2.72, 0], zoom).x}
        y={project([patch.originX, -2.72, 0], zoom).y + 20}
        fontSize={26} fontFamily={MONO} textAnchor="middle"
        fill={patch.id === 'A' ? GOLD : MUTED}>
        {'GROUP ' + patch.id + ' / ' + cut.detail.toUpperCase()}
      </text>
    </g>
  );
}

function CameraSymbol({x, y, distance}: {x: number; y: number; distance: number}) {
  return (
    <g>
      <path d={'M115 785 Q250 795 363 686'} fill="none" stroke={MUTED}
        strokeWidth={2} opacity={0.22} strokeDasharray="10 12"/>
      <line x1={x + 48} y1={y - 28} x2={362} y2={492}
        stroke={GOLD} strokeWidth={1.9} strokeDasharray="7 10" opacity={0.35}/>
      <g transform={'translate(' + x + ' ' + y + ')'}>
        <path d="M-46 -23 L8 -23 Q22 -23 22 -10 L22 12 Q22 23 10 23 L-46 23 Z"
          fill="#1c2a3d" stroke={GOLD} strokeWidth={3.2} strokeLinejoin="round"/>
        <path d="M22 -12 L51 -29 L51 28 L22 11 Z"
          fill="#1c2a3d" stroke={GOLD} strokeWidth={3.2} strokeLinejoin="round"/>
        <circle cx={-17} cy={0} r={9} fill={CYAN} opacity={0.7}/>
      </g>
      <text x={x - 12} y={y + 69} fill={INK} fontFamily={MONO}
        textAnchor="middle" fontSize={28}>
        {'CAMERA · ' + distance.toFixed(1)}
      </text>
    </g>
  );
}

type NodeInfo = {id: string; x: number; y: number; color: string; selected: boolean};

function GroupDag({patch, cut, top, flash}: {
  patch: Patch;
  cut: GroupCut;
  top: number;
  flash: number;
}) {
  const yFine = top + 46;
  const yCoarse = top + 229;
  const fineXs = [1210, 1387, 1564, 1741];
  const coarseXs = [1387, 1564];
  const nodes: NodeInfo[] = [
    ...patch.fineIds.map((id, i) => ({
      id, x: fineXs[i], y: yFine, color: FINE[i], selected: cut.selectedIds.includes(id),
    })),
    ...patch.coarseIds.map((id, i) => ({
      id, x: coarseXs[i], y: yCoarse, color: COARSE[i], selected: cut.selectedIds.includes(id),
    })),
  ];
  const chosenY = cut.detail === 'fine' ? yFine : yCoarse;
  return (
    <g>
      <text x={1180} y={top - 42} fontFamily={MONO} fontSize={24}
        letterSpacing={2} fill={patch.id === 'A' ? GOLD : MUTED}>
        {'GROUP ' + patch.id}
      </text>
      <text x={1755} y={top - 42} textAnchor="end"
        fontFamily={MONO} fontSize={26} fill={cut.detail === 'fine' ? GOLD : MUTED}>
        {'ERROR ' + cut.errorPx.toFixed(2) + ' PX'}
      </text>
      {fineXs.flatMap((fx, i) => coarseXs.map((cx, j) => (
        <line key={patch.id + '-edge-' + i + '-' + j}
          x1={fx} y1={yFine + 25} x2={cx} y2={yCoarse - 27}
          stroke={MUTED} strokeWidth={2.0} opacity={0.21}/>
      )))}
      <path d={'M1168 ' + chosenY + ' H1790'} fill="none"
        stroke={GOLD} strokeWidth={2.5} opacity={0.62}
        strokeDasharray="14 13"/>
      {nodes.map((node) => (
        <g key={node.id}>
          {node.selected && (
            <circle cx={node.x} cy={node.y} r={47 + flash * 10}
              fill="none" stroke={GOLD} strokeWidth={2.7 + flash * 2}
              opacity={0.58 + flash * 0.38}/>
          )}
          <circle cx={node.x} cy={node.y} r={31}
            fill={node.selected ? '#263a4b' : BKG}
            stroke={node.color}
            strokeWidth={node.selected ? 4 : 2.3}
            opacity={node.selected ? 1 : 0.42}/>
          {node.selected && <circle cx={node.x} cy={node.y} r={6.5} fill={GOLD}/>}
          <text x={node.x} y={node.y + 60} textAnchor="middle"
            fontSize={23} fontFamily={MONO}
            fill={node.selected ? INK : MUTED}
            opacity={node.selected ? 1 : 0.5}>
            {node.id}
          </text>
        </g>
      ))}
    </g>
  );
}

function InlineCaption({time, refining}: {time: number; refining: boolean}) {
  const caption = time < 3
    ? '远处：Coarse 的屏幕误差满足阈值'
    : refining
      ? '接近：误差超出阈值，完整切换 Fine 集合'
      : '相机靠近：投影误差连续增加';
  return (
    <g textAnchor="middle">
      <text x={960} y={978} fill={INK} fontSize={38} fontFamily={FONT}>
        {caption}
      </text>
      <text x={960} y={1023} fill={MUTED} fontSize={22} fontFamily={MONO}>
        CONCEPTUAL LOD SELECTION · NOT AN EXTRACT FROM UE GPU RUNTIME
      </text>
    </g>
  );
}

export const RuntimeCameraDagCut: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / RUNTIME_FPS;
  const state = getRuntimeFrame(frame);
  const approach = ease(3, 10, t);
  const zoom = lerp(84, 93, approach);
  const cutA = state.groups[0];
  const cutB = state.groups[1];

  const flash = cutA.detail === 'fine' ? Math.max(0, 1 - (cutA.errorPx - ERROR_THRESHOLD_PX) * 4) : 0;
  const cameraX = lerp(160, 310, approach);
  const cameraY = lerp(797, 718, approach);

  return (
    <AbsoluteFill style={{
      background: 'radial-gradient(circle at 33% 46%, #1b2b3d 0%, ' + BKG + ' 70%)',
      color: INK, fontFamily: FONT, overflow: 'hidden',
    }}>
      <svg width="100%" height="100%" viewBox={'0 0 ' + WIDTH + ' ' + HEIGHT}>
        <defs>
          <linearGradient id="runtime-separator" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#668398" stopOpacity="0"/>
            <stop offset="50%" stopColor="#668398" stopOpacity=".35"/>
            <stop offset="100%" stopColor="#668398" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <line x1="1080" x2="1080" y1="65" y2="945"
          stroke="url(#runtime-separator)" strokeWidth={2}/>
        <text x="114" y="118" fill={MUTED} fontFamily={MONO}
          fontSize={26} letterSpacing={3}>CAMERA / MESH</text>
        <text x="1180" y="118" fill={MUTED} fontFamily={MONO}
          fontSize={26} letterSpacing={3}>LOD DEPENDENCY DAG</text>
        <text x="1775" y="118" textAnchor="end" fill={GOLD}
          fontFamily={MONO} fontSize={26}>
          {'THRESHOLD ' + ERROR_THRESHOLD_PX.toFixed(1) + ' PX'}
        </text>

        <PatchMesh patch={PATCHES[0]} cut={cutA} zoom={zoom} flash={flash}/>
        <PatchMesh patch={PATCHES[1]} cut={cutB} zoom={zoom} flash={0}/>
        <CameraSymbol x={cameraX} y={cameraY} distance={state.camera[2]}/>
        <GroupDag patch={PATCHES[0]} cut={cutA} top={245} flash={flash}/>
        <GroupDag patch={PATCHES[1]} cut={cutB} top={660} flash={0}/>
        <InlineCaption time={t} refining={cutA.detail === 'fine'}/>
      </svg>
    </AbsoluteFill>
  );
};
