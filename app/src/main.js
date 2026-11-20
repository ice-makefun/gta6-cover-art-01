// Neon Coast Cover Studio — entry point. Wires the editor, restores undo/redo
// snapshots, and runs fixed ?shot= scenes for screenshots.
// Photos are loaded from the machine (upload) or from app/samples/; nothing
// is sent anywhere.
import { DEFAULT_STATE, freshPanels, snapshot, createHistory } from './state.js';
import { buildEditor, loadImage } from './editor.js';
import { renderCover } from './render.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');

const state = {
  ...DEFAULT_STATE,
  effects: { ...DEFAULT_STATE.effects },
  panels: [],
  photos: [],
};
state.panels = freshPanels(state.layout, 0);

const history = createHistory(60);
let lastSnapshot = snapshot(state);

function pushHistory() {
  history.push(lastSnapshot);
  lastSnapshot = snapshot(state);
  syncUndoRedo();
}

function syncUndoRedo() {
  document.getElementById('undo').disabled = !history.canUndo();
  document.getElementById('redo').disabled = !history.canRedo();
}

/** Restores a snapshot, reloading its photos from their stored sources. */
async function restore(snap) {
  state.layout = snap.layout;
  state.grade = snap.grade;
  state.kicker = snap.kicker;
  state.title = snap.title;
  state.script = snap.script;
  state.lettering = snap.lettering;
  state.effects = { ...snap.effects };
  state.selectedPanel = snap.selectedPanel;
  state.panels = snap.panels;
  state.photos = [];
  for (const src of snap.photoSrcs) {
    const img = await loadImage(src);
    state.photos.push({ src, img });
  }
  document.getElementById('kicker').value = state.kicker;
  document.getElementById('title').value = state.title;
  document.getElementById('script').value = state.script;
  document.getElementById('lettering').value = state.lettering;
  for (const key of ['sun', 'halftone', 'grain', 'vignette', 'badge']) {
    document.getElementById(`fx-${key}`).checked = state.effects[key];
  }
  editor.syncPickers();
  editor.syncStrip();
  editor.syncSliders();
  editor.draw();
  lastSnapshot = snapshot(state);
  syncUndoRedo();
}

async function undoRedo(which) {
  const snap = which === 'undo' ? history.undo(lastSnapshot) : history.redo(lastSnapshot);
  if (!snap) return;
  await restore(snap);
}

const editor = buildEditor({
  state,
  canvas,
  status,
  onChange: () => {
    lastSnapshot = snapshot(state);
    editor.draw();
    syncUndoRedo();
  },
  onHistory: pushHistory,
  onUndoRedo: undoRedo,
});

// A ?shot= query runs a fixed scene instead of the interactive editor.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (sceneState, size) => {
    Object.assign(state, sceneState);
    canvas.width = size.width;
    canvas.height = size.height;
    renderCover(canvas.getContext('2d'), size.width, size.height, state);
    editor.syncPickers();
    editor.syncStrip();
    editor.syncSliders();
  });
} else {
  // Start with the two sample photos so the first paint already shows a cover.
  (async () => {
    for (const name of ['boulevard', 'pier']) {
      const src = `samples/${name}.jpg`;
      const img = await loadImage(src);
      state.photos.push({ src, img });
    }
    state.panels = freshPanels(state.layout, state.photos.length);
    editor.syncStrip();
    editor.syncSliders();
    editor.draw();
    lastSnapshot = snapshot(state);
    syncUndoRedo();
  })();
  editor.syncPickers();
  editor.syncSliders();
  editor.draw();
  syncUndoRedo();
}
