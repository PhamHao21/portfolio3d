import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { shrink } from '../tools/shrink-vrm.mjs';

const MAGIC = 0x46546c67;

// Tao 1 file GLB gia: 1 anh 2048 co alpha + 1 khoi du lieu mesh gia,
// kem day du extension VRM de kiem tra chung co song sot khong.
async function makeFakeVrm(extraExtensions = []) {
  const png = await sharp({
    create: { width: 2048, height: 2048, channels: 4, background: { r: 200, g: 120, b: 90, alpha: 1 } }
  })
    .png()
    .toBuffer();

  const mesh = Buffer.alloc(1024);
  for (let i = 0; i < mesh.length; i++) mesh[i] = i % 251;

  const bin = Buffer.concat([png, Buffer.alloc((4 - (png.length % 4)) % 4), mesh]);
  const meshOffset = png.length + ((4 - (png.length % 4)) % 4);

  const json = {
    asset: { version: '2.0' },
    extensionsUsed: ['VRMC_vrm', 'VRMC_materials_mtoon', 'VRMC_springBone', ...extraExtensions],
    extensions: {
      VRMC_vrm: { specVersion: '1.0', humanoid: { humanBones: { hips: { node: 0 } } }, meta: { name: 'Test' } },
      VRMC_springBone: { specVersion: '1.0', springs: [{ joints: [{ node: 0 }] }] }
    },
    images: [{ name: 'body', bufferView: 0, mimeType: 'image/png' }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: png.length },
      { buffer: 0, byteOffset: meshOffset, byteLength: mesh.length }
    ],
    accessors: [{ bufferView: 1, componentType: 5126, count: 64, type: 'VEC4' }],
    buffers: [{ byteLength: bin.length }],
    nodes: [{ name: 'J_Bip_C_Hips' }],
    meshes: [],
    materials: [{ extensions: { VRMC_materials_mtoon: { specVersion: '1.0' } } }]
  };

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
  out.writeUInt32LE(0x4e4f534a, p + 4);
  jsonBuf.copy(out, p + 8);
  out.fill(0x20, p + 8 + jsonBuf.length, p + 8 + jsonBuf.length + jsonPad);
  p += 8 + jsonBuf.length + jsonPad;
  out.writeUInt32LE(bin.length + binPad, p);
  out.writeUInt32LE(0x004e4942, p + 4);
  bin.copy(out, p + 8);

  return { glb: out, mesh, png };
}

function readJson(glb) {
  const len = glb.readUInt32LE(12);
  return JSON.parse(glb.subarray(20, 20 + len).toString('utf8'));
}

function readBin(glb) {
  const jlen = glb.readUInt32LE(12);
  const p = 12 + 8 + jlen;
  const blen = glb.readUInt32LE(p);
  return glb.subarray(p + 8, p + 8 + blen);
}

test('giu nguyen toan bo extension VRM', async () => {
  const { glb } = await makeFakeVrm();
  const { buffer } = await shrink(glb, { size: 1024 });
  const json = readJson(buffer);

  assert.ok(json.extensionsUsed.includes('VRMC_vrm'));
  assert.ok(json.extensionsUsed.includes('VRMC_materials_mtoon'));
  assert.ok(json.extensionsUsed.includes('VRMC_springBone'));
  assert.equal(json.extensions.VRMC_vrm.humanoid.humanBones.hips.node, 0);
  assert.equal(json.extensions.VRMC_vrm.meta.name, 'Test');
  assert.ok(json.materials[0].extensions.VRMC_materials_mtoon);
  assert.equal(json.nodes[0].name, 'J_Bip_C_Hips');
});

test('anh nho lai, dung 1024px', async () => {
  const { glb, png } = await makeFakeVrm();
  const { buffer } = await shrink(glb, { size: 1024 });
  const json = readJson(buffer);
  const bin = readBin(buffer);

  const bv = json.bufferViews[0];
  const img = bin.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength);
  const meta = await sharp(img).metadata();

  assert.equal(meta.width, 1024);
  assert.equal(meta.height, 1024);
  assert.ok(img.length < png.length, 'anh moi phai nho hon anh cu');
});

test('du lieu mesh khong bi sua 1 byte nao', async () => {
  const { glb, mesh } = await makeFakeVrm();
  const { buffer } = await shrink(glb, { size: 1024 });
  const json = readJson(buffer);
  const bin = readBin(buffer);

  const bv = json.bufferViews[1];
  const got = bin.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength);
  assert.equal(got.length, mesh.length);
  assert.ok(got.equals(mesh), 'du lieu mesh bi thay doi');
});

test('offset thang hang 4 byte va nam trong buffer', async () => {
  const { glb } = await makeFakeVrm();
  const { buffer } = await shrink(glb, { size: 1024 });
  const json = readJson(buffer);
  const bin = readBin(buffer);

  for (const bv of json.bufferViews) {
    assert.equal(bv.byteOffset % 4, 0, 'byteOffset phai chia het 4');
    assert.ok(bv.byteOffset + bv.byteLength <= bin.length, 'bufferView tran ra ngoai buffer');
  }
  assert.equal(json.buffers[0].byteLength, bin.length);
});

test('tu choi file da nen meshopt', async () => {
  const { glb } = await makeFakeVrm(['EXT_meshopt_compression']);
  await assert.rejects(() => shrink(glb, { size: 1024 }), /meshopt/);
});
