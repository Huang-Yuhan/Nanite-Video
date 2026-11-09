/**
 * Camera ↔ DAG-cut teaching data, NOT UE 5.8.4 runtime output.
 * Reuses the validated 4-fine / 2-coarse boundary-preserving topology.
 * Both displays consume a single selected-cluster set at every frame.
 */
import {coarse, coarseCluster, fine, fineCluster, perimeter, positions, type Tri, type Vec3} from './demoData.ts';

export const RUNTIME_FPS = 30;
export const RUNTIME_DURATION_FRAMES = 540;
export const ERROR_THRESHOLD_PX = 1;

export type Detail = 'fine' | 'coarse';
export type GroupId = 'A' | 'B';
export type Patch = {
  id: GroupId;
  originX: number;
  amplitude: number;
  errorScale: number;
  fineIds: readonly string[];
  coarseIds: readonly string[];
};
export type GroupCut = {
  groupId: GroupId;
  errorPx: number;
  detail: Detail;
  selectedIds: readonly string[];
};
export type RuntimeFrame = {
  frame: number;
  camera: Vec3;
  groups: readonly GroupCut[];
  selectedClusterIds: readonly string[];
};

/** Two side-by-side mesh patches with exactly coincident seam vertices.
 * B's flatter patch has a smaller illustrative geometric LOD error,
 * so it stays coarse while the camera approaches A.
 */
export const PATCHES: readonly Patch[] = [
  {
    id: 'A', originX: -2, amplitude: 1, errorScale: 1,
    fineIds: ['A-F0', 'A-F1', 'A-F2', 'A-F3'],
    coarseIds: ['A-C0', 'A-C1'],
  },
  {
    id: 'B', originX: 2, amplitude: 0.35, errorScale: 0.32,
    fineIds: ['B-F0', 'B-F1', 'B-F2', 'B-F3'],
    coarseIds: ['B-C0', 'B-C1'],
  },
];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smoothstep = (x: number) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

export const cameraAt = (frame: number): Vec3 => {
  const seconds = Math.max(0, frame) / RUNTIME_FPS;
  const travel = smoothstep((seconds - 3.0) / 7.0);
  return [-2, 0, 18 - travel * 14.2];
};

/**
 * Educational nearest-sphere projection surrogate:
 *   E_px = K * e / max(length(camera - sphere.center) - radius, epsilon)
 * K=5, radius=2, e=patch.errorScale.
 * NOT a reproduction of Nanite's true view-error calculation.
 */
export const projectedError = (camera: Vec3, patch: Patch): number => {
  const dx = camera[0] - patch.originX;
  const dy = camera[1];
  const dz = camera[2];
  const distanceToSphere = Math.max(0.25, Math.hypot(dx, dy, dz) - 2);
  return (5 * patch.errorScale) / distanceToSphere;
};

export const getRuntimeFrame = (frame: number): RuntimeFrame => {
  const camera = cameraAt(frame);
  const groups: GroupCut[] = PATCHES.map((patch) => {
    const errorPx = projectedError(camera, patch);
    const detail: Detail = errorPx > ERROR_THRESHOLD_PX ? 'fine' : 'coarse';
    return {
      groupId: patch.id,
      errorPx,
      detail,
      selectedIds: detail === 'fine' ? patch.fineIds : patch.coarseIds,
    };
  });
  return {
    frame,
    camera,
    groups,
    selectedClusterIds: groups.flatMap((g) => [...g.selectedIds]),
  };
};

export const patchVertices = (patch: Patch) =>
  positions.map(([x, y, z]): Vec3 => [x + patch.originX, y, z * patch.amplitude]);

export const patchTriangles = (detail: Detail): readonly Tri[] => detail === 'fine' ? fine : coarse;

export const clusterIdFor = (patch: Patch, detail: Detail, tri: Tri): string => {
  const local = detail === 'fine' ? fineCluster(tri) : coarseCluster(tri);
  return patch.id + '-' + (detail === 'fine' ? 'F' : 'C') + local;
};

// Each coarse/fine representation must expose the same ordered perimeter.
function exposedBoundary(triangles: readonly Tri[]): string[] {
  const counts = new Map<string, number>();
  for (const tri of triangles) {
    for (const [a, b] of [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]]) {
      const edge = Math.min(a, b) + ':' + Math.max(a, b);
      counts.set(edge, (counts.get(edge) ?? 0) + 1);
    }
  }
  return [...counts].filter(([, n]) => n === 1).map(([key]) => key).sort();
}

export function validateRuntimeCut(): void {
  const boundaryFine = exposedBoundary(fine);
  const boundaryCoarse = exposedBoundary(coarse);
  if (boundaryFine.join('|') !== boundaryCoarse.join('|')) {
    throw new Error('Fine and coarse must preserve the exact external boundary');
  }
  if (fine.length !== 32 || coarse.length !== 16 ||
      new Set(fine.map(fineCluster)).size !== 4 ||
      new Set(coarse.map(coarseCluster)).size !== 2) {
    throw new Error('Unexpected fine/coarse topology');
  }

  // Both patches meet on x=0; the original perimeter has z=0.
  for (const [x, y, z] of perimeter) {
    if (x !== 2) continue;
    const seamA = [x + PATCHES[0].originX, y, z * PATCHES[0].amplitude];
    const seamB = [x - 4 + PATCHES[1].originX, y, z * PATCHES[1].amplitude];
    if (seamA.some((v, i) => v !== seamB[i])) throw new Error('Patch seam mismatch');
  }

  let refinements = 0;
  let previousA = getRuntimeFrame(0).groups[0].detail;
  let previousCameraZ = Infinity;

  for (let frame = 0; frame < RUNTIME_DURATION_FRAMES; frame++) {
    const state = getRuntimeFrame(frame);
    if (state.camera[2] > previousCameraZ + 1e-9) throw new Error('Camera moved backwards');
    previousCameraZ = state.camera[2];
    if (new Set(state.selectedClusterIds).size !== state.selectedClusterIds.length) {
      throw new Error('Duplicate selected cluster');
    }
    for (const cut of state.groups) {
      const patch = PATCHES.find((item) => item.id === cut.groupId);
      if (!patch) throw new Error('Unknown group');
      const validIds = cut.detail === 'fine' ? patch.fineIds : patch.coarseIds;
      if (cut.selectedIds.join('|') !== validIds.join('|')) {
        throw new Error('Illegal partial group replacement');
      }
      if ((cut.errorPx > ERROR_THRESHOLD_PX) !== (cut.detail === 'fine')) {
        throw new Error('Selection does not match error threshold');
      }
    }
    const a = state.groups[0].detail;
    if (a !== previousA) {
      if (previousA !== 'coarse' || a !== 'fine') throw new Error('Unexpected cut regression');
      refinements++;
    }
    previousA = a;
    if (state.groups[1].detail !== 'coarse') throw new Error('Adjacent group should remain coarse');
  }
  const near = getRuntimeFrame(300);
  if (refinements !== 1 || near.groups[0].detail !== 'fine' ||
      getRuntimeFrame(0).groups[0].detail !== 'coarse') {
    throw new Error('Expected exactly one coarse → fine transition');
  }
}

validateRuntimeCut();
