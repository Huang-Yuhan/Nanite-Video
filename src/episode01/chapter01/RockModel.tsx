import React, {useLayoutEffect, useRef, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {traditionalLods} from '../traditionalLod';

// Original meshes and per-corner UVs, painted into the existing SVG stage.
// Orthographic projection makes affine texture mapping exact per triangle.
export function RockModel({level, cx, cy, size, opacity = 1}: {
  level: number; cx: number; cy: number; size: number; opacity?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [texture, setTexture] = useState<HTMLImageElement | null>(null);
  const [handle] = useState(() => delayRender('Load Moon Rock 02 texture'));
  const extent = Math.ceil(size * 2.8);

  useLayoutEffect(() => {
    const img = new Image();
    let active = true;
    img.onload = () => {if (active) setTexture(img);};
    img.onerror = () => {if (active) cancelRender(new Error('Moon Rock 02 texture failed to load'));};
    img.src = staticFile('models/moon-rock-02/diffuse.jpg');
    return () => {active = false;continueRender(handle);};
  }, [handle]);

  useLayoutEffect(() => {
    if (!texture || !canvas.current) return;
    const ctx = canvas.current.getContext('2d');
    if (!ctx) {cancelRender(new Error('Canvas 2D is unavailable')); return;}
    ctx.clearRect(0, 0, extent, extent);
    const yaw = 0.48, pitch = -0.18;
    const mesh = traditionalLods[level];
    const points = mesh.positions.map(([x,y,z]) => {
      const rx = x*Math.cos(yaw)+z*Math.sin(yaw);
      const rz = -x*Math.sin(yaw)+z*Math.cos(yaw);
      const ry = y*Math.cos(pitch)-rz*Math.sin(pitch);
      return {x: extent/2+rx*size, y: extent/2-ry*size,
        z: y*Math.sin(pitch)+rz*Math.cos(pitch)};
    });
    const faces = mesh.triangles.map((tri, i) => ({
      i, p: tri.map(v => points[v]), depth: tri.reduce((s,v) => s+points[v].z,0)/3,
    })).sort((a,b) => a.depth-b.depth);
    for (const {i,p} of faces) {
      const [a,b,c] = p;
      const area = (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
      if (Math.abs(area) < 0.001) continue;
      const uv = mesh.uv[i].map(([u,v]) => ({x:u*texture.width,y:(1-v)*texture.height}));
      const [s,t,r] = uv;
      const det = (t.x-s.x)*(r.y-s.y)-(r.x-s.x)*(t.y-s.y);
      ctx.save();
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();
      ctx.fillStyle = '#77736d';ctx.fill();
      if (Math.abs(det) > 1e-6) {
        const m11 = ((b.x-a.x)*(r.y-s.y)-(c.x-a.x)*(t.y-s.y))/det;
        const m12 = ((b.y-a.y)*(r.y-s.y)-(c.y-a.y)*(t.y-s.y))/det;
        const m21 = ((c.x-a.x)*(t.x-s.x)-(b.x-a.x)*(r.x-s.x))/det;
        const m22 = ((c.y-a.y)*(t.x-s.x)-(b.y-a.y)*(r.x-s.x))/det;
        ctx.clip();
        ctx.transform(m11,m12,m21,m22,a.x-m11*s.x-m21*s.y,a.y-m12*s.x-m22*s.y);
        ctx.drawImage(texture,0,0);
      }
      ctx.restore();
      const ux=b.x-a.x, uy=-(b.y-a.y), uz=(b.z-a.z)*size;
      const vx=c.x-a.x, vy=-(c.y-a.y), vz=(c.z-a.z)*size;
      const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
      const normalLength=Math.hypot(nx,ny,nz)||1;
      const light=Math.max(0,(nx*-0.35+ny*0.65+nz*0.68)/normalLength);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();
      ctx.fillStyle=`rgba(0,0,0,${0.26*(1-light)})`;ctx.fill();
      ctx.strokeStyle='rgba(233,233,229,0.15)';ctx.lineWidth=0.55;ctx.stroke();
    }
    continueRender(handle);
  }, [texture, level, size, extent, handle]);

  return <foreignObject x={cx-extent/2} y={cy-extent/2} width={extent} height={extent} opacity={opacity}>
    <canvas ref={canvas} width={extent} height={extent}
      style={{width:extent,height:extent,display:'block'}}/>
  </foreignObject>;
}
