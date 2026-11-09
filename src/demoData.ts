// A small, deterministic, boundary-preserving example for algorithm animation.
// This is an illustrative manifold triangulation, NOT extracted from UE Nanite.
export type Vec3 = readonly [number, number, number];
export type Tri = readonly [number, number, number];
export type Collapse = readonly [number, number];

export const positions: Vec3[] = Array.from({length: 25}, (_, id) => {
  const x = id % 5 - 2;
  const y = Math.floor(id / 5) - 2;
  // The perimeter is flat. Interior vertices have a little depth.
  const z = 0.65 * Math.sin(Math.PI * (x + 2) / 4) *
    Math.sin(Math.PI * (y + 2) / 4) * (1 + 0.19 * Math.sin(1.7 * x + 0.8 * y));
  return [x, y, z];
});

const initial: Tri[] = [];
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 4; col++) {
    const a = row * 5 + col;
    const b = a + 1;
    const d = a + 5;
    const c = d + 1;
    initial.push([a, b, c], [a, c, d]);
  }
}

// The eight edge collapses reduce 32 triangles to 16 while leaving every
// perimeter vertex and perimeter edge intact. Each pair is [removed, retained].
// Verified against internal-edge incidence, the link condition, and oriented area.
export const collapses: Collapse[] = [
  [6, 12], [7, 12], [11, 12], [13, 12],
  [8, 12], [17, 12], [16, 12], [18, 12],
];

const onBoundary = (id: number): boolean => {
  const x = id % 5;
  const y = Math.floor(id / 5);
  return x === 0 || x === 4 || y === 0 || y === 4;
};

const key = (a: number, b: number): string =>
  a < b ? `${a}:${b}` : `${b}:${a}`;

const neighbours = (triangles: Tri[], index: number): Set<number> => {
  const out = new Set<number>();
  for (const tri of triangles) {
    if (tri.includes(index)) {
      for (const v of tri) if (v !== index) out.add(v);
    }
  }
  return out;
};

const orient = ([a, b, c]: Tri): number => {
  const pa = positions[a];
  const pb = positions[b];
  const pc = positions[c];
  return (pb[0] - pa[0]) * (pc[1] - pa[1]) -
    (pb[1] - pa[1]) * (pc[0] - pa[0]);
};

function collapseEdge(triangles: Tri[], [removed, retained]: Collapse): Tri[] {
  if (onBoundary(removed) || onBoundary(retained)) {
    throw new Error('The demo must not collapse perimeter vertices');
  }

  const shared = triangles.filter((tri) => tri.includes(removed) && tri.includes(retained));
  if (shared.length !== 2) throw new Error('Not an interior manifold edge');

  const common = [...neighbours(triangles, removed)]
    .filter((v) => neighbours(triangles, retained).has(v)).sort((a, b) => a - b);
  const opposite = shared.flatMap((tri) => tri.filter((v) => v !== removed && v !== retained))
    .sort((a, b) => a - b);
  if (common.join(',') !== opposite.join(',')) throw new Error('Link condition failed');

  const result = triangles
    .map((tri) => tri.map((v) => v === removed ? retained : v) as unknown as Tri)
    .filter((tri) => new Set(tri).size === 3);

  if (result.length !== triangles.length - 2 ||
      result.some((tri) => orient(tri) <= 0)) {
    throw new Error('Invalid triangle count or triangle flip');
  }
  return result;
}

const boundaryLoop = [
  0, 1, 2, 3, 4, 9, 14, 19, 24, 23, 22, 21, 20, 15, 10, 5,
];

function verifyBoundary(tris: Tri[]) {
  const incidence = new Map<string, number>();
  for (const tri of tris) {
    for (const [a, b] of [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]]) {
      const k = key(a, b);
      incidence.set(k, (incidence.get(k) ?? 0) + 1);
    }
  }
  const exposed = new Set([...incidence].filter(([, count]) => count === 1).map(([k]) => k));
  const expected = new Set(boundaryLoop.map((v, i) => key(v, boundaryLoop[(i + 1) % boundaryLoop.length])));
  if (exposed.size !== expected.size || [...expected].some((k) => !exposed.has(k))) {
    throw new Error('Boundary must stay identical in every LOD');
  }
}

export const snapshots: Tri[][] = [initial];
verifyBoundary(initial);
for (const edge of collapses) {
  const next = collapseEdge(snapshots[snapshots.length - 1], edge);
  verifyBoundary(next);
  snapshots.push(next);
}
if (snapshots.at(-1)?.length !== 16) throw new Error('Expected 16 coarse triangles');

export const fineCluster = (tri: Tri): number => {
  const x = tri.reduce((sum, id) => sum + positions[id][0], 0) / 3;
  const y = tri.reduce((sum, id) => sum + positions[id][1], 0) / 3;
  return (x >= 0 ? 1 : 0) + (y >= 0 ? 2 : 0);
};

export const coarseCluster = (tri: Tri): number => {
  const x = tri.reduce((sum, id) => sum + positions[id][0], 0) / 3;
  return x >= 0 ? 1 : 0;
};

export const fine = snapshots[0];
export const coarse = snapshots[snapshots.length - 1];

if ([0, 1, 2, 3].some((id) => fine.filter((t) => fineCluster(t) === id).length !== 8) ||
    [0, 1].some((id) => coarse.filter((t) => coarseCluster(t) === id).length !== 8)) {
  throw new Error('Expected 4x8 fine and 2x8 coarse triangles');
}

export const groupTransition = {
  fineClusterIds: ['F0', 'F1', 'F2', 'F3'],
  coarseClusterIds: ['C0', 'C1'],
};
export const perimeter = boundaryLoop.map((id) => positions[id]);
