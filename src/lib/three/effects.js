import * as THREE from 'three';
import { COLORS } from './constants.js';
import { measure, pointAt, radialFade, mulberry32 } from './circuit.js';
import { easeOutCubic } from './rotation.js';

// "Bloom gia": moi thu phat sang deu la mesh trong suot mau vang co quang mem.
// Khong dung UnrealBloomPass vi nen sang se loa trang ca man hinh, canvas mat
// trong suot, va ton them 5-6 pass toan man hinh moi frame.

const ACCENT = new THREE.Color(COLORS.accent);

function flat(geo) {
  return geo.rotateX(-Math.PI / 2);
}

// Texture quang tron: dac o tam, mo dan ra mep.
function glowTexture(size = 128, core = 0.15) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(core, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Dong dien chay tren mach san
// ---------------------------------------------------------------------------

const PULSE_Y = 0.004;
const MAX_PULSES = 18;
const SAMPLES = 16; // so diem tren duoi cua 1 xung
const TRAIL = 0.75; // do dai duoi (don vi the gioi)
const SPEED = 2.4; // don vi / giay
const CORE_W = 0.034;
const HALO_W = 0.17;
const MAX_SPARKS = MAX_PULSES * 2;

/**
 * Xung dien vang chay doc cac duong mach, co duoi mo dan va quang sang.
 * Moi xung gom 2 dai (quang rong + loi manh), tat ca chung 1 draw call.
 *
 * @param {{paths: {points: number[][]}[], radius: number, reduceMotion?: boolean}} opts
 */
export function createCircuitPulses({ paths, radius, reduceMotion = false }) {
  const rand = mulberry32(31);
  // Bo cac duong nam han ngoai vung san con nhin thay.
  const routes = paths
    .map((p) => ({ points: p.points, cum: measure(p.points) }))
    .filter((r) => r.points.some(([x, z]) => radialFade(Math.hypot(x, z), radius) > 0.2))
    .map((r) => ({ ...r, length: r.cum[r.cum.length - 1] }));

  const group = new THREE.Group();
  group.name = 'circuit-pulses';

  // --- Dai sang ---
  const perRibbon = SAMPLES * 2;
  const perPulse = perRibbon * 2;
  const positions = new Float32Array(MAX_PULSES * perPulse * 3);
  const colors = new Float32Array(MAX_PULSES * perPulse * 4);
  const index = [];
  for (let p = 0; p < MAX_PULSES; p++) {
    for (let r = 0; r < 2; r++) {
      const base = p * perPulse + r * perRibbon;
      for (let k = 0; k < SAMPLES - 1; k++) {
        const a = base + k * 2;
        // Dinh chan = mep trai theo huong chay, le = mep phai. Thu tu nay cho
        // mat tam giac huong len +Y (nhin tu camera phia tren).
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colors, 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', colAttr);
  geo.setIndex(index);
  const ribbons = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })
  );
  ribbons.frustumCulled = false;
  group.add(ribbons);

  // --- Tia loe o dau xung va o cuoi duong ---
  const sparks = new THREE.InstancedMesh(
    flat(new THREE.PlaneGeometry(1, 1)),
    new THREE.MeshBasicMaterial({
      map: glowTexture(),
      color: ACCENT,
      transparent: true,
      depthWrite: false
    }),
    MAX_SPARKS
  );
  sparks.frustumCulled = false;
  sparks.count = 0;
  group.add(sparks);

  const pulses = []; // { route, d, dir, speed, w, onArrive }
  const flashes = []; // { x, z, t }
  let spawnIn = 0.4;
  const m = new THREE.Matrix4();

  function spawn(route, fromEnd = rand() < 0.5) {
    if (pulses.length >= MAX_PULSES) return;
    pulses.push({ route, d: 0, dir: fromEnd ? -1 : 1, speed: SPEED * (0.8 + rand() * 0.5), w: 1 });
  }

  /**
   * Ban 1 tia dien day hon theo duong tu chon (toa do [x, z]), goi `onArrive`
   * dung luc dau tia cham diem cuoi. Luon duoc uu tien: day xung cu nhat ra neu day.
   */
  function shoot(points, { speed = 7, width = 2, onArrive } = {}) {
    if (reduceMotion) {
      onArrive?.();
      return;
    }
    const cum = measure(points);
    if (pulses.length >= MAX_PULSES) pulses.shift();
    pulses.push({
      route: { points, cum, length: cum[cum.length - 1] },
      d: 0,
      dir: 1,
      speed,
      w: width,
      onArrive
    });
  }

  // Loat xung toa ra tu cac duong co 1 dau gan diem (x, z).
  function burst(x, z, n = 5) {
    if (reduceMotion) return;
    const near = [];
    for (const route of routes) {
      const [sx, sz] = route.points[0];
      const [ex, ez] = route.points[route.points.length - 1];
      const ds = Math.hypot(sx - x, sz - z);
      const de = Math.hypot(ex - x, ez - z);
      near.push({ route, dist: Math.min(ds, de), fromEnd: de < ds });
    }
    near.sort((a, b) => a.dist - b.dist);
    near.slice(0, n).forEach((c) => spawn(c.route, c.fromEnd));
  }

  // Toa do + huong tai quang duong s tren route, co xet chieu chay.
  function sample(route, s, dir) {
    const p = pointAt(route.points, route.cum, dir > 0 ? s : route.length - s);
    return dir > 0 ? p : { ...p, dx: -p.dx, dy: -p.dy };
  }

  function writeRibbon(base, route, head, dir, width, alphaMul) {
    for (let k = 0; k < SAMPLES; k++) {
      const f = k / (SAMPLES - 1);
      const s = head - TRAIL * f;
      const inside = s >= 0 && s <= route.length;
      const p = sample(route, s, dir);
      const nx = -p.dy * (width / 2);
      const nz = p.dx * (width / 2);
      const fade = radialFade(Math.hypot(p.x, p.y), radius);
      const a = inside ? Math.pow(1 - f, 1.6) * fade * alphaMul : 0;
      for (let side = 0; side < 2; side++) {
        const v = base + k * 2 + side;
        const sign = side ? -1 : 1;
        positions[v * 3] = p.x + nx * sign;
        positions[v * 3 + 1] = PULSE_Y;
        positions[v * 3 + 2] = p.y + nz * sign;
        colors[v * 4] = ACCENT.r;
        colors[v * 4 + 1] = ACCENT.g;
        colors[v * 4 + 2] = ACCENT.b;
        colors[v * 4 + 3] = a;
      }
    }
  }

  function update(dt) {
    if (!reduceMotion) {
      spawnIn -= dt;
      if (spawnIn <= 0 && routes.length) {
        spawn(routes[Math.floor(rand() * routes.length)]);
        spawnIn = 0.25 + rand() * 0.7;
      }
    }

    let n = 0;
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pl = pulses[i];
      pl.d += pl.speed * dt;
      if (pl.onArrive && pl.d >= pl.route.length) {
        const cb = pl.onArrive;
        pl.onArrive = null;
        cb();
      }
      if (pl.d - TRAIL > pl.route.length) {
        const end = sample(pl.route, pl.route.length, pl.dir);
        flashes.push({ x: end.x, z: end.y, t: 0 });
        pulses.splice(i, 1);
      }
    }

    // Ghi dai: quang truoc, loi sau (cung 1 xung) de loi de len quang.
    pulses.forEach((pl, i) => {
      const base = i * perPulse;
      writeRibbon(base, pl.route, pl.d, pl.dir, HALO_W * pl.w, 0.38);
      writeRibbon(base + perRibbon, pl.route, pl.d, pl.dir, CORE_W * pl.w, 1);
    });
    geo.setDrawRange(0, pulses.length * (SAMPLES - 1) * 12);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // Tia loe: o dau moi xung + o cuoi duong khi xung vua chay het.
    for (const pl of pulses) {
      if (pl.d > pl.route.length || n >= MAX_SPARKS) continue;
      const p = sample(pl.route, pl.d, pl.dir);
      const size = 0.3 * pl.w * radialFade(Math.hypot(p.x, p.y), radius);
      m.makeScale(size, 1, size).setPosition(p.x, PULSE_Y + 0.001, p.y);
      sparks.setMatrixAt(n++, m);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.t += dt / 0.45;
      if (f.t >= 1) {
        flashes.splice(i, 1);
        continue;
      }
      if (n >= MAX_SPARKS) continue;
      // Phong to nhanh roi thu lai: loe len o nut cuoi duong mach.
      const size = 0.42 * Math.sin(Math.PI * f.t) * radialFade(Math.hypot(f.x, f.z), radius);
      m.makeScale(size, 1, size).setPosition(f.x, PULSE_Y + 0.001, f.z);
      sparks.setMatrixAt(n++, m);
    }
    sparks.count = n;
    sparks.instanceMatrix.needsUpdate = true;
  }

  return { object: group, update, burst, shoot };
}

// ---------------------------------------------------------------------------
// Hieu ung nen: bui sang lo lung
// ---------------------------------------------------------------------------

const DUST = 90;

/** Hat bui vang troi cham trong khong gian, de canh khong bao gio dung han. */
export function createAmbient({ reduceMotion = false } = {}) {
  const group = new THREE.Group();
  group.name = 'ambient';
  const rand = mulberry32(5);

  // --- Bui sang ---
  const pos = new Float32Array(DUST * 3);
  const col = new Float32Array(DUST * 4);
  const dust = Array.from({ length: DUST }, () => ({
    x: -4 + rand() * 9,
    y: 0.15 + rand() * 2.8,
    z: -4 + rand() * 7,
    v: 0.04 + rand() * 0.12,
    ph: rand() * Math.PI * 2,
    a: 0.2 + rand() * 0.55
  }));
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', colAttr);
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.035,
      map: glowTexture(64, 0.3),
      vertexColors: true,
      transparent: true,
      depthWrite: false
    })
  );
  points.frustumCulled = false;
  group.add(points);

  let t = 0;
  function update(dt) {
    t += dt;
    for (let i = 0; i < DUST; i++) {
      const d = dust[i];
      if (!reduceMotion) {
        d.y += d.v * dt;
        if (d.y > 3) d.y = 0.15;
      }
      pos[i * 3] = d.x + Math.sin(t * 0.3 + d.ph) * 0.15;
      pos[i * 3 + 1] = d.y;
      pos[i * 3 + 2] = d.z + Math.cos(t * 0.25 + d.ph) * 0.15;
      col[i * 4] = ACCENT.r;
      col[i * 4 + 1] = ACCENT.g;
      col[i * 4 + 2] = ACCENT.b;
      // Mo dan khi gan san va gan dinh de hat khong hien/bien dot ngot.
      col[i * 4 + 3] = d.a * Math.min(1, (d.y - 0.15) * 3, (3 - d.y) * 2);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  return { object: group, update };
}

// ---------------------------------------------------------------------------
// Hieu ung o be cua nhan vat dang chon: sang theo truc Y, khong loang ngang
// ---------------------------------------------------------------------------

const BEAM_R = 0.46; // vua om nhan vat, khop vong ngoai cua be
const BEAM_H = 2.3;
const SCAN_MS = 900; // thoi gian 1 vong quet chay tu chan len dau
const MOTES = 18;
const MOTE_TOP = 2.0;

function canvasTex(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Cac tia doc dut quang; lap lai theo ca 2 truc de cuon len vo han.
function streakTexture(rand) {
  const tex = canvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(rand() * w);
      const width = 1 + Math.floor(rand() * 3);
      const len = 30 + rand() * 110;
      const y = rand() * h;
      ctx.globalAlpha = 0.35 + rand() * 0.65;
      // Ve 2 lan de tia vat qua mep tren van noi lien khi lap lai.
      ctx.fillRect(x, y, width, len);
      ctx.fillRect(x, y - h, width, len);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

// Do dac theo chieu cao (dung lam alphaMap, doc kenh xanh la): dac o chan, tat dan len tren.
function heightFadeTexture(stops) {
  return canvasTex(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    for (const [at, v] of stops) g.addColorStop(at, `rgb(${v},${v},${v})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * Hieu ung be, moi thu di len theo truc Y:
 * - cot sang: 1 lop mo nhe o chan + cac tia doc chay nguoc len tren
 * - 2 vong quet chay tu chan len dau khi nhan vat vua toi noi
 * - hat sang bay thang len
 * - 1 vang sang nho sat chan de nhan vat co diem tua (khong loang ra ngoai be)
 * Nam trong discRoot, dat vao vi tri slot dang chon bang moveTo().
 */
export function createPadFx({ reduceMotion = false } = {}) {
  const group = new THREE.Group();
  group.name = 'pad-fx';
  const rand = mulberry32(77);

  const basic = (opts) =>
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, depthWrite: false, opacity: 0, ...opts });

  // Vang sang sat chan, gon trong vong be.
  const glow = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.1, 1.1)), basic({ map: glowTexture(128, 0.1) }));
  glow.position.y = 0.005;
  group.add(glow);

  const beamGeo = new THREE.CylinderGeometry(BEAM_R, BEAM_R, BEAM_H, 48, 1, true).translate(0, BEAM_H / 2, 0);

  // Lop mo: chi dac trong ~30 cm dau, de khong phu mau len nguoi nhan vat.
  const wall = new THREE.Mesh(
    beamGeo,
    basic({
      alphaMap: heightFadeTexture([
        [0, 200],
        [0.12, 70],
        [0.35, 0],
        [1, 0]
      ]),
      side: THREE.DoubleSide
    })
  );
  group.add(wall);

  // Tia doc: map cuon len theo thoi gian, alphaMap giu co dinh de tat dan len tren.
  const streakMap = streakTexture(rand);
  const streaks = new THREE.Mesh(
    beamGeo,
    basic({
      map: streakMap,
      alphaMap: heightFadeTexture([
        [0, 255],
        [0.3, 150],
        [0.75, 40],
        [1, 0]
      ]),
      side: THREE.DoubleSide
    })
  );
  group.add(streaks);

  // Vong quet: vanh mong om quanh nguoi, chay tu chan len dau.
  const scans = [0, 1].map(() => {
    const r = new THREE.Mesh(flat(new THREE.RingGeometry(BEAM_R - 0.015, BEAM_R + 0.015, 64)), basic());
    r.visible = false;
    group.add(r);
    return r;
  });

  // Hat sang bay thang len.
  const motePos = new Float32Array(MOTES * 3);
  const moteCol = new Float32Array(MOTES * 4);
  const motes = Array.from({ length: MOTES }, () => ({
    a: rand() * Math.PI * 2,
    r: BEAM_R * (0.55 + rand() * 0.45),
    y: rand() * MOTE_TOP,
    v: 0.35 + rand() * 0.45
  }));
  const moteGeo = new THREE.BufferGeometry();
  const motePosAttr = new THREE.BufferAttribute(motePos, 3).setUsage(THREE.DynamicDrawUsage);
  const moteColAttr = new THREE.BufferAttribute(moteCol, 4).setUsage(THREE.DynamicDrawUsage);
  moteGeo.setAttribute('position', motePosAttr);
  moteGeo.setAttribute('color', moteColAttr);
  const points = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      size: 0.045,
      map: glowTexture(64, 0.3),
      vertexColors: true,
      transparent: true,
      depthWrite: false
    })
  );
  points.frustumCulled = false;
  group.add(points);

  let level = 0; // do sang nen, tien dan ve `target`
  let target = 0;
  let flash = 0; // bung sang khi vua toi, tat dan
  const scanT = [-1, -1];
  // An / hien ca cot sang (vd khi camera zoom vao xem chi tiet), mo dan chu khong tat dot ngot.
  let shown = 1;
  let shownTarget = 1;

  function moveTo(x, z) {
    group.position.set(x, 0, z);
  }

  // Bat dau chuyen sang slot moi: tat het, cho nhan vat toi noi.
  function charge() {
    level = 0;
    target = 0.3;
    flash = 0;
    scanT[0] = scanT[1] = -1;
  }

  // Nhan vat vua toi vi tri: cot sang bung len + 2 vong quet chay tu chan len dau.
  function arrive() {
    target = 1;
    if (reduceMotion) {
      level = 1;
      return;
    }
    flash = 1;
    scanT[0] = 0;
    scanT[1] = -0.25; // vong thu 2 tre hon mot chut
  }

  function setHidden(on) {
    shownTarget = on ? 0 : 1;
    if (reduceMotion) shown = shownTarget;
  }

  function update(dt) {
    level += (target - level) * Math.min(1, dt * (reduceMotion ? 60 : 5));
    flash = Math.max(0, flash - dt * 1.2);
    // ~0.9 s tu sang han toi tat han, khop nhip camera zoom vao che do chi tiet.
    shown += Math.sign(shownTarget - shown) * Math.min(Math.abs(shownTarget - shown), dt * 1.1);
    group.visible = shown > 0.001;
    if (!group.visible) return;

    glow.material.opacity = (level * 0.5 + flash * 0.3) * shown;
    wall.material.opacity = (level * 0.35 + flash * 0.4) * shown;
    streaks.material.opacity = (level * 0.55 + flash * 0.45) * shown;
    // Tia chay len nhanh hon luc vua toi.
    if (!reduceMotion) streakMap.offset.y -= dt * (0.35 + flash * 1.2);

    scans.forEach((ring, i) => {
      if (scanT[i] < -0.5) return;
      scanT[i] += (dt * 1000) / SCAN_MS;
      const t = scanT[i];
      ring.visible = t >= 0 && t < 1;
      if (!ring.visible) {
        if (t >= 1) scanT[i] = -1;
        return;
      }
      ring.position.y = easeOutCubic(t) * MOTE_TOP;
      ring.material.opacity = Math.sin(Math.PI * t) * 0.9 * shown;
    });

    for (let i = 0; i < MOTES; i++) {
      const mo = motes[i];
      if (!reduceMotion) {
        mo.y += mo.v * dt * (1 + flash * 1.5);
        if (mo.y > MOTE_TOP) mo.y -= MOTE_TOP;
      }
      motePos[i * 3] = Math.cos(mo.a) * mo.r;
      motePos[i * 3 + 1] = mo.y;
      motePos[i * 3 + 2] = Math.sin(mo.a) * mo.r;
      moteCol[i * 4] = ACCENT.r;
      moteCol[i * 4 + 1] = ACCENT.g;
      moteCol[i * 4 + 2] = ACCENT.b;
      moteCol[i * 4 + 3] = Math.sin((Math.PI * mo.y) / MOTE_TOP) * level * shown;
    }
    motePosAttr.needsUpdate = true;
    moteColAttr.needsUpdate = true;
  }

  return { object: group, moveTo, charge, arrive, update, setHidden };
}
