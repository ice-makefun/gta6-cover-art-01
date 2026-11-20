// Editor wiring for Neon Coast Cover Studio: uploads, panel picking,
// drag-to-pan and wheel zoom on the preview, sliders, undo/redo, export.
// State lives in main.js; this module owns the DOM and calls back into it.

import { LAYOUTS } from './state.js';
import { GRADES } from './grades.js';
import { layoutRects, renderCover, renderToCanvas } from './render.js';

export const SIZES = [
  { id: '1080x1080', w: 1080, h: 1080 },
  { id: '1080x1350', w: 1080, h: 1350 },
  { id: '1920x1080', w: 1920, h: 1080 },
];

const $ = (id) => document.getElementById(id);

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${src}`));
    img.src = src;
  });
}

export function buildEditor({ state, canvas, onChange, onHistory, onUndoRedo, status }) {
  const ctx = canvas.getContext('2d');

  function draw() {
    renderCover(ctx, canvas.width, canvas.height, state);
  }

  function setStatus(text) {
    status.textContent = text;
  }

  // ---- pickers -----------------------------------------------------------
  const layoutPick = $('layout-pick');
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = layout.id;
    b.innerHTML = `${layout.name}<small>${layout.blurb}</small>`;
    b.addEventListener('click', () => {
      onHistory();
      state.layout = layout.id;
      state.panels = state.panels.slice(0, layout.panels.length);
      while (state.panels.length < layout.panels.length) {
        state.panels.push({ photo: state.photos.length > 0 ? state.panels.length % state.photos.length : -1, zoom: 1.15, ox: 0, oy: 0 });
      }
      state.selectedPanel = 0;
      syncPickers();
      syncSliders();
      onChange();
    });
    layoutPick.appendChild(b);
  }
  const gradePick = $('grade-pick');
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = grade.id;
    b.innerHTML = `${grade.name}<small>${grade.blurb}</small>`;
    b.addEventListener('click', () => {
      onHistory();
      state.grade = grade.id;
      syncPickers();
      onChange();
    });
    gradePick.appendChild(b);
  }

  function syncPickers() {
    layoutPick.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
    gradePick.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  }

  // ---- photo strip ---------------------------------------------------------
  function syncStrip() {
    const strip = $('photo-strip');
    strip.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = `Photo ${i + 1}`;
      img.classList.toggle('used', state.panels.some((p) => p.photo === i));
      img.addEventListener('click', () => {
        onHistory();
        state.panels[state.selectedPanel].photo = i;
        syncStrip();
        onChange();
      });
      strip.appendChild(img);
    });
  }

  function syncPanelLabel() {
    $('panel-label').textContent = `Panel ${state.selectedPanel + 1} of ${state.panels.length}`;
  }

  // ---- sliders -------------------------------------------------------------
  function syncSliders() {
    const slot = state.panels[state.selectedPanel];
    if (!slot) return;
    $('zoom').value = String(slot.zoom);
    $('pan-x').value = String(slot.ox);
    $('pan-y').value = String(slot.oy);
    syncPanelLabel();
  }

  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].zoom = Number(e.target.value);
    draw();
  });
  $('zoom').addEventListener('change', onHistory);
  $('pan-x').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].ox = Number(e.target.value);
    draw();
  });
  $('pan-x').addEventListener('change', onHistory);
  $('pan-y').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].oy = Number(e.target.value);
    draw();
  });
  $('pan-y').addEventListener('change', onHistory);

  $('panel-prev-photo').addEventListener('click', () => cyclePhoto(-1));
  $('panel-next-photo').addEventListener('click', () => cyclePhoto(1));

  function cyclePhoto(dir) {
    if (state.photos.length === 0) return;
    onHistory();
    const slot = state.panels[state.selectedPanel];
    slot.photo = ((slot.photo + dir) % state.photos.length + state.photos.length) % state.photos.length;
    syncStrip();
    onChange();
  }

  // ---- caption + effects -----------------------------------------------------
  $('kicker').addEventListener('input', (e) => { state.kicker = e.target.value; draw(); });
  $('kicker').addEventListener('change', onHistory);
  $('title').addEventListener('input', (e) => { state.title = e.target.value; draw(); });
  $('title').addEventListener('change', onHistory);
  $('script').addEventListener('input', (e) => { state.script = e.target.value; draw(); });
  $('script').addEventListener('change', onHistory);
  $('lettering').addEventListener('change', (e) => { onHistory(); state.lettering = e.target.value; onChange(); });
  for (const key of ['sun', 'halftone', 'grain', 'vignette', 'badge']) {
    $(`fx-${key}`).addEventListener('change', (e) => {
      onHistory();
      state.effects[key] = e.target.checked;
      onChange();
    });
  }

  // ---- uploads ---------------------------------------------------------------
  $('photo-input').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (files.length === 0) return;
    onHistory();
    for (const file of files) {
      const src = URL.createObjectURL(file);
      const img = await loadImage(src);
      state.photos.push({ src, img });
    }
    state.panels.forEach((slot, i) => {
      if (slot.photo < 0) slot.photo = i % state.photos.length;
    });
    syncStrip();
    onChange();
    setStatus(`${files.length} photo(s) loaded.`);
  });

  $('load-samples').addEventListener('click', async () => {
    onHistory();
    for (const name of ['boulevard', 'pier']) {
      if (state.photos.some((p) => p.src.endsWith(`${name}.jpg`))) continue;
      const src = `samples/${name}.jpg`;
      const img = await loadImage(src);
      state.photos.push({ src, img });
    }
    state.panels.forEach((slot, i) => {
      if (slot.photo < 0) slot.photo = i % state.photos.length;
    });
    syncStrip();
    onChange();
    setStatus('Sample photos loaded.');
  });

  // ---- canvas picking: click selects a panel, drag pans, wheel zooms ---------
  let drag = null;
  function panelAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) * (canvas.width / r.width);
    const y = (clientY - r.top) * (canvas.height / r.height);
    const rects = layoutRects(state.layout, canvas.width, canvas.height);
    const hit = rects.findIndex((rc) => x >= rc.x && x < rc.x + rc.w && y >= rc.y && y < rc.y + rc.h);
    return { hit, x, y };
  }
  canvas.addEventListener('pointerdown', (e) => {
    const { hit, x, y } = panelAt(e.clientX, e.clientY);
    if (hit < 0) return;
    state.selectedPanel = hit;
    syncSliders();
    const slot = state.panels[hit];
    drag = { x, y, ox: slot.ox, oy: slot.oy };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { x, y } = panelAt(e.clientX, e.clientY);
    const rects = layoutRects(state.layout, canvas.width, canvas.height);
    const rect = rects[state.selectedPanel];
    const slot = state.panels[state.selectedPanel];
    slot.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (x - drag.x) / rect.w));
    slot.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (y - drag.y) / rect.h));
    syncSliders();
    draw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag) { drag = null; onHistory(); onChange(); }
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const { hit } = panelAt(e.clientX, e.clientY);
    if (hit < 0) return;
    state.selectedPanel = hit;
    const slot = state.panels[hit];
    slot.zoom = Math.max(1, Math.min(2.5, slot.zoom * (e.deltaY < 0 ? 1.06 : 0.94)));
    syncSliders();
    draw();
  }, { passive: false });

  // ---- undo / redo / shuffle ---------------------------------------------------
  $('undo').addEventListener('click', () => onUndoRedo('undo'));
  $('redo').addEventListener('click', () => onUndoRedo('redo'));
  $('shuffle').addEventListener('click', () => {
    onHistory();
    state.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
    state.grade = GRADES[Math.floor(Math.random() * GRADES.length)].id;
    state.panels = state.panels.slice(0, (LAYOUTS.find((l) => l.id === state.layout)).panels.length);
    while (state.panels.length < (LAYOUTS.find((l) => l.id === state.layout)).panels.length) {
      state.panels.push({ photo: state.photos.length > 0 ? state.panels.length % state.photos.length : -1, zoom: 1.15, ox: 0, oy: 0 });
    }
    syncPickers();
    syncSliders();
    onChange();
    setStatus('Shuffled layout + grade.');
  });

  // ---- export -------------------------------------------------------------------
  function download(canvasEl, name) {
    return new Promise((resolve) => {
      canvasEl.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        resolve();
      }, 'image/png');
    });
  }

  async function exportSize(size) {
    const out = renderToCanvas(size.w, size.h, state);
    await download(out, `neon-coast-cover-${size.id}.png`);
    setStatus(`Saved neon-coast-cover-${size.id}.png`);
  }

  for (const size of SIZES) {
    $(`export-${size.id}`).addEventListener('click', () => exportSize(size));
  }
  $('export-all').addEventListener('click', async () => {
    for (const size of SIZES) await exportSize(size);
    setStatus('Saved all 3 sizes.');
  });

  return { draw, syncPickers, syncStrip, syncSliders, setStatus, exportSize };
}
