import React from 'react';
import {AbsoluteFill,Sequence} from 'remotion';
import {
  EPISODE_01_FPS,CHAPTER_01_FRAMES,CHAPTER_01_SHOTS,type ShotId,
} from './chapter01/Timeline';
import {
  Opening,TraditionalVersions,CameraAndLodList,
  WholeMeshLimit,PixelBudget,ClusteringBridge,
} from './chapter01/Shots';

export {EPISODE_01_FPS,CHAPTER_01_FRAMES} from './chapter01/Timeline';
export {viewAt,project,TriangleSurface,ClusterEdges} from './chapter01/Visuals';

/**
 * One labeled Remotion Sequence per shot. The Studio timeline now exposes
 * all six shots independently. Change their durations in Timeline.ts.
 */
const SHOT_COMPONENTS:Record<ShotId,React.FC>={
  intro:Opening,
  versions:TraditionalVersions,
  approach:CameraAndLodList,
  wall:WholeMeshLimit,
  pixels:PixelBudget,
  clusters:ClusteringBridge,
};

export const Episode01Chapter01:React.FC=()=>{
  let offset=0;
  return <AbsoluteFill>
    {CHAPTER_01_SHOTS.map(shot=>{
      const from=offset;
      const durationInFrames=Math.round(shot.seconds*EPISODE_01_FPS);
      offset+=durationInFrames;
      const Component=SHOT_COMPONENTS[shot.id];
      return <Sequence key={shot.id} name={shot.name}
        from={from} durationInFrames={durationInFrames}>
        <Component/>
      </Sequence>;
    })}
  </AbsoluteFill>;
};
