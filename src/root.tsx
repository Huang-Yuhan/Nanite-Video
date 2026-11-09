import React from 'react';
import {Composition} from 'remotion';
import {ClusterDagDemo} from './ClusterDagDemo';

export const Root: React.FC = () => (
  <Composition
    id="ClusterDagDemo"
    component={ClusterDagDemo}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={540}
  />
);
