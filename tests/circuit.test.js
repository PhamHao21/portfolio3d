import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, circuitPaths, measure, pointAt, radialFade } from '../src/lib/three/circuit.js';

test('mulberry32: cung seed cho cung day so, nam trong [0, 1)', () => {
  const a = mulberry32(99);
  const b = mulberry32(99);
  for (let i = 0; i < 200; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('circuitPaths: dung so duong, moi duong 3-5 dinh', () => {
  const paths = circuitPaths({ width: 512, height: 512, cell: 16, count: 40, rand: mulberry32(1) });
  assert.equal(paths.length, 40);
  for (const p of paths) assert.ok(p.points.length >= 3 && p.points.length <= 5);
});

test('circuitPaths: moi dinh nam tren luoi, moi doan la ngang/doc/cheo 45 do', () => {
  const cell = 16;
  const paths = circuitPaths({ width: 512, height: 512, cell, count: 60, rand: mulberry32(5) });
  for (const { points } of paths) {
    for (const [x, y] of points) {
      assert.ok(x % cell === 0, `x=${x} lech luoi`);
      assert.ok(y % cell === 0, `y=${y} lech luoi`);
    }
    for (let i = 1; i < points.length; i++) {
      const dx = Math.abs(points[i][0] - points[i - 1][0]);
      const dy = Math.abs(points[i][1] - points[i - 1][1]);
      assert.ok(dx === 0 || dy === 0 || dx === dy, `doan ${dx}x${dy} khong theo 45 do`);
    }
  }
});

test('circuitPaths: 2 doan lien tiep re dung 45 do', () => {
  const paths = circuitPaths({ width: 512, height: 512, cell: 16, count: 60, rand: mulberry32(8) });
  for (const { points } of paths) {
    for (let i = 2; i < points.length; i++) {
      const a = Math.atan2(points[i - 1][1] - points[i - 2][1], points[i - 1][0] - points[i - 2][0]);
      const b = Math.atan2(points[i][1] - points[i - 1][1], points[i][0] - points[i - 1][0]);
      let d = Math.abs(((b - a) * 180) / Math.PI) % 360;
      if (d > 180) d = 360 - d;
      assert.ok(Math.abs(d - 45) < 1e-9, `goc re ${d}`);
    }
  }
});

const L = [[0, 0], [3, 0], [3, 4]]; // 2 doan: 3 roi 4, tong 7

test('measure: do dai tich luy dung', () => {
  assert.deepEqual(measure(L), [0, 3, 7]);
});

test('pointAt: diem va huong dung tren tung doan', () => {
  const cum = measure(L);
  assert.deepEqual(pointAt(L, cum, 0), { x: 0, y: 0, dx: 1, dy: 0 });
  assert.deepEqual(pointAt(L, cum, 1.5), { x: 1.5, y: 0, dx: 1, dy: 0 });
  assert.deepEqual(pointAt(L, cum, 5), { x: 3, y: 2, dx: 0, dy: 1 });
  assert.deepEqual(pointAt(L, cum, 7), { x: 3, y: 4, dx: 0, dy: 1 });
});

test('pointAt: quang duong ngoai [0, tong] bi kep ve 2 dau', () => {
  const cum = measure(L);
  assert.equal(pointAt(L, cum, -2).x, 0);
  const end = pointAt(L, cum, 99);
  assert.deepEqual([end.x, end.y], [3, 4]);
});

test('pointAt: moi diem tren duong mach that deu nam tren 1 doan cua no', () => {
  const [path] = circuitPaths({ width: 256, height: 256, cell: 16, count: 1, rand: mulberry32(3) });
  const cum = measure(path.points);
  const total = cum[cum.length - 1];
  for (let d = 0; d <= total; d += total / 37) {
    const p = pointAt(path.points, cum, d);
    assert.ok(Math.abs(Math.hypot(p.dx, p.dy) - 1) < 1e-9, 'huong khong phai vector don vi');
  }
});

test('radialFade: 1 o trong, 0 o mep, giam dan o giua', () => {
  assert.equal(radialFade(0, 7), 1);
  assert.equal(radialFade(2.1, 7), 1);
  assert.equal(radialFade(7, 7), 0);
  assert.equal(radialFade(9, 7), 0);
  const mid = radialFade(4.55, 7);
  assert.ok(mid > 0.4 && mid < 0.6);
});
