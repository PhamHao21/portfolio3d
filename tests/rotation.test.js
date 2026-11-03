import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slotAngle,
  shortestDelta,
  nextAngle,
  slotPosition,
  easeOutCubic
} from '../src/lib/three/rotation.js';

test('slotAngle: 4 slot cach nhau 90 do', () => {
  assert.equal(slotAngle(0), 45);
  assert.equal(slotAngle(1), -45);
  assert.equal(slotAngle(2), -135);
  assert.equal(slotAngle(3), -225);
});

test('shortestDelta: khong bao gio vuot 180 do', () => {
  for (let a = -720; a <= 720; a += 7) {
    for (let i = 0; i < 4; i++) {
      const d = shortestDelta(a, slotAngle(i));
      assert.ok(Math.abs(d) <= 180, `delta ${d} qua lon tai a=${a} i=${i}`);
    }
  }
});

test('shortestDelta: slot ke nhau luon la 90 do', () => {
  assert.equal(Math.abs(shortestDelta(slotAngle(0), slotAngle(1))), 90);
  assert.equal(Math.abs(shortestDelta(slotAngle(1), slotAngle(2))), 90);
  assert.equal(Math.abs(shortestDelta(slotAngle(3), slotAngle(0))), 90);
});

test('slot 0 -> slot 3 di duong ngan (90 do), khong phai 270', () => {
  const d = shortestDelta(slotAngle(0), slotAngle(3));
  assert.equal(Math.abs(d), 90);
});

test('slot doi dien cach 180 do', () => {
  assert.equal(Math.abs(shortestDelta(slotAngle(0), slotAngle(2))), 180);
});

test('nextAngle: cong don, quay nhieu vong van dung slot', () => {
  let angle = 0;
  const order = [1, 2, 3, 0, 3, 2, 1, 0, 2];
  for (const i of order) {
    const prev = angle;
    angle = nextAngle(angle, i);
    assert.ok(Math.abs(angle - prev) <= 180, 'buoc quay qua dai');
    const mod = (((angle - slotAngle(i)) % 360) + 360) % 360;
    assert.ok(mod < 1e-9 || Math.abs(mod - 360) < 1e-9, `sai slot: ${angle} vs ${slotAngle(i)}`);
  }
});

test('slotPosition: 4 slot nam tren vong tron ban kinh r', () => {
  const r = 1.6;
  for (let i = 0; i < 4; i++) {
    const [x, y, z] = slotPosition(i, 0, r);
    assert.equal(y, 0);
    assert.ok(Math.abs(Math.hypot(x, z) - r) < 1e-9);
  }
});

test('easeOutCubic: bat dau 0 ket thuc 1, luon tang', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  let prev = -1;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const v = easeOutCubic(t);
    assert.ok(v > prev);
    prev = v;
  }
});
