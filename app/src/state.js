// State for Neon Coast Cover Studio: the cover's layout, grade, caption,
// effects and one photo slot per panel, plus undo/redo history.
// Photos themselves live in `photos` as { src, img }; a snapshot stores only
// the serialisable part, so undo/redo never copies image pixels.

export const LAYOUTS = [
  {
    id: 'sunset-hero',
    name: 'Sunset Hero',
    blurb: 'Big left hero + two stacked right',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  {
    id: 'sunset-hero-right',
    name: 'Hero Right',
    blurb: 'Mirrored hero, big right panel',
    panels: [
      { x: 0, y: 0, w: 0.38, h: 0.5 },
      { x: 0, y: 0.5, w: 0.38, h: 0.5 },
      { x: 0.38, y: 0, w: 0.62, h: 1 },
    ],
  },
  {
    id: 'triptych',
    name: 'Triptych',
    blurb: 'Three tall panels side by side',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  {
    id: 'quad',
    name: 'Quad Grid',
    blurb: 'Four equal panels, 2 by 2',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'bands',
    name: 'Sunset Bands',
    blurb: 'Wide top band over two strips',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.46 },
      { x: 0, y: 0.46, w: 0.55, h: 0.3 },
      { x: 0.55, y: 0.46, w: 0.45, h: 0.3 },
      { x: 0, y: 0.76, w: 1, h: 0.24 },
    ],
  },
  {
    id: 'diagonal',
    name: 'Diagonal Cut',
    blurb: 'Two panels split on a diagonal',
    diagonal: true,
    panels: [
      { x: 0, y: 0, w: 1, h: 0.62 },
      { x: 0, y: 0.62, w: 1, h: 0.38 },
    ],
  },
];

export const DEFAULT_STATE = {
  layout: 'sunset-hero',
  grade: 'neon-sunset',
  kicker: 'WELCOME TO THE',
  title: 'NEON COAST',
  script: 'sunset heist',
  lettering: 'block',
  effects: { sun: true, halftone: true, grain: true, vignette: true, badge: true },
  selectedPanel: 0,
  // One slot per panel: { photo (index into photos, -1 = empty), zoom, ox, oy }.
  panels: [],
};

/** Fresh panel slots for a layout, cycling the available photos. */
export function freshPanels(layoutId, photoCount) {
  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  return layout.panels.map((_, i) => ({
    photo: photoCount > 0 ? i % photoCount : -1,
    zoom: 1.15,
    ox: 0,
    oy: 0,
  }));
}

/** Deep-clone the serialisable part of the state (no Image objects). */
export function snapshot(state) {
  return JSON.parse(JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    kicker: state.kicker,
    title: state.title,
    script: state.script,
    lettering: state.lettering,
    effects: state.effects,
    selectedPanel: state.selectedPanel,
    panels: state.panels,
    photoSrcs: state.photos.map((p) => p.src),
  }));
}

/** A bounded undo/redo history over snapshots. */
export function createHistory(limit = 60) {
  const past = [];
  const future = [];
  return {
    push(snap) {
      past.push(snap);
      if (past.length > limit) past.shift();
      future.length = 0;
    },
    undo(current) {
      if (past.length === 0) return null;
      future.push(current);
      return past.pop();
    },
    redo(current) {
      if (future.length === 0) return null;
      past.push(current);
      return future.pop();
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}
