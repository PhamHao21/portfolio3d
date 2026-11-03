// Noi dung muc Tech. `kind` mo ta ban chat cong nghe, khong phai muc do thanh thao.

export const TECH_GROUPS = [
  {
    id: 'frontend',
    label: 'Frontend',
    desc: 'Giao diện và trải nghiệm web.',
    items: [
      { name: 'Svelte', kind: 'UI framework' },
      { name: 'TypeScript', kind: 'Ngôn ngữ' },
      { name: 'JavaScript', kind: 'Ngôn ngữ' },
      { name: 'HTML', kind: 'Markup' },
      { name: 'CSS', kind: 'Styling' },
      { name: 'Tailwind CSS', kind: 'Styling' }
    ]
  },
  {
    id: 'data',
    label: 'Data',
    desc: 'Lưu trữ, mô hình hoá và truy vấn dữ liệu.',
    items: [
      { name: 'PostgreSQL', kind: 'CSDL quan hệ' },
      { name: 'MongoDB', kind: 'CSDL NoSQL' },
      { name: 'Firebase', kind: 'BaaS / Realtime' }
    ]
  },
  {
    id: 'infra',
    label: 'Infra',
    desc: 'Đóng gói và triển khai ứng dụng.',
    items: [{ name: 'Docker', kind: 'Container' }]
  }
];

// Cong nghe dung de dung chinh portfolio nay.
export const THIS_SITE = ['SvelteKit', 'Svelte 5', 'three.js', 'three-vrm', 'Vite'];
