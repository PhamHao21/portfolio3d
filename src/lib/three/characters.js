import { VRMUtils } from '@pixiv/three-vrm';
import { loadCharacter } from './loadCharacter.js';
import { loadPmxCharacter } from './mmd/pmxCharacter.js';
import { poseFor } from '../data/sections.js';
import { POSES } from '../data/poses.js';
import { FADE_SEC, MMD } from './constants.js';

/**
 * Nap nhan vat cua 1 muc, VRM (.glb/.vrm) hoac MMD (.pmx), tra ve cung 1 giao dien:
 * { root, setPose(name, {instant}), update(dt), dispose(), failed }.
 * `name`: 'idle' (dung cho), 'pose' (dang duoc chon), 'detail' (dang xem chi tiet).
 * VRM chi co 2 clip nen 'detail' dung lai 'pose'.
 */
export async function loadSectionCharacter(section, { anisotropy = 1, seed = 1 } = {}) {
  if (section.model.toLowerCase().endsWith('.pmx')) {
    return loadPmxCharacter({
      model: section.model,
      poses: POSES[section.char] ?? {},
      scale: MMD.scale,
      edge: MMD.edge,
      anisotropy,
      seed
    });
  }

  const c = await loadCharacter({
    model: section.model,
    clips: { idle: section.idle, pose: poseFor(section) }
  });
  c.vrm.scene.traverse((o) => {
    o.frustumCulled = false;
  });
  let current = null;
  return {
    root: c.vrm.scene,
    failed: c.failed,
    setPose(name, { instant = false } = {}) {
      if (name === 'detail') name = 'pose';
      const next = c.actions[name] ?? c.actions.idle;
      if (!next || current === name) return;
      const prev = current && c.actions[current];
      if (prev && !instant) prev.fadeOut(FADE_SEC);
      else prev?.stop();
      next.reset();
      if (!instant) next.fadeIn(FADE_SEC);
      next.play();
      current = name;
    },
    update(dt) {
      c.mixer.update(dt);
      c.vrm.update(dt);
    },
    dispose() {
      c.mixer.stopAllAction();
      c.mixer.uncacheRoot(c.vrm.scene);
      VRMUtils.deepDispose(c.vrm.scene);
    }
  };
}
