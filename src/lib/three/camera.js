// Toan thuan cho chuyen canh camera khi mo che do xem chi tiet.

// Cham o ca 2 dau: bat dau va dung lai deu mem, hop cho chuyen canh camera.
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const lerp = (a, b, t) => a + (b - a) * t;

export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Tien do da ease cua 1 chuyen canh, luon trong [0, 1].
export function progress(elapsedMs, durationMs) {
  if (durationMs <= 0) return 1;
  return easeInOutCubic(Math.min(Math.max(elapsedMs / durationMs, 0), 1));
}

/**
 * Khung hinh can canh nhan vat: camera dat tren duong noi nhan vat voi camera
 * mac dinh (nhin theo phuong ngang), cach nhan vat `distance`, cao `height`,
 * nhin vao diem cao `lookHeight` tren nguoi nhan vat.
 *
 * @param {number[]} hero [x, z] vi tri nhan vat tren san
 * @param {number[]} from [x, y, z] vi tri camera mac dinh
 */
export function detailFraming(hero, from, { distance, height, lookHeight }) {
  let dx = from[0] - hero[0];
  let dz = from[2] - hero[1];
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  return {
    position: [hero[0] + dx * distance, height, hero[1] + dz * distance],
    lookAt: [hero[0], lookHeight, hero[1]]
  };
}
