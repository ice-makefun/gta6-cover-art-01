// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows the cover alone, ready for its Export
// buttons. Query params: layout, grade, size (WxH), title, script, kicker,
// photos (comma list of sample names), lettering. window.__shotReady is set
// once the scene is painted.
import { LAYOUTS, freshPanels } from './state.js';

export async function runShot(shot, query, apply) {
  const layout = query.get('layout') ?? 'sunset-hero';
  const grade = query.get('grade') ?? 'neon-sunset';
  const size = (query.get('size') ?? '1080x1080').split('x').map(Number);
  const names = (query.get('photos') ?? 'boulevard,pier').split(',').filter(Boolean);
  const photos = [];
  for (const name of names) {
    const src = `samples/${name}.jpg`;
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });
    photos.push({ src, img });
  }
  const layoutDef = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[0];
  const state = {
    layout,
    grade,
    kicker: query.get('kicker') ?? 'WELCOME TO THE',
    title: query.get('title') ?? 'NEON COAST',
    script: query.get('script') ?? 'sunset heist',
    lettering: query.get('lettering') ?? 'block',
    effects: { sun: true, halftone: true, grain: true, vignette: true, badge: true },
    selectedPanel: 0,
    panels: freshPanels(layout, photos.length),
    photos,
  };
  // Spread the photos across the panels in order, so every panel shows a photo.
  state.panels = state.panels.map((slot, i) => ({ ...slot, photo: i % photos.length }));
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await apply(state, { width: size[0], height: size[1] });
  document.title = `Neon Coast — ${state.title}`;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
