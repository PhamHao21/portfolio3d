import * as THREE from 'three';

// Vat lieu toon kieu MMD: mau = texture x mau vat lieu, +/x sphere map, x toon theo goc anh sang.
// Viet bang ShaderMaterial (thay vi MeshToonMaterial) de mau giong game, khong bi
// den/hemisphere cua san khau lam chay sang; anh sang co dinh theo huong LIGHT_DIR.

// Huong anh sang (the gioi): truoc-tren-phai, nhan vat luon quay ve camera nen
// mat luon duoc chieu sang.
const LIGHT_DIR = new THREE.Vector3(0.35, 0.75, 0.55).normalize();

const vertex = /* glsl */ `
#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

varying vec2 vTex;
varying vec3 vNormalW;
varying vec3 vNormalV;

void main() {
  vTex = uv;
  #include <morphinstance_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vNormalV = normalize(transformedNormal);
  vNormalW = normalize(mat3(modelMatrix) * objectNormal);
}
`;

const fragment = /* glsl */ `
uniform vec4 diffuse;
uniform sampler2D map;
uniform sampler2D sphere;
uniform sampler2D toon;
uniform vec3 lightDir;

varying vec2 vTex;
varying vec3 vNormalW;
varying vec3 vNormalV;

void main() {
  vec4 c = diffuse;
  #ifdef USE_TEX
    c *= texture2D(map, vTex);
  #endif
  if (c.a < 0.004) discard;

  vec3 n = normalize(vNormalW);
  vec3 nv = normalize(vNormalV);
  if (!gl_FrontFacing) {
    n = -n;
    nv = -nv;
  }

  #ifdef USE_SPHERE
    vec3 s = texture2D(sphere, nv.xy * 0.5 + 0.5).rgb;
    #if SPHERE_MODE == 1
      c.rgb *= s;
    #else
      c.rgb += s;
    #endif
  #endif

  #ifdef USE_TOON
    // Toon MMD: hang tren cung = phan sang, duoi cung = phan toi.
    float l = clamp(0.5 + 0.5 * dot(n, lightDir), 0.02, 0.98);
    c.rgb *= texture2D(toon, vec2(0.5, l)).rgb;
  #endif

  gl_FragColor = c;
  #include <colorspace_fragment>
}
`;

// Vien (inverted hull): day mat theo phap tuyen, do day khong doi tren man hinh.
const edgeVertex = /* glsl */ `
#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

attribute float edgeScale;
uniform float width;

void main() {
  #include <morphinstance_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  float dist = -(modelViewMatrix * vec4(transformed, 1.0)).z;
  transformed += normalize(objectNormal) * width * edgeScale * dist;
  #include <project_vertex>
}
`;

const edgeFragment = /* glsl */ `
uniform vec4 color;
void main() {
  gl_FragColor = color;
  #include <colorspace_fragment>
}
`;

const srgb = (rgb) => new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);

// Toon mac dinh cua MMD (toon01..toon10.bmp) khong di kem model: tao gradient 1x2 thay the.
let sharedToon;
function defaultToon() {
  if (!sharedToon) {
    // Hang duoi (v=0) = phan toi, hang tren = phan sang.
    const data = new Uint8Array([214, 208, 218, 255, 255, 255, 255, 255]);
    sharedToon = new THREE.DataTexture(data, 1, 2);
    sharedToon.colorSpace = THREE.SRGBColorSpace;
    sharedToon.magFilter = THREE.LinearFilter;
    sharedToon.needsUpdate = true;
  }
  return sharedToon;
}

/**
 * @param {object} m vat lieu tu parsePmx
 * @param {(index: number) => THREE.Texture | null} tex lay texture theo so thu tu
 */
export function createMmdMaterial(m, tex) {
  const defines = {};
  const map = m.textureIndex >= 0 ? tex(m.textureIndex) : null;
  const sphere = m.sphereMode === 1 || m.sphereMode === 2 ? tex(m.sphereIndex) : null;
  const toon = m.toonShared ? defaultToon() : m.toonIndex >= 0 ? tex(m.toonIndex) : null;
  if (map) defines.USE_TEX = '';
  if (sphere) {
    defines.USE_SPHERE = '';
    defines.SPHERE_MODE = m.sphereMode;
  }
  if (toon) defines.USE_TOON = '';

  const c = srgb(m.diffuse);
  const mat = new THREE.ShaderMaterial({
    name: m.name,
    defines,
    uniforms: {
      diffuse: { value: new THREE.Vector4(c.r, c.g, c.b, m.diffuse[3]) },
      map: { value: map },
      sphere: { value: sphere },
      toon: { value: toon },
      lightDir: { value: LIGHT_DIR }
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    // MMD ve moi vat lieu theo dung thu tu trong file, co tron alpha va ghi depth.
    transparent: true,
    side: m.flag & 1 ? THREE.DoubleSide : THREE.FrontSide
  });
  return mat;
}

// Vat lieu vien cho 1 vat lieu MMD; vat lieu khong bat vien -> material an (khong ve).
let hidden;
export function createEdgeMaterial(m, width) {
  if (!(m.flag & 0x10) || m.edgeSize <= 0 || m.edgeColor[3] <= 0) {
    hidden ??= Object.assign(new THREE.MeshBasicMaterial(), { visible: false });
    return hidden;
  }
  const c = srgb(m.edgeColor);
  return new THREE.ShaderMaterial({
    name: `${m.name}:edge`,
    uniforms: {
      color: { value: new THREE.Vector4(c.r, c.g, c.b, 1) },
      width: { value: width * m.edgeSize }
    },
    vertexShader: edgeVertex,
    fragmentShader: edgeFragment,
    side: THREE.BackSide
  });
}

export function disposeShared() {
  sharedToon?.dispose();
  sharedToon = undefined;
  hidden?.dispose();
  hidden = undefined;
}
