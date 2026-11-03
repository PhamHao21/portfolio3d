import * as THREE from 'three';
import { loadSectionCharacter } from './characters.js';
import { disposeShared as disposeMmdShared } from './mmd/material.js';
import {
  createDisc,
  createDiscRings,
  createSelector,
  setDiscActive,
  setDiscHover,
  updateDisc,
  disposeGroup
} from './disc.js';
import {
  createFloor,
  createPad,
  setPadActive,
  setPadHover,
  disposeShared,
  floorCircuitPaths
} from './floor.js';
import { createCircuitPulses, createPadFx, createAmbient } from './effects.js';
import { SECTIONS } from '../data/sections.js';
import {
  CAMERA,
  MAX_PIXEL_RATIO,
  SLOT_COUNT,
  FRONT_OFFSET,
  DISC_RADIUS,
  CAROUSEL_RADIUS,
  ROTATE_MS,
  CHAR_YAW_OFFSET,
  DETAIL_MS,
  DETAIL,
  COLORS
} from './constants.js';
import { slotAngle, nextAngle, slotPosition, degToRad, stepSlot, tweenAngle } from './rotation.js';
import { lerp, lerp3, progress, detailFraming } from './camera.js';

// Khoi tru vo hinh bao quanh moi nhan vat de raycast, tranh raycast
// thang vao SkinnedMesh (phai skin tung dinh tren CPU, rat cham).
const HIT_RADIUS = 0.4;
const HIT_HEIGHT = 1.7;
const FLOOR_RADIUS = 7;
// Camera "giat" zoom nhe (do FOV) o giua luc dia xoay, cho cam giac luc.
const FOV_KICK = 1.4;
const PAD_R = 0.42;

/**
 * Man chon muc: dia xoay o giua san, 4 nhan vat dung thanh vong ben ngoai dia.
 * Xoay `discRoot` la xoay ca dia lan vong nhan vat.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   count?: number,
 *   onProgress?: (loaded: number, total: number, label: string) => void,
 *   onReady?: () => void,
 *   onError?: (msg: string) => void,
 *   onStats?: (s: object) => void,
 *   onChange?: (index: number) => void,
 *   onSelect?: (sectionId: string, index: number) => void,
 *   onContextLost?: () => void,
 *   onContextRestored?: () => void
 * }} opts
 */
export function createStage(canvas, opts = {}) {
  const count = Math.min(opts.count ?? SLOT_COUNT, SECTIONS.length, SLOT_COUNT);
  const noop = () => {};
  const onProgress = opts.onProgress ?? noop;
  const onReady = opts.onReady ?? noop;
  const onError = opts.onError ?? noop;
  const onStats = opts.onStats ?? noop;
  const onChange = opts.onChange ?? noop;
  const onSelect = opts.onSelect ?? noop;
  const onContextLost = opts.onContextLost ?? noop;
  const onContextRestored = opts.onContextRestored ?? noop;
  const t0 = performance.now();
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const rotateMs = reduceMotion ? 0 : ROTATE_MS;
  const detailMs = reduceMotion ? 0 : DETAIL_MS;

  // MSAA ton nhieu bo nho GPU nhat o man hinh DPR cao, noi rang cua vien da it thay;
  // chi bat khi DPR < 1.5.
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: window.devicePixelRatio < 1.5,
    alpha: true
  });
  // ?fx=0: tat hieu ung phat sang + dong dien, de khoanh vung khi GPU gap loi.
  const fxOn = new URLSearchParams(location.search).get('fx') !== '0';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const gpuName = (() => {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  })();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  // Camera phai nam trong scene thi lop phu (con cua camera) moi duoc ve.
  scene.add(camera);

  // Lop phu mau nen, gan vao camera va luon dat ngay sau lung nhan vat dang chon:
  // moi thu xa hon (san, dia, 3 nhan vat kia) bi che mo, nhan vat van net.
  // Re hon nhieu so voi blur CSS tren canvas (blur lai ca khung hinh moi frame).
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: COLORS.veil,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
  );
  veil.visible = false;
  camera.add(veil);

  // Trang thai camera hien tai. `shift` = ti le chieu ngang day khung hinh sang phai.
  const cam = {
    pos: [...CAMERA.position],
    look: [...CAMERA.lookAt],
    shift: 0,
    veil: 0
  };
  let camFrom = { ...cam };
  let camTo = { ...cam };
  let camStart = 0;
  let camMoving = false;
  let detailOn = false;
  let othersHidden = false;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd2d8, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2, 5, 3);
  scene.add(key);

  scene.add(createFloor({ radius: FLOOR_RADIUS, carouselRadius: CAROUSEL_RADIUS, anisotropy }));

  // Dong dien chay tren mach san (dung yen theo san, khong xoay theo dia).
  const pulses = createCircuitPulses({
    paths: floorCircuitPaths(FLOOR_RADIUS),
    radius: FLOOR_RADIUS,
    reduceMotion
  });
  pulses.object.visible = fxOn;
  scene.add(pulses.object);

  const discRoot = new THREE.Group();
  discRoot.name = 'discRoot';
  scene.add(discRoot);

  const disc = createDisc({ radius: DISC_RADIUS, slotCount: SLOT_COUNT, anisotropy });
  discRoot.add(disc);
  // Con tro chon dung yen o huong FRONT_OFFSET, dia xoay ben duoi no.
  const selector = createSelector({ radius: DISC_RADIUS, angleDeg: FRONT_OFFSET });
  scene.add(selector);
  // Vong chia do + quang sang quanh chan dia (dung yen theo san).
  const rings = createDiscRings({ radius: DISC_RADIUS, reduceMotion, anisotropy });
  scene.add(rings.object);
  // Bui sang lo lung.
  const ambient = createAmbient({ reduceMotion });
  ambient.object.visible = fxOn;
  scene.add(ambient.object);

  const pickables = [...disc.userData.pickables];
  const hitGeo = new THREE.CylinderGeometry(HIT_RADIUS, HIT_RADIUS, HIT_HEIGHT, 12);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const pads = [];
  const slotXZ = [];
  for (let i = 0; i < count; i++) {
    const [x, , z] = slotPosition(i, 0, CAROUSEL_RADIUS);
    slotXZ.push([x, z]);

    const pad = createPad();
    pad.position.set(x, 0, z);
    discRoot.add(pad);
    pads.push(pad);

    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.set(x, HIT_HEIGHT / 2, z);
    hit.userData = { slotIndex: i };
    discRoot.add(hit);
    pickables.push(hit);
  }

  function applyCamera() {
    camera.position.set(...cam.pos);
    camera.lookAt(...cam.look);
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    // View offset day ca khung hinh sang ngang ma khong doi goc nhin,
    // nen nhan vat truot sang trai mem ma khong bi meo phoi canh.
    if (cam.shift) camera.setViewOffset(w, h, cam.shift * w, 0, w, h);
    else camera.clearViewOffset();
    veil.material.opacity = cam.veil;
    veil.visible = cam.veil > 0.001;
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    applyCamera();
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // chars[i] ung voi slot i; phan tu con trong neu chua load xong.
  const chars = [];
  let active = 0;
  let disposed = false;

  // Trang thai xoay (do, tich luy, khong chuan hoa ve 0..360).
  let currentAngleDeg = slotAngle(active);
  let targetAngleDeg = currentAngleDeg;
  let startAngle = currentAngleDeg;
  let startTime = 0;
  let rotating = false;
  let rotDir = 1; // chieu xoay hien tai, cho den chay quanh vanh dia
  let hovered = -1;
  discRoot.rotation.y = degToRad(currentAngleDeg);

  // Hieu ung sang o be nhan vat dang chon, xoay theo dia.
  const padFx = createPadFx({ reduceMotion });
  padFx.object.visible = fxOn;
  discRoot.add(padFx.object);

  function highlight(i) {
    setDiscActive(disc, i);
    pads.forEach((p, k) => setPadActive(p, k === i));
    padFx.moveTo(...slotXZ[i]);
  }
  highlight(active);

  // Nhan vat vua toi vi tri phia truoc: 1 tia dien ban tu mep dia toi be,
  // cham be thi be bung sang + dong dien toa ra tren san.
  function arrive() {
    const [x, , z] = slotPosition(0, FRONT_OFFSET, CAROUSEL_RADIUS);
    const erupt = () => {
      padFx.arrive();
      pulses.burst(x, z, 6);
    };
    if (!fxOn) return erupt();
    const [sx, , sz] = slotPosition(0, FRONT_OFFSET, DISC_RADIUS * 1.05);
    const [ex, , ez] = slotPosition(0, FRONT_OFFSET, CAROUSEL_RADIUS - PAD_R);
    pulses.shoot(
      [
        [sx, sz],
        [ex, ez]
      ],
      { speed: 6, width: 2.2, onArrive: erupt }
    );
  }

  async function boot() {
    const specs = SECTIONS.slice(0, count);
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      onProgress(i, specs.length, s.label);
      try {
        const c = await loadSectionCharacter(s, { anisotropy: Math.min(anisotropy, 4), seed: i + 1 });
        if (disposed) {
          c.dispose();
          return;
        }

        const [x, z] = slotXZ[i];
        c.root.position.set(x, 0, z);
        discRoot.add(c.root);
        c.setPose(i === active ? 'pose' : 'idle', { instant: true });

        chars[i] = { ...c, section: s };
        if (c.failed.length) console.warn(s.label, c.failed);
      } catch (err) {
        console.error(err);
        onError(`Loi tai ${s.label}: ${err.message}`);
        return;
      }
    }
    onProgress(specs.length, specs.length, '');
    onStats({ loadMs: Math.round(performance.now() - t0) });
    arrive();
    onReady();
  }

  function setClip(i, name) {
    chars[i]?.setPose(name);
  }

  function select(i) {
    // Khoa input trong luc dang xoay hoac dang xem chi tiet.
    if (rotating || detailOn || camMoving || i === active || i < 0 || i >= count) return;
    setClip(active, 'idle');
    active = i;
    setClip(active, 'pose');
    highlight(active);
    padFx.charge();
    onChange(active);

    startAngle = currentAngleDeg;
    targetAngleDeg = nextAngle(currentAngleDeg, i);
    rotDir = Math.sign(targetAngleDeg - startAngle) || 1;
    startTime = performance.now();
    rotating = true;
    setHover(-1);
  }

  function updateRotation(now) {
    if (!rotating) return;
    const elapsed = now - startTime;
    const { angle, done } = tweenAngle(startAngle, targetAngleDeg, elapsed, rotateMs);
    discRoot.rotation.y = degToRad(angle);
    if (!reduceMotion) {
      const t = Math.min(1, elapsed / rotateMs);
      camera.fov = CAMERA.fov - FOV_KICK * Math.sin(Math.PI * t);
      camera.updateProjectionMatrix();
    }
    if (done) {
      rotating = false;
      currentAngleDeg = targetAngleDeg;
      camera.fov = CAMERA.fov;
      camera.updateProjectionMatrix();
      arrive();
      onSelect(SECTIONS[active].id, active);
    }
  }

  // Mo / dong che do chi tiet. Goi lai giua chung thi chuyen canh dao chieu
  // tu dung vi tri hien tai, khong giat.
  function setDetail(on) {
    if (on === detailOn || rotating) return;
    detailOn = on;
    // Can canh nhan vat thi tat cot sang quanh nguoi, dong chi tiet thi bat lai.
    padFx.setHidden(on);
    // Moi nhan vat co dang rieng khi xem chi tiet; dong lai thi ve dang duoc chon.
    chars[active]?.setPose(on ? 'detail' : 'pose', { duration: 0.8 });
    camFrom = { ...cam, pos: [...cam.pos], look: [...cam.look] };
    if (on) {
      const [hx, , hz] = slotPosition(0, FRONT_OFFSET, CAROUSEL_RADIUS);
      const f = detailFraming([hx, hz], CAMERA.position, DETAIL);
      camTo = { pos: f.position, look: f.lookAt, shift: DETAIL.shift, veil: DETAIL.veilOpacity };
    } else {
      camTo = { pos: [...CAMERA.position], look: [...CAMERA.lookAt], shift: 0, veil: 0 };
      showOthers(true);
    }
    camStart = performance.now();
    camMoving = true;
  }

  function updateCamera(now) {
    if (!camMoving) return;
    const t = progress(now - camStart, detailMs);
    cam.pos = lerp3(camFrom.pos, camTo.pos, t);
    cam.look = lerp3(camFrom.look, camTo.look, t);
    cam.shift = lerp(camFrom.shift, camTo.shift, t);
    cam.veil = lerp(camFrom.veil, camTo.veil, t);
    applyCamera();
    camera.updateProjectionMatrix();
    if (t >= 1) {
      camMoving = false;
      // Da che kin: an 3 nhan vat kia, ngung animation cua ho de do ton GPU/CPU.
      if (detailOn) showOthers(false);
    }
  }

  function showOthers(on) {
    othersHidden = !on;
    chars.forEach((c, i) => {
      if (c && i !== active) c.root.visible = on;
    });
  }

  // Dat lop phu ngay sau lung nhan vat dang chon, phu kin khung nhin.
  const _hero = new THREE.Vector3();
  function placeVeil() {
    if (!veil.visible) return;
    const [hx, , hz] = slotPosition(0, FRONT_OFFSET, CAROUSEL_RADIUS);
    _hero.set(hx, DETAIL.lookHeight, hz);
    const d = camera.position.distanceTo(_hero) + 0.6;
    const hgt = 2 * d * Math.tan(degToRad(camera.fov / 2)) * 1.2;
    veil.position.set(0, 0, -d);
    veil.scale.set(hgt * camera.aspect * 1.8, hgt, 1);
  }

  // Moi nhan vat luon quay mat ve phia camera du dang dung o dau tren vong.
  function faceCamera() {
    const rootYaw = discRoot.rotation.y;
    const cos = Math.cos(rootYaw);
    const sin = Math.sin(rootYaw);
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (!c) continue;
      const [lx, lz] = slotXZ[i];
      // Toa do the gioi cua slot sau khi discRoot xoay quanh Y.
      const wx = lx * cos + lz * sin;
      const wz = -lx * sin + lz * cos;
      const yaw = Math.atan2(camera.position.x - wx, camera.position.z - wz);
      c.root.rotation.y = yaw - rootYaw + degToRad(CHAR_YAW_OFFSET);
    }
  }

  // --- Input ---

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function pickSlot(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster
      .intersectObjects(pickables, false)
      .find((h) => h.object.userData.slotIndex !== undefined);
    return hit ? hit.object.userData.slotIndex : -1;
  }

  function onPointerDown(e) {
    const i = pickSlot(e);
    if (i >= 0) select(i);
  }

  // Re chuot: o slot + be cua muc do sang len, bao "bam duoc".
  function setHover(i) {
    if (i === active) i = -1;
    if (i === hovered) return;
    hovered = i;
    setDiscHover(disc, i);
    pads.forEach((p, k) => setPadHover(p, k === i));
  }

  function onPointerMove(e) {
    const i = rotating || detailOn ? -1 : pickSlot(e);
    canvas.style.cursor = i >= 0 ? 'pointer' : 'default';
    setHover(i);
  }

  function onPointerLeave() {
    setHover(-1);
  }

  function onKey(e) {
    // Khong cuop phim khi dang go trong o nhap lieu.
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return;
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      e.preventDefault();
      select(stepSlot(active, e.code === 'ArrowRight' ? 1 : -1, count));
      return;
    }
    if (e.code === 'Enter') {
      // Giu nguyen slot hien tai. Phase 4 dung de mo panel.
      return;
    }
    const n = Number(e.key);
    if (n >= 1 && n <= count) select(n - 1);
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('keydown', onKey);

  // three tu goi preventDefault khi mat context de trinh duyet thu khoi phuc;
  // o day chi bao len UI.
  // Ghi lai thong tin de chan doan khi GPU reset (khong tai hien duoc tren moi may).
  function logContextLost() {
    console.warn('[stage] WebGL context lost', {
      afterSec: +((performance.now() - t0) / 1000).toFixed(1),
      gpu: gpuName,
      dpr: window.devicePixelRatio,
      antialias: window.devicePixelRatio < 1.5,
      fx: fxOn,
      detail: detailOn,
      memory: { ...renderer.info.memory },
      programs: renderer.info.programs?.length
    });
  }
  canvas.addEventListener('webglcontextlost', logContextLost);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  // --- Render loop ---

  const timer = new THREE.Timer();
  let frames = 0;
  let last = performance.now();
  let raf;

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    frame(ts);
  }

  function frame(ts) {
    timer.update(ts);
    const dt = timer.getDelta();
    const now = performance.now();
    updateRotation(now);
    updateCamera(now);
    placeVeil();
    faceCamera();
    updateDisc(disc, dt, { rotating, dir: rotDir });
    rings.update(dt, { rotating });
    if (fxOn) {
      pulses.update(dt);
      padFx.update(dt);
      ambient.update(dt);
    }
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (!c || (othersHidden && i !== active)) continue;
      c.update(dt);
    }
    renderer.render(scene, camera);

    frames++;
    if (now - last >= 1000) {
      onStats({
        fps: Math.round((frames * 1000) / (now - last)),
        calls: renderer.info.render.calls,
        tris: renderer.info.render.triangles
      });
      frames = 0;
      last = now;
    }
  }
  raf = requestAnimationFrame(loop);
  boot();

  return {
    select,
    setDetail,
    getActiveIndex: () => active,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', logContextLost);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      canvas.style.cursor = '';
      for (const c of chars) {
        if (!c) continue;
        discRoot.remove(c.root);
        c.dispose();
      }
      chars.length = 0;
      hitGeo.dispose();
      hitMat.dispose();
      camera.remove(veil);
      veil.geometry.dispose();
      veil.material.dispose();
      disposeGroup(scene);
      disposeShared();
      disposeMmdShared();
      scene.clear();
      renderer.dispose();
      // Tra context cho GPU ngay, khong doi garbage collector. Thieu dong nay thi
      // moi lan component mount lai (HMR, chuyen trang) lai giu them ~300 MB VRAM
      // den khi driver het bo nho va reset GPU.
      renderer.forceContextLoss();
    }
  };
}
