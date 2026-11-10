import React from 'react';
import {triangleGraphNodes} from '../ch02Graph';
import type {Vec3} from '../ch01Geometry';

const vertices=triangleGraphNodes.flatMap(node=>node.triangle.corners);
const low=[0,1,2].map(k=>Math.min(...vertices.map(p=>p[k])));
const high=[0,1,2].map(k=>Math.max(...vertices.map(p=>p[k])));
const center=low.map((v,k)=>(v+high[k])/2);

// Diagram projection of the verified teaching patch, not a scanned-cliff crop.
// The bridge and Chapter 02 share this projection, so mesh/graph identity
// stays fixed across the chapter boundary without the old full-wall backdrop.
export function projectTeachingPatch(p:Vec3,zoom=0){
  const scale=1+zoom*0.15;
  const x=(p[0]-center[0])/(high[0]-low[0])*640;
  const y=(p[1]-center[1])/(high[1]-low[1])*540;
  const depth=(p[2]-center[2])*70;
  return {x:960+(x+depth*0.18)*scale,y:480-(y+depth)*scale};
}

export function TeachingPatch(){
  return <g>
    {triangleGraphNodes.map(node=><polygon key={node.id}
      points={node.triangle.corners.map(p=>{
        const q=projectTeachingPatch(p);return q.x+','+q.y;
      }).join(' ')}
      fill="#25303a" stroke="#e9e9e5" strokeWidth={1.5}
      strokeOpacity={0.60} strokeLinejoin="round"/>)}
  </g>;
}
