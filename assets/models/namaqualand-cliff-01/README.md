# Namaqualand Cliff 01

- Source: https://polyhaven.com/a/namaqualand_cliff_01
- License: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/
- Authors: Jenelle van Heerden (photography), Rico Cilliers (modeling).
- Downloaded: 2026-11-10. Powered by Poly Haven.

The whole-mesh limitation shot uses the author's existing **LOD0 (94,369
triangles)** and **LOD3 (11,794 triangles)** from this original source:

https://dl.polyhaven.org/file/ph-assets/Models/blend/1k/namaqualand_cliff_01/namaqualand_cliff_01_1k.blend

Original SHA-256: `eba0ae3947ec26c866f9174b6a70816d96b1d3c543356fa6d27f0d8a4eef09f1`

The original source remains downloadable; the repository stores runtime mesh
exports, not the source .blend. Export without evaluating modifiers using:

```bash
blender -b /path/to/namaqualand_cliff_01_1k.blend --python scripts/episode-01/export-cliff-lods.py
npm run validate:cliff-lods
```

The binary format is a gzip-compressed little-endian Float32 triangle list.
Each corner stores `[x, y, z, u, v]`. Only Blender's Z-up to Y-up coordinate
conversion is applied. The original triangles and per-corner UVs are retained;
no decimation or local stitching is performed. Manifest hashes refer to the
uncompressed bytes, independent of gzip implementation.

2K diffuse texture:
https://dl.polyhaven.org/file/ph-assets/Models/jpg/2k/namaqualand_cliff_01/namaqualand_cliff_01_diff_2k.jpg

Texture SHA-256: `72501708e40c12e315b24e606555193af0f89bc189d26072bc0021a1ca362ed0`

Both levels share one fixed perspective camera. Near/far wire overlays show
the actual triangles; each LOD switch replaces the entire mesh. Lighting is
baked into the diffuse texture; normal maps are not used. Canvas uses per-face
affine texture mapping as an approximation under perspective.

This asset continues through the screen-detail shot. The clustering bridge
explicitly switches to an isolated 32-triangle teaching patch, which remains the verified
source for Chapter 02's graph and Chapter 03's collapse trace. The teaching
grid is not presented as a patch extracted from this scanned asset.
