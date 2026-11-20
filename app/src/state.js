// State for Vice Cover Studio: one plain object, snapshotted for undo/redo.
// Panels are per-layout slots; a layout uses the first N panels it needs.
// A panel photo is 'boulevard' | 'pier' | 'upload:<n>' | 'none' (solid colour).
export const DEFAULT_STATE = {
  layout: 'hero-left',
  grade: 'neon-sunset',
  size: '1920x1080',
  lettering: 'block',
  title: 'NEON SHORES',
  script: 'sunset heist',
  kicker: 'WELCOME TO THE',
  halftone: true,
  grain: true,
  vignette: true,
  sun: true,
  panels: [
    { photo: 'boulevard', zoom: 1.12, ox: 0.1, oy: -0.05 },
    { photo: 'pier', zoom: 1.08, ox: -0.08, oy: 0.05 },
    { photo: 'boulevard', zoom: 1.25, ox: 0.15, oy: 0.1 },
    { photo: 'pier', zoom: 1.15, ox: 0, oy: -0.1 },
  ],
};

/** Deep-copies a state object through JSON (state holds only plain data). */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * The live store every module shares: `state` is replaced on undo/redo and
 * `selectedPanel` tracks which panel the editor is working on. Uploads are
 * kept here too so the photo picker can list them.
 */
export const store = {
  state: cloneState(DEFAULT_STATE),
  selectedPanel: 0,
  uploads: [],
};

/** A bounded undo/redo history of JSON snapshots of the state. */
export function createHistory(initial) {
  let stack = [JSON.stringify(initial)];
  let index = 0;
  return {
    commit(state) {
      const snap = JSON.stringify(state);
      if (snap === stack[index]) return;
      stack = stack.slice(0, index + 1);
      stack.push(snap);
      if (stack.length > 60) stack.shift();
      index = stack.length - 1;
    },
    undo() {
      if (index === 0) return null;
      index -= 1;
      return JSON.parse(stack[index]);
    },
    redo() {
      if (index >= stack.length - 1) return null;
      index += 1;
      return JSON.parse(stack[index]);
    },
    canUndo() {
      return index > 0;
    },
    canRedo() {
      return index < stack.length - 1;
    },
  };
}
