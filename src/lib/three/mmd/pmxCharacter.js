import * as THREE from 'three';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js';
import { parsePmx } from './pmx.js';
import { buildPmxMesh } from './pmxMesh.js';
import {
  normalizePose,
  solveOrder,
  ikLimitToRight,
  physicsChains,
  blinkCurve,
  idleMotion,
  physicsSway
} from './pose.js';
import { easeInOutCubic } from '../camera.js';

const DEG = Math.PI / 180;
// Lap IK toi da moi frame. File MMD hay dat 40, voi dang dung yen 12 la du sat.
const IK_LOOP_MAX = 12;
// Morph luon tao: chop mat. Morph bieu cam trong dang duoc them tu dong.
const BLINK_MORPH = 'まばたき';

const fileLoader = new THREE.FileLoader().setResponseType('arraybuffer');
const texLoader = new THREE.TextureLoader();

/**
 * Nhan vat MMD: SkinnedMesh + bo giai xuong (付与, IK) + dang tinh + chuyen dong song.
 * Dang lay tu du lieu (POSES), khong dung file animation.
 *
 * @param {{ model: string, poses: Record<string, object>, scale: number,
 *           edge?: number, anisotropy?: number, morphs?: string[] | 'all',
 *           seed?: number }} spec
 * @param {(ratio: number) => void} [onProgress]
 */
export async function loadPmxCharacter(spec, onProgress) {
  const buffer = await fileLoader.loadAsync(spec.model, (e) => {
    if (onProgress && e.total) onProgress(e.loaded / e.total);
  });
  const pmx = parsePmx(buffer);
  const failed = [];

  // Texture nam canh file model, ten theo so thu tu (xem tools/prepare-pmx.mjs).
  const base = spec.model.slice(0, spec.model.lastIndexOf('/') + 1);
  const used = new Set();
  for (const m of pmx.materials) {
    used.add(m.textureIndex);
    if (m.sphereMode === 1 || m.sphereMode === 2) used.add(m.sphereIndex);
    if (!m.toonShared) used.add(m.toonIndex);
  }
  used.delete(-1);
  const textures = new Map();
  await Promise.all(
    [...used].map(async (i) => {
      try {
        const t = await texLoader.loadAsync(`${base}t${i}.webp`);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = spec.anisotropy ?? 1;
        textures.set(i, t);
      } catch {
        failed.push(`texture t${i} (${pmx.textures[i]})`);
      }
    })
  );

  const faceMorphs = new Set([BLINK_MORPH]);
  for (const p of Object.values(spec.poses ?? {})) {
    for (const k of Object.keys(p?.face ?? {})) faceMorphs.add(k);
  }

  const { mesh, bones } = buildPmxMesh(pmx, {
    scale: spec.scale,
    texture: (i) => textures.get(i) ?? null,
    morphs: spec.morphs ?? [...faceMorphs],
    edge: spec.edge ?? 0
  });
  const root = new THREE.Group();
  root.name = pmx.name;
  root.add(mesh);

  // --- Bo giai xuong ---
  const rest = bones.map((b) => b.position.clone());
  const byName = new Map(pmx.bones.map((b, i) => [b.name, i]));
  const ikOf = new Map();
  const iks = [];
  pmx.bones.forEach((b, i) => {
    if (!b.ik) return;
    const ik = {
      target: i,
      effector: b.ik.target,
      iteration: Math.min(b.ik.loop, IK_LOOP_MAX),
      maxAngle: b.ik.limit,
      links: b.ik.links.map((l) => {
        const link = { index: l.bone, enabled: true };
        if (l.min) {
          const r = ikLimitToRight(l.min, l.max);
          link.rotationMin = new THREE.Vector3(...r.min);
          link.rotationMax = new THREE.Vector3(...r.max);
        }
        if (pmx.bones[l.bone].name.includes('ひざ')) link.limitation = new THREE.Vector3(1, 0, 0);
        return link;
      })
    };
    ikOf.set(i, ik);
    iks.push(ik);
  });
  const solver = new CCDIKSolver(mesh, iks);
  const order = solveOrder(pmx.bones);
  const phys = [...physicsChains(pmx.bones, pmx.rigidBodies)];
  // Goi IK chan can dau goi hoi gap san, chan thang tuyet doi thi CCD ket.
  const knees = ['左ひざ', '右ひざ'].map((n) => byName.get(n)).filter((i) => i !== undefined);

  const find = (...names) => names.map((n) => byName.get(n)).find((i) => i !== undefined) ?? -1;
  const B = {
    center: find('センター'),
    upper: find('上半身'),
    chest: find('上半身2', '上半身'),
    neck: find('首'),
    head: find('頭'),
    shoulderL: find('左肩'),
    shoulderR: find('右肩')
  };

  // --- Dang ---
  const dict = mesh.morphTargetDictionary ?? {};
  const influences = mesh.morphTargetInfluences ?? [];
  const blinkIndex = dict[BLINK_MORPH] ?? -1;

  function compile(p) {
    p = normalizePose(p);
    const rot = new Map();
    const move = new Map();
    const face = new Map();
    const e = new THREE.Euler();
    for (const [name, [x, y, z]] of Object.entries(p.rot)) {
      const i = byName.get(name);
      if (i !== undefined) rot.set(i, new THREE.Quaternion().setFromEuler(e.set(x * DEG, y * DEG, z * DEG)));
    }
    for (const [name, v] of Object.entries(p.move)) {
      const i = byName.get(name);
      if (i !== undefined) move.set(i, new THREE.Vector3(...v));
    }
    for (const [name, w] of Object.entries(p.face)) {
      if (dict[name] !== undefined) face.set(dict[name], w);
    }
    return { rot, move, face };
  }

  const compiled = {};
  for (const [k, p] of Object.entries(spec.poses ?? {})) compiled[k] = compile(p);
  const EMPTY = compile();
  let from = EMPTY;
  let to = EMPTY;
  let blend = 1;
  let blendDur = 0.45;
  let current = null;

  function setPose(name, { instant = false, duration = 0.45 } = {}) {
    // Thieu dang 'detail' thi dung 'pose', thieu 'pose' thi dung 'idle'.
    const next = compiled[name] ?? (name === 'detail' ? compiled.pose : null) ?? compiled.idle ?? EMPTY;
    if (name === current && !instant) return;
    current = name;
    // Dang chuyen giua chung: lay dang hien tai lam diem dau cho muot.
    from = blend < 1 ? snapshot() : to;
    to = next;
    blend = instant ? 1 : 0;
    blendDur = duration;
  }

  // Chup lai dang dang hien (giua 2 dang) de lam diem xuat phat moi.
  function snapshot() {
    const k = easeInOutCubic(blend);
    const s = { rot: new Map(), move: new Map(), face: new Map() };
    for (const i of new Set([...from.rot.keys(), ...to.rot.keys()])) {
      s.rot.set(i, new THREE.Quaternion().slerpQuaternions(from.rot.get(i) ?? I, to.rot.get(i) ?? I, k));
    }
    for (const i of new Set([...from.move.keys(), ...to.move.keys()])) {
      s.move.set(i, new THREE.Vector3().lerpVectors(from.move.get(i) ?? O, to.move.get(i) ?? O, k));
    }
    for (const i of new Set([...from.face.keys(), ...to.face.keys()])) {
      s.face.set(i, (from.face.get(i) ?? 0) * (1 - k) + (to.face.get(i) ?? 0) * k);
    }
    return s;
  }

  // --- Moi frame ---
  const I = new THREE.Quaternion();
  const O = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _e = new THREE.Euler();
  let seed = spec.seed ?? 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const phase = rand() * Math.PI * 2;
  let time = rand() * 10;
  let nextBlink = time + 1 + rand() * 3;
  let blinkStart = -1;
  let live = true;

  const turn = (i, x, y, z) => {
    if (i < 0) return;
    bones[i].quaternion.multiply(_q.setFromEuler(_e.set(x * DEG, y * DEG, z * DEG)));
  };

  function update(dt) {
    time += dt;
    if (blend < 1) blend = Math.min(1, blend + dt / blendDur);
    const k = easeInOutCubic(blend);

    for (let i = 0; i < bones.length; i++) {
      bones[i].position.copy(rest[i]);
      bones[i].quaternion.identity();
    }
    for (const i of new Set([...from.rot.keys(), ...to.rot.keys()])) {
      bones[i].quaternion.slerpQuaternions(from.rot.get(i) ?? I, to.rot.get(i) ?? I, k);
    }
    for (const i of new Set([...from.move.keys(), ...to.move.keys()])) {
      bones[i].position.add(_v.lerpVectors(from.move.get(i) ?? O, to.move.get(i) ?? O, k));
    }

    if (live) {
      const m = idleMotion(time, phase);
      if (B.center >= 0) bones[B.center].position.x += m.hipX;
      turn(B.upper, 0, 0, m.spineRoll);
      turn(B.chest, -m.chest, 0, 0);
      turn(B.neck, m.chest * 0.5, 0, -m.spineRoll * 0.6);
      turn(B.head, m.headPitch, m.headYaw, 0);
      turn(B.shoulderL, 0, 0, m.shoulder);
      turn(B.shoulderR, 0, 0, -m.shoulder);
      for (const [i, depth] of phys) turn(i, physicsSway(time, depth, phase) * 0.6, 0, physicsSway(time + 0.7, depth, phase));
    }
    for (const i of knees) turn(i, 1, 0, 0);

    // Xuong phu + IK theo thu tu MMD.
    for (const i of order) {
      const b = pmx.bones[i];
      if (b.grant && b.grant.parent >= 0) {
        const src = b.grant.parent;
        if (b.grant.rotation) bones[i].quaternion.multiply(_q.identity().slerp(bones[src].quaternion, b.grant.ratio));
        if (b.grant.position) bones[i].position.add(_v.subVectors(bones[src].position, rest[src]).multiplyScalar(b.grant.ratio));
      }
      if (b.ik) {
        mesh.updateWorldMatrix(true, true);
        solver.updateOne(ikOf.get(i));
      }
    }

    // Bieu cam + chop mat.
    for (let i = 0; i < influences.length; i++) {
      influences[i] = (from.face.get(i) ?? 0) * (1 - k) + (to.face.get(i) ?? 0) * k;
    }
    if (live && blinkIndex >= 0) {
      if (time >= nextBlink) {
        blinkStart = time;
        // Thinh thoang chop 2 lan lien.
        nextBlink = time + (rand() < 0.18 ? 0.32 : 2.4 + rand() * 3.2);
      }
      const w = blinkStart >= 0 ? blinkCurve(time - blinkStart) : 0;
      influences[blinkIndex] = Math.min(1, influences[blinkIndex] + w);
    }
  }

  function dispose() {
    mesh.geometry.dispose();
    const mats = new Set();
    mesh.traverse((o) => {
      if (o.isMesh) for (const m of [o.material].flat()) mats.add(m);
    });
    for (const m of mats) m.dispose();
    for (const t of textures.values()) t.dispose();
    mesh.skeleton.dispose();
  }

  update(0);

  return {
    root,
    setPose,
    update,
    dispose,
    failed,
    // Cho trang chinh dang (dev): doc ten xuong / morph, nap dang tam, tat chuyen dong song.
    rig: {
      pmx,
      mesh,
      boneNames: pmx.bones.map((b) => b.name),
      morphNames: Object.keys(dict),
      setPoseData(name, p) {
        compiled[name] = compile(p);
        if (current === name) to = compiled[name];
      },
      setLive(on) {
        live = on;
      }
    }
  };
}
