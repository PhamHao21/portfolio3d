import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePmx } from '../src/lib/three/mmd/pmx.js';
import {
  toRightHanded,
  normalizePose,
  mirrorName,
  mirrorPose,
  solveOrder,
  ikLimitToRight,
  physicsChains,
  blinkCurve,
  BLINK,
  idleMotion,
  physicsSway,
  curlPose
} from '../src/lib/three/mmd/pose.js';
import { formatPoses } from '../tools/pose-saver.js';
import { POSES } from '../src/lib/data/poses.js';
import { SECTIONS } from '../src/lib/data/sections.js';

// --- Ghi 1 file PMX 2.0 toi gian (UTF-16, index 1 byte) de test bo doc ---
function pmxWriter() {
  const bytes = [];
  const dv = new DataView(new ArrayBuffer(4));
  const w = {
    u8: (v) => bytes.push(v & 255),
    i8: (v) => bytes.push(v & 255),
    u16: (v) => (dv.setUint16(0, v, true), bytes.push(dv.getUint8(0), dv.getUint8(1))),
    i32: (v) => (dv.setInt32(0, v, true), bytes.push(...new Uint8Array(dv.buffer))),
    f32: (v) => (dv.setFloat32(0, v, true), bytes.push(...new Uint8Array(dv.buffer))),
    vec: (a) => a.forEach((v) => w.f32(v)),
    text: (s) => {
      w.i32(s.length * 2);
      for (const ch of s) w.u16(ch.charCodeAt(0));
    },
    buffer: () => new Uint8Array(bytes).buffer
  };
  return w;
}

function samplePmx() {
  const w = pmxWriter();
  for (const c of 'PMX ') w.u8(c.charCodeAt(0));
  w.f32(2.0);
  w.u8(8);
  [0, 0, 1, 1, 1, 1, 1, 1].forEach(w.u8); // UTF-16, 0 uv phu, index 1 byte
  w.text('テスト');
  w.text('test');
  w.text('ghi chu');
  w.text('');

  // 3 dinh: BDEF1, BDEF2, BDEF4
  w.i32(3);
  const vert = (p, type, skin) => {
    w.vec(p);
    w.vec([0, 0, -1]);
    w.vec([0.25, 0.75]);
    w.u8(type);
    skin();
    w.f32(1);
  };
  vert([0, 0, 1], 0, () => w.i8(0));
  vert([1, 0, 2], 1, () => (w.i8(0), w.i8(1), w.f32(0.3)));
  vert([0, 1, 3], 2, () => (w.i8(1), w.i8(0), w.i8(0), w.i8(0), w.vec([0.5, 0.5, 0, 0])));

  w.i32(3);
  [0, 1, 2].forEach(w.u8);

  w.i32(1);
  w.text('tex\\a.png');

  w.i32(1);
  w.text('mat');
  w.text('');
  w.vec([1, 1, 1, 0.5]);
  w.vec([0, 0, 0]);
  w.f32(5);
  w.vec([0.5, 0.5, 0.5]);
  w.u8(0x11);
  w.vec([0, 0, 0, 1]);
  w.f32(1);
  w.i8(0); // texture
  w.i8(-1); // sphere
  w.u8(0);
  w.u8(1); // toon dung chung
  w.u8(2);
  w.text('');
  w.i32(3);

  // 3 xuong: 0 goc, 1 phu (grant tu 0, ti le 0.5), 2 IK nham xuong 1
  w.i32(3);
  w.text('センター');
  w.text('center');
  w.vec([0, 1, 0]);
  w.i8(-1);
  w.i32(0);
  w.u16(0x0000);
  w.vec([0, 1, 0]);

  w.text('左足D');
  w.text('');
  w.vec([1, 1, 0]);
  w.i8(0);
  w.i32(1);
  w.u16(0x0100);
  w.vec([0, 0, 0]);
  w.i8(0);
  w.f32(0.5);

  w.text('左足ＩＫ');
  w.text('');
  w.vec([1, 0, 0]);
  w.i8(-1);
  w.i32(0);
  w.u16(0x0020 | 0x0001);
  w.i8(1); // tail bone
  w.i8(1); // ik target
  w.i32(40);
  w.f32(2);
  w.i32(1);
  w.i8(0);
  w.u8(1);
  w.vec([-3, 0, 0]);
  w.vec([-0.01, 0, 0]);

  // 3 morph: dinh, nhom, xuong (chi doc qua)
  w.i32(3);
  w.text('まばたき');
  w.text('');
  w.u8(1);
  w.u8(1);
  w.i32(1);
  w.u8(2);
  w.vec([0, -0.5, 0.25]);

  w.text('nhom');
  w.text('');
  w.u8(4);
  w.u8(0);
  w.i32(1);
  w.i8(0);
  w.f32(0.8);

  w.text('xuong');
  w.text('');
  w.u8(4);
  w.u8(2);
  w.i32(1);
  w.i8(0);
  w.vec([0, 0, 0, 0, 0, 0, 1]);

  // 1 khung hien thi
  w.i32(1);
  w.text('Root');
  w.text('');
  w.u8(1);
  w.i32(1);
  w.u8(0);
  w.i8(0);

  // 1 rigid body vat ly gan xuong 1
  w.i32(1);
  w.text('rb');
  w.text('');
  w.i8(1);
  w.u8(0);
  w.u16(0xffff);
  w.u8(0);
  w.vec([0.1, 0.2, 0.3]);
  w.vec([0, 0, 0]);
  w.vec([0, 0, 0]);
  w.vec([1, 0.5, 0.5, 0, 0.5]);
  w.u8(1);

  w.i32(0); // joint
  return w.buffer();
}

test('parsePmx: doc dung dinh, mat, vat lieu', () => {
  const p = parsePmx(samplePmx());
  assert.equal(p.name, 'テスト');
  assert.equal(p.nameEn, 'test');
  assert.equal(p.vertexCount, 3);
  assert.deepEqual([...p.positions], [0, 0, 1, 1, 0, 2, 0, 1, 3]);
  assert.deepEqual([...p.uvs.slice(0, 2)], [0.25, 0.75]);
  assert.deepEqual([...p.indices], [0, 1, 2]);
  assert.deepEqual(p.textures, ['tex\\a.png']);
  const m = p.materials[0];
  assert.equal(m.name, 'mat');
  assert.equal(m.diffuse[3], 0.5);
  assert.equal(m.flag, 0x11);
  assert.equal(m.textureIndex, 0);
  assert.equal(m.sphereIndex, -1);
  assert.equal(m.toonShared, true);
  assert.equal(m.toonIndex, 2);
  assert.equal(m.indexCount, 3);
});

test('parsePmx: trong so skin BDEF1/2/4', () => {
  const p = parsePmx(samplePmx());
  assert.deepEqual([...p.skinIndices.slice(0, 4)], [0, 0, 0, 0]);
  assert.deepEqual([...p.skinWeights.slice(0, 4)], [1, 0, 0, 0]);
  assert.deepEqual([...p.skinIndices.slice(4, 6)], [0, 1]);
  assert.ok(Math.abs(p.skinWeights[4] - 0.3) < 1e-6 && Math.abs(p.skinWeights[5] - 0.7) < 1e-6);
  assert.deepEqual([...p.skinWeights.slice(8, 12)], [0.5, 0.5, 0, 0]);
});

test('parsePmx: xuong phu, IK va gioi han goc', () => {
  const { bones } = parsePmx(samplePmx());
  assert.deepEqual(bones.map((b) => b.name), ['センター', '左足D', '左足ＩＫ']);
  assert.deepEqual(bones[1].grant, { parent: 0, ratio: 0.5, rotation: true, position: false, local: false });
  assert.equal(bones[2].tailBone, 1);
  assert.equal(bones[2].ik.target, 1);
  assert.equal(bones[2].ik.loop, 40);
  assert.deepEqual(bones[2].ik.links[0].bone, 0);
  assert.ok(Math.abs(bones[2].ik.links[0].min[0] + 3) < 1e-6);
});

test('parsePmx: morph dinh, morph nhom, rigid body; bo qua morph xuong', () => {
  const p = parsePmx(samplePmx());
  assert.equal(p.morphs.length, 3);
  const blink = p.morphs[0];
  assert.equal(blink.name, 'まばたき');
  assert.deepEqual([...blink.indices], [2]);
  assert.deepEqual([...blink.offsets], [0, -0.5, 0.25]);
  assert.deepEqual(p.morphs[1].children, [{ morph: 0, ratio: p.morphs[1].children[0].ratio }]);
  assert.ok(Math.abs(p.morphs[1].children[0].ratio - 0.8) < 1e-6);
  assert.equal(p.rigidBodies.length, 1);
  assert.equal(p.rigidBodies[0].bone, 1);
  assert.equal(p.rigidBodies[0].mode, 1);
});

test('parsePmx: tu choi file khong phai PMX', () => {
  assert.throws(() => parsePmx(new Uint8Array([1, 2, 3, 4, 0, 0, 0, 64]).buffer), /PMX/);
});

test('toRightHanded: dao z va nhan ti le, khong sua mang goc', () => {
  const src = new Float32Array([1, 2, 3, -4, 5, -6]);
  assert.deepEqual([...toRightHanded(src, 2)], [2, 4, -6, -8, 10, 12]);
  assert.deepEqual([...src], [1, 2, 3, -4, 5, -6]);
});

test('mirrorName / mirrorPose: doi ben, doi dau y z va x dich chuyen', () => {
  assert.equal(mirrorName('左腕'), '右腕');
  assert.equal(mirrorName('右ひじ'), '左ひじ');
  assert.equal(mirrorName('頭'), '頭');
  const m = mirrorPose({ rot: { 左腕: [1, 2, 3], 頭: [4, 5, 6] }, move: { センター: [0.1, 0.2, 0.3] }, face: { 笑い: 0.5 } });
  assert.deepEqual(m.rot, { 右腕: [1, -2, -3], 頭: [4, -5, -6] });
  assert.deepEqual(m.move, { センター: [-0.1, 0.2, 0.3] });
  assert.deepEqual(m.face, { 笑い: 0.5 });
  // Lat 2 lan ra lai dang cu.
  const p = { rot: { 左腕: [1, 2, 3] }, move: { 左足ＩＫ: [0.1, 0, 0] }, face: {} };
  assert.deepEqual(mirrorPose(mirrorPose(p)), normalizePose(p));
});

test('normalizePose: luon du 3 nhom, khong dung chung object voi dau vao', () => {
  assert.deepEqual(normalizePose(), { rot: {}, move: {}, face: {} });
  const src = { rot: { a: [1, 2, 3] } };
  const n = normalizePose(src);
  n.rot.b = [0, 0, 0];
  assert.equal(src.rot.b, undefined);
});

test('solveOrder: chi xuong co grant/ik, xep theo sau-vat-ly, layer, index', () => {
  const bones = [
    { layer: 0, flag: 0 },
    { layer: 1, flag: 0, grant: {} },
    { layer: 0, flag: 0, ik: {} },
    { layer: 0, flag: 0x1000, grant: {} },
    { layer: 0, flag: 0, grant: {} }
  ];
  assert.deepEqual(solveOrder(bones), [2, 4, 1, 3]);
});

test('ikLimitToRight: doi dau va doi cho min/max truc x, y', () => {
  const r = ikLimitToRight([-3, -0.2, -0.1], [-0.01, 0.4, 0.5]);
  assert.deepEqual(r.min, [0.01, -0.4, -0.1]);
  assert.deepEqual(r.max, [3, 0.2, 0.5]);
  for (let i = 0; i < 3; i++) assert.ok(r.min[i] <= r.max[i]);
});

test('physicsChains: do sau tang dan theo chuoi xuong vat ly', () => {
  const bones = [{ parent: -1 }, { parent: 0 }, { parent: 1 }, { parent: 2 }, { parent: 0 }];
  const rigid = [
    { bone: 0, mode: 0 },
    { bone: 1, mode: 1 },
    { bone: 2, mode: 1 },
    { bone: 3, mode: 2 },
    { bone: 4, mode: 0 }
  ];
  const d = physicsChains(bones, rigid);
  assert.deepEqual([...d.entries()].sort(), [
    [1, 1],
    [2, 2],
    [3, 3]
  ]);
});

test('blinkCurve: 0 ngoai khoang, nham het o giua, mo lai', () => {
  const total = BLINK.close + BLINK.hold + BLINK.open;
  assert.equal(blinkCurve(-1), 0);
  assert.equal(blinkCurve(0), 0);
  assert.equal(blinkCurve(BLINK.close + BLINK.hold / 2), 1);
  assert.equal(blinkCurve(total + 0.01), 0);
  const a = blinkCurve(BLINK.close / 2);
  assert.ok(a > 0.4 && a < 0.6);
  let prev = 1;
  for (let t = BLINK.close + BLINK.hold; t <= total; t += 0.01) {
    const v = blinkCurve(t);
    assert.ok(v <= prev + 1e-9);
    prev = v;
  }
});

test('idleMotion / physicsSway: bien do nho, lech pha thi khac nhau', () => {
  for (let t = 0; t < 20; t += 0.37) {
    const m = idleMotion(t, 1.2);
    assert.ok(Math.abs(m.chest) <= 1.1 + 1e-9);
    assert.ok(m.shoulder >= 0 && m.shoulder <= 1.2 + 1e-9);
    assert.ok(Math.abs(m.hipX) <= 0.006 + 1e-9);
    assert.ok(Math.abs(m.headYaw) <= 2.2 + 1e-9);
    assert.ok(Math.abs(physicsSway(t, 9, 0)) <= 1.6 + 1e-9);
  }
  assert.notEqual(idleMotion(3, 0).breath, idleMotion(3, 1).breath);
  assert.equal(physicsSway(1, 0), 0);
});

test('curlPose: du 14 xuong ngon, 2 ben doi xung', () => {
  const l = curlPose('左', 30);
  const r = curlPose('右', 30);
  assert.equal(Object.keys(l).length, 14);
  assert.ok(Object.keys(l).every((n) => n.startsWith('左')));
  assert.deepEqual(mirrorPose({ rot: l }).rot, r);
  assert.ok(l['左人指２'][2] < 0, 'gap ngon trai = xoay z am');
  assert.deepEqual(curlPose('左', 0)['左中指２'], [0, 0, 0]);
});

test('formatPoses: ghi lai doc duoc, mang so tren 1 dong', async () => {
  const src = formatPoses({ a: { idle: { rot: { 左腕: [0, -1.5, 40] }, move: {}, face: { 笑い: 0.3 } } } });
  assert.match(src, /"左腕": \[0, -1\.5, 40\]/);
  const mod = await import(`data:text/javascript,${encodeURIComponent(src)}`);
  assert.deepEqual(mod.POSES.a.idle.rot['左腕'], [0, -1.5, 40]);
});

test('POSES: moi nhan vat MMD co du idle, pose, detail hop le; detail khong trung nhau', () => {
  for (const s of SECTIONS.filter((x) => x.model.endsWith('.pmx'))) {
    const p = POSES[s.char];
    assert.ok(p, `thieu dang cho ${s.char}`);
    for (const slot of ['idle', 'pose', 'detail']) {
      assert.ok(p[slot], `thieu ${s.char}.${slot}`);
      const n = normalizePose(p[slot]);
      for (const v of [...Object.values(n.rot), ...Object.values(n.move)]) {
        assert.ok(v.length === 3 && v.every(Number.isFinite), `${s.char}.${slot} sai`);
      }
    }
  }
});

test('POSES: dang detail cua 4 nhan vat khac nhau tung doi', () => {
  const chars = SECTIONS.filter((x) => x.model.endsWith('.pmx')).map((x) => x.char);
  const keys = chars.map((c) => JSON.stringify(POSES[c].detail));
  assert.equal(new Set(keys).size, chars.length);
});
