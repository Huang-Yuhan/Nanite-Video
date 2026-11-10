/**
 * Chapter 02: the real topological dual graph of the bridge's teaching patch.
 *
 * Sample: 4 × 4 quads = 32 triangles, taken from fine strip #2,
 * rows 4..7 of the procedural study data. This is not a crop of the scanned
 * cliff. Each graph edge corresponds to exactly one shared Mesh edge.
 *
 * "strided" is deliberately poor, not a Nanite partitioner.
 * "compact" is a hand-constructed connected partition, not METIS output.
 * Both use four clusters of eight triangles for a fair cut comparison.
 */
import {wallMeshes, type Vec3, type WallTriangle} from './ch01Geometry.ts';

export type GraphEdge = {a: number; b: number};
export type PartitionKind = 'strided' | 'compact';
export type TriangleNode = {
  id: number;
  triangle: WallTriangle;
  center: Vec3;
  row: number;
  column: number;
};
export type PartitionStats = {
  kind: PartitionKind;
  labels: readonly number[];
  countByCluster: readonly number[];
  cutEdges: number;
};

const GRID_COLUMNS = 4;
const GRID_ROWS = 4;
const STRIP = 2;
const FIRST_ROW = 4;
const PER_ROW = GRID_COLUMNS * 2;

const stripTriangles = wallMeshes.fine.triangles.filter((t) => t.strip === STRIP);
const source = stripTriangles.slice(FIRST_ROW * PER_ROW, (FIRST_ROW + GRID_ROWS) * PER_ROW);

export const triangleGraphNodes: readonly TriangleNode[] = source.map((triangle, i) => {
  const [a, b, c] = triangle.corners;
  const center: Vec3 = [
    (a[0] + b[0] + c[0]) / 3,
    (a[1] + b[1] + c[1]) / 3,
    (a[2] + b[2] + c[2]) / 3,
  ];
  return {
    id: i, triangle, center,
    row: Math.floor(i / PER_ROW),
    column: Math.floor((i % PER_ROW) / 2),
  };
});

const key3 = ([x, y, z]: Vec3) => [x, y, z].map((v) => v.toFixed(7)).join(',');
const keyEdge = (a: Vec3, b: Vec3) =>
  [key3(a), key3(b)].sort().join('|');

const incidence = new Map<string, number[]>();
for (const node of triangleGraphNodes) {
  const [a, b, c] = node.triangle.corners;
  for (const [u, v] of [[a, b], [b, c], [c, a]]) {
    const key = keyEdge(u, v);
    const owners = incidence.get(key) ?? [];
    owners.push(node.id);
    incidence.set(key, owners);
  }
}

export const triangleGraphEdges: readonly GraphEdge[] = [...incidence.values()]
  .filter((ids) => ids.length === 2)
  .map(([a, b]) => ({a, b}))
  .sort((u, v) => u.a - v.a || u.b - v.b);

// Keep the actual mesh edge with each dual-graph link. The animation can
// transform that edge into a centroid-to-centroid connection without
// inventing adjacency or losing triangle identity.
export const triangleGraphLinks = triangleGraphEdges.map(edge => {
  const a=triangleGraphNodes[edge.a].triangle.corners;
  const b=triangleGraphNodes[edge.b].triangle.corners;
  const shared=a.filter(p=>b.some(q=>key3(p)===key3(q)));
  if(shared.length!==2)throw new Error('Graph link must have exactly one shared mesh edge');
  return {...edge,shared:shared as unknown as readonly [Vec3,Vec3]};
});

export const STRIDED_LABELS = triangleGraphNodes.map((node) => node.id % 4);
export const COMPACT_LABELS = triangleGraphNodes.map((node) =>
  Math.floor(node.row / 2) * 2 + Math.floor(node.column / 2),
);

export function partitionStats(
  kind: PartitionKind, labels: readonly number[],
): PartitionStats {
  const countByCluster = [0, 0, 0, 0];
  for (const label of labels) {
    if (!Number.isInteger(label) || label < 0 || label > 3) {
      throw new Error('Invalid graph partition label: ' + label);
    }
    countByCluster[label]++;
  }
  return {
    kind, labels, countByCluster,
    cutEdges: triangleGraphEdges.reduce(
      (acc, edge) => acc + Number(labels[edge.a] !== labels[edge.b]), 0,
    ),
  };
}

export const stridedPartition = partitionStats('strided', STRIDED_LABELS);
export const compactPartition = partitionStats('compact', COMPACT_LABELS);

const connectedComponentSize = (id: number, labels: readonly number[]): number => {
  const start = labels.findIndex((label) => label === id);
  if (start < 0) return 0;
  const seen = new Set([start]);
  const visit = [start];
  while (visit.length) {
    const cur = visit.pop()!;
    for (const e of triangleGraphEdges) {
      const next = e.a === cur ? e.b : e.b === cur ? e.a : -1;
      if (next !== -1 && labels[next] === id && !seen.has(next)) {
        seen.add(next);
        visit.push(next);
      }
    }
  }
  return seen.size;
};

export function validateTriangleGraph() {
  if (triangleGraphNodes.length !== 32) {
    throw new Error('Expected 4x4 quads / 32 triangles');
  }
  if (triangleGraphEdges.length !== 40) {
    throw new Error('The 4x4 triangulated patch must have 40 shared edges');
  }
  if ([...incidence.values()].some((owners) => owners.length > 2)) {
    throw new Error('Non-manifold triangle edge');
  }
  const boundary = [...incidence.values()].filter((owners) => owners.length === 1);
  if (boundary.length !== 16) {
    throw new Error('Expected 16 outside edges for the 4x4 patch');
  }
  const uniquePairs = new Set(triangleGraphEdges.map(({a,b}) => a + ':' + b));
  if (uniquePairs.size !== triangleGraphEdges.length) {
    throw new Error('Duplicate triangle graph edge');
  }
  for (const p of [stridedPartition, compactPartition]) {
    if (p.countByCluster.some((count) => count !== 8)) {
      throw new Error('Both partitions must use 4 clusters with 8 triangles each');
    }
  }
  for (let id = 0; id < 4; id++) {
    if (connectedComponentSize(id, COMPACT_LABELS) !== 8) {
      throw new Error('Each optimized cluster must be edge-connected');
    }
  }
  if (compactPartition.cutEdges !== 8 ||
      stridedPartition.cutEdges <= compactPartition.cutEdges) {
    throw new Error('Expected compact partition to reduce cut edges');
  }
  // Ensure this exact patch is also present in Chapter 01's local LOD:
  const localStrip = wallMeshes.local.triangles.filter((tri) => tri.strip === STRIP);
  const localSource = localStrip.slice(FIRST_ROW * PER_ROW, (FIRST_ROW + GRID_ROWS) * PER_ROW);
  if (localSource.length !== source.length ||
      localSource.some((tri, i) =>
        tri.corners.some((p, j) => key3(p) !== key3(source[i].corners[j])))) {
    throw new Error('Chapter 02 patch must share Chapter 01 source triangle IDs');
  }
}

validateTriangleGraph();
