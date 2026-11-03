// Toan thuan cho model MMD: doi he toa do, lat doi xung dang, thu tu giai xuong,
// nhip tho / chop mat. Khong dung three de test duoc bang node --test.

/** Dao truc z (he tay trai MMD -> tay phai three) va nhan ti le, tra mang moi. */
export function toRightHanded(xyz, scale = 1) {
  const out = new Float32Array(xyz.length);
  for (let i = 0; i < xyz.length; i += 3) {
    out[i] = xyz[i] * scale;
    out[i + 1] = xyz[i + 1] * scale;
    out[i + 2] = -xyz[i + 2] * scale;
  }
  return out;
}

/**
 * Dang (pose) = { rot: {ten xuong: [x,y,z] do}, move: {ten xuong: [x,y,z] met}, face: {ten morph: 0..1} }.
 * Goc Euler thu tu XYZ, quanh truc cua xuong o tu the goc (truc the gioi luc nghi).
 */
export function normalizePose(p = {}) {
  return { rot: { ...p.rot }, move: { ...p.move }, face: { ...p.face } };
}

/** Doi ten xuong ben trai <-> ben phai (ten MMD bat dau bang 左 / 右). */
export function mirrorName(name) {
  if (name.startsWith('左')) return '右' + name.slice(1);
  if (name.startsWith('右')) return '左' + name.slice(1);
  return name;
}

/**
 * Lat dang qua mat phang doi xung (x = 0): doi ben trai/phai,
 * goc quanh y va z doi dau, dich chuyen theo x doi dau.
 */
export function mirrorPose(pose) {
  const p = normalizePose(pose);
  const out = normalizePose();
  for (const [k, [x, y, z]] of Object.entries(p.rot)) out.rot[mirrorName(k)] = [x, -y || 0, -z || 0];
  for (const [k, [x, y, z]] of Object.entries(p.move)) out.move[mirrorName(k)] = [-x || 0, y, z];
  for (const [k, v] of Object.entries(p.face)) out.face[k] = v;
  return out;
}

/**
 * Thu tu giai xuong phu (付与) va IK giong MMD: xuong "sau vat ly" xep cuoi,
 * roi theo cap bien doi (layer), cung cap thi theo so thu tu.
 * @param {{layer: number, flag: number, grant?: object, ik?: object}[]} bones
 * @returns {number[]} index cac xuong co grant hoac ik
 */
export function solveOrder(bones) {
  const after = (b) => (b.flag & 0x1000 ? 1 : 0);
  return bones
    .map((b, i) => i)
    .filter((i) => bones[i].grant || bones[i].ik)
    .sort((a, b) => after(bones[a]) - after(bones[b]) || bones[a].layer - bones[b].layer || a - b);
}

/**
 * Gioi han goc khop IK cua MMD (radian, he tay trai) -> he tay phai:
 * goc quanh x va y doi dau nen min/max doi cho nhau.
 */
export function ikLimitToRight(min, max) {
  return {
    min: [-max[0], -max[1], min[2]],
    max: [-min[0], -min[1], max[2]]
  };
}

/**
 * Xuong gan voi rigid body vat ly (toc, vay, ruy bang...) kem do sau trong chuoi:
 * 1 = xuong vat ly dau tien duoi xuong thuong, tang dan ve phia ngon.
 * @returns {Map<number, number>} index xuong -> do sau
 */
export function physicsChains(bones, rigidBodies) {
  const phys = new Set(rigidBodies.filter((r) => r.mode !== 0 && r.bone >= 0).map((r) => r.bone));
  const depth = new Map();
  const get = (i) => {
    if (!phys.has(i)) return 0;
    if (depth.has(i)) return depth.get(i);
    const p = bones[i].parent;
    const d = (p >= 0 && p !== i ? get(p) : 0) + 1;
    depth.set(i, d);
    return d;
  };
  for (const i of phys) get(i);
  return depth;
}

// Ngon tay MMD: ten + so doan full-width (１２３). Doan ngoai gap nhieu hon goc ngon.
const CURL = [
  ['人指', [0.75, 1, 0.8]],
  ['中指', [0.8, 1, 0.8]],
  ['薬指', [0.85, 1, 0.8]],
  ['小指', [0.9, 1, 0.8]]
];
const DIGITS = ['１', '２', '３'];

/**
 * Goc gap ngon tay (nam tay) cho 1 ben: `amount` do o doan giua, am = duoi ngon.
 * Ngon tay o tu the goc nam doc theo canh tay, gap = xoay quanh z
 * (ben trai am, ben phai duong). Ngon cai gap it hon, quanh truc y.
 * @param {'左' | '右'} side
 */
export function curlPose(side, amount) {
  const s = side === '左' ? -1 : 1;
  const rot = {};
  const r = (v) => Math.round(v * 10) / 10 || 0;
  for (const [f, k] of CURL) {
    DIGITS.forEach((d, i) => {
      rot[`${side}${f}${d}`] = [0, 0, r(s * amount * k[i])];
    });
  }
  rot[`${side}親指１`] = [0, r(-s * amount * 0.35), 0];
  rot[`${side}親指２`] = [0, r(-s * amount * 0.5), 0];
  return rot;
}

/**
 * Do nham mat theo thoi gian ke tu luc bat dau chop (giay): nham nhanh, mo cham hon.
 * Tra 0 khi ngoai khoang chop.
 */
export const BLINK = { close: 0.06, hold: 0.04, open: 0.11 };
export function blinkCurve(t) {
  const { close, hold, open } = BLINK;
  if (t <= 0) return 0;
  if (t < close) return t / close;
  if (t < close + hold) return 1;
  if (t < close + hold + open) return 1 - (t - close - hold) / open;
  return 0;
}

/**
 * Chuyen dong song khi dung yen (do / met), lap theo chu ky, lech pha theo `phase`
 * de 4 nhan vat khong tho cung nhip.
 */
export function idleMotion(t, phase = 0) {
  const TAU = Math.PI * 2;
  const breath = Math.sin(TAU * (t / 3.8) + phase);
  const sway = Math.sin(TAU * (t / 7.3) + phase * 1.7);
  return {
    breath, // -1..1
    chest: breath * 1.1, // nguc nhap nho (x)
    shoulder: Math.max(0, breath) * 1.2, // vai nhuc khi hit vao (z)
    hipX: sway * 0.006, // dich trong tam trai phai (met)
    spineRoll: -sway * 0.7,
    headYaw: Math.sin(TAU * (t / 9.1) + phase * 2.3) * 2.2,
    headPitch: Math.sin(TAU * (t / 6.4) + phase * 0.6) * 1.1
  };
}

/** Song nhe cho xuong vat ly (do): ngon toc / vay lac nhieu hon goc. */
export function physicsSway(t, depth, phase = 0) {
  const k = Math.min(depth, 4) / 4;
  return Math.sin(Math.PI * 2 * (t / 2.9) + phase + depth * 0.55) * 1.6 * k;
}
