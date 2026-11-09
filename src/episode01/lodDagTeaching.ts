/**
 * Synthetic three-tier, two-group dependency DAG.
 * The 4->2 replacement is repeated in two lower groups; their four
 * intermediate clusters form a higher 4->2 replacement group.
 * These are illustrative dependency nodes, NOT UE-built cluster data.
 */
export type DagId = `F${number}` | `M${number}` | `C${number}`;
export type DagCut = readonly DagId[];
export const fineIds: readonly DagId[] = Array.from({length: 8}, (_,i) => `F${i}`);
export const middleIds: readonly DagId[] = Array.from({length: 4}, (_,i) => `M${i}`);
export const coarseIds: readonly DagId[] = ['C0','C1'];
export const dagEdges: readonly (readonly [DagId,DagId])[] = [
  ...fineIds.flatMap((fine,i) =>
    middleIds.slice(i<4?0:2,i<4?2:4).map(mid => [fine,mid] as const)),
  ...middleIds.flatMap(mid => coarseIds.map(coarse => [mid,coarse] as const)),
];
export const teachingCuts = {
  coarse: coarseIds,
  middle: middleIds,
  locallyRefined: [...fineIds.slice(0,4),...middleIds.slice(2)],
} as const;

function equals(a:readonly DagId[],b:readonly DagId[]):boolean {
  return a.length===b.length && a.every(id=>b.includes(id));
}

/** A legal cut replaces complete cluster groups, never a partial group. */
export function isLegalTeachingCut(cut:DagCut):boolean {
  if(new Set(cut).size!==cut.length)return false;
  if(cut.some(id=>![...fineIds,...middleIds,...coarseIds].includes(id)))return false;
  if(cut.some(id=>coarseIds.includes(id)))return equals(cut,coarseIds);
  for(let group=0;group<2;group++){
    const groupFine=fineIds.slice(group*4,group*4+4);
    const groupMiddle=middleIds.slice(group*2,group*2+2);
    const actual=cut.filter(id=>groupFine.includes(id)||groupMiddle.includes(id));
    if(!equals(actual,groupFine) && !equals(actual,groupMiddle))return false;
  }
  return true;
}
export function validateTeachingDag():void {
  if(dagEdges.length!==24)throw new Error('Unexpected synthetic DAG edge count');
  for(const cut of Object.values(teachingCuts)){
    if(!isLegalTeachingCut(cut))throw new Error('Invalid whole-group teaching cut');
  }
  for(const invalid of [
    ['C0'] as DagId[],
    ['C0','M0','M1','M2','M3'] as DagId[],
    ['F0','M0','M1','M2','M3'] as DagId[],
    ['M0','M1','F4','F5','F6'] as DagId[],
    ['F0','F0',...fineIds.slice(1)] as DagId[],
  ]) if(isLegalTeachingCut(invalid))throw new Error('Accepted an invalid partial DAG cut');
}
validateTeachingDag();
