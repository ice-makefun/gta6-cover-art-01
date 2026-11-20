// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the cover alone, controls hidden. Query
// params pick the scene: layout, grade, size, lettering, title, script,
// kicker, photo (one sample for every panel) or photos (one per panel,
// comma-separated). window.__shotReady is set once the cover is painted.
export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const overrides = {};
  for (const key of ['layout', 'grade', 'size', 'lettering', 'title', 'script', 'kicker']) {
    const value = query.get(key);
    if (value) overrides[key] = value;
  }
  const photos = query.get('photos');
  const photo = query.get('photo');
  if (photos || photo) {
    const list = photos ? photos.split(',') : [photo];
    overrides.panels = list.map((p) => ({ photo: p, zoom: 1.1, ox: 0, oy: 0 }));
    while (overrides.panels.length < 4) {
      overrides.panels.push({ photo: list[0], zoom: 1.15, ox: 0, oy: 0 });
    }
  }
  await apply(overrides);
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
