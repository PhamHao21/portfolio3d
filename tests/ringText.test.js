import test from 'node:test';
import assert from 'node:assert/strict';
import { fitRepeat, layoutRing } from '../src/lib/three/ringText.js';

test('fitRepeat: so lan lap vua chu vi, kep trong [min, max]', () => {
  assert.equal(fitRepeat(1000, 2650), 2);
  assert.equal(fitRepeat(600, 2650), 4);
  assert.equal(fitRepeat(100, 2650, 1, 4), 4);
  assert.equal(fitRepeat(5000, 2650), 1);
  assert.equal(fitRepeat(0, 2650), 1);
});

test('layoutRing: phan tu cuoi + khe cuoi khep kin vong tron', () => {
  const widths = [120, 20, 90, 20, 60, 200];
  const circ = 900;
  const { starts, gap } = layoutRing(widths, circ);
  const last = widths.length - 1;
  assert.ok(Math.abs(starts[last] + widths[last] + gap - circ) < 1e-9);
});

test('layoutRing: cac khe deu nhau va khong am khi du cho', () => {
  const widths = [100, 50, 100, 50];
  const { starts, gap } = layoutRing(widths, 600);
  assert.equal(gap, 75);
  for (let i = 1; i < widths.length; i++) {
    assert.equal(starts[i] - (starts[i - 1] + widths[i - 1]), gap);
  }
});

test('layoutRing: danh sach rong khong loi', () => {
  assert.deepEqual(layoutRing([], 500), { starts: [], gap: 0 });
});
