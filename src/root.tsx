import React from 'react';
import {Composition} from 'remotion';
import {ClusterDagDemo} from './ClusterDagDemo';
import {
  Episode01Workprint,
  EPISODE_01_WORKPRINT_FPS,
  EPISODE_01_WORKPRINT_FRAMES,
} from './episode01/Episode01';

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
      component={Episode01Workprint}
      width={1920}
      height={1080}
      fps={EPISODE_01_WORKPRINT_FPS}
      durationInFrames={EPISODE_01_WORKPRINT_FRAMES}
    />
  </>
);
