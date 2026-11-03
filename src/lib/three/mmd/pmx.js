// Doc file .pmx (model MikuMikuDance, ban 2.0 / 2.1) thanh du lieu tho.
// Thuan JS (khong dung three) de chay duoc ca trong trinh duyet, node --test va tools/.
// Toa do giu nguyen he tay trai cua MMD; doi sang tay phai o pmxMesh.js.
// Chi doc toi het rigid body (dung de biet xuong nao la toc/vay), bo qua joint/soft body.

const MAGIC = 'PMX ';

class Reader {
  constructor(buffer) {
    this.dv = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
    this.o = 0;
  }
  u8() {
    return this.dv.getUint8(this.o++);
  }
  i8() {
    return this.dv.getInt8(this.o++);
  }
  u16() {
    const v = this.dv.getUint16(this.o, true);
    this.o += 2;
    return v;
  }
  i16() {
    const v = this.dv.getInt16(this.o, true);
    this.o += 2;
    return v;
  }
  u32() {
    const v = this.dv.getUint32(this.o, true);
    this.o += 4;
    return v;
  }
  i32() {
    const v = this.dv.getInt32(this.o, true);
    this.o += 4;
    return v;
  }
  f32() {
    const v = this.dv.getFloat32(this.o, true);
    this.o += 4;
    return v;
  }
  vec(n) {
    const a = new Array(n);
    for (let i = 0; i < n; i++) a[i] = this.f32();
    return a;
  }
  skip(n) {
    this.o += n;
  }
  // Index co dau (xuong, texture, vat lieu, morph, rigid body): -1 = khong co.
  index(size) {
    if (size === 1) return this.i8();
    if (size === 2) return this.i16();
    return this.i32();
  }
  // Index dinh: 1 va 2 byte la khong dau.
  vertexIndex(size) {
    if (size === 1) return this.u8();
    if (size === 2) return this.u16();
    return this.i32();
  }
  text(decoder) {
    const len = this.u32();
    const s = decoder.decode(this.bytes.subarray(this.o, this.o + len));
    this.o += len;
    return s;
  }
}

/**
 * @param {ArrayBuffer} buffer
 */
export function parsePmx(buffer) {
  const r = new Reader(buffer);

  const magic = String.fromCharCode(r.u8(), r.u8(), r.u8(), r.u8());
  if (magic !== MAGIC) throw new Error(`Khong phai file PMX (magic "${magic}")`);
  const version = Math.round(r.f32() * 10) / 10;
  if (version !== 2 && version !== 2.1) throw new Error(`PMX ${version} chua ho tro`);

  const headerSize = r.u8();
  const head = [];
  for (let i = 0; i < headerSize; i++) head.push(r.u8());
  const [encoding, addUv, vSize, tSize, mSize, bSize, morphSize, rSize] = head;
  const decoder = new TextDecoder(encoding === 1 ? 'utf-8' : 'utf-16le');
  const text = () => r.text(decoder);

  const name = text();
  const nameEn = text();
  const comment = text();
  text(); // comment tieng Anh

  // --- Dinh ---
  const vertexCount = r.u32();
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  const edgeScale = new Float32Array(vertexCount);

  for (let v = 0; v < vertexCount; v++) {
    for (let k = 0; k < 3; k++) positions[v * 3 + k] = r.f32();
    for (let k = 0; k < 3; k++) normals[v * 3 + k] = r.f32();
    uvs[v * 2] = r.f32();
    uvs[v * 2 + 1] = r.f32();
    r.skip(addUv * 16);

    const type = r.u8();
    const si = v * 4;
    if (type === 0) {
      // BDEF1
      skinIndices[si] = Math.max(0, r.index(bSize));
      skinWeights[si] = 1;
    } else if (type === 1 || type === 3) {
      // BDEF2, SDEF (SDEF lam xap xi nhu BDEF2, bo 3 vector C/R0/R1)
      skinIndices[si] = Math.max(0, r.index(bSize));
      skinIndices[si + 1] = Math.max(0, r.index(bSize));
      const w = r.f32();
      skinWeights[si] = w;
      skinWeights[si + 1] = 1 - w;
      if (type === 3) r.skip(36);
    } else if (type === 2 || type === 4) {
      // BDEF4, QDEF
      for (let k = 0; k < 4; k++) skinIndices[si + k] = Math.max(0, r.index(bSize));
      for (let k = 0; k < 4; k++) skinWeights[si + k] = r.f32();
    } else {
      throw new Error(`Kieu skin dinh ${type} khong hop le (dinh ${v})`);
    }
    edgeScale[v] = r.f32();
  }

  // --- Mat (tam giac) ---
  const indexCount = r.u32();
  const indices = new Uint32Array(indexCount);
  for (let i = 0; i < indexCount; i++) indices[i] = r.vertexIndex(vSize);

  // --- Texture: duong dan tuong doi, thuong dung dau "\" ---
  const textures = [];
  const textureCount = r.u32();
  for (let i = 0; i < textureCount; i++) textures.push(text());

  // --- Vat lieu ---
  const materials = [];
  const materialCount = r.u32();
  for (let i = 0; i < materialCount; i++) {
    const m = {
      name: text(),
      nameEn: text(),
      diffuse: r.vec(4),
      specular: r.vec(3),
      shininess: r.f32(),
      ambient: r.vec(3),
      flag: r.u8(),
      edgeColor: r.vec(4),
      edgeSize: r.f32(),
      textureIndex: r.index(tSize),
      sphereIndex: r.index(tSize),
      // 0 tat, 1 nhan, 2 cong, 3 sub-texture
      sphereMode: r.u8()
    };
    m.toonShared = r.u8() === 1;
    // Toon dung chung: so 0-9 ung voi toon01..toon10.bmp cua MMD.
    m.toonIndex = m.toonShared ? r.u8() : r.index(tSize);
    m.memo = text();
    m.indexCount = r.u32();
    materials.push(m);
  }

  // --- Xuong ---
  const bones = [];
  const boneCount = r.u32();
  for (let i = 0; i < boneCount; i++) {
    const b = {
      name: text(),
      nameEn: text(),
      position: r.vec(3),
      parent: r.index(bSize),
      layer: r.i32(),
      flag: r.u16()
    };
    if (b.flag & 0x0001) b.tailBone = r.index(bSize);
    else b.tailOffset = r.vec(3);
    // Xuong "phu" (付与): copy goc xoay / vi tri cua xuong khac theo ti le.
    if (b.flag & 0x0300) {
      b.grant = {
        parent: r.index(bSize),
        ratio: r.f32(),
        rotation: (b.flag & 0x0100) !== 0,
        position: (b.flag & 0x0200) !== 0,
        local: (b.flag & 0x0080) !== 0
      };
    }
    if (b.flag & 0x0400) b.fixAxis = r.vec(3);
    if (b.flag & 0x0800) b.localAxes = { x: r.vec(3), z: r.vec(3) };
    if (b.flag & 0x2000) b.externalKey = r.i32();
    if (b.flag & 0x0020) {
      const ik = { target: r.index(bSize), loop: r.i32(), limit: r.f32(), links: [] };
      const linkCount = r.i32();
      for (let k = 0; k < linkCount; k++) {
        const link = { bone: r.index(bSize) };
        if (r.u8() === 1) {
          link.min = r.vec(3);
          link.max = r.vec(3);
        }
        ik.links.push(link);
      }
      b.ik = ik;
    }
    bones.push(b);
  }

  // --- Morph: giu day du morph dinh + morph nhom, cac loai khac chi doc qua ---
  const morphs = [];
  const morphCount = r.u32();
  for (let i = 0; i < morphCount; i++) {
    const m = { name: text(), nameEn: text(), panel: r.u8(), type: r.u8() };
    const n = r.i32();
    if (m.type === 1) {
      m.indices = new Uint32Array(n);
      m.offsets = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) {
        m.indices[k] = r.vertexIndex(vSize);
        for (let j = 0; j < 3; j++) m.offsets[k * 3 + j] = r.f32();
      }
    } else if (m.type === 0 || m.type === 9) {
      // nhom / flip: [morph, ti le]
      m.children = [];
      for (let k = 0; k < n; k++) m.children.push({ morph: r.index(morphSize), ratio: r.f32() });
    } else if (m.type === 2) {
      for (let k = 0; k < n; k++) (r.index(bSize), r.skip(28));
    } else if (m.type >= 3 && m.type <= 7) {
      for (let k = 0; k < n; k++) (r.vertexIndex(vSize), r.skip(16));
    } else if (m.type === 8) {
      for (let k = 0; k < n; k++) (r.index(mSize), r.skip(113));
    } else if (m.type === 10) {
      for (let k = 0; k < n; k++) (r.index(rSize), r.skip(25));
    } else {
      throw new Error(`Kieu morph ${m.type} khong hop le`);
    }
    morphs.push(m);
  }

  // --- Khung hien thi: chi doc qua ---
  const frameCount = r.u32();
  for (let i = 0; i < frameCount; i++) {
    text();
    text();
    r.u8();
    const n = r.i32();
    for (let k = 0; k < n; k++) {
      const target = r.u8();
      r.index(target === 0 ? bSize : morphSize);
    }
  }

  // --- Rigid body: mode 0 = bam theo xuong, 1/2 = vat ly (toc, vay, ruy bang...) ---
  const rigidBodies = [];
  const rigidCount = r.u32();
  for (let i = 0; i < rigidCount; i++) {
    rigidBodies.push({
      name: text(),
      nameEn: text(),
      bone: r.index(bSize),
      group: r.u8(),
      mask: r.u16(),
      shape: r.u8(),
      size: r.vec(3),
      position: r.vec(3),
      rotation: r.vec(3),
      mass: r.f32(),
      linearDamping: r.f32(),
      angularDamping: r.f32(),
      restitution: r.f32(),
      friction: r.f32(),
      mode: r.u8()
    });
  }

  return {
    version,
    name,
    nameEn,
    comment,
    vertexCount,
    positions,
    normals,
    uvs,
    skinIndices,
    skinWeights,
    edgeScale,
    indices,
    textures,
    materials,
    bones,
    morphs,
    rigidBodies
  };
}
