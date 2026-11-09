import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {
  Vec3, Tri, positions, fine, coarse, snapshots, collapses,
  fineCluster, coarseCluster, perimeter, groupTransition,
} from './demoData';

/**
 * Manim / 3Blue1Brown-inspired visual language:
 * one fullscreen composition, continuous geometry, vector strokes,
 * meaningful movement, no static dashboard or explanatory slide layout.
 *
 * The source vertices are 3D; we project them into the SVG camera by math.
 * SVG is intentional: edge motion and graph morphology remain razor-sharp
 * at any resolution and do not require headless Chromium WebGL.
 */
const W = 1920;
const H = 1080;
const FPS = 30;
const BACKGROUND = '#0d111e';
const WHITE = '#e8edf8';
const QUIET = '#90a2b7';
const GOLD = '#ffcf70';
const CYAN = '#59d3e8';
const FINE = ['#5bb8ed', '#70cc9e', '#f2ad62', '#b794ef'];
const COARSE = ['#5bb8ed', '#f2ad62'];
const FONT = "'Inter', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
const MONO = "'JetBrains Mono', 'Cascadia Code', monospace";

type Point = {x: number; y: number};
type Projection = (p: Vec3) => Point;

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const lerpPoint = (a: Point, b: Point, p: number): Point => ({
  x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p),
});
const lerpVec = (a: Vec3, b: Vec3, p: number): Vec3 =>
  [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

function blendHex(from: string, to: string, p: number): string {
  const a = from.match(/\w\w/g)?.map((v) => parseInt(v, 16)) ?? [0, 0, 0];
  const b = to.match(/\w\w/g)?.map((v) => parseInt(v, 16)) ?? [0, 0, 0];
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], p))
    .toString(16).padStart(2, '0')).join('');
}

/** Simple animated 3D -> 2D orthographic projection with a mild perspective cue. */
function camera(cx: number, cy: number, scale: number, t: number): Projection {
  const yaw = 0.20 + 0.075 * Math.sin(t * 0.24);
  const pitch = -0.36 - 0.045 * Math.sin(t * 0.19);
  return ([x, y, z]) => {
    const xx = x * Math.cos(yaw) + z * Math.sin(yaw);
    const zz = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const yy = y * Math.cos(pitch) - zz * Math.sin(pitch);
    const depth = y * Math.sin(pitch) + zz * Math.cos(pitch);
    const perspective = 7.6 / (7.6 - depth * 0.25);
    return {x: cx + xx * scale * perspective, y: cy - yy * scale * perspective};
  };
}

function trianglePoint(tri: Tri, project: Projection, override?: (id: number) => Vec3) {
  return tri.map((id) => {
    const p = project(override ? override(id) : positions[id]);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');
}

function Surface({
  triangles, project, opacity, fillColor, override, strokeOpacity = 0.74,
}: {
  triangles: Tri[];
  project: Projection;
  opacity: number;
  fillColor: (tri: Tri) => string;
  override?: (id: number) => Vec3;
  strokeOpacity?: number;
}) {
  if (opacity <= 0.002) return null;
  return (
    <g opacity={opacity}>
      {triangles.map((tri, i) => (
        <polygon
          key={i}
          points={trianglePoint(tri, project, override)}
          fill={fillColor(tri)}
          fillOpacity={0.48}
          stroke={WHITE}
          strokeWidth={2.0}
          strokeOpacity={strokeOpacity}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

function ClusterText({
  triangles, classify, colors, prefix, project, opacity,
}: {
  triangles: Tri[];
  classify: (tri: Tri) => number;
  colors: string[];
  prefix: string;
  project: Projection;
  opacity: number;
}) {
  return (
    <g opacity={opacity} fontFamily={MONO} fontSize={28} fontWeight={600}
      textAnchor="middle" dominantBaseline="middle">
      {colors.map((color, id) => {
        const selected = triangles.filter((tri) => classify(tri) === id);
        const unique = [...new Set(selected.flatMap((tri) => [...tri]))];
        const pos: Vec3 = [
          unique.reduce((v, i) => v + positions[i][0], 0) / unique.length,
          unique.reduce((v, i) => v + positions[i][1], 0) / unique.length,
          unique.reduce((v, i) => v + positions[i][2], 0) / unique.length,
        ];
        const {x, y} = project(pos);
        return <text key={prefix + id} x={x} y={y} fill={color}
          paintOrder="stroke" stroke={BACKGROUND} strokeWidth={7}>
          {prefix}{id}
        </text>;
      })}
    </g>
  );
}

function PolylineBoundary({project, t, opacity}: {
  project: Projection;
  t: number;
  opacity: number;
}) {
  const pts = perimeter.map(project);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') + ' Z';
  const progress = ease(5.1, 7.9, t);
  return (
    <g opacity={opacity}>
      <path d={d} pathLength={1} stroke={GOLD} strokeWidth={6} fill="none"
        strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - progress}
        filter="url(#line-glow)" />
      <path d={d} pathLength={1} stroke={GOLD} strokeWidth={4} fill="none"
        strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - progress} />
    </g>
  );
}

/** Real topological edit: vertex r travels onto vertex k; degenerate faces vanish. */
function Simplification({t, project, opacity}: {
  t: number;
  project: Projection;
  opacity: number;
}) {
  const interval = 1.1;
  const elapsed = Math.max(0, t - 9.0);
  const step = Math.min(collapses.length, Math.floor(elapsed / interval));
  const progress = step >= collapses.length
    ? 1 : ease(0.08, 0.87, elapsed / interval - step);
  const tris = snapshots[step];
  const current = collapses[step];
  const override = (id: number): Vec3 => {
    if (current && id === current[0]) {
      return lerpVec(positions[current[0]], positions[current[1]], progress);
    }
    return positions[id];
  };
  const p0 = current ? project(positions[current[0]]) : null;
  const p1 = current ? project(positions[current[1]]) : null;
  const moving = current ? project(override(current[0])) : null;

  return (
    <g opacity={opacity}>
      <Surface triangles={tris} project={project}
        fillColor={() => '#2a4054'} override={override} opacity={1}
        strokeOpacity={0.80} />
      {p0 && p1 && moving ? (
        <g>
          <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={GOLD}
            strokeWidth={5} strokeLinecap="round" opacity={0.85}/>
          <circle cx={p1.x} cy={p1.y} r={14} stroke={GOLD}
            strokeWidth={3} fill={BACKGROUND}/>
          <circle cx={moving.x} cy={moving.y} r={12} fill={GOLD}
            filter="url(#dot-glow)"/>
          <circle cx={moving.x} cy={moving.y} r={6} fill={WHITE}/>
        </g>
      ) : null}
    </g>
  );
}

const fineNodes: Point[] = [
  {x: 420, y: 390}, {x: 780, y: 390},
  {x: 1140, y: 390}, {x: 1500, y: 390},
];
const coarseNodes: Point[] = [{x: 740, y: 680}, {x: 1180, y: 680}];

function MorphToDag({t}: {t: number}) {
  const arrive = ease(20.25, 21.3, t);
  const morph = ease(21.55, 23.4, t);
  const circle = ease(22.75, 23.6, t);
  const fadeGeom = 1 - ease(22.8, 23.5, t);
  const nodes = [...fineNodes, ...coarseNodes];

  const group = (
    triangles: Tri[], classifier: (tri: Tri) => number,
    colors: string[], centers: Point[], origin: Point,
    keyPrefix: string,
  ) => colors.map((color, groupId) => {
    const tris = triangles.filter((tri) => classifier(tri) === groupId);
    const base = camera(origin.x, origin.y, 88, t);
    const project: Projection = (p) => lerpPoint(base(p), centers[groupId], morph);
    return (
      <g key={keyPrefix + groupId} opacity={arrive * fadeGeom}>
        {tris.map((tri, index) => (
          <polygon key={index} points={tri.map((id) => {
            const p = project(positions[id]);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill={color} fillOpacity={0.38}
          stroke={WHITE} strokeWidth={2.3} strokeOpacity={0.8}/>
        ))}
      </g>
    );
  });

  const thumbnails = 1 - ease(21.3, 22.5, t);
  const lines = Math.max(0, t - 23.45);

  return (
    <g>
      <g>
        {fineNodes.flatMap((node, i) => coarseNodes.map((target, j) => {
          const progress = ease(i * 0.105 + j * 0.07, 0.75 + i * 0.105 + j * 0.07, lines);
          return (
            <line key={`${i}-${j}`} x1={node.x} y1={node.y}
              x2={lerp(node.x, target.x, progress)}
              y2={lerp(node.y, target.y, progress)}
              stroke="#9fb0c8" strokeWidth={3} opacity={0.55 * circle}/>
          );
        }))}
      </g>
      {group(fine, fineCluster, FINE, fineNodes, {x: 590, y: 535}, 'F')}
      {group(coarse, coarseCluster, COARSE, coarseNodes, {x: 1350, y: 535}, 'C')}

      <g opacity={arrive * thumbnails} fontFamily={MONO} fontSize={30}
        textAnchor="middle" fill={QUIET} letterSpacing={3}>
        <text x={590} y={800}>FINE CLUSTERS</text>
        <text x={1350} y={800}>COARSE CLUSTERS</text>
      </g>
      <g opacity={circle}>
        <text x={960} y={277} textAnchor="middle" fontSize={29}
          letterSpacing={4} fontFamily={MONO} fill={QUIET}>FINE  ·  HIGH DETAIL</text>
        <text x={960} y={822} textAnchor="middle" fontSize={29}
          letterSpacing={4} fontFamily={MONO} fill={QUIET}>COARSE  ·  LOW DETAIL</text>
        {nodes.map((p, i) => {
          const isFine = i < fineNodes.length;
          const index = isFine ? i : i - fineNodes.length;
          const color = isFine ? FINE[index] : COARSE[index];
          const id = (isFine ? 'F' : 'C') + index;
          const size = isFine ? 44 : 55;
          return (
            <g key={id}>
              <circle cx={p.x} cy={p.y} r={size} fill={BACKGROUND}
                stroke={color} strokeWidth={4}/>
              <circle cx={p.x} cy={p.y} r={8} fill={color}/>
              <text x={p.x} y={p.y + size + 37} fill={WHITE}
                fontFamily={MONO} fontSize={28} textAnchor="middle">{id}</text>
            </g>
          );
        })}
      </g>
    </g>
  );
}

const explanations = [
  {start: 0, end: 4.9, title: 'Triangle → Cluster',
    sub: '把同一张网格分成更小的几何单元'},
  {start: 4.9, end: 9, title: 'Cluster Group',
    sub: 'Group 的外边界保持不变，内部可以重新组织'},
  {start: 9, end: 17.85, title: 'Edge Collapse',
    sub: '逐步移除内部顶点，真实改变网格拓扑'},
  {start: 17.85, end: 20.25, title: 'Repartition',
    sub: '简化后的三角形重新划分为 Coarse Clusters'},
  {start: 20.25, end: 25, title: 'DAG ≠ Tree',
    sub: '多个 Fine Cluster 共同对应多个 Coarse Cluster'},
];

function Annotation({t}: {t: number}) {
  const scene = explanations.find((v) => t >= v.start && t < v.end) ??
    explanations[explanations.length - 1];
  const opacity = ease(scene.start, scene.start + 0.4, t) *
    (1 - ease(scene.end - 0.35, scene.end, t));
  return (
    <div style={{
      position: 'absolute', bottom: 108, left: 100, right: 100,
      textAlign: 'center', opacity, pointerEvents: 'none',
    }}>
      <div style={{fontFamily: MONO, fontSize: 29, letterSpacing: 4,
        color: CYAN, fontWeight: 600}}>{scene.title}</div>
      <div style={{fontSize: 43, marginTop: 16, fontWeight: 550, color: WHITE}}>
        {scene.sub}
      </div>
    </div>
  );
}

export const ClusterDagDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const fineReveal = ease(2.0, 4.6, t);
  const groupBoundary = ease(5.0, 6.1, t) * (1 - ease(8.4, 9.3, t));
  const simplifyAlpha = ease(8.85, 9.15, t) * (1 - ease(17.6, 18, t));
  const coarseAlpha = ease(17.7, 18.15, t) * (1 - ease(20, 20.95, t));
  const initialAlpha = ease(0.25, 1.25, t) * (1 - ease(8.8, 9.15, t));
  const projector = camera(
    lerp(960, 955, ease(7.5, 9, t)),
    lerp(515, 498, ease(7.5, 9, t)),
    lerp(173, 190, ease(7.5, 9, t)),
    t,
  );
  const neutral = '#293f52';

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(circle at 48% 44%, #1a2435 0%, ${BACKGROUND} 67%)`,
      overflow: 'hidden', fontFamily: FONT, color: WHITE,
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{display:'block'}}>
        <defs>
          <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9"/>
          </filter>
          <filter id="dot-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4"/>
          </filter>
        </defs>

        <Surface triangles={fine} project={projector} opacity={initialAlpha}
          fillColor={(tri) => blendHex(neutral, FINE[fineCluster(tri)], fineReveal)}
          strokeOpacity={lerp(0.85, 0.42, groupBoundary)}/>
        <ClusterText triangles={fine} classify={fineCluster} colors={FINE}
          prefix="F" project={projector}
          opacity={ease(3.15, 4.7, t) * (1 - ease(7.6, 8.5, t))}/>
        <PolylineBoundary project={projector} t={t} opacity={groupBoundary}/>
        <Simplification project={projector} t={t} opacity={simplifyAlpha}/>
        <Surface triangles={coarse} project={projector} opacity={coarseAlpha}
          fillColor={(tri) => blendHex(neutral, COARSE[coarseCluster(tri)], ease(18.0, 19.25, t))}/>
        <ClusterText triangles={coarse} classify={coarseCluster} colors={COARSE}
          prefix="C" project={projector}
          opacity={ease(18.4, 19.2, t) * (1 - ease(20, 20.8, t))}/>
        {t >= 19.7 && <MorphToDag t={t}/>}

        {t >= 9 && t < 18 && (
          <g fontFamily={MONO} textAnchor="end" fontSize={30}>
            <text x="1680" y="177" fill={QUIET}>TRIANGLES</text>
            <text x="1680" y="246" fill={GOLD} fontSize={65}>
              {32 - 2 * Math.min(8, Math.floor((t - 9) / 1.1))}
            </text>
            <text x="1680" y="291" fill={QUIET} fontSize={24}>
              -2 / COLLAPSE
            </text>
          </g>
        )}
        {t > 23.85 && (
          <g opacity={ease(23.85, 24.75, t)} fontFamily={MONO}
            textAnchor="middle" fontSize={27} fill={GOLD}>
            <text x="960" y="1010">
              ONE GROUP REPLACEMENT  ·  {groupTransition.fineClusterIds.length} FINE → {groupTransition.coarseClusterIds.length} COARSE
            </text>
          </g>
        )}
      </svg>
      <Annotation t={t}/>
    </AbsoluteFill>
  );
};
