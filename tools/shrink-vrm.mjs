/**
 * Thu nho texture ben trong file .vrm ma KHONG dung vao cau truc glTF.
 * Chi thay noi dung anh + cap nhat offset bufferView. Moi extension VRM giu nguyen.
 *
 * Dung: node tools/shrink-vrm.mjs <input.vrm> <output.vrm> [size] [--no-palette]
 */
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const MAGIC = 0x46546c67; // 'glTF'
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function parseGlb(buf) {
  if (buf.readUInt32LE(0) !== MAGIC) throw new Error('Khong phai file GLB/VRM hop le');
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < buf.length) {
    const len = buf.readUInt32LE(offset);
    const type = buf.readUInt32LE(offset + 4);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString('utf8'));
    else if (type === BIN_CHUNK) bin = Buffer.from(data);
    offset += 8 + len + ((4 - ((8 + len) % 4)) % 4);
  }
  if (!json || !bin) throw new Error('Thieu chunk JSON hoac BIN');
  return { json, bin };
}

function buildGlb(json, bin) {
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + jsonBuf.length + jsonPad + 8 + bin.length + binPad;

  const out = Buffer.alloc(total);
  out.writeUInt32LE(MAGIC, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);

  let p = 12;
  out.writeUInt32LE(jsonBuf.length + jsonPad, p);
  out.writeUInt32LE(JSON_CHUNK, p + 4);
  jsonBuf.copy(out, p + 8);
  out.fill(0x20, p + 8 + jsonBuf.length, p + 8 + jsonBuf.length + jsonPad);
  p += 8 + jsonBuf.length + jsonPad;

  out.writeUInt32LE(bin.length + binPad, p);
  out.writeUInt32LE(BIN_CHUNK, p + 4);
  bin.copy(out, p + 8);
  return out;
}

export async function shrink(inputBuf, { size = 1024, palette = true } = {}) {
  const { json, bin } = parseGlb(inputBuf);

  const meshopt = (json.extensionsUsed ?? []).includes('EXT_meshopt_compression');
  if (meshopt) {
    throw new Error('File da nen meshopt. Hay chay script nay tren file .vrm goc.');
  }

  const images = json.images ?? [];
  const replaced = new Map(); // bufferView index -> Buffer moi
  const report = [];

  for (const img of images) {
    if (img.bufferView === undefined) continue;
    const bv = json.bufferViews[img.bufferView];
    const src = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);

    const meta = await sharp(src).metadata();
    let pipe = sharp(src);
    if (Math.max(meta.width, meta.height) > size) {
      pipe = pipe.resize(size, size, { fit: 'inside', withoutEnlargement: true });
    }
    const out =
      meta.format === 'jpeg' && !meta.hasAlpha
        ? await pipe.jpeg({ quality: 85 }).toBuffer()
        : await pipe.png({ palette, quality: 85, compressionLevel: 9, effort: 8 }).toBuffer();

    if (out.length < src.length) {
      replaced.set(img.bufferView, out);
      report.push({
        name: img.name ?? `image${report.length}`,
        from: `${meta.width}x${meta.height} ${(src.length / 1024).toFixed(0)}KB`,
        to: `${Math.min(size, meta.width)}px ${(out.length / 1024).toFixed(0)}KB`
      });
    }
  }

  // Dung lai BIN: giu nguyen thu tu bufferView, chi doi noi dung anh.
  const order = json.bufferViews.map((bv, i) => ({ i, bv })).sort(
    (a, b) => (a.bv.byteOffset ?? 0) - (b.bv.byteOffset ?? 0)
  );
  const parts = [];
  let cursor = 0;
  for (const { i, bv } of order) {
    const data = replaced.get(i) ?? bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    const pad = (4 - (cursor % 4)) % 4;
    if (pad) {
      parts.push(Buffer.alloc(pad));
      cursor += pad;
    }
    bv.byteOffset = cursor;
    bv.byteLength = data.length;
    parts.push(data);
    cursor += data.length;
  }

  const newBin = Buffer.concat(parts);
  json.buffers[0].byteLength = newBin.length;
  return { buffer: buildGlb(json, newBin), report };
}

// Windows dung dau \ nen phai doi sang URL moi so sanh duoc.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output, sizeArg] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Dung: node tools/shrink-vrm.mjs <input.vrm> <output.vrm> [size]');
    process.exit(1);
  }
  const size = Number(sizeArg) || 1024;
  const palette = !process.argv.includes('--no-palette');
  const src = await fs.readFile(input);
  const { buffer, report } = await shrink(src, { size, palette });
  await fs.writeFile(output, buffer);
  console.table(report);
  console.log(
    `${input}: ${(src.length / 1048576).toFixed(2)} MB -> ${output}: ${(buffer.length / 1048576).toFixed(2)} MB`
  );
}