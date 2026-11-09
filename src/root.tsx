import React from 'react';
import {Composition} from 'remotion';
import {ClusterDagDemo} from './ClusterDagDemo';
import {
  Episode01Chapter01,
  EPISODE_01_FPS,
  CHAPTER_01_FRAMES,
} from './episode01/Chapter01';

export const Root: React.FC = () => (
  <>
    <Composition
      id="ClusterDagDemo"
      component={ClusterDagDemo}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={750}
    />
    <Composition
      id="Episode01Workprint"
      component={Episode01Chapter01}
      width={1920}
      height={1080}
      fps={EPISODE_01_FPS}
      durationInFrames={CHAPTER_01_FRAMES}
    />
  </>
);
