import * as THREE from 'three';
import { createMmdMaterial, createEdgeMaterial } from './material.js';
import { toRightHanded } from './pose.js';

/**
 * Dung SkinnedMesh tu du lieu parsePmx.
 * - Doi he tay trai (MMD) sang tay phai (three): dao z, dao thu tu dinh tam giac.
 * - Nhan `scale` vao toa do de xuong co don vi met (de cong animation thu cong).
 * - Chi tao morph target cho cac morph trong `morphs` (moi morph ton 1 ban sao vi tri
 *   toan bo dinh tren GPU, tao het ~40 morph x 4 nhan vat la qua nang).
 *
 * @param {ReturnType<import('./pmx.js').parsePmx>} pmx
 * @param {{ scale: number, texture: (i: number) => THREE.Texture | null,
 *           morphs?: string[] | 'all', edge?: number }} opts
 */
export function buildPmxMesh(pmx, { scale, texture, morphs = [], edge = 0 }) {
  const n = pmx.vertexCount;
  const geo = new THREE.BufferGeometry();

  const pos = toRightHanded(pmx.positions, scale);
  const nor = toRightHanded(pmx.normals, 1);
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    uv[i * 2] = pmx.uvs[i * 2];
    uv[i * 2 + 1] = 1 - pmx.uvs[i * 2 + 1];
  }
  // BDEF4 co the co tong trong so khac 1: chuan hoa lai.
  const w = pmx.skinWeights.slice();
  for (let i = 0; i < n; i++) {
    const s = w[i * 4] + w[i * 4 + 1] + w[i * 4 + 2] + w[i * 4 + 3];
    if (s > 0 && Math.abs(s - 1) > 1e-4) for (let k = 0; k < 4; k++) w[i * 4 + k] /= s;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(pmx.skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
  if (edge > 0) geo.setAttribute('edgeScale', new THREE.BufferAttribute(pmx.edgeScale, 1));

  // Dao thu tu dinh (0,1,2) -> (2,1,0) vi da lat truc z.
  const src = pmx.indices;
  const idx = n > 65535 ? new Uint32Array(src.length) : new Uint16Array(src.length);
  for (let i = 0; i < src.length; i += 3) {
    idx[i] = src[i + 2];
    idx[i + 1] = src[i + 1];
    idx[i + 2] = src[i];
  }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));

  let start = 0;
  pmx.materials.forEach((m, i) => {
    geo.addGroup(start, m.indexCount, i);
    start += m.indexCount;
  });

  // --- Morph ---
  const wanted = pmx.morphs.filter((m) => m.type === 1 && (morphs === 'all' || morphs.includes(m.name)));
  if (wanted.length) {
    geo.morphAttributes.position = wanted.map((m) => {
      const arr = new Float32Array(n * 3);
      for (let k = 0; k < m.indices.length; k++) {
        const v = m.indices[k] * 3;
        arr[v] = m.offsets[k * 3] * scale;
        arr[v + 1] = m.offsets[k * 3 + 1] * scale;
        arr[v + 2] = -m.offsets[k * 3 + 2] * scale;
      }
      const attr = new THREE.BufferAttribute(arr, 3);
      attr.name = m.name;
      return attr;
    });
    geo.morphTargetsRelative = true;
  }
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  // --- Xuong: MMD khong co huong xuong, moi xuong chi co vi tri ---
  const bones = pmx.bones.map((b) => {
    const bone = new THREE.Bone();
    bone.name = b.name;
    return bone;
  });
  const roots = [];
  pmx.bones.forEach((b, i) => {
    const [x, y, z] = b.position;
    const p = b.parent >= 0 ? pmx.bones[b.parent].position : [0, 0, 0];
    bones[i].position.set((x - p[0]) * scale, (y - p[1]) * scale, -(z - p[2]) * scale);
    if (b.parent >= 0) bones[b.parent].add(bones[i]);
    else roots.push(bones[i]);
  });

  const materials = pmx.materials.map((m) => createMmdMaterial(m, texture));
  const mesh = new THREE.SkinnedMesh(geo, materials);
  mesh.name = pmx.name;
  for (const r of roots) mesh.add(r);
  mesh.bind(new THREE.Skeleton(bones));
  // Khung bao cua dang dung yen; dang tu the khac van nam gon trong do nen khoi tinh
  // lai moi frame (tinh tren CPU tung dinh). Tat culling cho chac.
  mesh.frustumCulled = false;

  let outline = null;
  if (edge > 0) {
    outline = new THREE.SkinnedMesh(
      geo,
      pmx.materials.map((m) => createEdgeMaterial(m, edge))
    );
    outline.bind(mesh.skeleton, mesh.bindMatrix);
    outline.frustumCulled = false;
    // Chung mang trong so morph voi mesh chinh: chop mat thi vien chop theo.
    if (mesh.morphTargetInfluences) {
      outline.morphTargetInfluences = mesh.morphTargetInfluences;
      outline.morphTargetDictionary = mesh.morphTargetDictionary;
    }
    mesh.add(outline);
  }

  return { mesh, outline, bones };
}
