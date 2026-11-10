/**
 * Chapter 01 editing timeline (30 fps).
 *
 * Change a shot's seconds here to retime it. Every shot is a named
 * Remotion <Sequence>, visible as a separate range in Studio.
 * Studio's timeline is a preview/scrubber; editing these constants,
 * not dragging clips, is the source of truth in this code-driven project.
 * Camera and LOD motion are normalized to each shot's duration.
 */
export const EPISODE_01_FPS=30;
export const CHAPTER_01_SHOTS=[
  {id:'intro',name:'00 · Opening / narration',seconds:5},
  {id:'versions',name:'01 · Four traditional LODs',seconds:8},
  {id:'approach',name:'02 · Camera / LOD List',seconds:15},
  {id:'wall',name:'03 · Whole-mesh limitation',seconds:21},
  {id:'pixels',name:'04 · Pixel-scaled detail',seconds:13},
  {id:'clusters',name:'05 · Transition to clusters',seconds:8},
] as const;
export type ShotId=(typeof CHAPTER_01_SHOTS)[number]['id'];
export const CHAPTER_01_FRAMES=CHAPTER_01_SHOTS.reduce(
  (sum,shot)=>sum+Math.round(shot.seconds*EPISODE_01_FPS),0);
export function validateChapter01Timeline():void {
  if(CHAPTER_01_SHOTS.some(s=>s.seconds<=0||
    Math.round(s.seconds*EPISODE_01_FPS)!==s.seconds*EPISODE_01_FPS))
    throw new Error('Shot durations must be positive whole frames');
  if(new Set(CHAPTER_01_SHOTS.map(s=>s.id)).size!==CHAPTER_01_SHOTS.length)
    throw new Error('Duplicate shot IDs');
}
validateChapter01Timeline();
