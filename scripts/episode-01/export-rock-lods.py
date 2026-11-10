"""Run: blender -b assets/models/moon-rock-02/moon_rock_02_1k.blend --python scripts/episode-01/export-rock-lods.py

Extracts the author's existing LOD meshes, without evaluating modifiers or
performing simplification. Run from the repository root. Requires Blender 4.4+.
"""
import hashlib
import json
from pathlib import Path
import bpy

source = Path('assets/models/moon-rock-02/moon_rock_02_1k.blend')
assert hashlib.sha256(source.read_bytes()).hexdigest() == '8e6fe1d0ec5773c75855eff9aa2f4138752fadf5479a5b48ad66aeaeb688275a'
lods = []
for level in range(4):
    obj = bpy.data.objects[f'moon_rock_02_LOD{level}']
    assert tuple(obj.location) == (0,0,0) and tuple(obj.rotation_euler) == (0,0,0)
    assert tuple(obj.scale) == (1,1,1)
    mesh = obj.data
    positions = [[v.co.x,v.co.z,-v.co.y] for v in mesh.vertices]
    triangles, uv = [], []
    for face in mesh.polygons:
        assert len(face.vertices) == 3, 'Expected already-triangulated source'
        triangles.append(list(face.vertices))
        uv.append([list(mesh.uv_layers['UVMap'].data[i].uv) for i in face.loop_indices])
    assert len(triangles) == [3304,1652,826,412][level]
    lods.append(dict(level=level,positions=positions,triangles=triangles,uv=uv))
mins = [min(v[k] for v in lods[0]['positions']) for k in range(3)]
maxs = [max(v[k] for v in lods[0]['positions']) for k in range(3)]
center = [(a+b)/2 for a,b in zip(mins,maxs)]
scale = 2/max(b-a for a,b in zip(mins,maxs))
for lod in lods:
    lod['positions'] = [[round((v[k]-center[k])*scale,7) for k in range(3)] for v in lod['positions']]
    lod['uv'] = [[[round(x,7) for x in v] for v in tri] for tri in lod['uv']]
output = Path('src/episode01/assets/moonRockLods.json')
output.write_text(json.dumps(dict(asset='moon_rock_02',lods=lods),separators=(',',':'))+'\n')
print(f'Exported author LODs: {[len(l["triangles"]) for l in lods]} -> {output}')
