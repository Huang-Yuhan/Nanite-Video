import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {
  Episode01Chapter01,
  CHAPTER_01_FRAMES,
  EPISODE_01_FPS,
} from './Chapter01';

/**
 * First-episode engineering entrypoint.
 * Append reviewed chapters as new Sequences (and extend the duration).
 * Do not render placeholders for unwritten chapters.
 */
export const EPISODE_01_WORKPRINT_FRAMES = CHAPTER_01_FRAMES;
export const EPISODE_01_WORKPRINT_FPS = EPISODE_01_FPS;

export const Episode01Workprint: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={CHAPTER_01_FRAMES}>
      <Episode01Chapter01/>
    </Sequence>
  </AbsoluteFill>
);
