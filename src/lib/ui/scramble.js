// Hieu ung "giai ma" chu kieu HUD game: ky tu ngau nhien chot dan tu trai sang phai.

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>_';

/**
 * Chuoi hien thi tai tien do `progress` (0..1): phan dau da chot dung chu,
 * phan sau la ky tu ngau nhien. Khoang trang giu nguyen de do dai tu khong nhay.
 */
export function scrambleText(target, progress, rand, chars = CHARS) {
  const settled = Math.floor(target.length * Math.min(Math.max(progress, 0), 1));
  let out = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    out += i < settled || ch === ' ' ? ch : chars[Math.floor(rand() * chars.length)];
  }
  return out;
}

/**
 * Svelte action: `<h2 use:scramble={text} aria-label={text}></h2>`.
 * Chay hieu ung moi khi gan / doi chu. Phan tu phai de trong (action tu ghi chu),
 * dat aria-label de trinh doc man hinh doc dung chu that.
 */
export function scramble(node, text, duration = 450) {
  let raf = 0;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function run(value) {
    cancelAnimationFrame(raf);
    const target = String(value ?? '');
    if (reduce) {
      node.textContent = target;
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const p = (now - start) / duration;
      node.textContent = p >= 1 ? target : scrambleText(target, p, Math.random);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    node.textContent = scrambleText(target, 0, Math.random);
    raf = requestAnimationFrame(tick);
  }

  run(text);
  return {
    update: run,
    destroy: () => cancelAnimationFrame(raf)
  };
}
