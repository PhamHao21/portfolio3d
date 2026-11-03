import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadPmxCharacter } from './mmd/pmxCharacter.js';
import { disposeShared as disposeMmdShared } from './mmd/material.js';
import { COLORS, MAX_PIXEL_RATIO, MMD } from './constants.js';

/**
 * San khau cho trang chinh dang (/pose, chi dung khi dev): 1 nhan vat MMD,
 * camera xoay quanh bang chuot, diem vang danh dau xuong dang chinh.
 *
 * @param {HTMLCanvasElement} canvas
 */
export function createPoseStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.paper);
  const grid = new THREE.GridHelper(4, 16, 0x9a9ea8, 0xd5d8dd);
  scene.add(grid);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  camera.position.set(0, 1.1, 4.2);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.85, 0);
  controls.enableDamping = true;
  controls.update();

  // Diem danh dau xuong: ve de len tren moi thu.
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 12, 8),
    new THREE.MeshBasicMaterial({ color: COLORS.accent, depthTest: false })
  );
  marker.renderOrder = 10;
  marker.visible = false;
  scene.add(marker);
  let markIndex = -1;

  let char = null;
  let loading = 0;

  async function load(section, poses) {
    const token = ++loading;
    const next = await loadPmxCharacter({
      model: section.model,
      poses,
      scale: MMD.scale,
      edge: MMD.edge,
      morphs: 'all',
      anisotropy: 4
    });
    if (token !== loading || disposed) {
      next.dispose();
      return null;
    }
    if (char) {
      scene.remove(char.root);
      char.dispose();
    }
    char = next;
    char.rig.setLive(false);
    scene.add(char.root);
    markIndex = -1;
    marker.visible = false;
    return {
      boneNames: char.rig.boneNames,
      morphNames: char.rig.morphNames,
      failed: char.failed
    };
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const timer = new THREE.Timer();
  let raf;
  let disposed = false;
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    timer.update(ts);
    const dt = Math.min(timer.getDelta(), 0.1);
    controls.update();
    if (char) {
      char.update(dt);
      if (markIndex >= 0) {
        char.root.updateMatrixWorld(true);
        char.rig.mesh.skeleton.bones[markIndex].getWorldPosition(marker.position);
      }
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  return {
    load,
    setSlot(slot, data) {
      char?.rig.setPoseData(slot, data);
    },
    show(slot, instant = false) {
      char?.setPose(slot, { instant, duration: 0.6 });
    },
    setLive(on) {
      char?.rig.setLive(on);
    },
    mark(name) {
      markIndex = char ? char.rig.boneNames.indexOf(name) : -1;
      marker.visible = markIndex >= 0;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      if (char) char.dispose();
      marker.geometry.dispose();
      marker.material.dispose();
      grid.geometry.dispose();
      grid.material.dispose();
      disposeMmdShared();
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
}
