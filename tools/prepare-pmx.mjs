/**
 * Chuan bi 1 model PMX cho web: chep file .pmx + doi moi texture trong bang texture
 * cua no sang webp, dat ten theo so thu tu (t0.webp, t1.webp...). Loader tra texture
 * theo so thu tu nen khong phai lo ten file tieng Trung, dau "\" hay hoa/thuong.
 *
 * Dung: node tools/prepare-pmx.mjs <thu-muc-giai-nen> <id> [--size 1024] [--face 2048]
 *   -> static/models/<id>/model.pmx, static/models/<id>/t*.webp
 * File .pmx chinh = file .pmx lon nhat trong thu muc (bo qua vu khi, phu kien rieng).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { parsePmx } from '../src/lib/three/mmd/pmx.js';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const [srcDir, id] = args;
if (!srcDir || !id) {
  console.error('Dung: node tools/prepare-pmx.mjs <thu-muc-giai-nen> <id> [--size 1024] [--face 2048]');
  process.exit(1);
}
const SIZE = opt('size', 1024);
const FACE = opt('face', 2048);
// Vat lieu mat / mat: giu texture lon hon vi camera zoom sat mat o che do chi tiet.
const FACE_MAT = /颜|顔|目|face|eye/i;

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

// BMP 24/32 bit khong nen (toon, sphere cua MMD) -> RGBA cho sharp. sharp khong doc BMP.
function decodeBmp(buf) {
  if (buf.toString('latin1', 0, 2) !== 'BM') throw new Error('khong phai BMP');
  const dataOffset = buf.readUInt32LE(10);
  const width = buf.readInt32LE(18);
  const rawH = buf.readInt32LE(22);
  const bpp = buf.readUInt16LE(28);
  const comp = buf.readUInt32LE(30);
  if ((bpp !== 24 && bpp !== 32) || (comp !== 0 && comp !== 3)) {
    throw new Error(`BMP ${bpp}bit nen ${comp} chua ho tro`);
  }
  const height = Math.abs(rawH);
  const bottomUp = rawH > 0;
  const stride = Math.ceil((width * bpp) / 32) * 4;
  const px = bpp / 8;
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = dataOffset + (bottomUp ? height - 1 - y : y) * stride;
    for (let x = 0; x < width; x++) {
      const s = row + x * px;
      const d = (y * width + x) * 4;
      out[d] = buf[s + 2];
      out[d + 1] = buf[s + 1];
      out[d + 2] = buf[s];
      out[d + 3] = px === 4 ? buf[s + 3] : 255;
    }
  }
  return { data: out, width, height };
}

async function toWebp(file, outFile, maxSize) {
  const buf = await fs.readFile(file);
  let img;
  if (path.extname(file).toLowerCase() === '.bmp') {
    const { data, width, height } = decodeBmp(buf);
    img = sharp(data, { raw: { width, height, channels: 4 } });
  } else {
    img = sharp(buf);
  }
  const meta = await img.metadata();
  const small = (meta.width ?? 0) <= 64; // toon: giu nguyen, nen khong mat du lieu
  await img
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .webp(small ? { lossless: true } : { quality: 88, alphaQuality: 100, effort: 5 })
    .toFile(outFile);
  return meta;
}

const files = await walk(srcDir);
const pmxFiles = files.filter((f) => f.toLowerCase().endsWith('.pmx'));
if (!pmxFiles.length) throw new Error(`Khong co file .pmx trong ${srcDir}`);
const sizes = await Promise.all(pmxFiles.map(async (f) => (await fs.stat(f)).size));
const main = pmxFiles[sizes.indexOf(Math.max(...sizes))];

const raw = await fs.readFile(main);
const pmx = parsePmx(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));

// Tim file khong phan biet hoa/thuong va dau "\" (PMX lam tren Windows).
const byKey = new Map(files.map((f) => [path.relative(srcDir, f).replace(/\\/g, '/').toLowerCase(), f]));
const faceTex = new Set(pmx.materials.filter((m) => FACE_MAT.test(m.name)).map((m) => m.textureIndex));

const outDir = path.join('static', 'models', id);
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });
await fs.copyFile(main, path.join(outDir, 'model.pmx'));

console.log(`\n${pmx.name} <- ${path.basename(main)}`);
let total = raw.length;
for (let i = 0; i < pmx.textures.length; i++) {
  const ref = pmx.textures[i];
  const src = byKey.get(ref.replace(/\\/g, '/').toLowerCase());
  if (!src) {
    console.warn(`  t${i}: THIEU ${ref}`);
    continue;
  }
  const out = path.join(outDir, `t${i}.webp`);
  const meta = await toWebp(src, out, faceTex.has(i) ? FACE : SIZE);
  const kb = (await fs.stat(out)).size;
  total += kb;
  console.log(`  t${i}: ${ref} ${meta.width}px -> ${Math.round(kb / 1024)} KB`);
}
console.log(`  tong: ${(total / 1024 / 1024).toFixed(2)} MB`);
