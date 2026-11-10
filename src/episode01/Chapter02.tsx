import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import type {Vec3} from './ch01Geometry';
import {projectTeachingPatch} from './chapter01/TeachingPatch';
import {
  triangleGraphNodes,triangleGraphLinks,
  stridedPartition,compactPartition,COMPACT_LABELS,
} from './ch02Graph';
import {COLOR,FINE_COLORS,FONT,MONO,smooth,mix} from './visuals';

export const CHAPTER_02_FPS=30;
export const CHAPTER_02_FRAMES=1080;

type Point={x:number;y:number};
const distance=(a:Point,b:Point)=>(a.x-b.x)**2+(a.y-b.y)**2;
const interpolate=(a:Point,b:Point,u:number):Point=>({
  x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),
});
const project=(p:Vec3,zoom:number)=>projectTeachingPatch(p,zoom);
const focus=triangleGraphLinks.reduce((best,link)=>{
  const midpoint=(edge:typeof link)=>{
    const a=triangleGraphNodes[edge.a].center,b=triangleGraphNodes[edge.b].center;
    return project([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],0);
  };
  return distance(midpoint(link),{x:960,y:480})<
    distance(midpoint(best),{x:960,y:480})?link:best;
});

/** All views use the same triangle IDs, shared edges and partition labels.
 * The two partitions are teaching constructions, not a METIS execution.
 * Phase changes never fade the whole stage to black.
 */
export const Episode01Chapter02:React.FC=()=>{
  const t=useCurrentFrame()/CHAPTER_02_FPS;
  const zoom=smooth(2.2,6.5,t);
  const graph=smooth(7.2,11.3,t)*(1-smooth(26,30.2,t));
  const meshAlpha=1-smooth(0.88,1,graph);
  const nodeAlpha=smooth(0.50,0.95,graph);
  const focusAlpha=smooth(2.6,3.4,t)*(1-smooth(7.0,7.8,t));
  const grouping=smooth(12.5,13.5,t);
  const stats=t<19?stridedPartition:compactPartition;
  const points=triangleGraphNodes.map(node=>project(node.center,zoom));
  const coloredMesh=smooth(26,30.2,t);

  const polygon=(corners:readonly Vec3[],center:Vec3)=>{
    const target=project(center,zoom);
    return corners.map(p=>{
      const q=interpolate(project(p,zoom),target,graph);
      return q.x.toFixed(2)+','+q.y.toFixed(2);
    }).join(' ');
  };
  const captions=[
    {a:0,b:3.0,text:'要独立选择几何细节，先把三角形组织成小簇。'},
    {a:3.0,b:7.2,text:'两个三角形共享一条边，就把它们视为相邻。'},
    {a:7.2,b:12.5,text:'每个三角形变成一个点，连线保留它们的相邻关系。'},
    {a:12.5,b:16.0,text:'这里用四组、每组八个三角形作示例。'},
    {a:16.0,b:19.0,text:'数量相同，但每组都散落各处，跨组连接很多。'},
    {a:19.0,b:26.0,text:'把相邻的三角形归到一起，跨组连接就少了。'},
    {a:26.0,b:31.0,text:'再把图还原成几何，就得到四个相邻的小簇。'},
    {a:31.0,b:36.0,text:'下一步，把这些小簇组织起来，构建更粗的几何。'},
  ];
  const cue=captions.find(c=>t>=c.a&&t<c.b)??captions[captions.length-1];
  const captionAlpha=smooth(cue.a,cue.a+0.35,t)*(1-smooth(cue.b-0.35,cue.b,t));

  return <AbsoluteFill style={{background:COLOR.bg,overflow:'hidden',fontFamily:FONT}}>
    <svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <g opacity={meshAlpha}>
        {triangleGraphNodes.map(node=><g key={node.id}>
          <polygon points={polygon(node.triangle.corners,node.center)}
            fill="#25303a" stroke={COLOR.white} strokeWidth={1.5}
            strokeOpacity={0.60} strokeLinejoin="round"/>
          <polygon points={polygon(node.triangle.corners,node.center)}
            fill={FINE_COLORS[COMPACT_LABELS[node.id]]}
            fillOpacity={coloredMesh*0.34}/>
        </g>)}
      </g>

      {/* First establish one real shared edge while both triangles remain. */}
      <g opacity={focusAlpha}>
        {[focus.a,focus.b].map(id=><polygon key={id}
          points={polygon(triangleGraphNodes[id].triangle.corners,triangleGraphNodes[id].center)}
          fill={COLOR.gold} fillOpacity={0.18} stroke="none"/>)}
        {(()=>{
          const a=project(focus.shared[0],zoom),b=project(focus.shared[1],zoom);
          return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={COLOR.gold} strokeWidth={5} strokeLinecap="round"/>;
        })()}
      </g>

      {/* Rotate every actual shared mesh edge into its dual-graph link.
          The reverse motion returns those links to cluster boundaries. */}
      {triangleGraphLinks.map(link=>{
        const meshA=project(link.shared[0],zoom),meshB=project(link.shared[1],zoom);
        let targetA=points[link.a],targetB=points[link.b];
        if(distance(meshA,targetA)+distance(meshB,targetB)>
          distance(meshA,targetB)+distance(meshB,targetA)){
          [targetA,targetB]=[targetB,targetA];
        }
        const a=interpolate(meshA,targetA,graph),b=interpolate(meshB,targetB,graph);
        const cut=stats.labels[link.a]!==stats.labels[link.b];
        const selected=link===focus;
        const alpha=Math.max(graph*0.65,grouping*(cut?0.85:0.28));
        return <line key={link.a+':'+link.b}
          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={grouping>0.5&&cut?COLOR.gold:selected&&t<12.5?COLOR.gold:COLOR.muted}
          strokeWidth={grouping>0.5&&cut?3.0:1.8}
          strokeLinecap="round" opacity={alpha}/>;
      })}

      <g opacity={nodeAlpha}>
        {points.map((p,id)=><g key={id}>
          <circle cx={p.x} cy={p.y} r={12} fill={COLOR.bg}
            stroke={COLOR.white} strokeWidth={2.1}/>
          <circle cx={p.x} cy={p.y} r={12}
            fill={FINE_COLORS[stats.labels[id]]} opacity={grouping}
            stroke={COLOR.bg} strokeWidth={2.1}/>
        </g>)}
      </g>

      <g opacity={smooth(13.5,14.3,t)*(1-smooth(25,26.3,t))}
        textAnchor="middle" fontFamily={FONT}>
        <text x={960} y={860} fill={COLOR.muted} fontSize={23}>跨组连接</text>
        <text x={960} y={916} fill={COLOR.gold} fontSize={42} fontFamily={MONO}>
          {t<19?stridedPartition.cutEdges:
            stridedPartition.cutEdges+' → '+compactPartition.cutEdges}
        </text>
      </g>

      <g opacity={smooth(30.5,32,t)} textAnchor="middle"
        fontFamily={MONO} fontSize={25}>
        {FINE_COLORS.map((_,id)=>{
          const members=triangleGraphNodes.filter(n=>COMPACT_LABELS[n.id]===id);
          const p=members.map(n=>project(n.center,zoom)).reduce((sum,v)=>({
            x:sum.x+v.x/members.length,y:sum.y+v.y/members.length,
          }),{x:0,y:0});
          return <text key={id} x={p.x} y={p.y+8}
            fill={COLOR.white} stroke={COLOR.bg} strokeWidth={5}
            paintOrder="stroke">{'F'+id}</text>;
        })}
      </g>

      <text x={960} y={996} textAnchor="middle" fontFamily={FONT}
        fontSize={34} fill={COLOR.white} opacity={captionAlpha}>{cue.text}</text>
    </svg>
  </AbsoluteFill>;
};
