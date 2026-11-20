// Wires the editor sidebar and the preview canvas to the shared store:
// layout / grade / size / lettering buttons, caption fields, the per-panel
// photo picker, zoom slider, uploads, drag-to-pan, scroll-to-zoom, shuffle
// and undo/redo. Every committed change goes through `deps.commit`.
import { store, cloneState, DEFAULT_STATE } from './state.js';
import { LAYOUTS, GRADES, SIZES, LETTERINGS } from './grades.js';
import { layoutRects } from './render.js';

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function currentPanel() {
  return store.state.panels[store.selectedPanel] ?? { photo: 'none', zoom: 1, ox: 0, oy: 0 };
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Builds one row of toggle buttons from a definition map. */
function buildButtonGroup(container, entries, key, onPick) {
  container.innerHTML = '';
  for (const [id, def] of Object.entries(entries)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = def.name ?? def.label ?? id;
    button.dataset[key] = id;
    button.addEventListener('click', () => onPick(id));
    container.appendChild(button);
  }
}

function markActive(container, key, value) {
  container.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset[key] === value);
  });
}

/**
 * Copies the state back into every control: called after undo, redo,
 * shuffle and shot presets, never on each keystroke.
 */
export function syncInputs() {
  const s = store.state;
  document.getElementById('titleInput').value = s.title;
  document.getElementById('scriptInput').value = s.script;
  document.getElementById('kickerInput').value = s.kicker;
  document.getElementById('sunToggle').checked = !!s.sun;
  document.getElementById('halftoneToggle').checked = !!s.halftone;
  document.getElementById('grainToggle').checked = !!s.grain;
  document.getElementById('vignetteToggle').checked = !!s.vignette;
  markActive(document.getElementById('layoutRow'), 'layout', s.layout);
  markActive(document.getElementById('gradeRow'), 'grade', s.grade);
  markActive(document.getElementById('sizeRow'), 'size', s.size);
  markActive(document.getElementById('letteringRow'), 'lettering', s.lettering);
  syncPanelControls();
}

/** Rebuilds the per-panel photo picker and zoom slider for the selection. */
export function syncPanelControls() {
  const panel = currentPanel();
  const select = document.getElementById('panelPhoto');
  const options = [
    ['boulevard', 'Boulevard — sample photo'],
    ['pier', 'Pier — sample photo'],
    ...store.uploads.map((u) => [u.key, `Uploaded — ${u.name}`]),
    ['none', 'Solid colour (no photo)'],
  ];
  select.innerHTML = '';
  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }
  select.value = options.some(([v]) => v === panel.photo) ? panel.photo : 'none';
  document.getElementById('panelLabel').textContent = String(store.selectedPanel + 1);
  const zoom = document.getElementById('zoomRange');
  zoom.value = String(panel.zoom || 1);
  document.getElementById('zoomValue').textContent = `${(panel.zoom || 1).toFixed(2)}×`;
}

/** Loads uploaded files as panel photos and assigns the newest to the panel. */
async function handleUploads(files, deps) {
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const img = await deps.loadImage(url);
      const key = `upload:${store.uploads.length}`;
      deps.images.set(key, img);
      store.uploads.push({ key, name: file.name });
    } catch {
      // An unreadable file is skipped; the editor keeps working.
    }
  }
  const newest = store.uploads[store.uploads.length - 1];
  if (newest) currentPanel().photo = newest.key;
  syncPanelControls();
  deps.rerender();
  deps.commit();
}

/** Picks a fresh random layout, grade, lettering and panel photos. */
function shuffleCover(deps) {
  const s = store.state;
  s.layout = pickRandom(Object.keys(LAYOUTS));
  s.grade = pickRandom(Object.keys(GRADES));
  s.lettering = pickRandom(Object.keys(LETTERINGS));
  const photos = ['boulevard', 'pier', ...store.uploads.map((u) => u.key)];
  s.panels = s.panels.map((panel) => ({
    ...panel,
    photo: pickRandom(photos),
    zoom: 1.05 + Math.random() * 0.35,
    ox: (Math.random() - 0.5) * 0.4,
    oy: (Math.random() - 0.5) * 0.4,
  }));
  syncInputs();
  deps.rerender();
  deps.commit();
}

export function wireEditor(deps) {
  const s = store.state;
  const preview = document.getElementById('preview');

  buildButtonGroup(document.getElementById('layoutRow'), LAYOUTS, 'layout', (id) => {
    s.layout = id;
    syncInputs();
    deps.rerender();
    deps.commit();
  });
  buildButtonGroup(document.getElementById('gradeRow'), GRADES, 'grade', (id) => {
    s.grade = id;
    syncInputs();
    deps.rerender();
    deps.commit();
  });
  buildButtonGroup(document.getElementById('sizeRow'), SIZES, 'size', (id) => {
    s.size = id;
    syncInputs();
    deps.rerender();
    deps.commit();
  });
  buildButtonGroup(document.getElementById('letteringRow'), LETTERINGS, 'lettering', (id) => {
    s.lettering = id;
    syncInputs();
    deps.rerender();
    deps.commit();
  });

  const bindText = (id, key) => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      s[key] = input.value;
      deps.rerender();
    });
    input.addEventListener('change', deps.commit);
  };
  bindText('titleInput', 'title');
  bindText('scriptInput', 'script');
  bindText('kickerInput', 'kicker');

  const bindToggle = (id, key) => {
    document.getElementById(id).addEventListener('change', (e) => {
      s[key] = e.target.checked;
      deps.rerender();
      deps.commit();
    });
  };
  bindToggle('sunToggle', 'sun');
  bindToggle('halftoneToggle', 'halftone');
  bindToggle('grainToggle', 'grain');
  bindToggle('vignetteToggle', 'vignette');

  document.getElementById('panelPhoto').addEventListener('change', (e) => {
    currentPanel().photo = e.target.value;
    deps.rerender();
    deps.commit();
  });
  const zoom = document.getElementById('zoomRange');
  zoom.addEventListener('input', () => {
    currentPanel().zoom = parseFloat(zoom.value);
    document.getElementById('zoomValue').textContent = `${currentPanel().zoom.toFixed(2)}×`;
    deps.rerender();
  });
  zoom.addEventListener('change', deps.commit);
  document.getElementById('centerPhoto').addEventListener('click', () => {
    currentPanel().ox = 0;
    currentPanel().oy = 0;
    deps.rerender();
    deps.commit();
  });
  document.getElementById('resetPanel').addEventListener('click', () => {
    store.state.panels[store.selectedPanel] = { photo: 'boulevard', zoom: 1, ox: 0, oy: 0 };
    syncPanelControls();
    deps.rerender();
    deps.commit();
  });
  document.getElementById('uploadInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleUploads(e.target.files, deps);
    e.target.value = '';
  });
  document.getElementById('shuffleBtn').addEventListener('click', () => shuffleCover(deps));
  document.getElementById('undoBtn').addEventListener('click', deps.undo);
  document.getElementById('redoBtn').addEventListener('click', deps.redo);
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
    e.preventDefault();
    if (e.shiftKey) deps.redo();
    else deps.undo();
  });

  for (const [sizeKey, buttonId] of [
    ['1080x1080', 'export-1080x1080'],
    ['1080x1350', 'export-1080x1350'],
    ['1920x1080', 'export-1920x1080'],
  ]) {
    document.getElementById(buttonId).addEventListener('click', () => deps.exportCover(sizeKey));
  }

  // Click a panel to select it; drag to pan its photo; scroll to zoom it.
  const canvasPos = (e) => {
    const box = preview.getBoundingClientRect();
    return {
      x: (e.clientX - box.left) * (preview.width / box.width),
      y: (e.clientY - box.top) * (preview.height / box.height),
    };
  };
  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    const pos = canvasPos(e);
    const rects = layoutRects(s.layout, preview.width, preview.height);
    const hit = rects.findIndex(
      (r) => pos.x >= r.x && pos.x < r.x + r.w && pos.y >= r.y && pos.y < r.y + r.h,
    );
    if (hit < 0) return;
    store.selectedPanel = hit;
    syncPanelControls();
    preview.setPointerCapture(e.pointerId);
    const panel = currentPanel();
    drag = { x: pos.x, y: pos.y, ox: panel.ox || 0, oy: panel.oy || 0 };
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pos = canvasPos(e);
    const rect = layoutRects(s.layout, preview.width, preview.height)[store.selectedPanel];
    const panel = currentPanel();
    panel.ox = clamp(drag.ox + ((pos.x - drag.x) / rect.w) * 2, -1, 1);
    panel.oy = clamp(drag.oy + ((pos.y - drag.y) / rect.h) * 2, -1, 1);
    deps.rerender();
  });
  preview.addEventListener('pointerup', () => {
    if (drag) {
      drag = null;
      deps.commit();
    }
  });
  let wheelTimer = null;
  preview.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const panel = currentPanel();
      panel.zoom = clamp((panel.zoom || 1) * (1 - e.deltaY * 0.001), 1, 3);
      syncPanelControls();
      deps.rerender();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(deps.commit, 300);
    },
    { passive: false },
  );

  // Keep the DEFAULT_STATE import honest: a fresh reset is one click away
  // in the console for anyone trying the app, and the constant documents
  // the cover every new visitor starts from.
  window.__viceReset = () => {
    store.state = cloneState(DEFAULT_STATE);
    store.selectedPanel = 0;
    syncInputs();
    deps.rerender();
    deps.commit();
  };
}
