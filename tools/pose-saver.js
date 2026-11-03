// Plugin Vite chi chay khi dev: trang /pose gui POST /__poses de ghi src/lib/data/poses.js.
// Khong co trong ban build (apply: 'serve').
import fs from 'node:fs/promises';
import path from 'node:path';

const FILE = path.resolve('src/lib/data/poses.js');
const HEADER = `// Dang dung cua nhan vat MMD, theo \`char\` trong sections.js.
// File nay duoc trang /pose (chi chay khi dev) ghi lai khi bam Luu.
// rot: goc xoay xuong (do, Euler XYZ), move: dich xuong (met), face: morph bieu cam (0..1).
`;

const isVec = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n));

// Chi nhan dung cau truc { char: { slot: { rot, move, face } } } voi gia tri so.
function validate(poses) {
  if (!poses || typeof poses !== 'object') throw new Error('du lieu khong phai object');
  for (const slots of Object.values(poses)) {
    for (const p of Object.values(slots)) {
      for (const v of Object.values(p.rot ?? {})) if (!isVec(v)) throw new Error('rot sai');
      for (const v of Object.values(p.move ?? {})) if (!isVec(v)) throw new Error('move sai');
      for (const v of Object.values(p.face ?? {})) if (!Number.isFinite(v)) throw new Error('face sai');
    }
  }
}

// JSON 2 khoang trang, mang so nam tren 1 dong.
export function formatPoses(poses) {
  const json = JSON.stringify(poses, null, 2).replace(/\[\s+([-\d.e,\s]+?)\s+\]/g, (_, nums) =>
    `[${nums.split(',').map((s) => s.trim()).join(', ')}]`
  );
  return `${HEADER}export const POSES = ${json};\n`;
}

export function poseSaver() {
  return {
    name: 'pose-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__poses', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        try {
          let body = '';
          for await (const chunk of req) body += chunk;
          const poses = JSON.parse(body);
          validate(poses);
          await fs.writeFile(FILE, formatPoses(poses), 'utf8');
          res.end('ok');
        } catch (err) {
          res.statusCode = 400;
          res.end(String(err.message ?? err));
        }
      });
    }
  };
}
