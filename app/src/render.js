// Canvas renderer for Neon Coast Cover Studio: draws the multi-panel cover
// with its grade, synthwave sun, halftone, grain, vignette, caption and badge.
// Everything is drawn from the state; no network, no fonts beyond system stacks.

import { LAYOUTS } from './state.js';
import { gradeById } from './grades.js';

/** Deterministic PRNG so grain looks the same on every export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pixel rects for a layout, with gutters between panels. */
export function layoutRects(layoutId, W, H) {
  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  const g = Math.max(4, Math.round(W * 0.012));
  return layout.panels.map((p) => ({
    x: Math.round(p.x * W + (p.x > 0 ? g / 2 : 0)),
    y: Math.round(p.y * H + (p.y > 0 ? g / 2 : 0)),
    w: Math.round(p.w * W - (p.x > 0 ? g / 2 : 0) - (p.x + p.w < 1 ? g / 2 : 0)),
    h: Math.round(p.h * H - (p.y > 0 ? g / 2 : 0) - (p.y + p.h < 1 ? g / 2 : 0)),
    diagonal: layout.diagonal === true,
  }));
}

/** Draws one photo cover-fitting its rect, honouring the slot's zoom/pan. */
function drawPhotoCover(ctx, img, rect, slot) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (slot?.zoom ?? 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (slot?.ox ?? 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (slot?.oy ?? 0) * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** A synthwave sun: a striped disc, drawn as stacked bands that narrow downward. */
function drawSun(ctx, cx, cy, r, grade) {
  const bands = 14;
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, grade.titleFrom);
  grad.addColorStop(0.55, grade.horizon);
  grad.addColorStop(1, grade.sky);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = grad;
  for (let i = 0; i < bands; i++) {
    const y0 = cy - r + (2 * r * i) / bands;
    const y1 = cy - r + (2 * r * (i + 1)) / bands;
    const gap = i < 4 ? 0 : (i - 3) * r * 0.012;
    const my = (y0 + y1) / 2;
    const half = Math.sqrt(Math.max(0, r * r - (my - cy) * (my - cy)));
    ctx.fillRect(cx - half, y0 + gap / 2, half * 2, Math.max(0, y1 - y0 - gap));
  }
  ctx.restore();
}

/** Halftone dots in the lower-right corner, fading out toward the centre. */
function drawHalftone(ctx, W, H, grade) {
  ctx.save();
  ctx.fillStyle = grade.accent;
  const step = Math.max(10, Math.round(W / 90));
  const cx = W * 0.92;
  const cy = H * 0.9;
  for (let y = H * 0.62; y < H; y += step) {
    for (let x = W * 0.6; x < W; x += step) {
      const d = Math.hypot(x - cx, y - cy) / (W * 0.45);
      const r = Math.max(0, (1 - d)) * step * 0.32;
      if (r > 0.4) {
        ctx.globalAlpha = 0.28 * (1 - d);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** Film grain from a seeded generator, so exports are stable. */
function drawGrain(ctx, W, H) {
  const rand = mulberry32(20261120);
  ctx.save();
  ctx.globalAlpha = 0.07;
  const n = Math.round((W * H) / 900);
  for (let i = 0; i < n; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * W, rand() * H, 1.6, 1.6);
  }
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A starburst coast badge with the studio name. */
function drawBadge(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.8;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = grade.accent;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = 'rgba(20,5,40,0.85)';
  ctx.stroke();
  ctx.fillStyle = '#1a0b2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${r * 0.34}px 'Arial Black', 'Impact', sans-serif`;
  ctx.fillText('NEON', 0, -r * 0.16);
  ctx.fillText('COAST', 0, r * 0.2);
  ctx.font = `700 ${r * 0.16}px 'Arial Black', 'Impact', sans-serif`;
  ctx.fillText('EST. 2026', 0, r * 0.52);
  ctx.restore();
}

/** The caption block: kicker, big gradient title, script line. */
function drawCaption(ctx, W, H, state, grade) {
  const margin = Math.round(W * 0.045);
  const base = H - Math.round(H * 0.055);
  // Scrim so lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, H * 0.58, 0, H);
  scrim.addColorStop(0, 'rgba(10,4,28,0)');
  scrim.addColorStop(0.55, 'rgba(10,4,28,0.55)');
  scrim.addColorStop(1, 'rgba(10,4,28,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.58, W, H * 0.42);

  const kickerSize = Math.max(14, Math.round(W * 0.022));
  const titleSize = Math.max(34, Math.round(W * 0.105));
  const scriptSize = Math.max(18, Math.round(W * 0.038));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Script line sits above the title, in cursive with a neon glow.
  ctx.save();
  ctx.font = `italic 700 ${scriptSize}px 'Comic Sans MS', 'Segoe Script', cursive`;
  ctx.fillStyle = grade.scriptColor;
  ctx.shadowColor = grade.scriptColor;
  ctx.shadowBlur = Math.round(W * 0.012);
  ctx.fillText(state.script || '', margin, base - titleSize - scriptSize * 0.35);
  ctx.restore();

  // Kicker: small caps, letterspaced.
  ctx.save();
  ctx.font = `700 ${kickerSize}px 'Arial Black', 'Impact', sans-serif`;
  ctx.fillStyle = '#ffffff';
  const kicker = (state.kicker || '').toUpperCase();
  let kx = margin;
  for (const ch of kicker) {
    ctx.fillText(ch, kx, base - titleSize - scriptSize - kickerSize * 0.4);
    kx += ctx.measureText(ch).width + kickerSize * 0.28;
  }
  ctx.restore();

  // Title: fit the width, gradient fill, dark outline.
  const title = (state.title || '').toUpperCase();
  let size = titleSize;
  ctx.font = `900 ${size}px 'Arial Black', 'Impact', sans-serif`;
  while (size > 20 && ctx.measureText(title).width > W - margin * 2) {
    size -= 2;
    ctx.font = `900 ${size}px 'Arial Black', 'Impact', sans-serif`;
  }
  const grad = ctx.createLinearGradient(0, base - size, 0, base);
  grad.addColorStop(0, grade.titleFrom);
  grad.addColorStop(1, grade.titleTo);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.07);
  ctx.strokeStyle = 'rgba(12,4,30,0.9)';
  if (state.lettering === 'neon') {
    ctx.shadowColor = grade.sky;
    ctx.shadowBlur = Math.round(W * 0.02);
    ctx.fillStyle = '#ffffff';
  } else if (state.lettering === 'outline') {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = Math.max(4, size * 0.09);
    ctx.strokeStyle = '#ffffff';
  } else {
    ctx.fillStyle = grad;
  }
  ctx.strokeText(title, margin, base);
  ctx.fillText(title, margin, base);
  ctx.restore();
}

/** The outline path of a panel: a rectangle, or the diagonal slant for the diagonal layout. */
function panelPath(ctx, rect, W, H) {
  ctx.beginPath();
  if (rect.diagonal) {
    if (rect.y === 0) {
      ctx.moveTo(0, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, H * 0.45);
      ctx.lineTo(0, H * 0.62);
    } else {
      ctx.moveTo(0, H * 0.62);
      ctx.lineTo(W, H * 0.45);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
    }
    ctx.closePath();
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
}

/** Renders the whole cover into ctx at W x H. */
export function renderCover(ctx, W, H, state) {
  const grade = gradeById(state.grade);
  const rects = layoutRects(state.layout, W, H);
  const g = Math.max(4, Math.round(W * 0.012));

  // Backdrop: deep grade colour shows through the gutters.
  ctx.fillStyle = grade.deep;
  ctx.fillRect(0, 0, W, H);

  // Panels: photos, clipped to their rects (diagonal layout clips on a slant).
  rects.forEach((rect, i) => {
    const slot = state.panels[i];
    const photo = slot && slot.photo >= 0 ? state.photos[slot.photo] : null;
    ctx.save();
    panelPath(ctx, rect, W, H);
    ctx.clip();
    if (photo?.img) {
      drawPhotoCover(ctx, photo.img, rect, slot);
    } else {
      const pg = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      pg.addColorStop(0, grade.sky);
      pg.addColorStop(1, grade.deep);
      ctx.fillStyle = pg;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    // Grade wash over the photo.
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    wash.addColorStop(0, grade.sky);
    wash.addColorStop(1, grade.horizon);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();

    // White gutter frame around the panel, following its outline.
    ctx.save();
    panelPath(ctx, rect, W, H);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, g * 0.45);
    ctx.stroke();
    ctx.restore();
  });

  // Synthwave sun peeking from the biggest panel's top-left corner, over the
  // sky and clear of faces even in narrow panels.
  if (state.effects.sun) {
    const big = rects.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
    drawSun(ctx, big.x + big.w * 0.13, big.y + big.h * 0.09, Math.min(big.w, big.h) * 0.16, grade);
  }
  if (state.effects.halftone) drawHalftone(ctx, W, H, grade);
  if (state.effects.vignette) drawVignette(ctx, W, H);
  drawCaption(ctx, W, H, state, grade);
  if (state.effects.badge) {
    drawBadge(ctx, W - Math.round(W * 0.085), Math.round(H * 0.085), Math.round(W * 0.062), grade);
  }
  if (state.effects.grain) drawGrain(ctx, W, H);
}

/** Renders the cover onto a fresh canvas of the requested size. */
export function renderToCanvas(W, H, state) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  renderCover(canvas.getContext('2d'), W, H, state);
  return canvas;
}
