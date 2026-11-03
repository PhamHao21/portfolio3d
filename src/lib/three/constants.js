export const SLOT_COUNT = 4;

// Goc cua slot dang duoc chon (do). 45 = huong truoc-phai, chua cho panel ben phai.
export const FRONT_OFFSET = 45;

// Ban kinh dia chon (vong xoay o giua san).
export const DISC_RADIUS = 1.05;
// Ban kinh vong nhan vat dung, nam ngoai dia.
export const CAROUSEL_RADIUS = 2.05;
// Mat tren cua dia (than dia day nay, day dat o y = 0).
export const DISC_TOP = 0.09;

// Bu goc huong mat. Model VRM 1.0 va PMX (sau khi doi he toa do) deu huong +Z
// nen khong can bu; model VRM 0.x (mat huong -Z) se can 180.
export const CHAR_YAW_OFFSET = 0;

// Model MMD: 1 don vi ~ 8 cm. Model PMX sau khi doi he toa do cung quay mat ve +Z.
// edge: do day vien (ti le theo khoang cach camera, ~1px o tam nhin mac dinh), 0 = tat.
export const MMD = {
  scale: 0.083,
  edge: 0.0009
};

export const ROTATE_MS = 650;
export const FADE_SEC = 0.3;

export const MAX_PIXEL_RATIO = 1.5;

// Nhin tu tren xuong, lech phai de nhan vat active dung giua khoang trong ben trai panel.
export const CAMERA = {
  fov: 30,
  near: 0.1,
  far: 40,
  position: [2.0, 4.1, 7.4],
  lookAt: [0.95, 0.62, 0.3]
};

// Che do xem chi tiet: camera lai gan nhan vat dang chon, day nhan vat sang trai.
// DETAIL_MS phai khop voi --detail-ms trong +page.svelte de panel va camera chay cung nhip.
export const DETAIL_MS = 900;
export const DETAIL = {
  distance: 3.0, // khoang cach ngang camera -> nhan vat
  height: 1.35, // do cao camera
  lookHeight: 0.95, // diem nhin tren nguoi nhan vat
  // Day khung hinh sang phai theo ti le chieu ngang man hinh, de nhan vat nam o
  // khoang trong ~36% ben trai panel (panel chi tiet rong ~62vw).
  shift: 0.31,
  veilOpacity: 0.9 // do dac cua lop phu che nen sau nhan vat
};

// Bang mau dung chung cho three.js. CSS co bien tuong ung trong +page.svelte.
export const COLORS = {
  paper: '#f3f4f5',
  floor: '#e4e6e9',
  ink: '#17181b',
  inkSoft: '#3a3d44',
  line: '#9a9ea8',
  accent: '#f2d40c',
  // Dia toi de noi bat tren nen sang.
  discBody: '#1b1c21',
  discFace: '#24262c',
  discBand: '#32353d',
  discBandHover: '#4a4e5a',
  discTick: '#a3a8b3',
  veil: '#eceef0' // gan mau nen CSS o giua man hinh
};
