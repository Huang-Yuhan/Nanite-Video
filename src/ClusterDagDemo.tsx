import React, {useMemo} from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ClusterMesh, demoData} from './demoData';

const FPS = 30;
const ACCENT = '#43e0cf';
const TEXT = '#eaf3ff';
const MUTED = '#8ea7bd';
const FONT = "'Inter', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
const MONO = "'JetBrains Mono', 'Cascadia Code', monospace";

function smooth(a: number, b: number, t: number): number {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

const stages = [
  {at: 0, en: 'SOURCE GEOMETRY', zh: '高密度三角网格', hint: '32 TRIANGLES  /  SOURCE MESH'},
  {at: 2.2, en: 'INITIAL CLUSTERING', zh: '划分 Fine Clusters', hint: '4 CLUSTERS  /  8 TRIANGLES EACH'},
  {at: 4.7, en: 'CLUSTER GROUP', zh: '标记 Group 外边界', hint: 'PRESERVE SHARED OUTER BOUNDARY'},
  {at: 7.2, en: 'MERGE & SIMPLIFY', zh: '从 32 个三角形减少到 16 个', hint: 'PRECOMPUTED BEFORE / AFTER LOD'},
  {at: 10, en: 'COARSE CLUSTERING', zh: '重新划分 Coarse Clusters', hint: '2 CLUSTERS  /  8 TRIANGLES EACH'},
  {at: 12.3, en: 'DAG DEPENDENCIES', zh: '构建多对多 LOD 依赖', hint: '4 FINE  →  2 COARSE   /   ONE GROUP TRANSITION'},
] as const;

const stageAt = (t: number): number => {
  for (let i = stages.length - 1; i >= 0; i--) {
    if (t >= stages[i].at) return i;
  }
  return 0;
};

function MeshPiece({cluster, opacity, colorMix}: {
  cluster: ClusterMesh;
  opacity: number;
  colorMix: number;
}) {
  const surface = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(cluster.vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [cluster]);

  const lines = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(cluster.edges, 3));
    return geometry;
  }, [cluster]);

  const color = new THREE.Color('#395871').lerp(new THREE.Color(cluster.color), colorMix);

  return (
    <group visible={opacity > 0.002}>
      <mesh geometry={surface} renderOrder={2}>
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          flatShading
          roughness={0.48}
          metalness={0.12}
          emissive={cluster.color}
          emissiveIntensity={0.08 * colorMix}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          transparent
          opacity={opacity}
          depthWrite={opacity > 0.98}
        />
      </mesh>
      <lineSegments geometry={lines} renderOrder={3}>
        <lineBasicMaterial
          color="#c5e7fa"
          transparent
          opacity={opacity * 0.48}
          depthTest={false}
        />
      </lineSegments>
    </group>
  );
}

function MeshWorld({t}: {t: number}) {
  const border = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(demoData.boundary, 3));
    return geometry;
  }, []);

  const transition = smooth(7.25, 9.55, t);
  const fineColor = smooth(2.1, 4.45, t);
  const coarseColor = smooth(9.7, 11.7, t);
  const borderAlpha = smooth(4.9, 6.6, t) * (1 - smooth(10.1, 11.9, t));

  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight color="#bcefff" position={[2, 4, 7]} intensity={2.0} />
      <pointLight color="#4b99ed" position={[-5, -1, 4]} intensity={22} />
      <group rotation={[-0.3 + 0.03 * Math.sin(t * 0.5), -0.16 + 0.15 * Math.sin(t * 0.28), 0.06]}>
        {demoData.fine.map((cluster) => (
          <MeshPiece
            key={cluster.id}
            cluster={cluster}
            opacity={1 - transition}
            colorMix={fineColor}
          />
        ))}
        {demoData.coarse.map((cluster) => (
          <MeshPiece
            key={cluster.id}
            cluster={cluster}
            opacity={transition}
            colorMix={coarseColor}
          />
        ))}
        <line geometry={border} renderOrder={9} visible={borderAlpha > 0.01}>
          <lineBasicMaterial
            color="#ffba64"
            transparent
            opacity={borderAlpha}
            depthTest={false}
          />
        </line>
      </group>
    </>
  );
}

function DagGraph({t}: {t: number}) {
  const reveal = smooth(12.3, 13.1, t);
  const nodesF = [
    {id: 'F0', x: 71, c: '#4da9ff'},
    {id: 'F1', x: 185, c: '#32d1b2'},
    {id: 'F2', x: 299, c: '#ffbd65'},
    {id: 'F3', x: 413, c: '#bb8dff'},
  ];
  const nodesC = [
    {id: 'C0', x: 150, c: '#5bafff'},
    {id: 'C1', x: 334, c: '#ffb95c'},
  ];

  return (
    <div style={{opacity: reveal, marginTop: 27}}>
      <div style={{fontFamily: MONO, color: MUTED, fontSize: 17, letterSpacing: 1.4}}>
        LOD DEPENDENCY GRAPH
      </div>
      <svg width="100%" viewBox="0 0 484 350" style={{overflow: 'visible', marginTop: 6}}>
        <text x="4" y="40" fill={MUTED} fontFamily={MONO} fontSize="13">FINE  /  HIGH DETAIL</text>
        <text x="4" y="338" fill={MUTED} fontFamily={MONO} fontSize="13">COARSE  /  LOW DETAIL</text>
        {nodesF.flatMap((f, i) => nodesC.map((c, j) => {
          const progress = smooth(13.4 + (i * 2 + j) * 0.14, 15.2 + (i * 2 + j) * 0.14, t);
          const y1 = 123;
          const y2 = 262;
          const x2 = f.x + (c.x - f.x) * progress;
          const yy2 = y1 + (y2 - y1) * progress;
          return (
            <line
              key={f.id + '-' + c.id}
              x1={f.x}
              y1={y1}
              x2={x2}
              y2={yy2}
              stroke="#6c92ae"
              strokeWidth={2}
              opacity={0.6}
            />
          );
        }))}
        {nodesF.map((f) => (
          <g key={f.id}>
            <circle cx={f.x} cy="111" r={27} fill="#102235" stroke={f.c} strokeWidth="3"/>
            <circle cx={f.x} cy="111" r={5} fill={f.c}/>
            <text x={f.x} y="161" textAnchor="middle" fill={TEXT} fontFamily={MONO} fontSize="16">{f.id}</text>
          </g>
        ))}
        {nodesC.map((c) => (
          <g key={c.id}>
            <circle cx={c.x} cy="275" r={30} fill="#102235" stroke={c.c} strokeWidth="3"/>
            <circle cx={c.x} cy="275" r={5} fill={c.c}/>
            <text x={c.x} y="318" textAnchor="middle" fill={TEXT} fontFamily={MONO} fontSize="16">{c.id}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function BuildPipeline({step}: {step: number}) {
  return (
    <div style={{marginTop: 32, display: 'flex', flexDirection: 'column', gap: 9}}>
      {stages.map((s, i) => {
        const active = i === step;
        return (
          <div key={s.en} style={{
            padding: '14px 13px',
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            borderRadius: 11,
            background: active ? 'rgba(38,102,122,.32)' : 'transparent',
            border: active ? '1px solid rgba(77,222,209,.26)' : '1px solid transparent',
            opacity: i > step ? 0.4 : 1,
          }}>
            <span style={{fontFamily: MONO, color: active ? ACCENT : MUTED, fontSize: 19}}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{fontFamily: MONO, color: active ? TEXT : MUTED, fontSize: 19}}>
              {s.en}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const ClusterDagDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const step = stageAt(t);
  const s = stages[step];
  const dag = smooth(12.3, 13.05, t);
  const meshShift = smooth(12.3, 13.05, t);

  return (
    <AbsoluteFill style={{
      fontFamily: FONT,
      color: TEXT,
      background: 'radial-gradient(ellipse at 42% 43%, #122d45 0%, #0b182a 54%, #080f1b 100%)',
      overflow: 'hidden',
    }}>
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(81,152,194,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(81,152,194,.055) 1px, transparent 1px)',
        backgroundSize: '54px 54px',
        maskImage: 'linear-gradient(90deg, transparent, black 17%, black 90%, transparent)',
      }}/>
      <div style={{
        position: 'absolute', left: 240, top: 190, width: 850, height: 850,
        borderRadius: '50%', border: '1px solid rgba(65,204,214,.095)',
        boxShadow: 'inset 0 0 105px rgba(27,104,153,.095)', pointerEvents: 'none',
      }}/>
      <div style={{position: 'absolute', left: 90, top: 48, fontFamily: MONO, color: ACCENT, fontSize: 22, letterSpacing: 3}}>
        NANITE  /  VIRTUALIZED GEOMETRY
      </div>
      <div style={{position: 'absolute', left: 88, top: 94, fontSize: 66, fontWeight: 800, letterSpacing: 0.5}}>
        从 Mesh 到 Cluster DAG
      </div>
      <div style={{position: 'absolute', right: 88, top: 59, textAlign: 'right', fontFamily: MONO}}>
        <div style={{color: ACCENT, fontSize: 21}}>VISUAL DEMO 01</div>
        <div style={{color: MUTED, fontSize: 17, marginTop: 8}}>OFFLINE BUILD / 18 SEC</div>
      </div>

      <div style={{
        position: 'absolute', left: 82, top: 214,
        width: 1168, height: 696, borderRadius: 22,
        background: 'rgba(10,23,39,.62)', border: '1px solid rgba(111,165,202,.2)',
        overflow: 'hidden',
      }}>
        <div style={{position:'absolute',left:31,top:25,zIndex:5,fontFamily:MONO,color:MUTED,fontSize:17,letterSpacing:1}}>
          THREE.JS  /  PROCEDURAL MESH
        </div>
        <div style={{position:'absolute',right:30,top:25,zIndex:5,fontFamily:MONO,color:MUTED,fontSize:17}}>
          FRAME {String(frame).padStart(4, '0')} / 0540
        </div>
        <div style={{
          position:'absolute',left:0,top:0,width:'100%',height:'100%',
          transform: `translateX(${-80 * meshShift}px) scale(${1 - 0.13 * meshShift})`,
          transformOrigin:'center',
        }}>
          <ThreeCanvas
            width={1168}
            height={696}
            camera={{fov: 43, position: [0, 0, 8.4]}}
            style={{width:'100%',height:'100%'}}
          >
            <MeshWorld t={t}/>
          </ThreeCanvas>
        </div>
        <div style={{position:'absolute',left:34,bottom:33,zIndex:6}}>
          <div style={{fontFamily:MONO,color:step===3?'#ffbb70':ACCENT,fontSize:19,letterSpacing:1.2}}>
            {s.en}
          </div>
          <div style={{fontSize:39,fontWeight:750,marginTop:6}}>{s.zh}</div>
          <div style={{fontFamily:MONO,color:MUTED,fontSize:17,marginTop:10}}>{s.hint}</div>
        </div>
        <div style={{position:'absolute',bottom:0,left:0,width:`${t / 18 * 100}%`,height:3,background:ACCENT}}/>
      </div>

      <div style={{
        position:'absolute',left:1274,top:214,width:557,height:696,
        padding:'31px 36px',boxSizing:'border-box',borderRadius:22,
        background:'rgba(10,23,39,.74)',border:'1px solid rgba(111,165,202,.2)',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',fontFamily:MONO,fontSize:19}}>
          <span style={{color:TEXT}}>BUILD PIPELINE</span>
          <span style={{color:ACCENT}}>{String(step+1).padStart(2,'0')} / 06</span>
        </div>
        <div style={{height:1,background:'rgba(120,176,203,.18)',marginTop:23}}/>
        <div style={{opacity:1-dag, position:'absolute',top:86,left:24,right:24,pointerEvents:'none'}}>
          <BuildPipeline step={step}/>
        </div>
        <div style={{position:'absolute',top:99,left:35,right:35,pointerEvents:'none'}}>
          <DagGraph t={t}/>
        </div>
        <div style={{position:'absolute',bottom:30,left:35,fontFamily:MONO,fontSize:15,color:MUTED}}>
          ASSET BUILD   /   NOT RUNTIME
        </div>
      </div>

      <div style={{position:'absolute',left:90,bottom:85,fontFamily:MONO,color:MUTED,fontSize:17}}>
        ILLUSTRATIVE GEOMETRY  /  NOT UE CAPTURE OR EDGE-COLLAPSE TRACE
      </div>
      <div style={{position:'absolute',right:90,bottom:85,fontFamily:MONO,color:TEXT,fontSize:22}}>
        00:{String(Math.floor(t)).padStart(2,'0')}
      </div>
      <div style={{position:'absolute',left:90,right:90,bottom:50,height:5,borderRadius:4,background:'#21374b'}}>
        <div style={{width:`${frame / 539 * 100}%`,height:'100%',background:ACCENT,borderRadius:4}}/>
      </div>
    </AbsoluteFill>
  );
};
