// Nguon du lieu duy nhat cho 4 muc. Doi thu tu / doi model chi sua o day.

// Thong tin chu nhan portfolio. `ringText`: cac cum chu chay vong quanh dia chon,
// giua cac cum co dau hinh thoi.
export const PROFILE = {
  // Ten + dong mo ta o goc tren trai.
  brand: 'Thorwen',
  tagline: 'Fullstack developer',
  ringText: ['PHAM GIA HAO', 'THORWEN', '2004', 'DEVELOPER']
};

const BASE = [
  { id: 'about', label: 'About' },
  { id: 'tech', label: 'Tech' },
  { id: 'project', label: 'Projects' },
  { id: 'work', label: 'Work' }
];

// Bo nhan vat dang dung:
// - 'mmd'  : 4 model PMX. Giay phep cam phan phoi lai -> chi chay tren may, khong deploy.
// - 'vroid': 4 nhan vat VRoid tu lam (VRM), dung cho ban dua len mang.
export const CAST = 'mmd';

const CASTS = {
  // `char`: khoa tra dang trong poses.js. Model tao bang tools/prepare-pmx.mjs.
  mmd: [
    { char: 'piper', name: 'Piper Wheel', model: '/models/piper/model.pmx' },
    { char: 'mana', name: 'Nekomiya Mana', model: '/models/mana/model.pmx' },
    { char: 'sunna', name: 'Sunna', model: '/models/sunna/model.pmx' },
    { char: 'dialyn', name: 'Dialyn', model: '/models/dialyn/model.pmx' }
  ],
  vroid: [
    { model: '/models/character1.glb', idle: '/anim/idle_1.fbx', seat: false, seatVisible: false },
    { model: '/models/character4.glb', idle: '/anim/idle_3.fbx', seat: true, seatVisible: false },
    { model: '/models/character3.glb', idle: '/anim/idle_4.fbx', seat: false, seatVisible: false },
    { model: '/models/character2.glb', idle: '/anim/idle_2.fbx', seat: true, seatVisible: false }
  ]
};

export const SECTIONS = BASE.map((b, i) => ({ ...b, ...CASTS[CAST][i] }));

// Pose VRM khi duoc chon. Hien tai dung chung 1 file cho ca 4.
// Sau nay co pose ngoi rieng thi doi POSE_SIT va bat seatVisible.
export const POSE_STAND = '/anim/pose_select.fbx';
export const POSE_SIT = '/anim/pose_select.fbx';

export function poseFor(section) {
  return section.seat ? POSE_SIT : POSE_STAND;
}
