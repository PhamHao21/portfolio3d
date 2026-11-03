import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { retargetAnimation } from 'vrm-mixamo-retarget';

const gltfLoader = new GLTFLoader();
// BAT BUOC: file .glb da nen bang meshopt, thieu decoder nay se khong load duoc.
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));

const fbxLoader = new FBXLoader();
const fbxCache = new Map();

function loadFbx(url) {
  if (!fbxCache.has(url)) fbxCache.set(url, fbxLoader.loadAsync(url));
  return fbxCache.get(url);
}

/**
 * Load 1 VRM + cac clip animation da retarget san.
 * @param {{model: string, clips: Record<string,string>}} spec
 * @param {(ratio:number)=>void} [onProgress]
 */
export async function loadCharacter(spec, onProgress) {
  const gltf = await gltfLoader.loadAsync(spec.model, (e) => {
    if (onProgress && e.total) onProgress(e.loaded / e.total);
  });

  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error(`Khong tim thay du lieu VRM trong ${spec.model}`);

  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  vrm.scene.traverse((o) => {
    o.frustumCulled = false;
  });

  const mixer = new THREE.AnimationMixer(vrm.scene);
  const actions = {};
  const failed = [];

  for (const [name, url] of Object.entries(spec.clips)) {
    try {
      const cached = await loadFbx(url);
      // retargetAnimation ghi de track.values tai cho -> FBX dung chung (vd pose_select)
      // se bi bien doi chong nhieu lan. Clone clip cho moi lan retarget.
      const asset = Object.create(cached);
      asset.animations = cached.animations.map((c) => c.clone());
      const clip = retargetAnimation(asset, vrm);
      if (!clip) {
        failed.push(`${name}: retarget tra ve null`);
        continue;
      }
      clip.name = name;
      actions[name] = mixer.clipAction(clip);
    } catch (err) {
      failed.push(`${name}: ${err.message}`);
    }
  }

  return { vrm, mixer, actions, failed };
}
