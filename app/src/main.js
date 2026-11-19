// Neon Shore Cover Studio — page wiring.
//
// Connects the editor (editor.js) to the controls in index.html: layout and
// grade pickers, the photo tray, caption fields, the panel sliders, undo and
// redo, and the PNG export buttons. Also exposes a small automation handle,
// window.coverStudio, so a screenshot script can drive the app the same way
// a person would: load the samples, pick a layout, export a cover.

import { CoverEditor } from './editor.js';
import {
  EXPORT_SIZES,
  LAYOUT_IDS,
  LAYOUT_LABELS,
  GRADE_IDS,
  GRADE_LABELS,
} from './cover.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const editor = new CoverEditor(preview);

const state = {
  sizeKey: 'wide',
  sizeLabel: EXPORT_SIZES.wide.label,
};

function sizeCanvasToSelection() {
  const size = EXPORT_SIZES[state.sizeKey];
  const maxW = 640;
  const scale = Math.min(1, maxW / size.width);
  preview.width = Math.round(size.width * scale);
  preview.height = Math.round(size.height * scale);
  preview.style.aspectRatio = `${size.width} / ${size.height}`;
}

function buildPicker(container, items, labels, current, onPick) {
  container.innerHTML = '';
  for (const id of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip' + (id === current ? ' active' : '');
    button.textContent = labels[id];
    button.dataset.pick = id;
    button.addEventListener('click', () => {
      onPick(id);
      for (const child of container.children) child.classList.toggle('active', child.dataset.pick === id);
    });
    container.appendChild(button);
  }
}

function syncChips(container, current) {
  for (const child of container.children) child.classList.toggle('active', child.dataset.pick === current);
}

function refreshPhotoTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  editor.photos.forEach((photo, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'thumb';
    card.title = `Use ${photo.name} in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    const label = document.createElement('span');
    label.textContent = photo.name;
    card.append(img, label);
    card.addEventListener('click', () => editor.assignPhotoToSelected(index));
    tray.appendChild(card);
  });
  $('photoCount').textContent = `${editor.photos.length} photo${editor.photos.length === 1 ? '' : 's'}`;
}

function refreshPanelControls() {
  const panel = editor.state.panels[editor.state.selected];
  $('panelLabel').textContent = `Panel ${editor.state.selected + 1} of ${editor.state.panels.length}`;
  if (!panel) return;
  $('zoomRange').value = String(panel.zoom);
  $('zoomValue').textContent = `${panel.zoom.toFixed(2)}×`;
  $('xRange').value = String(panel.ox);
  $('yRange').value = String(panel.oy);
}

function refreshUndoButtons() {
  $('undoBtn').disabled = editor.history.length === 0;
  $('redoBtn').disabled = editor.future.length === 0;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function exportOne(sizeKey) {
  const status = $('exportStatus');
  status.textContent = 'Exporting…';
  try {
    const { blob, filename } = await editor.exportPng(sizeKey);
    downloadBlob(blob, filename);
    status.textContent = `Saved ${filename} (${(blob.size / 1024).toFixed(0)} KB)`;
  } catch (error) {
    status.textContent = `Export failed: ${error.message}`;
  }
}

async function exportAll() {
  const status = $('exportStatus');
  status.textContent = 'Exporting all three sizes…';
  for (const sizeKey of Object.keys(EXPORT_SIZES)) {
    await exportOne(sizeKey);
    await new Promise((r) => setTimeout(r, 250));
  }
}

// -- wire the controls ---------------------------------------------------
buildPicker($('layoutPicker'), LAYOUT_IDS, LAYOUT_LABELS, editor.state.layout, (id) => {
  editor.setLayout(id);
  refreshPanelControls();
  refreshUndoButtons();
});
buildPicker($('gradePicker'), GRADE_IDS, GRADE_LABELS, editor.state.grade, (id) => {
  editor.setGrade(id);
  refreshUndoButtons();
});
buildPicker($('sizePicker'), Object.keys(EXPORT_SIZES), Object.fromEntries(
  Object.entries(EXPORT_SIZES).map(([key, size]) => [key, size.label]),
), state.sizeKey, (id) => {
  state.sizeKey = id;
  sizeCanvasToSelection();
  editor.render();
});

$('titleInput').value = editor.state.title;
$('subtitleInput').value = editor.state.subtitle;
$('titleInput').addEventListener('input', (event) => editor.setTitle(event.target.value));
$('subtitleInput').addEventListener('input', (event) => editor.setSubtitle(event.target.value));
$('titleInput').addEventListener('change', () => editor.commitText());
$('subtitleInput').addEventListener('change', () => editor.commitText());

$('badgeToggle').checked = editor.state.badge;
$('badgeToggle').addEventListener('change', (event) => {
  editor.toggleBadge(event.target.checked);
  refreshUndoButtons();
});
$('grainToggle').checked = editor.state.grain;
$('grainToggle').addEventListener('change', (event) => {
  editor.toggleEffect('grain', event.target.checked);
  refreshUndoButtons();
});
$('vignetteToggle').checked = editor.state.vignette;
$('vignetteToggle').addEventListener('change', (event) => {
  editor.toggleEffect('vignette', event.target.checked);
  refreshUndoButtons();
});

$('zoomRange').addEventListener('input', (event) => {
  editor.setSelectedZoom(Number(event.target.value));
  $('zoomValue').textContent = `${Number(event.target.value).toFixed(2)}×`;
});
$('zoomRange').addEventListener('change', () => {
  editor.commitPanelEdit();
  refreshUndoButtons();
});
$('xRange').addEventListener('input', (event) => {
  const panel = editor.state.panels[editor.state.selected];
  editor.setSelectedOffset(Number(event.target.value), panel ? panel.oy : 0);
});
$('yRange').addEventListener('input', (event) => {
  const panel = editor.state.panels[editor.state.selected];
  editor.setSelectedOffset(panel ? panel.ox : 0, Number(event.target.value));
});
$('xRange').addEventListener('change', () => editor.commitPanelEdit());
$('yRange').addEventListener('change', () => editor.commitPanelEdit());

$('fillOneBtn').addEventListener('click', () => {
  editor.fillAll(0, false);
  refreshPanelControls();
  refreshUndoButtons();
});
$('fillCycleBtn').addEventListener('click', () => {
  editor.fillAll(0, true);
  refreshPanelControls();
  refreshUndoButtons();
});

$('undoBtn').addEventListener('click', () => {
  editor.undo();
  refreshPanelControls();
  refreshUndoButtons();
});
$('redoBtn').addEventListener('click', () => {
  editor.redo();
  refreshPanelControls();
  refreshUndoButtons();
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault();
    editor.undo();
    refreshPanelControls();
    refreshUndoButtons();
  }
  if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
    event.preventDefault();
    editor.redo();
    refreshPanelControls();
    refreshUndoButtons();
  }
});

const fileInput = $('fileInput');
$('uploadBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (event) => {
  const added = await editor.addPhotoFiles(event.target.files);
  if (added) {
    refreshPhotoTray();
    refreshUndoButtons();
  }
  fileInput.value = '';
});

const dropZone = $('dropZone');
['dragenter', 'dragover'].forEach((name) => dropZone.addEventListener(name, (event) => {
  event.preventDefault();
  dropZone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((name) => dropZone.addEventListener(name, (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragging');
}));
dropZone.addEventListener('drop', async (event) => {
  const added = await editor.addPhotoFiles(event.dataTransfer.files);
  if (added) {
    refreshPhotoTray();
    refreshUndoButtons();
  }
});

$('exportBtn').addEventListener('click', () => exportOne(state.sizeKey));
$('exportAllBtn').addEventListener('click', exportAll);

editor.onchange = () => {
  refreshPanelControls();
  refreshUndoButtons();
};

// Pointer: click selects a panel, drag pans its photo, wheel zooms it.
preview.addEventListener('pointerdown', (event) => {
  preview.setPointerCapture(event.pointerId);
  if (editor.pointerDown(event.clientX, event.clientY)) refreshPanelControls();
});
preview.addEventListener('pointermove', (event) => editor.pointerMove(event.clientX, event.clientY));
preview.addEventListener('pointerup', () => editor.pointerUp());
preview.addEventListener('wheel', (event) => {
  event.preventDefault();
  editor.wheelZoom(event.deltaY);
  refreshPanelControls();
}, { passive: false });

// -- boot ----------------------------------------------------------------
sizeCanvasToSelection();
refreshPanelControls();
refreshUndoButtons();
await document.fonts.ready;
await editor.loadSamples();
refreshPhotoTray();
editor.render();

// Automation handle for screenshot scripts. It drives the same public
// methods the buttons use, so a scripted export is the app's own export.
window.coverStudio = {
  editor,
  exportPng: (sizeKey) => editor.exportPng(sizeKey),
  setLayout: (id) => { editor.setLayout(id); syncChips($('layoutPicker'), id); refreshPanelControls(); },
  setGrade: (id) => { editor.setGrade(id); syncChips($('gradePicker'), id); },
  setSize: (id) => { state.sizeKey = id; syncChips($('sizePicker'), id); sizeCanvasToSelection(); editor.render(); },
  setTitle: (text) => { editor.setTitle(text); $('titleInput').value = text; },
  setSubtitle: (text) => { editor.setSubtitle(text); $('subtitleInput').value = text; },
  fillCycle: () => editor.fillAll(0, true),
  ready: true,
};
