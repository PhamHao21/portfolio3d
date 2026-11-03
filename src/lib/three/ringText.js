// Toan thuan de xep 1 day phan tu (chu, dau phan cach, doan soc) quanh vong tron.

/**
 * So lan lap lai 1 chu ky rong `unit` px de vua chu vi `circ`, kep trong [min, max].
 */
export function fitRepeat(unit, circ, min = 1, max = 4) {
  if (!(unit > 0)) return min;
  return Math.min(max, Math.max(min, Math.floor(circ / unit)));
}

/**
 * Vi tri bat dau (px, doc theo vong) cua tung phan tu co do rong `widths`.
 * Khoang du chia deu vao sau moi phan tu, nen phan tu cuoi + khe cuoi khep
 * vua kin vong tron (khong co khe to bat thuong o cho noi).
 */
export function layoutRing(widths, circ) {
  const used = widths.reduce((a, w) => a + w, 0);
  const gap = widths.length ? (circ - used) / widths.length : 0;
  const starts = [];
  let s = 0;
  for (const w of widths) {
    starts.push(s);
    s += w + gap;
  }
  return { starts, gap };
}
