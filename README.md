# Portfolio 3D

Portfolio dang character-select: 4 nhan vat dung quanh dia xoay,
moi nhan vat ung voi 1 muc (About / Tech / Projects / Work).

Co 2 bo nhan vat, chon bang `CAST` trong `src/lib/data/sections.js`:

| CAST | Model | Dang | Ghi chu |
|---|---|---|---|
| `mmd` | 4 model PMX (MikuMikuDance) | dang tinh trong `poses.js` + chuyen dong song viet bang code | Giay phep cam phan phoi lai: **chi chay tren may, khong deploy** |
| `vroid` | 4 nhan vat VRoid (VRM) | animation Mixamo (FBX) | Dung cho ban dua len mang |

## Cong nghe

| Lop | Chon |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 |
| Deploy | adapter-static (site tinh, khong can server) |
| 3D | three (thuan, khong dung Threlte) |
| MMD | bo doc PMX tu viet (`src/lib/three/mmd/`), IK bang CCDIKSolver co san trong three |
| VRM | @pixiv/three-vrm v3, giai nen MeshoptDecoder |
| Animation VRM | vrm-mixamo-retarget |

## Chuan bi file

Cac file model khong nam trong repo.

**MMD**: giai nen tung file zip vao 1 thu muc rieng roi chay:

    node tools/prepare-pmx.mjs <thu-muc-giai-nen> piper
    -> static/models/piper/model.pmx + t0.webp, t1.webp...

Script lay file .pmx lon nhat, doi texture sang webp (1024px, texture mat 2048px).

**VRoid**:

    static/models/character1.glb ... character4.glb
    static/anim/idle_1.fbx ... idle_4.fbx
    static/anim/pose_select.fbx

FBX phai tai tu Mixamo voi: Format = FBX Binary (.fbx), Skin = Without Skin.

## Lenh

    npm install
    npm run dev       # http://localhost:5173
    npm test
    npm run build

Chinh dang nhan vat MMD: http://localhost:5173/pose (chi khi dev). Keo thanh truot,
bam Luu -> ghi `src/lib/data/poses.js`. Co the mo anh tham khao de dat chong len.

Hien so do fps: http://localhost:5173/?stats . Tat hieu ung: `?fx=0`.

## Nen lai model VRM

    cd tools
    .\optimize.ps1 -Name Character1

## Cau truc

    src/lib/data/       du lieu 4 muc + dang MMD, khong hardcode o cho khac
    src/lib/three/      code three.js (menh lenh, tach khoi Svelte)
    src/lib/three/mmd/  doc PMX, dung mesh, vat lieu toon, giai xuong + dang
    src/lib/components/ component giao dien
    src/lib/dev/        trang chinh dang (chi dev)
    tools/              script nen VRM, chuan bi PMX, plugin luu dang
    tests/              unit test
