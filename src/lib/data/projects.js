// Noi dung muc Projects. Them du an moi vao PROJECTS, o trong con lai hien "dang cap nhat".

export const PROJECT_SLOTS = 3;

export const PROJECTS = [
  {
    code: 'P-01',
    name: 'Persona 3 Portfolio',
    cover: 'P3', // chu lon tren anh bia (chua co anh chup)
    status: 'Đang phát triển',
    started: '2026-05',
    summary: 'Portfolio cá nhân mô phỏng hệ thống menu của game Persona 3 Reload.',
    description:
      'Website portfolio lấy cảm hứng từ hệ thống menu đầy phong cách của Persona 3 Reload, dựng bằng Svelte 5 và SvelteKit. Phần menu chính và hệ thống chuyển cảnh đã hoàn thiện, các trang nội dung đang được phát triển.',
    features: [
      'Giao diện và trải nghiệm theo phong cách Persona 3 Reload',
      'Chuyển menu mượt, tương tác có hoạt ảnh',
      'Hiệu ứng chuyển cảnh bằng SVG mask',
      'Bố cục responsive cho desktop và thiết bị hiện đại',
      'Cấu trúc component tách module'
    ],
    stack: ['Svelte 5', 'SvelteKit', 'Vite', 'Vitest', 'Playwright', 'CSS'],
    links: [{ label: 'GitHub', href: 'https://github.com/PhamHao21/persona3-portfolio' }]
  }
];
