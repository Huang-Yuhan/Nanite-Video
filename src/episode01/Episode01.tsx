import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {
  Episode01Chapter01,
  CHAPTER_01_FRAMES,
  EPISODE_01_FPS,
} from './Chapter01';
import {
  Episode01Chapter02,
  CHAPTER_02_FRAMES,
  CHAPTER_02_FPS,
} from './Chapter02';

/**
 * Episode 01 workprint timeline. The two chapters share a continuous
 * procedural source mesh and a consistent camera handoff.
 * Extend with new Sequences as chapters are implemented and reviewed.
 */
export const EPISODE_01_WORKPRINT_FRAMES = CHAPTER_01_FRAMES + CHAPTER_02_FRAMES;
export const EPISODE_01_WORKPRINT_FPS = EPISODE_01_FPS;

if (CHAPTER_02_FPS !== EPISODE_01_FPS) {
  throw new Error('Chapter FPS differs from the Episode01 timeline');
}

export const Episode01Workprint: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={CHAPTER_01_FRAMES}>
      <Episode01Chapter01/>
    </Sequence>
    <Sequence from={CHAPTER_01_FRAMES} durationInFrames={CHAPTER_02_FRAMES}>
      <Episode01Chapter02/>
    </Sequence>
  </AbsoluteFill>
);
