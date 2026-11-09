/**
 * Episode 01 / Chapter 01 procedural study asset.
 *
 * One continuous surface, three legal LOD arrangements:
 *   fine (10 x 4 x 12 x 2 = 960 triangles)
 *   coarse (10 x 1 x 12 x 2 = 240 triangles)
 *   local (3 fine strips + 7 coarse strips = 456 triangles)
 *
 * This is a teaching mesh, not a Nanite cooked asset / clustering export.
 * Adjacent strips always have the same 13 boundary vertices, so partial
 * refinement does not introduce T-junctions or cracks.
 */
export type Vec3 = readonly [number, number, number];
export type Detail = 'fine' | 'coarse';
export type WallMode = 'fine' | 'coarse' | 'local';
export type WallTriangle = {
  corners: readonly [Vec3, Vec3, Vec3];
  strip: number;
  detail: Detail;
};
export type WallMesh = {
  mode: WallMode;
  triangles: readonly WallTriangle[];
  triCount: number;
};

export const STRIPS = 10;
export const ROWS = 12;
export const FINE_COLUMNS_PER_STRIP = 4;
export const LOCAL_FINE_STRIPS = 3;
export const WORLD_LEFT = -6;
export const WORLD_RIGHT = 6;
export const WORLD_BOTTOM = -2.55;
export const WORLD_TOP = 2.55;

const height = (x: number, y: number): number => {
  const envelope = Math.cos((y / WORLD_TOP) * Math.PI * 0.5) ** 2;
  const jagged =
    0.72 * Math.sin(x * 1.62 + y * 0.63) * Math.cos(y * 1.32) +
    0.26 * Math.sin(x * 7.2 + y * 5.5) * Math.cos(y * 3.7) +
    0.16 * Math.cos(x * 12.7 - y * 3.9);
  return envelope * jagged;
};

const point = (strip: number, column: number, columns: number, row: number): Vec3 => {
  // Shared edges use the exact same arithmetic rather than summing increments.
  const x = WORLD_LEFT + ((strip + column / columns) / STRIPS) * (WORLD_RIGHT - WORLD_LEFT);
  const y = WORLD_BOTTOM + (row / ROWS) * (WORLD_TOP - WORLD_BOTTOM);
  return [x, y, height(x, y)];
};

export const getStripDetail = (strip: number, mode: WallMode): Detail =>
  mode === 'fine' || (mode === 'local' && strip < LOCAL_FINE_STRIPS) ? 'fine' : 'coarse';

export const makeWall = (mode: WallMode): WallMesh => {
  const triangles: WallTriangle[] = [];
  for (let strip = 0; strip < STRIPS; strip++) {
    const detail = getStripDetail(strip, mode);
    const cols = detail === 'fine' ? FINE_COLUMNS_PER_STRIP : 1;
    for (let row = 0; row < ROWS; row++) {
      for (let column = 0; column < cols; column++) {
        const a = point(strip, column, cols, row);
        const b = point(strip, column + 1, cols, row);
        const c = point(strip, column + 1, cols, row + 1);
        const d = point(strip, column, cols, row + 1);
        triangles.push({corners: [a, b, c], strip, detail});
        triangles.push({corners: [a, c, d], strip, detail});
      }
    }
  }
  return {mode, triangles, triCount: triangles.length};
};

export const wallMeshes: Record<WallMode, WallMesh> = {
  fine: makeWall('fine'),
  coarse: makeWall('coarse'),
  local: makeWall('local'),
};

const vertexKey = ([x, y, z]: Vec3): string =>
  [x, y, z].map((v) => v.toFixed(7)).join(':');

const edgeKey = (a: Vec3, b: Vec3): string => {
  const keys = [vertexKey(a), vertexKey(b)].sort();
  return keys[0] + '|' + keys[1];
};

const planarOrientation = ([a, b, c]: WallTriangle['corners']): number =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

export function validateEpisode01Geometry(): void {
  if (wallMeshes.fine.triCount !== 960 ||
      wallMeshes.coarse.triCount !== 240 ||
      wallMeshes.local.triCount !== 456) {
    throw new Error('Triangle counts must match chapter narration');
  }
  const expectedSideEdges = new Set<string>();
  for (let row = 0; row < ROWS; row++) {
    expectedSideEdges.add(edgeKey(point(0, 0, 1, row), point(0, 0, 1, row + 1)));
    expectedSideEdges.add(edgeKey(point(STRIPS - 1, 1, 1, row),
      point(STRIPS - 1, 1, 1, row + 1)));
  }

  for (const mesh of Object.values(wallMeshes)) {
    const edgeCount = new Map<string, number>();
    const countsPerStrip = new Array<number>(STRIPS).fill(0);
    for (const tri of mesh.triangles) {
      if (planarOrientation(tri.corners) <= 0) throw new Error('Flipped / degenerate triangle');
      countsPerStrip[tri.strip]++;
      const [a, b, c] = tri.corners;
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const key = edgeKey(u, v);
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      }
    }
    const boundary = new Set([...edgeCount].filter(([, count]) => count === 1).map(([k]) => k));
    if ([...edgeCount.values()].some((count) => count > 2)) {
      throw new Error('Non-manifold incidence in ' + mesh.mode);
    }
    // The exterior is the same *geometric contour* in every LOD.
    // Fine strips subdivide the flat upper/lower outer edges more densely,
    // so they need not have exactly the same boundary edge indices.
    const sideEdges = new Set<string>();
    const topEdges: Array<[number, number]> = [];
    const bottomEdges: Array<[number, number]> = [];
    const eq = (x: number, y: number) => Math.abs(x-y) < 1e-6;
    for (const edge of boundary) {
      const [av, bv] = edge.split('|');
      const a = av.split(':').map(Number);
      const b = bv.split(':').map(Number);
      if (eq(a[0], b[0]) &&
          (eq(a[0], WORLD_LEFT) || eq(a[0], WORLD_RIGHT))) {
        sideEdges.add(edge);
      } else if (eq(a[1], b[1]) &&
          (eq(a[1], WORLD_TOP) || eq(a[1], WORLD_BOTTOM))) {
        if (!eq(a[2], 0) || !eq(b[2], 0)) {
          throw new Error('Upper/lower boundary must remain flat');
        }
        const segment: [number, number] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
        (eq(a[1], WORLD_TOP) ? topEdges : bottomEdges).push(segment);
      } else {
        throw new Error('Interior seam exposed in ' + mesh.mode);
      }
    }
    if (sideEdges.size !== expectedSideEdges.size ||
        [...sideEdges].some((key) => !expectedSideEdges.has(key))) {
      throw new Error('Side boundary mismatch for ' + mesh.mode);
    }
    for (const segments of [topEdges, bottomEdges]) {
      segments.sort((a,b) => a[0] - b[0]);
      let end = WORLD_LEFT;
      for (const [x0, x1] of segments) {
        if (!eq(x0, end) || x1 <= x0) throw new Error('Contour gap or overlap');
        end = x1;
      }
      if (!eq(end, WORLD_RIGHT)) throw new Error('Incomplete outer contour');
    }
    for (let strip = 0; strip < STRIPS; strip++) {
      const expected = getStripDetail(strip, mesh.mode) === 'fine' ? 96 : 24;
      if (countsPerStrip[strip] !== expected || expected > 128) {
        throw new Error('Bad strip triangle budget at ' + strip);
      }
    }
  }
}

validateEpisode01Geometry();
