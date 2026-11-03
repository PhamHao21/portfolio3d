import * as THREE from 'three';
import { SECTIONS, PROFILE } from '../data/sections.js';
import { SLOT_COUNT, DISC_TOP, COLORS } from './constants.js';
import { degToRad } from './rotation.js';
import { drawCircuit, mulberry32 } from './circuit.js';
import { fitRepeat, layoutRing } from './ringText.js';

// Ban kinh cac lop tren mat dia, tinh theo ti le ban kinh dia.
const GAP_DEG = 3; // khe ho giua 2 o slot
const BAND_IN = 0.58;
const BAND_OUT = 0.88;
const DOT_R = 0.905; // vong den chay
const BAND_DEPTH = 0.022; // o slot noi khoi
const BAND_LIFT = 0.03; // o dang chon nho cao them
const DOTS = 72;
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
const FONT_COND = '"Barlow Condensed", "Arial Narrow", sans-serif';

const ACCENT = new THREE.Color(COLORS.accent);
const DOT_DIM = new THREE.Color('#4a4e59');
const _c = new THREE.Color();

// Mesh phang nam ngang (mat huong +Y). Canvas phia tren -> -Z (xa camera).
function flat(geo) {
  return geo.rotateX(-Math.PI / 2);
}

function canvasTexture(w, h, draw, anisotropy = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  const redraw = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
    tex.needsUpdate = true;
  };
  redraw();
  // Font web tai xong sau khi ve lan dau -> ve lai cho dung font.
  document.fonts?.ready.then(redraw);
  return tex;
}

// Mat dia toi: vach chia do, vien sang, mach dien quanh hub, tam hub.
function drawFace(ctx, size) {
  const c = size / 2;
  const R = c;
  ctx.fillStyle = COLORS.discFace;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fill();

  // Vien sang mong o mep tren cua dia.
  ctx.strokeStyle = COLORS.discTick;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(c, c, R * 0.99, 0, Math.PI * 2);
  ctx.stroke();

  // Vach chia do, dai hon moi 15 do.
  for (let deg = 0; deg < 360; deg += 3) {
    const long = deg % 15 === 0;
    const a = degToRad(deg);
    const r0 = R * (long ? 0.925 : 0.945);
    ctx.globalAlpha = long ? 0.7 : 0.35;
    ctx.lineWidth = long ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
    ctx.lineTo(c + Math.cos(a) * R * 0.97, c + Math.sin(a) * R * 0.97);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c, c, R * (BAND_IN - 0.025), 0, Math.PI * 2);
  ctx.stroke();

  // Mach dien trong vong hub.
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R * (BAND_IN - 0.05), 0, Math.PI * 2);
  ctx.clip();
  drawCircuit(ctx, {
    width: size,
    height: size,
    cell: 26,
    count: 70,
    rand: mulberry32(7),
    ink: COLORS.discTick,
    accent: COLORS.accent,
    alpha: 0.2
  });
  ctx.restore();

  // Tam hub: nen den + vong vang + chu thap.
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.discBody;
  ctx.beginPath();
  ctx.arc(c, c, R * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(c, c, R * 0.15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = COLORS.paper;
  ctx.lineWidth = 3;
  const x = R * 0.07;
  ctx.beginPath();
  ctx.moveTo(c - x, c);
  ctx.lineTo(c + x, c);
  ctx.moveTo(c, c - x);
  ctx.lineTo(c, c + x);
  ctx.stroke();
}

// Lop xoay quanh hub: 3 cung vang + vach nho.
function drawSpinner(ctx, size) {
  const c = size / 2;
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = size * 0.035;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.86, a, a + Math.PI * 0.42);
    ctx.stroke();
  }
  ctx.lineWidth = size * 0.012;
  ctx.globalAlpha = 0.7;
  for (let d = 0; d < 360; d += 10) {
    const a = degToRad(d);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * c * 0.66, c + Math.sin(a) * c * 0.66);
    ctx.lineTo(c + Math.cos(a) * c * 0.74, c + Math.sin(a) * c * 0.74);
    ctx.stroke();
  }
}

function drawLabel(ctx, w, h, index, text) {
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.font = `600 34px ${FONT_MONO}`;
  const code = String(index + 1).padStart(2, '0');
  const codeW = ctx.measureText(code).width;
  ctx.font = `700 72px ${FONT_COND}`;
  const label = text.toUpperCase();
  const labelW = ctx.measureText(label).width;
  const gap = 18;
  let x = (w - (codeW + gap + labelW)) / 2;
  ctx.font = `600 34px ${FONT_MONO}`;
  ctx.fillText(code, x, h / 2 + 4);
  x += codeW + gap;
  ctx.font = `700 72px ${FONT_COND}`;
  ctx.fillText(label, x, h / 2 + 4);
}

// O slot noi khoi: hinh quat vanh khan, dun len theo +Y, tam cung huong +Z cuc bo.
function bandGeometry(radius, step) {
  const a0 = degToRad(-90 - step / 2 + GAP_DEG / 2);
  const a1 = degToRad(-90 + step / 2 - GAP_DEG / 2);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius * BAND_OUT, a0, a1, false);
  shape.absarc(0, 0, radius * BAND_IN, a1, a0, true);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: BAND_DEPTH, bevelEnabled: false, curveSegments: 40 });
  // Sau khi xoay: (x, y) cua shape -> (x, -y) tren mat san, chieu dun -> +Y.
  return geo.rotateX(-Math.PI / 2);
}

/**
 * Dia chon muc (mau toi de noi tren nen sang): than dia day + dai den vang quanh
 * canh, 4 o slot noi khoi, vong den chay quanh vanh, lop xoay quanh hub.
 *
 * Moi slot la 1 Group xoay quanh tam sao cho truc +Z cuc bo tro ve
 * slotPosition(i, 0, radius). Phase 4 gan icon vao `group.userData.slotGroups[i]`.
 * `group.userData.pickables` la cac mesh co userData.slotIndex de raycast.
 *
 * @param {{radius: number, slotCount?: number, anisotropy?: number}} opts
 * @returns {THREE.Group}
 */
export function createDisc({ radius, slotCount = SLOT_COUNT, anisotropy = 1 }) {
  const group = new THREE.Group();
  group.name = 'disc';

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.035, DISC_TOP, 96).translate(0, DISC_TOP / 2, 0),
    new THREE.MeshStandardMaterial({ color: COLORS.discBody, roughness: 0.55, metalness: 0.25 })
  );
  group.add(base);

  // Dai den vang chay quanh canh dia.
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.022, radius * 1.022, 0.014, 96, 1, true).translate(
      0,
      DISC_TOP * 0.45,
      0
    ),
    new THREE.MeshBasicMaterial({ color: COLORS.accent })
  );
  group.add(rim);

  const face = new THREE.Mesh(
    flat(new THREE.CircleGeometry(radius, 96)),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(1024, 1024, (ctx, w) => drawFace(ctx, w), anisotropy),
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  );
  face.position.y = DISC_TOP;
  group.add(face);

  const spinner = new THREE.Mesh(
    flat(new THREE.PlaneGeometry(radius * 0.52, radius * 0.52)),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(256, 256, (ctx, w) => drawSpinner(ctx, w)),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    })
  );
  spinner.position.y = DISC_TOP + 0.001;
  group.add(spinner);

  // Vong den chay: mau tung den cap nhat moi frame trong updateDisc().
  const dots = new THREE.InstancedMesh(
    flat(new THREE.CircleGeometry(radius * 0.014, 10)),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    DOTS
  );
  const m = new THREE.Matrix4();
  for (let i = 0; i < DOTS; i++) {
    const a = (i / DOTS) * Math.PI * 2;
    m.makeTranslation(Math.sin(a) * radius * DOT_R, DISC_TOP + 0.002, Math.cos(a) * radius * DOT_R);
    dots.setMatrixAt(i, m);
    dots.setColorAt(i, DOT_DIM);
  }
  group.add(dots);

  const step = 360 / slotCount;
  const bandGeo = bandGeometry(radius, step);
  const labelW = radius * 0.5;
  const labelGeo = flat(new THREE.PlaneGeometry(labelW, labelW / 4));

  const slotGroups = [];
  const pickables = [];
  const bands = [];
  const labels = [];

  for (let i = 0; i < slotCount; i++) {
    const slot = new THREE.Group();
    slot.name = `slot-${i}`;
    slot.rotation.y = degToRad(i * step);

    const band = new THREE.Mesh(
      bandGeo,
      new THREE.MeshStandardMaterial({
        color: COLORS.discBand,
        roughness: 0.6,
        metalness: 0.1,
        emissive: COLORS.accent,
        emissiveIntensity: 0
      })
    );
    band.position.y = DISC_TOP;
    band.userData = { slotIndex: i };
    slot.add(band);

    // Chu mau trang tren texture, nhan voi material.color de doi mau khi active.
    // La con cua o slot nen nho len cung o.
    const label = new THREE.Mesh(
      labelGeo,
      new THREE.MeshBasicMaterial({
        map: canvasTexture(
          512,
          128,
          (ctx, w, h) => drawLabel(ctx, w, h, i, SECTIONS[i]?.label ?? ''),
          anisotropy
        ),
        color: COLORS.paper,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
      })
    );
    label.position.set(0, BAND_DEPTH + 0.001, radius * ((BAND_IN + BAND_OUT) / 2));
    label.userData = { slotIndex: i };
    band.add(label);

    group.add(slot);
    slotGroups.push(slot);
    pickables.push(band, label);
    bands.push(band);
    labels.push(label);
  }

  group.userData = {
    slotGroups,
    pickables,
    bands,
    labels,
    dots,
    spinner,
    anim: { active: 0, hover: -1, lift: bands.map(() => 0), chase: 0 }
  };
  return group;
}

// To vang o slot dang chon (o nho len duoc tween trong updateDisc).
export function setDiscActive(group, index) {
  group.userData.anim.active = index;
  applyBandColors(group);
}

// Sang nhe o slot dang duoc re chuot.
export function setDiscHover(group, index) {
  group.userData.anim.hover = index;
  applyBandColors(group);
}

function applyBandColors(group) {
  const { bands, labels, anim } = group.userData;
  bands.forEach((b, i) => {
    const on = i === anim.active;
    b.material.color.set(on ? COLORS.accent : i === anim.hover ? COLORS.discBandHover : COLORS.discBand);
    b.material.emissiveIntensity = on ? 0.55 : 0;
  });
  labels.forEach((l, i) => l.material.color.set(i === anim.active ? COLORS.ink : COLORS.paper));
}

// Khoang cach vong tron giua 2 chi so tren vong `n` phan tu.
function ringDist(a, b, n) {
  const d = Math.abs(a - b) % n;
  return Math.min(d, n - d);
}

/**
 * Hoat anh cua dia moi frame.
 * @param {{rotating: boolean, dir: number}} state dir = chieu xoay (+1 / -1)
 */
export function updateDisc(group, dt, { rotating, dir }) {
  const { bands, anim, dots, spinner } = group.userData;

  // O dang chon nho len, o dang re chuot nho nhe.
  bands.forEach((b, i) => {
    const target = i === anim.active ? BAND_LIFT : i === anim.hover ? BAND_LIFT * 0.35 : 0;
    anim.lift[i] += (target - anim.lift[i]) * Math.min(1, dt * 12);
    b.position.y = DISC_TOP + anim.lift[i];
  });

  // Den chay quanh vanh: 2 dom sang cham luc nghi, 4 dom chay nhanh theo chieu xoay.
  const heads = rotating ? 4 : 2;
  const width = rotating ? 5 : 9;
  anim.chase = (anim.chase + dt * (rotating ? 60 * dir : 9)) % DOTS;
  for (let i = 0; i < DOTS; i++) {
    let b = 0;
    for (let h = 0; h < heads; h++) {
      const head = (anim.chase + (h * DOTS) / heads + DOTS) % DOTS;
      b = Math.max(b, 1 - ringDist(i, Math.round(head), DOTS) / width);
    }
    dots.setColorAt(i, _c.copy(DOT_DIM).lerp(ACCENT, Math.max(0, b)));
  }
  dots.instanceColor.needsUpdate = true;

  spinner.rotation.y += dt * (rotating ? 7 * dir : 0.7);
}

// Vong chu ten quanh dia: cac cum chu cua PROFILE.ringText, giua moi cum 1 hinh thoi
// vang. Chu dung "chan huong ra ngoai, dau huong vao tam" nen doan o phia truoc
// (gan camera) doc xuoi.
function drawNameRing(ctx, size, { px, radius, tokens }) {
  const c = size / 2;
  const r = radius * px;
  const circ = 2 * Math.PI * r;
  const fontPx = 44;
  const track = 7; // gian chu
  ctx.font = `600 ${fontPx}px ${FONT_COND}`;
  const charW = (ch) => ctx.measureText(ch).width + track;

  const cycle = [];
  for (const t of tokens) {
    const chars = [...t];
    cycle.push({ type: 'text', chars, w: chars.reduce((a, ch) => a + charW(ch), 0) - track });
    cycle.push({ type: 'sep', w: fontPx * 0.5 });
  }
  const unit = cycle.reduce((a, it) => a + it.w, 0);
  // Chua ~20% cho khe giua cac phan tu de chu khong dinh nhau.
  const repeat = fitRepeat(unit * 1.2, circ, 1, 4);
  const items = Array.from({ length: repeat }, () => cycle).flat();
  const { starts } = layoutRing(
    items.map((it) => it.w),
    circ
  );

  // Quang duong s (px) doc vong -> goc canvas. Bat dau o day canvas (phia camera),
  // giam dan de chu chay tu trai sang phai khi nhin tu phia truoc.
  const angAt = (s) => Math.PI / 2 - s / r;

  // 2 vien mong 2 ben dai chu.
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(c, c, r - fontPx * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([10, 12]);
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.arc(c, c, r + fontPx * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  items.forEach((it, k) => {
    const s0 = starts[k];
    if (it.type === 'text') {
      ctx.fillStyle = COLORS.ink;
      ctx.globalAlpha = 0.78;
      let s = s0;
      for (const ch of it.chars) {
        const w = charW(ch) - track;
        const a = angAt(s + w / 2);
        ctx.save();
        ctx.translate(c + Math.cos(a) * r, c + Math.sin(a) * r);
        ctx.rotate(a - Math.PI / 2);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        s += w + track;
      }
    } else {
      const a = angAt(s0 + it.w / 2);
      const d = fontPx * 0.16;
      ctx.save();
      ctx.translate(c + Math.cos(a) * r, c + Math.sin(a) * r);
      ctx.rotate(a - Math.PI / 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLORS.accent;
      ctx.beginPath();
      ctx.moveTo(0, -d);
      ctx.lineTo(d, 0);
      ctx.lineTo(0, d);
      ctx.lineTo(-d, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });
  ctx.globalAlpha = 1;
}

/**
 * Lop trang tri quanh dia, dung yen theo san (khong xoay theo dia):
 * - vong chu ten (PROFILE.ringText) xoay cham nguoc chieu
 * - quang vang mo quanh chan dia, tho nhe
 */
export function createDiscRings({ radius, reduceMotion = false, anisotropy = 1 }) {
  const group = new THREE.Group();
  group.name = 'disc-rings';

  const outerSize = radius * 3;
  const outer = new THREE.Mesh(
    flat(new THREE.PlaneGeometry(outerSize, outerSize)),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(
        1024,
        1024,
        (ctx, s) =>
          drawNameRing(ctx, s, {
            px: s / outerSize, // pixel / don vi the gioi
            radius: radius * 1.25,
            tokens: PROFILE.ringText
          }),
        anisotropy
      ),
      transparent: true,
      depthWrite: false
    })
  );
  outer.position.y = 0.002;
  group.add(outer);

  // Quang vang mo quanh chan dia: vanh khan sang o dung mep dia, tat dan 2 phia.
  const glowSize = radius * 2.7;
  const glow = new THREE.Mesh(
    flat(new THREE.PlaneGeometry(glowSize, glowSize)),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(512, 512, (ctx, s) => {
        const c = s / 2;
        const px = c / (glowSize / 2);
        const g = ctx.createRadialGradient(c, c, radius * 0.9 * px, c, c, radius * 1.32 * px);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.22, 'rgba(255,255,255,0.9)');
        g.addColorStop(0.45, 'rgba(255,255,255,0.3)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      }),
      color: COLORS.accent,
      transparent: true,
      depthWrite: false,
      opacity: 0.55
    })
  );
  glow.position.y = 0.003;
  group.add(glow);

  let t = 0;
  function update(dt, { rotating }) {
    t += dt;
    if (reduceMotion) return;
    outer.rotation.y -= dt * (rotating ? 0.6 : 0.05);
    glow.material.opacity = 0.45 + 0.12 * Math.sin(t * 1.6) + (rotating ? 0.25 : 0);
  }

  return { object: group, update };
}

/**
 * Danh dau co dinh (khong xoay theo dia) o huong `angleDeg`: 1 cung vang mong
 * om o slot dang nam o vi tri chon.
 */
export function createSelector({ radius, angleDeg, slotCount = SLOT_COUNT }) {
  const group = new THREE.Group();
  group.name = 'selector';
  group.rotation.y = degToRad(angleDeg);

  const step = 360 / slotCount;
  const arc = new THREE.Mesh(
    flat(
      new THREE.RingGeometry(
        radius * 0.93,
        radius * 0.97,
        40,
        1,
        degToRad(-90 - step / 2 + GAP_DEG),
        degToRad(step - GAP_DEG * 2)
      )
    ),
    new THREE.MeshBasicMaterial({
      color: COLORS.accent,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    })
  );
  arc.position.y = DISC_TOP;
  group.add(arc);

  return group;
}

export function disposeGroup(group) {
  group.traverse((o) => {
    if (!o.isMesh && !o.isPoints) return;
    o.geometry.dispose();
    o.material.map?.dispose();
    o.material.alphaMap?.dispose();
    o.material.dispose();
  });
}
