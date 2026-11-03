import { SLOT_COUNT, FRONT_OFFSET } from './constants.js';

// Goc muc tieu (do) de slot `index` quay ve vi tri truoc mat nguoi xem.
export function slotAngle(index, count = SLOT_COUNT, frontOffset = FRONT_OFFSET) {
  return frontOffset - index * (360 / count);
}

// Chenh lech goc ngan nhat, luon nam trong (-180, 180].
export function shortestDelta(current, target) {
  const d = (((target - current + 180) % 360) + 360) % 360 - 180;
  return d === -180 ? 180 : d;
}

// Goc tuyet doi ke tiep, khong bi nhay 270 do.
export function nextAngle(current, index, count = SLOT_COUNT, frontOffset = FRONT_OFFSET) {
  return current + shortestDelta(current, slotAngle(index, count, frontOffset));
}

export const degToRad = (d) => (d * Math.PI) / 180;

// Vi tri cua slot tren vanh dia, theo goc hien tai cua dia.
export function slotPosition(index, discAngleDeg, radius, count = SLOT_COUNT) {
  const a = degToRad(discAngleDeg + index * (360 / count));
  return [Math.sin(a) * radius, 0, Math.cos(a) * radius];
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Slot ke ben khi bam mui ten (dir = +1 / -1), boc vong bang modulo.
export function stepSlot(current, dir, count = SLOT_COUNT) {
  return (((current + dir) % count) + count) % count;
}

// Goc tai thoi diem `elapsedMs` cua 1 lan xoay tu `start` toi `target`.
export function tweenAngle(start, target, elapsedMs, durationMs) {
  const t = durationMs > 0 ? Math.min(Math.max(elapsedMs / durationMs, 0), 1) : 1;
  if (t >= 1) return { angle: target, done: true };
  return { angle: start + (target - start) * easeOutCubic(t), done: false };
}
