# 3D models (optional)

Put these files here. Anything missing falls back to the built-in procedural model.

- `lab_table.glb`  lab bench with sink and faucet (e.g. Sketchfab "LabTable2")
- `plant_a.glb`, `plant_b.glb`  indoor plants

Shrink them first:
`npx @gltf-transform/cli optimize in.glb out.glb --texture-compress webp --texture-size 1024`

Tune scale, counter colour and faucet detection in `src/three/assets.ts` (LAB_MODELS).
Open the app with `?labdebug=1` to print node names and show a red marker at the spout tip.
Save each model's license as `LICENSE-<name>.txt` and fill in CREDITS.md.
