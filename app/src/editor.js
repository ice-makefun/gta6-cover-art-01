// Neon Shore Cover Studio — editor state and interactions.
//
// Holds the cover state, the photo library, undo/redo history and the
// pointer math for dragging a photo inside its panel. The rendering itself
// lives in cover.js; this module only decides *what* to draw.

import {
  defaultState,
  defaultPanels,
  drawCover,
  panelAt,
  layoutPanels,
  LAYOUT_IDS,
  GRADE_IDS,
} from './cover.js';

export const SAMPLE_PHOTOS = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

export class CoverEditor {
  constructor(previewCanvas) {
    this.preview = previewCanvas;
    this.state = defaultState();
    this.photos = []; // { name, img } in load order; index 0/1 are samples
    this.history = [];
    this.future = [];
    this.onchange = null;
    this.drag = null;
  }

  // -- photos ----------------------------------------------------------
  async loadSamples() {
    for (const sample of SAMPLE_PHOTOS) {
      if (this.photos.some((p) => p.name === sample.name)) continue;
      const img = await loadImage(sample.src);
      this.photos.push({ name: sample.name, img });
    }
    this.render();
  }

  async addPhotoFiles(fileList) {
    let added = 0;
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        this.photos.push({ name: file.name.replace(/\.[^.]+$/, ''), img });
        added += 1;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    if (added) {
      this.pushHistory();
      this.render();
    }
    return added;
  }

  // -- state -----------------------------------------------------------
  pushHistory() {
    this.history.push(JSON.stringify(this.state));
    if (this.history.length > 60) this.history.shift();
    this.future.length = 0;
  }

  undo() {
    if (!this.history.length) return false;
    this.future.push(JSON.stringify(this.state));
    this.state = JSON.parse(this.history.pop());
    this.render();
    return true;
  }

  redo() {
    if (!this.future.length) return false;
    this.history.push(JSON.stringify(this.state));
    this.state = JSON.parse(this.future.pop());
    this.render();
    return true;
  }

  setLayout(layoutId) {
    if (!LAYOUT_IDS.includes(layoutId) || layoutId === this.state.layout) return;
    this.pushHistory();
    this.state.layout = layoutId;
    this.state.panels = defaultPanels(layoutId);
    this.state.selected = 0;
    this.render();
  }

  setGrade(gradeId) {
    if (!GRADE_IDS.includes(gradeId) || gradeId === this.state.grade) return;
    this.pushHistory();
    this.state.grade = gradeId;
    this.render();
  }

  setTitle(text) {
    if (text === this.state.title) return;
    this.state.title = text;
    this.render();
  }

  setSubtitle(text) {
    if (text === this.state.subtitle) return;
    this.state.subtitle = text;
    this.render();
  }

  commitText() {
    this.pushHistory();
  }

  toggleBadge(on) {
    this.pushHistory();
    this.state.badge = on;
    this.render();
  }

  toggleEffect(key, on) {
    this.pushHistory();
    this.state[key] = on;
    this.render();
  }

  selectPanel(index) {
    if (index < 0 || index >= this.state.panels.length) return;
    this.state.selected = index;
    this.render();
  }

  // Fill every panel with one photo, cycling the library if asked. The
  // crop defaults come from a fresh layout so faces stay framed.
  fillAll(photoIndex, cycle = false) {
    this.pushHistory();
    const fresh = defaultPanels(this.state.layout);
    this.state.panels = this.state.panels.map((panel, i) => ({
      ...panel,
      photo: cycle ? (photoIndex + i) % Math.max(1, this.photos.length) : photoIndex,
      zoom: fresh[i].zoom,
      ox: fresh[i].ox,
      oy: fresh[i].oy,
      anchorY: fresh[i].anchorY,
    }));
    this.render();
  }

  assignPhotoToSelected(photoIndex) {
    this.pushHistory();
    const panel = this.state.panels[this.state.selected];
    if (panel) {
      panel.photo = photoIndex;
      panel.zoom = 1.15;
      panel.ox = 0;
      panel.oy = 0;
    }
    this.render();
  }

  setSelectedZoom(zoom) {
    const panel = this.state.panels[this.state.selected];
    if (!panel) return;
    panel.zoom = zoom;
    this.render();
  }

  setSelectedOffset(ox, oy) {
    const panel = this.state.panels[this.state.selected];
    if (!panel) return;
    panel.ox = ox;
    panel.oy = oy;
    this.render();
  }

  commitPanelEdit() {
    this.pushHistory();
  }

  // -- pointer interaction on the preview ------------------------------
  pointerDown(clientX, clientY) {
    const rect = this.preview.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const hit = panelAt(this.state, px, py, rect.width, rect.height);
    if (hit < 0) return false;
    this.state.selected = hit;
    const panel = this.state.panels[hit];
    this.drag = { startX: px, startY: py, ox: panel.ox, oy: panel.oy, moved: false };
    this.render();
    return true;
  }

  pointerMove(clientX, clientY) {
    if (!this.drag) return;
    const rect = this.preview.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const panel = this.state.panels[this.state.selected];
    if (!panel) return;
    const dx = (px - this.drag.startX) / rect.width;
    const dy = (py - this.drag.startY) / rect.height;
    if (Math.abs(dx) + Math.abs(dy) > 0.004) this.drag.moved = true;
    panel.ox = clamp(this.drag.ox + dx * 2.2, -1, 1);
    panel.oy = clamp(this.drag.oy + dy * 2.2, -1, 1);
    this.render();
  }

  pointerUp() {
    if (this.drag?.moved) this.pushHistory();
    this.drag = null;
  }

  wheelZoom(deltaY) {
    const panel = this.state.panels[this.state.selected];
    if (!panel) return;
    panel.zoom = clamp(panel.zoom * (deltaY > 0 ? 0.94 : 1.06), 1, 3);
    this.render();
  }

  // -- rendering + export ----------------------------------------------
  render() {
    const canvas = this.preview;
    const ctx = canvas.getContext('2d');
    const images = this.photos.map((p) => p.img);
    drawCover(ctx, this.state, images, canvas.width, canvas.height);
    this.drawSelection(ctx);
    if (this.onchange) this.onchange(this.state);
  }

  drawSelection(ctx) {
    if (this.state.panels.length < 2) return;
    const { panels } = layoutPanels(this.state.layout, this.preview.width, this.preview.height);
    const slot = panels[this.state.selected];
    if (!slot) return;
    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = Math.max(3, this.preview.width * 0.006);
    ctx.setLineDash([14, 8]);
    ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#00e5ff';
    ctx.font = `700 ${Math.max(13, Math.round(this.preview.width * 0.022))}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    const label = `PANEL ${this.state.selected + 1}`;
    const tw = ctx.measureText(label).width;
    ctx.fillRect(slot.x, slot.y, tw + 16, Math.round(this.preview.width * 0.032) + 8);
    ctx.fillStyle = '#14081f';
    ctx.fillText(label, slot.x + 8, slot.y + 4);
    ctx.restore();
  }

  async exportPng(sizeKey) {
    const { EXPORT_SIZES } = await import('./cover.js');
    const size = EXPORT_SIZES[sizeKey];
    if (!size) throw new Error(`unknown size ${sizeKey}`);
    await document.fonts.ready;
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    const images = this.photos.map((p) => p.img);
    drawCover(ctx, this.state, images, size.width, size.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return { blob, filename: `neon-shore-cover-${size.width}x${size.height}.png` };
  }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load image ${src}`));
    img.src = src;
  });
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
