"""Run from the repository root with the verified original source:
blender -b /path/to/namaqualand_cliff_01_1k.blend --python scripts/episode-01/export-cliff-lods.py

Exports the author's existing LOD0 and LOD3, without modifiers or simplification.
"""
import gzip
import hashlib
import json
import struct
from pathlib import Path
import bpy

source_hash='eba0ae3947ec26c866f9174b6a70816d96b1d3c543356fa6d27f0d8a4eef09f1'
assert hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest()==source_hash
output=Path('public/models/namaqualand-cliff-01')
output.mkdir(parents=True,exist_ok=True)
lods=[]
for level,label,expected in [(0,'fine',94369),(3,'coarse',11794)]:
    name=f'namaqualand_cliff_01_LOD{level}'
    obj=bpy.data.objects[name]
    assert tuple(obj.location)==(0,0,0) and tuple(obj.rotation_euler)==(0,0,0)
    assert tuple(obj.scale)==(1,1,1)
    mesh=obj.data
    assert len(mesh.polygons)==expected
    binary=bytearray()
    for face in mesh.polygons:
        assert len(face.vertices)==3
        for loop in face.loop_indices:
            x,y,z=mesh.vertices[mesh.loops[loop].vertex_index].co
            u,v=mesh.uv_layers['UVMap'].data[loop].uv
            binary.extend(struct.pack('<fffff',x,z,-y,u,v))
    filename=label+'.bin.gz'
    (output/filename).write_bytes(gzip.compress(binary,mtime=0))
    lods.append(dict(id=label,sourceObject=name,triangles=len(mesh.polygons),
        vertices=len(mesh.vertices),bytes=len(binary),
        sha256=hashlib.sha256(binary).hexdigest(),file=filename))
manifest=dict(asset='namaqualand_cliff_01',
    sourceUrl='https://polyhaven.com/a/namaqualand_cliff_01',sourceSha256=source_hash,
    layout='little-endian float32: x,y,z,u,v per triangle corner; Blender Z-up converted to Y-up',
    lods=sorted(lods,key=lambda lod:lod['id']))
Path('src/episode01/assets/cliffLods.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Exported author LOD0 and LOD3; no simplification performed')
