// The choices the editor offers: export sizes, panel layouts, colour grades
// and caption lettering styles. Layouts are fractions of the cover (x, y, w, h),
// so one layout works for every export size.

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape 1920 × 1080' },
};

export const LAYOUTS = {
  'hero-left': {
    name: 'Hero Left',
    panels: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 0.5],
      [0.62, 0.5, 0.38, 0.5],
    ],
  },
  'hero-right': {
    name: 'Hero Right',
    panels: [
      [0, 0, 0.38, 0.5],
      [0, 0.5, 0.38, 0.5],
      [0.38, 0, 0.62, 1],
    ],
  },
  triptych: {
    name: 'Triptych',
    panels: [
      [0, 0, 1 / 3, 1],
      [1 / 3, 0, 1 / 3, 1],
      [2 / 3, 0, 1 / 3, 1],
    ],
  },
  'top-hero': {
    name: 'Top Hero',
    panels: [
      [0, 0, 1, 0.6],
      [0, 0.6, 0.5, 0.4],
      [0.5, 0.6, 0.5, 0.4],
    ],
  },
  grid: {
    name: 'Four Grid',
    panels: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
  cinema: {
    name: 'Cinema Strip',
    panels: [
      [0, 0, 1, 0.55],
      [0, 0.55, 1 / 3, 0.45],
      [1 / 3, 0.55, 1 / 3, 0.45],
      [2 / 3, 0.55, 1 / 3, 0.45],
    ],
  },
};

/**
 * A grade is a photo filter plus a top-to-bottom tint and the colours of the
 * synthwave sun. All of it is drawn with canvas, never with an outside image.
 */
export const GRADES = {
  'neon-sunset': {
    name: 'Neon Sunset',
    filter: 'saturate(1.3) contrast(1.08)',
    top: 'rgba(255, 120, 60, 0.08)',
    bottom: 'rgba(255, 41, 117, 0.34)',
    sun: ['#ffe259', '#ff7e5f', '#ff2975'],
  },
  'vice-nights': {
    name: 'Vice Nights',
    filter: 'saturate(1.15) contrast(1.12) brightness(0.96)',
    top: 'rgba(80, 40, 255, 0.16)',
    bottom: 'rgba(0, 210, 200, 0.22)',
    sun: ['#7ef9ff', '#b06bff', '#ff2975'],
  },
  'palm-noir': {
    name: 'Palm Noir',
    filter: 'saturate(0.55) contrast(1.18) brightness(0.94)',
    top: 'rgba(20, 8, 40, 0.18)',
    bottom: 'rgba(60, 10, 70, 0.30)',
    sun: ['#f5f0ff', '#c9b8ff', '#7a4dff'],
  },
  'hot-pink': {
    name: 'Hot Pink',
    filter: 'saturate(1.5) contrast(1.05)',
    top: 'rgba(255, 80, 180, 0.14)',
    bottom: 'rgba(190, 10, 120, 0.38)',
    sun: ['#fff3a3', '#ff9de2', '#ff2e88'],
  },
  'golden-hour': {
    name: 'Golden Hour',
    filter: 'saturate(1.2) contrast(1.04) brightness(1.03)',
    top: 'rgba(255, 190, 80, 0.12)',
    bottom: 'rgba(255, 110, 30, 0.30)',
    sun: ['#fff7c0', '#ffc46b', '#ff7b2f'],
  },
};

export const LETTERINGS = {
  block: { name: 'Block' },
  neon: { name: 'Neon Glow' },
  script: { name: 'Script Mix' },
};
