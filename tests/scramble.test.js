import test from 'node:test';
import assert from 'node:assert/strict';
import { scrambleText } from '../src/lib/ui/scramble.js';
import { mulberry32 } from '../src/lib/three/circuit.js';

test('scrambleText: progress 1 tra ve dung chu goc', () => {
  assert.equal(scrambleText('PROJECTS', 1, mulberry32(1)), 'PROJECTS');
  assert.equal(scrambleText('PROJECTS', 5, mulberry32(1)), 'PROJECTS');
});

test('scrambleText: luon giu nguyen do dai va khoang trang', () => {
  const target = 'ABOUT ME 01';
  for (let p = 0; p <= 1; p += 0.1) {
    const out = scrambleText(target, p, mulberry32(9));
    assert.equal(out.length, target.length);
    assert.equal(out[5], ' ');
    assert.equal(out[8], ' ');
  }
});

test('scrambleText: phan dau da chot dung theo tien do', () => {
  const target = 'ABCDEFGHIJ';
  const out = scrambleText(target, 0.5, mulberry32(3));
  assert.equal(out.slice(0, 5), 'ABCDE');
});

test('scrambleText: chi dung ky tu trong bang cho phan chua chot', () => {
  const out = scrambleText('XXXXXXXXXXXX', 0, mulberry32(4), 'ab');
  assert.match(out, /^[ab]+$/);
});
