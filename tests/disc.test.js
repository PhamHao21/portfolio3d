import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slotAngle,
  nextAngle,
  slotPosition,
  stepSlot,
  tweenAngle
} from '../src/lib/three/rotation.js';
import { SLOT_COUNT, DISC_RADIUS } from '../src/lib/three/constants.js';

// Goc dia co dung dang tro vao slot `index` khong (bo qua so vong).
function assertAtSlot(angle, index) {
  const mod = (((angle - slotAngle(index)) % 360) + 360) % 360;
  assert.ok(mod < 1e-9 || Math.abs(mod - 360) < 1e-9, `goc ${angle} khong khop slot ${index}`);
}

// PRNG co seed de test lap lai duoc.
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

test('di lan luot 4 slot roi ve slot 0: moi buoc |delta| <= 180', () => {
  let angle = slotAngle(0);
  for (const i of [1, 2, 3, 0]) {
    const next = nextAngle(angle, i);
    assert.ok(Math.abs(next - angle) <= 180, `buoc toi slot ${i} quay ${next - angle}`);
    angle = next;
    assertAtSlot(angle, i);
  }
});

test('20 lan chon ngau nhien: goc van khop slot dang chon', () => {
  const rand = rng(42);
  let angle = slotAngle(0);
  let active = 0;
  for (let n = 0; n < 20; n++) {
    active = Math.floor(rand() * SLOT_COUNT);
    angle = nextAngle(angle, active);
  }
  assertAtSlot(angle, active);
});

test('ArrowRight 4 lan tu slot 0: ve slot 0, tong goc dung 360', () => {
  const start = slotAngle(0);
  let angle = start;
  let active = 0;
  for (let n = 0; n < 4; n++) {
    active = stepSlot(active, 1, SLOT_COUNT);
    angle = nextAngle(angle, active);
  }
  assert.equal(active, 0);
  assert.equal(Math.abs(angle - start), 360);
});

test('ArrowLeft 4 lan tu slot 0: ve slot 0, tong goc dung 360 nguoc chieu', () => {
  const start = slotAngle(0);
  let angle = start;
  let active = 0;
  for (let n = 0; n < 4; n++) {
    active = stepSlot(active, -1, SLOT_COUNT);
    angle = nextAngle(angle, active);
  }
  assert.equal(active, 0);
  assert.equal(angle - start, 360);
});

test('stepSlot: boc vong 2 dau', () => {
  assert.equal(stepSlot(3, 1, 4), 0);
  assert.equal(stepSlot(0, -1, 4), 3);
  assert.equal(stepSlot(1, 1, 4), 2);
  assert.equal(stepSlot(2, -1, 4), 1);
});

test('slotPosition: 4 slot cach deu, cach tam dung DISC_RADIUS', () => {
  const pts = Array.from({ length: SLOT_COUNT }, (_, i) => slotPosition(i, 0, DISC_RADIUS));
  const side = DISC_RADIUS * Math.SQRT2; // canh hinh vuong noi tiep
  for (let i = 0; i < SLOT_COUNT; i++) {
    const [x, , z] = pts[i];
    assert.ok(Math.abs(Math.hypot(x, z) - DISC_RADIUS) < 1e-9);
    const [x2, , z2] = pts[(i + 1) % SLOT_COUNT];
    assert.ok(Math.abs(Math.hypot(x2 - x, z2 - z) - side) < 1e-9, `slot ${i} lech khoang cach`);
  }
});

test('tweenAngle: bat dau o start, ket thuc dung target va bao done', () => {
  assert.deepEqual(tweenAngle(45, -45, 0, 600), { angle: 45, done: false });
  assert.deepEqual(tweenAngle(45, -45, 600, 600), { angle: -45, done: true });
  assert.deepEqual(tweenAngle(45, -45, 5000, 600), { angle: -45, done: true });
  const mid = tweenAngle(45, -45, 300, 600);
  assert.ok(mid.angle < 45 && mid.angle > -45 && !mid.done);
});

test('tweenAngle: di don dieu, khong vuot qua target', () => {
  let prev = 45;
  for (let ms = 0; ms <= 600; ms += 20) {
    const { angle } = tweenAngle(45, -45, ms, 600);
    assert.ok(angle <= prev && angle >= -45);
    prev = angle;
  }
});
