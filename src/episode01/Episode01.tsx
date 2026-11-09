import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Episode01Chapter01,CHAPTER_01_FRAMES,EPISODE_01_FPS} from './Chapter01';
import {Episode01Chapter02,CHAPTER_02_FRAMES,CHAPTER_02_FPS} from './Chapter02';
import {Episode01Chapter03,CHAPTER_03_FRAMES,CHAPTER_03_FPS} from './Chapter03';
import {Episode01Chapter04,CHAPTER_04_FRAMES,CHAPTER_04_FPS} from './Chapter04';
import {Episode01Chapter05,CHAPTER_05_FRAMES,CHAPTER_05_FPS} from './Chapter05';
import {Episode01Chapter06,CHAPTER_06_FRAMES,CHAPTER_06_FPS} from './Chapter06';

/**
 * Complete Episode 01 six-chapter *visual workprint*.
 * Timeline duration is content-driven and can be revised after voice edit.
 * Unwritten chapters never occupy placeholder frames.
 */
export const EPISODE_01_WORKPRINT_FPS = EPISODE_01_FPS;
export const EPISODE_01_CHAPTER_FRAMES=[
  CHAPTER_01_FRAMES,CHAPTER_02_FRAMES,CHAPTER_03_FRAMES,
  CHAPTER_04_FRAMES,CHAPTER_05_FRAMES,CHAPTER_06_FRAMES,
] as const;
export const EPISODE_01_WORKPRINT_FRAMES=
  EPISODE_01_CHAPTER_FRAMES.reduce((a,b)=>a+b,0);

if ([CHAPTER_02_FPS,CHAPTER_03_FPS,CHAPTER_04_FPS,CHAPTER_05_FPS,CHAPTER_06_FPS]
  .some(fps=>fps!==EPISODE_01_WORKPRINT_FPS)){
  throw new Error('Inconsistent chapter FPS');
}

const chapters=[
  Episode01Chapter01,Episode01Chapter02,Episode01Chapter03,
  Episode01Chapter04,Episode01Chapter05,Episode01Chapter06,
];

export const Episode01Workprint: React.FC = () => {
  let offset=0;
  return <AbsoluteFill>
    {chapters.map((Component,index)=>{
      const from=offset;
      const duration=EPISODE_01_CHAPTER_FRAMES[index];
      offset+=duration;
      return <Sequence key={index} from={from} durationInFrames={duration}>
        <Component/>
      </Sequence>;
    })}
  </AbsoluteFill>;
};
