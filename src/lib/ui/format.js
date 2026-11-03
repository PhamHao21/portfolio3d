// Dinh dang thoi gian cho noi dung panel. Ham thuan, test duoc bang node --test.

// 'YYYY-MM' hoac 'YYYY-MM-DD' -> 'MM/YYYY'.
export function formatMonth(iso) {
  const [y, m] = iso.split('-');
  return `${m}/${y}`;
}

/**
 * So thang lam viec, tinh ca thang bat dau va thang hien tai (giong cach LinkedIn):
 * 08/2026 -> 09/2026 = 2 thang.
 */
export function monthSpan(startIso, end = new Date()) {
  const [y, m] = startIso.split('-').map(Number);
  const months = (end.getFullYear() - y) * 12 + (end.getMonth() + 1 - m) + 1;
  return Math.max(1, months);
}

// 2 -> '2 tháng', 12 -> '1 năm', 15 -> '1 năm 3 tháng'.
export function durationLabel(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} tháng`;
  return m ? `${y} năm ${m} tháng` : `${y} năm`;
}
