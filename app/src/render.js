// Draws a cover onto a canvas at the canvas's own size: the layout's panels
// with their photos, the grade tint, a synthwave sun, halftone dots, film
// grain, a vignette and the caption lettering. Everything is drawn with the
// 2D canvas API; no image comes from outside app/.
import { LAYOUTS, GRADES, SIZES } from './grades.js';

const GUTTER = 0.014; // fraction of the cover width left between panels

/** The panel rectangles of a layout in pixels, with a gutter between them. */
export function layoutRects(layoutKey, w, h) {
  const def = LAYOUTS[layoutKey] ?? LAYOUTS['hero-left'];
  const g = w * GUTTER;
  return def.panels.map(([fx, fy, fw, fh]) => ({
    x: fx * w + g / 2,
    y: fy * h + g / 2,
    w: fw * w - g,
    h: fh * h - g,
  }));
}

/** The pixel size of an export-size key. */
export function sizeOf(sizeKey) {
  return SIZES[sizeKey] ?? SIZES['1920x1080'];
}

/** Draws one photo cover-filling its panel, with the panel's zoom and pan. */
function drawPanelPhoto(ctx, rect, img, panel, grade) {
  if (!img) {
    const solid = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    solid.addColorStop(0, '#3b1155');
    solid.addColorStop(1, '#12041f');
    ctx.fillStyle = solid;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    return;
  }
  const zoom = panel.zoom || 1;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const maxX = Math.max(0, (dw - rect.w) / 2);
  const maxY = Math.max(0, (dh - rect.h) / 2);
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * maxX;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * maxY;
  ctx.save();
  ctx.filter = grade.filter || 'none';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Washes a panel with the grade's top-to-bottom tint. */
function applyGradeTint(ctx, rect, grade) {
  const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  tint.addColorStop(0, grade.top);
  tint.addColorStop(1, grade.bottom);
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** A retro striped sun, drawn offscreen so its stripes can be cut out. */
function drawSynthwaveSun(ctx, cx, cy, r, colors) {
  const off = document.createElement('canvas');
  off.width = Math.ceil(r * 2 + 4);
  off.height = Math.ceil(r * 2 + 4);
  const o = off.getContext('2d');
  const glow = o.createLinearGradient(0, 0, 0, off.height);
  glow.addColorStop(0, colors[0]);
  glow.addColorStop(0.55, colors[1]);
  glow.addColorStop(1, colors[2]);
  o.fillStyle = glow;
  o.beginPath();
  o.arc(r + 2, r + 2, r, 0, Math.PI * 2);
  o.fill();
  o.globalCompositeOperation = 'destination-out';
  let y = r + 2 + r * 0.05;
  let thickness = 2;
  while (y < r * 2 + 2) {
    o.fillRect(0, y, off.width, thickness);
    y += thickness + r * 0.12;
    thickness += 2;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.85;
  ctx.drawImage(off, cx - r - 2, cy - r - 2);
  ctx.restore();
}

let halftonePattern = null;
let grainPattern = null;

/** A field of print dots over the whole cover. */
function drawHalftoneDots(ctx, w, h) {
  if (!halftonePattern) {
    const dot = document.createElement('canvas');
    dot.width = 14;
    dot.height = 14;
    const p = dot.getContext('2d');
    p.fillStyle = 'rgba(0, 0, 0, 0.55)';
    p.beginPath();
    p.arc(7, 7, 2.2, 0, Math.PI * 2);
    p.fill();
    halftonePattern = ctx.createPattern(dot, 'repeat');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = halftonePattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Random grey noise over the whole cover. */
function drawFilmGrain(ctx, w, h) {
  if (!grainPattern) {
    const noise = document.createElement('canvas');
    noise.width = 160;
    noise.height = 160;
    const p = noise.getContext('2d');
    const data = p.createImageData(160, 160);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 118 + Math.floor(Math.random() * 40);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    p.putImageData(data, 0, 0);
    grainPattern = ctx.createPattern(noise, 'repeat');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Darkens the cover's edges so the caption reads. */
function drawVignette(ctx, w, h) {
  const shade = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.72,
  );
  shade.addColorStop(0, 'rgba(8, 0, 18, 0)');
  shade.addColorStop(1, 'rgba(8, 0, 18, 0.5)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

/** Shrinks a font until its text fits, returning the size used. */
function fitFont(ctx, text, fontFamily, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `400 ${size}px ${fontFamily}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `400 ${size}px ${fontFamily}`;
  }
  return size;
}

/** Kicker, script line and big title across the foot of the cover. */
function drawCaptionLettering(ctx, w, h, state) {
  const scrim = ctx.createLinearGradient(0, h * 0.58, 0, h);
  scrim.addColorStop(0, 'rgba(12, 2, 24, 0)');
  scrim.addColorStop(1, 'rgba(12, 2, 24, 0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  const cx = w / 2;
  const title = (state.title || '').trim().toUpperCase();
  const script = (state.script || '').trim();
  const kicker = (state.kicker || '').trim().toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const titleSize = title
    ? fitFont(ctx, title, 'Anton', Math.round(h * 0.115), w * 0.92)
    : 0;
  const titleY = h - h * 0.055;
  const scriptSize = script
    ? fitFont(ctx, script, 'Pacifico', Math.round(h * 0.052), w * 0.8)
    : 0;
  const scriptY = titleY - titleSize * 0.98;
  const kickerSize = kicker
    ? fitFont(ctx, kicker, 'Anton', Math.round(h * 0.028), w * 0.8)
    : 0;
  const kickerY = script ? scriptY - scriptSize * 1.15 : titleY - titleSize * 0.98;

  if (kicker) {
    ctx.font = `400 ${kickerSize}px Anton`;
    ctx.letterSpacing = `${Math.round(h * 0.008)}px`;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(kicker, cx, kickerY);
    ctx.letterSpacing = '0px';
  }
  if (script) {
    ctx.font = `400 ${scriptSize}px Pacifico`;
    ctx.fillStyle = '#ff7ad9';
    ctx.shadowColor = 'rgba(255, 41, 117, 0.8)';
    ctx.shadowBlur = scriptSize * 0.35;
    ctx.fillText(script, cx, scriptY);
    ctx.shadowBlur = 0;
  }
  if (title) {
    ctx.font = `400 ${titleSize}px Anton`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160428';
    ctx.lineWidth = Math.max(2, titleSize * 0.16);
    ctx.shadowColor = state.lettering === 'neon' ? '#ff2975' : 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = titleSize * (state.lettering === 'neon' ? 0.35 : 0.18);
    ctx.shadowOffsetY = titleSize * 0.05;
    if (state.lettering === 'neon') {
      const neon = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY);
      neon.addColorStop(0, '#fff7ad');
      neon.addColorStop(0.5, '#ff9a3d');
      neon.addColorStop(1, '#ff2975');
      ctx.fillStyle = neon;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.strokeText(title, cx, titleY);
    ctx.fillText(title, cx, titleY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
}

/** Small poster credits along the very bottom edge. */
function drawPosterCredits(ctx, w, h) {
  ctx.save();
  ctx.font = `400 ${Math.max(11, Math.round(h * 0.014))}px Anton`;
  ctx.letterSpacing = `${Math.round(h * 0.004)}px`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.textAlign = 'left';
  ctx.fillText('VICE COVER STUDIO', w * 0.035, h - h * 0.022);
  ctx.textAlign = 'right';
  ctx.fillText('EST. 2026', w * 0.965, h - h * 0.022);
  ctx.restore();
}

/**
 * Renders the whole cover for a state onto `canvas` (at the canvas's own
 * size). `images` maps a photo key to its loaded image, or nothing.
 */
export function renderCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES['neon-sunset'];
  const rects = layoutRects(state.layout, w, h);
  const photoOf = (key) => images.get(key) ?? null;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: 'none', zoom: 1, ox: 0, oy: 0 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    drawPanelPhoto(ctx, rect, photoOf(panel.photo), panel, grade);
    applyGradeTint(ctx, rect, grade);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, Math.round(w * 0.003));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  if (state.sun && rects.length > 0) {
    const hero = rects.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b), rects[0]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(hero.x, hero.y, hero.w, hero.h);
    ctx.clip();
    drawSynthwaveSun(
      ctx,
      hero.x + hero.w * 0.84,
      hero.y + hero.h * 0.13,
      Math.min(hero.w, hero.h) * 0.11,
      grade.sun,
    );
    ctx.restore();
  }

  if (state.halftone) drawHalftoneDots(ctx, w, h);
  if (state.grain) drawFilmGrain(ctx, w, h);
  if (state.vignette) drawVignette(ctx, w, h);
  drawCaptionLettering(ctx, w, h, state);
  drawPosterCredits(ctx, w, h);
}
