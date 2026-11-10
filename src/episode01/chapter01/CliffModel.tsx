import React, {useLayoutEffect, useRef, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import manifest from '../assets/cliffLods.json';

type Level='fine'|'coarse';
type Asset={texture:HTMLImageElement;fine:Float32Array;coarse:Float32Array};
type Plates={base:HTMLCanvasElement;near:HTMLCanvasElement;far:HTMLCanvasElement};
const WIDTH=1920,HEIGHT=1080;
const directory='models/namaqualand-cliff-01/';
let pendingAsset:Promise<Asset>|undefined;
const plates=new Map<Level,Plates>();

function loadAsset():Promise<Asset>{
  if(pendingAsset)return pendingAsset;
  const read=async(level:Level)=>{
    const info=manifest.lods.find(l=>l.id===level)!;
    const response=await fetch(staticFile(directory+info.file));
    if(!response.ok||!response.body)throw new Error('Failed to load cliff '+level);
    const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
    const buffer=await new Response(stream).arrayBuffer();
    if(buffer.byteLength!==info.bytes)throw new Error('Cliff mesh size mismatch');
    return new Float32Array(buffer);
  };
  const image=new Promise<HTMLImageElement>((resolve,reject)=>{
    const texture=new Image();
    texture.onload=()=>resolve(texture);
    texture.onerror=()=>reject(new Error('Failed to load cliff texture'));
    texture.src=staticFile(directory+'diffuse.jpg');
  });
  pendingAsset=Promise.all([image,read('fine'),read('coarse')])
    .then(([texture,fine,coarse])=>({texture,fine,coarse}));
  return pendingAsset;
}

function paint(asset:Asset,level:Level):Plates{
  const cached=plates.get(level);
  if(cached)return cached;
  const makeCanvas=()=>{
    const canvas=document.createElement('canvas');
    canvas.width=WIDTH;canvas.height=HEIGHT;
    return canvas;
  };
  const result={base:makeCanvas(),near:makeCanvas(),far:makeCanvas()};
  const base=result.base.getContext('2d')!;
  const near=result.near.getContext('2d')!;
  const far=result.far.getContext('2d')!;
  const mesh=asset[level],texture=asset.texture;
  // One fixed perspective camera for both authored LODs. The left end is
  // nearer; switching meshes never moves or independently fits the asset.
  const project=(offset:number)=>{
    const x=mesh[offset]-0.2674353,y=mesh[offset+1]-2.0613457,z=mesh[offset+2]+1.4154674;
    const yaw=0.62,pitch=-0.06;
    const rx=x*Math.cos(yaw)+z*Math.sin(yaw);
    const rz=-x*Math.sin(yaw)+z*Math.cos(yaw);
    const ry=y*Math.cos(pitch)-rz*Math.sin(pitch);
    const depth=y*Math.sin(pitch)+rz*Math.cos(pitch);
    const perspective=11/(11-depth);
    return {x:960+rx*132*perspective,y:450-ry*132*perspective,depth,
      u:mesh[offset+3]*texture.width,v:(1-mesh[offset+4])*texture.height,worldX:x};
  };
  const faces=Array.from({length:mesh.length/15},(_,i)=>{
    const p=[project(i*15),project(i*15+5),project(i*15+10)];
    return {p,depth:p.reduce((sum,v)=>sum+v.depth,0)/3};
  }).sort((a,b)=>a.depth-b.depth);
  const path=(ctx:CanvasRenderingContext2D,p:ReturnType<typeof project>[],expand=0)=>{
    const cx=(p[0].x+p[1].x+p[2].x)/3,cy=(p[0].y+p[1].y+p[2].y)/3;
    const q=p.map(v=>{
      const length=Math.hypot(v.x-cx,v.y-cy)||1;
      return {x:v.x+(v.x-cx)/length*expand,y:v.y+(v.y-cy)/length*expand};
    });
    ctx.beginPath();ctx.moveTo(q[0].x,q[0].y);
    ctx.lineTo(q[1].x,q[1].y);ctx.lineTo(q[2].x,q[2].y);ctx.closePath();
  };
  for(const {p} of faces){
    const [a,b,c]=p;
    const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    if(Math.abs(area)<0.0001)continue;
    const det=(b.u-a.u)*(c.v-a.v)-(c.u-a.u)*(b.v-a.v);
    // Subpixel overlap closes Canvas antialiasing seams between texture
    // triangles; it does not change the source mesh or wireframe topology.
    base.save();path(base,p,0.65);
    if(Math.abs(det)>1e-6){
      const m11=((b.x-a.x)*(c.v-a.v)-(c.x-a.x)*(b.v-a.v))/det;
      const m12=((b.y-a.y)*(c.v-a.v)-(c.y-a.y)*(b.v-a.v))/det;
      const m21=((c.x-a.x)*(b.u-a.u)-(b.x-a.x)*(c.u-a.u))/det;
      const m22=((c.y-a.y)*(b.u-a.u)-(b.y-a.y)*(c.u-a.u))/det;
      base.clip();
      base.transform(m11,m12,m21,m22,a.x-m11*a.u-m21*a.v,a.y-m12*a.u-m22*a.v);
      base.drawImage(texture,0,0);
    }else{base.fillStyle='#756b59';base.fill();}
    base.restore();
    // Fill each overlay with transparent interiors using destination-out:
    // farther wireframe cannot show through the nearer rock surface.
    for(const ctx of [near,far]){
      ctx.save();ctx.globalCompositeOperation='destination-out';path(ctx,p);ctx.fill();ctx.restore();
    }
    const x=p.reduce((sum,v)=>sum+v.worldX,0)/3;
    const ctx=x<-0.6?near:x>0.7?far:undefined;
    if(ctx){path(ctx,p);ctx.strokeStyle='#e7d4aa';ctx.lineWidth=0.65;ctx.stroke();}
  }
  plates.set(level,result);
  return result;
}

export function CliffModel({level,nearWire=0,farWire=0}:{
  level:Level;nearWire?:number;farWire?:number;
}){
  const base=useRef<HTMLCanvasElement>(null);
  const near=useRef<HTMLCanvasElement>(null);
  const far=useRef<HTMLCanvasElement>(null);
  const [asset,setAsset]=useState<Asset|null>(null);
  const [handle]=useState(()=>delayRender('Load authored cliff LODs'));
  useLayoutEffect(()=>{
    let active=true;
    loadAsset().then(data=>{if(active)setAsset(data);})
      .catch(error=>{if(active)cancelRender(error);});
    return ()=>{active=false;continueRender(handle);};
  },[handle]);
  useLayoutEffect(()=>{
    if(!asset)return;
    try{
      const rendered=paint(asset,level);
      for(const [ref,plate] of [[base,rendered.base],[near,rendered.near],[far,rendered.far]] as const){
        const ctx=ref.current!.getContext('2d')!;
        ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.drawImage(plate,0,0);
      }
      continueRender(handle);
    }catch(error){cancelRender(error);}
  },[asset,level,handle]);
  return <foreignObject x={0} y={0} width={WIDTH} height={HEIGHT}>
    <div style={{position:'relative',width:WIDTH,height:HEIGHT}}>
      {[[base,1],[near,nearWire],[far,farWire]].map(([ref,opacity],i)=><canvas
        key={i} ref={ref as React.RefObject<HTMLCanvasElement>}
        width={WIDTH} height={HEIGHT}
        style={{position:'absolute',inset:0,width:WIDTH,height:HEIGHT,opacity:opacity as number}}/>)}
    </div>
  </foreignObject>;
}
