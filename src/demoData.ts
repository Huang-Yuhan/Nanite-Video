/**
 * Deterministic teaching mesh for the first video demo.
 *
 * Fine: 4x4 grid = 32 triangles; four 2x2-cell clusters (8 tris each).
 * Coarse: center + all sixteen ORIGINAL boundary vertices = 16 triangles;
 * two coarse clusters (8 tris each).
 *
 * Both LODs have the EXACT same perimeter vertices / outer edges.
 * This is an illustrative precomputed LOD replacement, not an Unreal Engine
 * simplifier trace or a simulation of the actual Nanite cluster builder.
 */
export type Vec3 = readonly [number, number, number];

export type ClusterMesh = {
  id: string;
  color: string;
  triangleCount: number;
  vertices: number[];
  edges: number[];
};

export type DemoData = {
  fine: ClusterMesh[];
  coarse: ClusterMesh[];
  boundary: number[];
  transition: {
    fineClusterIds: string[];
    coarseClusterIds: string[];
  };
};

const FINE_COLORS = ['#4da9ff', '#32d1b2', '#ffbd65', '#bb8dff'];
const COARSE_COLORS = ['#5bafff', '#ffb95c'];

function point(x: number, y: number): Vec3 {
  const u = (x + 2) / 4;
  const v = (y + 2) / 4;
  const boundaryEnvelope = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
  const z = 0.72 * boundaryEnvelope *
    (1 + 0.22 * Math.sin(x * 1.9 + y * 0.8));
  return [x, y, z];
}

type BuildingCluster = ClusterMesh & {edgeKeys: Set<string>};

function piece(id: string, color: string): BuildingCluster {
  return {id, color, triangleCount: 0, vertices: [], edges: [], edgeKeys: new Set()};
}

function vertexKey(p: Vec3): string {
  return p.map((v) => v.toFixed(6)).join(',');
}

function addTriangle(mesh: BuildingCluster, a: Vec3, b: Vec3, c: Vec3) {
  mesh.vertices.push(...a, ...b, ...c);
  mesh.triangleCount += 1;
  for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
    const ordered = [vertexKey(p), vertexKey(q)].sort();
    const key = ordered.join('|');
    if (!mesh.edgeKeys.has(key)) {
      mesh.edgeKeys.add(key);
      mesh.edges.push(...p, ...q);
    }
  }
}

function finish(meshes: BuildingCluster[]): ClusterMesh[] {
  return meshes.map(({edgeKeys: _unused, ...mesh}) => mesh);
}

function makeFine(): ClusterMesh[] {
  const groups = FINE_COLORS.map((color, i) => piece('F' + i, color));
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const g = (x >= 2 ? 1 : 0) + (y >= 2 ? 2 : 0);
      const a = point(x - 2, y - 2);
      const b = point(x - 1, y - 2);
      const c = point(x - 1, y - 1);
      const d = point(x - 2, y - 1);
      addTriangle(groups[g], a, b, c);
      addTriangle(groups[g], a, c, d);
    }
  }
  return finish(groups);
}

function perimeter(): Vec3[] {
  const loop: Vec3[] = [];
  for (let x = -2; x <= 2; x++) loop.push(point(x, -2));
  for (let y = -1; y <= 2; y++) loop.push(point(2, y));
  for (let x = 1; x >= -2; x--) loop.push(point(x, 2));
  for (let y = 1; y >= -1; y--) loop.push(point(-2, y));
  return loop;
}

function makeCoarse(boundary: Vec3[]): ClusterMesh[] {
  const groups = COARSE_COLORS.map((color, i) => piece('C' + i, color));
  const center = point(0, 0);
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i];
    const b = boundary[(i + 1) % boundary.length];
    const g = (a[0] + b[0]) / 2 >= 0 ? 0 : 1;
    addTriangle(groups[g], center, a, b);
  }
  return finish(groups);
}

function makeDemo(): DemoData {
  const border = perimeter();
  const fine = makeFine();
  const coarse = makeCoarse(border);
  const fineCount = fine.reduce((sum, p) => sum + p.triangleCount, 0);
  const coarseCount = coarse.reduce((sum, p) => sum + p.triangleCount, 0);
  if (border.length !== 16 || fineCount !== 32 || coarseCount !== 16 ||
      fine.some((p) => p.triangleCount !== 8) ||
      coarse.some((p) => p.triangleCount !== 8)) {
    throw new Error('Invalid illustrative Cluster DAG teaching mesh');
  }
  return {
    fine,
    coarse,
    boundary: [...border, border[0]].flat(),
    transition: {
      fineClusterIds: fine.map((p) => p.id),
      coarseClusterIds: coarse.map((p) => p.id),
    },
  };
}

export const demoData = makeDemo();
