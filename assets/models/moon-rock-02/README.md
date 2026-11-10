# Moon Rock 02 · traditional LOD asset

- Source: https://polyhaven.com/a/moon_rock_02
- License: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/
- Poly Haven license: https://polyhaven.com/license
- Photography: Greg Zaal and Rico Cilliers; processing: Jenelle van Heerden.
- Downloaded: 2026-11-10. Powered by Poly Haven.

The four **existing, author-supplied** objects in `moon_rock_02_1k.blend`
are used directly. No decimation, remeshing or LOD generation is performed.

| Object | Vertices | Triangles |
| --- | ---: | ---: |
| moon_rock_02_LOD0 | 1654 | 3304 |
| moon_rock_02_LOD1 | 828 | 1652 |
| moon_rock_02_LOD2 | 415 | 826 |
| moon_rock_02_LOD3 | 208 | 412 |

Original download: https://dl.polyhaven.org/file/ph-assets/Models/blend/1k/moon_rock_02/moon_rock_02_1k.blend

Original SHA-256: `8e6fe1d0ec5773c75855eff9aa2f4138752fadf5479a5b48ad66aeaeb688275a`

Diffuse texture: https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/moon_rock_02/moon_rock_02_diff_1k.jpg

Texture SHA-256: `2df7bedcd0f169d76f37af52768c2a674019b6c6b812492a47c230726cff96ad`

`src/episode01/assets/moonRockLods.json` preserves triangle indices and
per-corner UVs. It converts Blender's Z-up coordinates to Y-up and uses a
single center/scale derived from LOD0 for all levels, preserving alignment.
Regenerate with Blender from the repository root:

```bash
blender -b assets/models/moon-rock-02/moon_rock_02_1k.blend --python scripts/episode-01/export-rock-lods.py
```

The runtime uses only local mesh data and the 1K diffuse map; no external
requests, normal maps or displacement. Shading/projection are for teaching,
not a reproduction of Unreal's renderer or its automatic LOD selection.
