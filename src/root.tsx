import React from 'react';
import {Composition} from 'remotion';
import {ClusterDagDemo} from './ClusterDagDemo';
import {RuntimeCameraDagCut} from './RuntimeCameraDagCut';
import {RUNTIME_DURATION_FRAMES, RUNTIME_FPS} from './runtimeCutData';

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
      id="RuntimeCameraDagCut"
      component={RuntimeCameraDagCut}
      width={1920}
      height={1080}
      fps={RUNTIME_FPS}
      durationInFrames={RUNTIME_DURATION_FRAMES}
    />
  </>
);
