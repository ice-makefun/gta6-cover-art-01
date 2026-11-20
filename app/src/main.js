// Boots Vice Cover Studio: loads the two sample photos and the OFL fonts,
// wires the editor, then either shows the live editor or a fixed screenshot
// scene (?shot=editor / ?shot=cover). Everything runs offline from app/.
import { store, createHistory } from './state.js';
import { renderCover, sizeOf } from './render.js';
import { wireEditor, syncInputs } from './editor.js';
import { runShot } from './shots.js';

const preview = document.getElementById('preview');
const statusEl = document.getElementById('status');
const images = new Map();
const history = createHistory(store.state);

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Paints the preview canvas at the state's export size. */
export function rerender() {
  const { w, h } = sizeOf(store.state.size);
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  renderCover(preview, store.state, images);
}

function commit() {
  history.commit(store.state);
  syncUndoRedo();
}

function syncUndoRedo() {
  document.getElementById('undoBtn').disabled = !history.canUndo();
  document.getElementById('redoBtn').disabled = !history.canRedo();
}

function undo() {
  const previous = history.undo();
  if (!previous) return;
  store.state = previous;
  syncInputs();
  rerender();
  syncUndoRedo();
}

function redo() {
  const next = history.redo();
  if (!next) return;
  store.state = next;
  syncInputs();
  rerender();
  syncUndoRedo();
}

/** Renders the cover at an export size and downloads it as a PNG. */
export function exportCover(sizeKey) {
  const { w, h } = sizeOf(sizeKey);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off, store.state, images);
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — the canvas could not make a PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Exported vice-cover-${w}x${h}.png`;
  }, 'image/png');
}

async function boot() {
  await Promise.all([
    loadImage('samples/boulevard.jpg').then((img) => images.set('boulevard', img)),
    loadImage('samples/pier.jpg').then((img) => images.set('pier', img)),
  ]);
  try {
    await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('60px Pacifico')]);
  } catch {
    // The canvas falls back to a system font if an OFL font fails to load.
  }
  wireEditor({ images, rerender, commit, undo, redo, exportCover, loadImage });
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, async (overrides) => {
      Object.assign(store.state, overrides);
      if (overrides.panels) store.state.panels = overrides.panels;
      syncInputs();
      rerender();
    });
  } else {
    syncInputs();
    rerender();
  }
  syncUndoRedo();
}

boot();
