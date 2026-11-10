import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=new URL('../../',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('src/episode01/assets/cliffLods.json',root),'utf8'));
assert.equal(manifest.asset,'namaqualand_cliff_01');
assert.equal(manifest.lods.length,2);
for(const lod of manifest.lods){
  const level=lod.id==='fine'?0:3;
  assert.ok(['fine','coarse'].includes(lod.id));
  assert.equal(lod.sourceObject,`namaqualand_cliff_01_LOD${level}`);
  assert.equal(lod.triangles,level===0?94369:11794);
  const data=gunzipSync(readFileSync(new URL('public/models/namaqualand-cliff-01/'+lod.file,root)));
  assert.equal(data.length,lod.bytes);
  assert.equal(data.length,lod.triangles*3*5*4);
  assert.equal(createHash('sha256').update(data).digest('hex'),lod.sha256);
  for(let offset=0;offset<data.length;offset+=60){
    const tri=Array.from({length:15},(_,i)=>data.readFloatLE(offset+i*4));
    assert.ok(tri.every(Number.isFinite),'Non-finite vertex or UV');
    const a=tri.slice(0,3),b=tri.slice(5,8),c=tri.slice(10,13);
    const ab=b.map((v,k)=>v-a[k]),ac=c.map((v,k)=>v-a[k]);
    assert.ok(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],
      ab[0]*ac[1]-ab[1]*ac[0])>1e-12,'Degenerate triangle');
  }
  console.log(`${lod.sourceObject}: ${lod.triangles} triangles, export hash and geometry valid`);
}
