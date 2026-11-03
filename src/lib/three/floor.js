import * as THREE from 'three';
import { COLORS } from './constants.js';
import { drawCircuit, circuitPaths, mulberry32 } from './circuit.js';

const TEX = 2048;
// Thong so mach tren san. Dung chung cho luc ve texture va luc tinh duong chay
// cua dong dien (effects.js), nen 2 ben luon trung khop tung net.
const CIRCUIT = { cellUnits: 0.25, count: 170, seed: 2026 };

function circuitOpts(radius) {
  const px = TEX / 2 / radius;
  // accentRatio 0: san chi co net den. Mau vang tren san chi xuat hien khi co
  // dong dien dang chay, de khong ai nham net vang tinh la xung chua tat.
  return { width: TEX, height: TEX, cell: px * CIRCUIT.cellUnits, count: CIRCUIT.count, accentRatio: 0 };
}

/**
 * Cac duong mach tren san, doi tu pixel texture sang toa do the gioi [x, z].
 * Canvas: trai -> -X, tren -> -Z (xem flat()).
 */
export function floorCircuitPaths(radius) {
  const c = TEX / 2;
  const px = c / radius;
  return circuitPaths({ ...circuitOpts(radius), rand: mulberry32(CIRCUIT.seed) }).map((p) => ({
    points: p.points.map(([x, y]) => [(x - c) / px, (y - c) / px]),
    accent: p.accent
  }));
}

function flat(geo) {
  return geo.rotateX(-Math.PI / 2);
}

/**
 * San: luoi ky thuat + mach dien + vong ray cho nhan vat, mo dan ra mep.
 * Dung yen, khong xoay theo dia.
 */
export function createFloor({ radius, carouselRadius, anisotropy = 1 }) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEX;
  const ctx = canvas.getContext('2d');
  const c = TEX / 2;
  const px = c / radius; // pixel tren 1 don vi the gioi

  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, TEX, TEX);

  // Luoi o vuong 0.5 don vi.
  ctx.strokeStyle = COLORS.ink;
  ctx.globalAlpha = 0.07;
  ctx.lineWidth = 2;
  const step = px * 0.5;
  for (let v = c % step; v < TEX; v += step) {
    ctx.beginPath();
    ctx.moveTo(v, 0);
    ctx.lineTo(v, TEX);
    ctx.moveTo(0, v);
    ctx.lineTo(TEX, v);
    ctx.stroke();
  }

  drawCircuit(ctx, {
    ...circuitOpts(radius),
    rand: mulberry32(CIRCUIT.seed),
    ink: COLORS.ink,
    accent: COLORS.accent,
    alpha: 0.13,
    lineWidth: 3
  });

  // Vong ray noi nhan vat dung: 1 vong lien + 1 vong net dut.
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, carouselRadius * px, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([18, 14]);
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(c, c, (carouselRadius + 0.55) * px, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Mo dan ra mep de hoa vao nen CSS.
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createRadialGradient(c, c, c * 0.3, c, c, c);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, TEX, TEX);
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;

  const floor = new THREE.Mesh(
    flat(new THREE.CircleGeometry(radius, 96)),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  floor.name = 'floor';
  floor.renderOrder = -1;
  return floor;
}

// Bong mo duoi chan, dung chung cho moi be.
let shadowTex = null;
function getShadowTexture() {
  if (shadowTex) return shadowTex;
  const s = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(23,24,27,0.35)');
  g.addColorStop(1, 'rgba(23,24,27,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  shadowTex = new THREE.CanvasTexture(canvas);
  return shadowTex;
}

/** Be dung duoi 1 nhan vat: bong mo + vong trong + vong ngoai (sang vang khi active). */
export function createPad({ radius = 0.42 } = {}) {
  const pad = new THREE.Group();
  pad.name = 'pad';

  const shadow = new THREE.Mesh(
    flat(new THREE.PlaneGeometry(radius * 2.6, radius * 2.6)),
    new THREE.MeshBasicMaterial({ map: getShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.position.y = 0.004;
  pad.add(shadow);

  const inner = new THREE.Mesh(
    flat(new THREE.RingGeometry(radius * 0.82, radius * 0.88, 48)),
    new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.45, depthWrite: false })
  );
  inner.position.y = 0.006;
  pad.add(inner);

  const outer = new THREE.Mesh(
    flat(new THREE.RingGeometry(radius * 0.96, radius * 1.06, 48)),
    new THREE.MeshBasicMaterial({ color: COLORS.accent, transparent: true, opacity: 0, depthWrite: false })
  );
  outer.position.y = 0.008;
  pad.add(outer);

  pad.userData = { inner, outer, active: false, hover: false };
  return pad;
}

function applyPad(pad) {
  const { inner, outer, active, hover } = pad.userData;
  outer.material.opacity = active ? 1 : hover ? 0.55 : 0;
  inner.material.color.set(active || hover ? COLORS.accent : COLORS.ink);
  inner.material.opacity = active ? 1 : hover ? 0.9 : 0.45;
}

export function setPadActive(pad, on) {
  pad.userData.active = on;
  applyPad(pad);
}

// Re chuot vao nhan vat / o slot: be sang vang nhat de bao "bam duoc".
export function setPadHover(pad, on) {
  pad.userData.hover = on;
  applyPad(pad);
}

export function disposeShared() {
  shadowTex?.dispose();
  shadowTex = null;
}
