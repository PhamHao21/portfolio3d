// Sinh hoa van mach dien (duong di theo luoi, re 45 do) de ve len canvas.

// PRNG co seed: cung seed -> cung hoa van moi lan tai trang.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 8 huong, cach nhau 45 do. Buoc cheo di 1 o ngang + 1 o doc.
const DIRS = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1]
];

/**
 * Tao `count` duong mach. Moi duong gom 2-4 doan, giua 2 doan re +-45 do,
 * moi dinh nam tren luoi `cell`. Tra ve toa do pixel.
 * @returns {{points: number[][], accent: boolean}[]}
 */
export function circuitPaths({ width, height, cell, count, rand, accentRatio = 0.08 }) {
  const cols = Math.floor(width / cell);
  const rows = Math.floor(height / cell);
  const paths = [];
  for (let n = 0; n < count; n++) {
    let gx = Math.floor(rand() * (cols + 1));
    let gy = Math.floor(rand() * (rows + 1));
    let dir = Math.floor(rand() * 8);
    const points = [[gx * cell, gy * cell]];
    const segs = 2 + Math.floor(rand() * 3);
    for (let s = 0; s < segs; s++) {
      if (s > 0) dir = (dir + (rand() < 0.5 ? 1 : 7)) % 8;
      const len = 1 + Math.floor(rand() * 4);
      gx += DIRS[dir][0] * len;
      gy += DIRS[dir][1] * len;
      points.push([gx * cell, gy * cell]);
    }
    paths.push({ points, accent: rand() < accentRatio });
  }
  return paths;
}

// Ve cac duong mach + nut tron o 2 dau.
export function drawCircuit(ctx, { ink, accent, alpha = 0.2, lineWidth = 2, ...opts }) {
  const paths = circuitPaths(opts);
  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'miter';
  for (const { points, accent: hot } of paths) {
    ctx.strokeStyle = hot ? accent : ink;
    ctx.globalAlpha = hot ? Math.min(1, alpha * 4) : alpha;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    for (const [x, y] of [points[0], points[points.length - 1]]) {
      ctx.beginPath();
      ctx.arc(x, y, lineWidth * 2.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Do dai tich luy tai tung dinh cua polyline: cum[0] = 0, cum[n-1] = tong do dai.
export function measure(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    cum.push(cum[i - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  return cum;
}

// Diem va huong (vector don vi) tai quang duong `d` tren polyline, d bi kep trong [0, tong].
export function pointAt(points, cum, d) {
  const total = cum[cum.length - 1];
  const t = Math.min(Math.max(d, 0), total);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < t) i++;
  const [x0, y0] = points[i - 1];
  const [x1, y1] = points[i];
  const seg = cum[i] - cum[i - 1] || 1;
  const k = (t - cum[i - 1]) / seg;
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, dx: (x1 - x0) / seg, dy: (y1 - y0) / seg };
}

// Do mo theo ban kinh, khop voi gradient mo dan ra mep cua texture san:
// 1 trong vong `inner * R`, giam tuyen tinh ve 0 tai R.
export function radialFade(r, R, inner = 0.3) {
  return 1 - Math.min(Math.max((r / R - inner) / (1 - inner), 0), 1);
}
