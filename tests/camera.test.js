import test from 'node:test';
import assert from 'node:assert/strict';
import { easeInOutCubic, lerp, lerp3, progress, detailFraming } from '../src/lib/three/camera.js';
import { CAMERA, DETAIL, FRONT_OFFSET, CAROUSEL_RADIUS } from '../src/lib/three/constants.js';
import { slotPosition } from '../src/lib/three/rotation.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('easeInOutCubic: 0 -> 0, 0.5 -> 0.5, 1 -> 1, doi xung, luon tang', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(0.5), 0.5);
  assert.equal(easeInOutCubic(1), 1);
  for (let t = 0; t <= 1; t += 0.05) {
    assert.ok(close(easeInOutCubic(t) + easeInOutCubic(1 - t), 1), `khong doi xung tai ${t}`);
  }
  let prev = -1;
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const v = easeInOutCubic(t);
    assert.ok(v > prev);
    prev = v;
  }
});

test('easeInOutCubic: bat dau va ket thuc cham (dao ham gan 0 o 2 dau)', () => {
  const h = 1e-4;
  assert.ok(easeInOutCubic(h) / h < 0.01);
  assert.ok((1 - easeInOutCubic(1 - h)) / h < 0.01);
});

test('lerp / lerp3: dung 2 dau va diem giua', () => {
  assert.equal(lerp(2, 6, 0), 2);
  assert.equal(lerp(2, 6, 1), 6);
  assert.equal(lerp(2, 6, 0.5), 4);
  assert.deepEqual(lerp3([0, 0, 0], [2, 4, 6], 0.5), [1, 2, 3]);
});

test('progress: kep trong [0, 1], duration 0 thi xong ngay', () => {
  assert.equal(progress(-50, 900), 0);
  assert.equal(progress(0, 900), 0);
  assert.equal(progress(900, 900), 1);
  assert.equal(progress(5000, 900), 1);
  assert.equal(progress(0, 0), 1);
});

test('detailFraming: camera cach nhan vat dung `distance`, nhin vao nguoi nhan vat', () => {
  const [hx, , hz] = slotPosition(0, FRONT_OFFSET, CAROUSEL_RADIUS);
  const f = detailFraming([hx, hz], CAMERA.position, DETAIL);
  assert.ok(close(Math.hypot(f.position[0] - hx, f.position[2] - hz), DETAIL.distance));
  assert.equal(f.position[1], DETAIL.height);
  assert.deepEqual(f.lookAt, [hx, DETAIL.lookHeight, hz]);
});

test('detailFraming: camera nam tren duong noi nhan vat -> camera mac dinh', () => {
  const hero = [1, 1];
  const from = [4, 5, 5];
  const f = detailFraming(hero, from, { distance: 2, height: 1, lookHeight: 1 });
  // Vector nhan vat -> camera moi cung huong voi nhan vat -> camera mac dinh.
  const ax = f.position[0] - hero[0];
  const az = f.position[2] - hero[1];
  const bx = from[0] - hero[0];
  const bz = from[2] - hero[1];
  assert.ok(close(ax * bz - az * bx, 0), 'khong cung phuong');
  assert.ok(ax * bx + az * bz > 0, 'nguoc huong');
});
