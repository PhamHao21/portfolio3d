import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMonth, monthSpan, durationLabel } from '../src/lib/ui/format.js';
import { SECTIONS } from '../src/lib/data/sections.js';
import { ABOUT } from '../src/lib/data/about.js';
import { TECH_GROUPS } from '../src/lib/data/tech.js';
import { PROJECTS, PROJECT_SLOTS } from '../src/lib/data/projects.js';
import { WORK } from '../src/lib/data/work.js';

test('formatMonth: YYYY-MM[-DD] -> MM/YYYY', () => {
  assert.equal(formatMonth('2026-08-01'), '08/2026');
  assert.equal(formatMonth('2026-05'), '05/2026');
});

test('monthSpan: tinh ca thang dau va thang hien tai', () => {
  assert.equal(monthSpan('2026-08-01', new Date(2026, 8, 25)), 2); // 08 -> 09/2026
  assert.equal(monthSpan('2026-08-01', new Date(2026, 7, 2)), 1); // cung thang
  assert.equal(monthSpan('2025-11-01', new Date(2026, 1, 1)), 4); // qua nam
  assert.equal(monthSpan('2026-08-01', new Date(2026, 6, 1)), 1); // ngay tuong lai -> toi thieu 1
});

test('durationLabel: thang / nam / nam + thang', () => {
  assert.equal(durationLabel(2), '2 tháng');
  assert.equal(durationLabel(12), '1 năm');
  assert.equal(durationLabel(15), '1 năm 3 tháng');
});

test('moi muc trong SECTIONS co id hop le cho panel', () => {
  const known = ['about', 'tech', 'project', 'work'];
  for (const s of SECTIONS) assert.ok(known.includes(s.id), `id la: ${s.id}`);
});

test('lien ket ngoai deu la https', () => {
  const hrefs = [...ABOUT.links, ...PROJECTS.flatMap((p) => p.links)].map((l) => l.href);
  for (const h of hrefs) assert.match(h, /^https:\/\//);
});

test('du lieu du truong bat buoc', () => {
  assert.ok(ABOUT.name && ABOUT.role && ABOUT.bio.length);
  for (const g of TECH_GROUPS) assert.ok(g.label && g.items.length);
  assert.ok(PROJECTS.length <= PROJECT_SLOTS);
  for (const p of PROJECTS) assert.ok(p.code && p.name && p.stack.length);
  for (const w of WORK) {
    assert.match(w.start, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(w.company && w.roles.length);
  }
});
