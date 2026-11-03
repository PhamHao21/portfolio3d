# Portfolio 3D

A character-select style portfolio: 4 characters stand around a rotating disc,
each one representing a section (About / Tech / Projects / Work).

There are 2 character sets, selected with `CAST` in `src/lib/data/sections.js`:

| CAST | Models | Posing | Notes |
|---|---|---|---|
| `mmd` | 4 PMX models (MikuMikuDance) | static poses in `poses.js` + procedural idle motion | License forbids redistribution: **local use only, do not deploy** |
| `vroid` | 4 VRoid characters (VRM) | Mixamo animations (FBX) | Use this set for the public build |

## Tech stack

| Layer | Choice |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 |
| Deploy | adapter-static (static site, no server needed) |
| 3D | plain three.js (no Threlte) |
| MMD | custom PMX loader (`src/lib/three/mmd/`), IK via three's built-in CCDIKSolver |
| VRM | @pixiv/three-vrm v3, MeshoptDecoder for compressed meshes |
| VRM animation | vrm-mixamo-retarget |

## Preparing assets

The VRoid models and animations are included in the repo. The PMX models are not.

**MMD**: extract each zip into its own folder, then run:

    node tools/prepare-pmx.mjs <extracted-folder> piper
    -> static/models/piper/model.pmx + t0.webp, t1.webp...

The script picks the largest .pmx file and converts its textures to webp
(1024px, face textures 2048px).

**VRoid**:

    static/models/character1.glb ... character4.glb
    static/anim/idle_1.fbx ... idle_4.fbx
    static/anim/pose_select.fbx

FBX files must be downloaded from Mixamo with Format = FBX Binary (.fbx), Skin = Without Skin.

## Commands

    npm install
    npm run dev       # http://localhost:5173
    npm test
    npm run build

Pose editor for MMD characters: http://localhost:5173/pose (dev only). Drag the sliders,
then click Save to write `src/lib/data/poses.js`. You can load a reference image as an overlay.

Show the FPS meter: http://localhost:5173/?stats. Disable post effects: `?fx=0`.

## Compressing VRM models

    cd tools
    .\optimize.ps1 -Name Character1

## Project structure

    src/lib/data/       data for the 4 sections + MMD poses (nothing hardcoded elsewhere)
    src/lib/three/      three.js code (imperative, kept separate from Svelte)
    src/lib/three/mmd/  PMX parsing, mesh building, toon materials, bone solving + poses
    src/lib/components/ UI components
    src/lib/dev/        pose editor page (dev only)
    tools/              scripts for compressing VRM, preparing PMX, pose saving plugin
    tests/              unit tests
