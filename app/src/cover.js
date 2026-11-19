// Neon Shore Cover Studio — cover rendering engine.
//
// Everything the poster needs lives here: the panel layouts, the neon-sunset
// colour grades, the genre lettering and the print effects (grain, vignette,
// halftone title block, starburst badge). It draws onto any 2D canvas context
// at any size, so the live preview and the exported PNG share one code path.
//
// No Rockstar logo, artwork or font is used anywhere. The lettering is Anton
// (display) and Pacifico (script), both shipped under the SIL Open Font
// License in app/fonts/.

export const EXPORT_SIZES = {
  square: { label: 'Square 1080 × 1080', width: 1080, height: 1080 },
  portrait: { label: 'Portrait 1080 × 1350', width: 1080, height: 1350 },
  wide: { label: 'Wide 1920 × 1080', width: 1920, height: 1080 },
};

export const LAYOUT_IDS = ['hero3', 'grid4', 'grid9', 'fullbleed', 'tilted', 'split'];

export const LAYOUT_LABELS = {
  hero3: 'Hero + Two',
  grid4: 'Four Panel',
  grid9: 'Nine Panel',
  fullbleed: 'Full Bleed',
  tilted: 'Tilted Snaps',
  split: 'Diagonal Split',
};

export const GRADE_IDS = ['sunset', 'neon', 'palm', 'tealorange', 'mono', 'vicepink'];

export const GRADE_LABELS = {
  sunset: 'Sunset',
  neon: 'Neon Night',
  palm: 'Palm Dusk',
  tealorange: 'Teal Orange',
  mono: 'Mono Noir',
  vicepink: 'Vice Pink',
};

// Each grade: a canvas filter for the photo plus one or two colour washes
// painted over it. The washes are linear gradients with a blend mode, which
// is what gives the whole cover one consistent neon-sunset grade.
export const GRADES = {
  sunset: {
    filter: 'saturate(1.35) contrast(1.08) sepia(0.22)',
    washes: [
      { stops: [[0, 'rgba(255,122,26,0.20)'], [1, 'rgba(255,0,110,0.22)']], blend: 'overlay', angle: 135 },
    ],
  },
  neon: {
    filter: 'saturate(1.55) contrast(1.15) hue-rotate(-12deg)',
    washes: [
      { stops: [[0, 'rgba(255,45,149,0.26)'], [0.55, 'rgba(120,0,255,0.10)'], [1, 'rgba(0,229,255,0.26)']], blend: 'soft-light', angle: 115 },
    ],
  },
  palm: {
    filter: 'saturate(1.22) contrast(1.06) sepia(0.32) hue-rotate(-8deg)',
    washes: [
      { stops: [[0, 'rgba(0,128,128,0.16)'], [1, 'rgba(255,176,66,0.20)']], blend: 'overlay', angle: 160 },
    ],
  },
  tealorange: {
    filter: 'saturate(1.32) contrast(1.12)',
    washes: [
      { stops: [[0, 'rgba(0,150,170,0.24)'], [1, 'rgba(255,120,40,0.24)']], blend: 'soft-light', angle: 45 },
    ],
  },
  mono: {
    filter: 'grayscale(1) contrast(1.18) brightness(1.04)',
    washes: [
      { stops: [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(0,0,0,0.14)']], blend: 'overlay', angle: 135 },
    ],
  },
  vicepink: {
    filter: 'saturate(1.45) contrast(1.08) hue-rotate(18deg)',
    washes: [
      { stops: [[0, 'rgba(255,93,242,0.24)'], [1, 'rgba(120,40,255,0.22)']], blend: 'overlay', angle: 120 },
    ],
  },
};

export const DEFAULT_TITLE = 'Neon Shore';
export const DEFAULT_SUBTITLE = 'nights on the boulevard';

// A panel slot: which photo fills it and how that photo is cropped.
// zoom 1 fills the panel edge to edge; ox/oy shift the photo inside it.
// anchorY picks where a too-tall photo is cropped from: 0 is the top of
// the photo, 0.5 its middle — near-top keeps faces in wide panels.
export function blankPanel(photo = 0) {
  return { photo, zoom: 1.15, ox: 0, oy: 0, anchorY: 0.5 };
}

export function defaultPanels(layoutId) {
  const count = layoutId === 'grid9' ? 9 : layoutId === 'fullbleed' ? 1 : layoutId === 'split' ? 3 : layoutId === 'tilted' ? 3 : layoutId === 'grid4' ? 4 : 3;
  const panels = [];
  for (let i = 0; i < count; i += 1) panels.push(blankPanel(i % 2));
  // Wide panels crop portrait photos top and bottom: anchor near the top
  // so faces stay in frame instead of being cropped at the forehead.
  // Full Bleed fills the whole cover, so it keeps the centred crop.
  if (layoutId !== 'fullbleed') {
    for (const panel of panels) panel.anchorY = 0.15;
  }
  return panels;
}

export function defaultState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    title: DEFAULT_TITLE,
    subtitle: DEFAULT_SUBTITLE,
    badge: true,
    grain: true,
    vignette: true,
    selected: 0,
    panels: defaultPanels('hero3'),
  };
}

// ---------------------------------------------------------------- layouts
//
// layoutPanels returns the photo rectangles for a cover of width W and
// height H, plus the title block rectangle. Gaps are poster-white gutters
// on a deep plum backing, which reads as a printed poster at any size.

function rect(x, y, w, h, angle = 0, clip = null) {
  return { x, y, w, h, angle, clip };
}

export function layoutPanels(layoutId, W, H) {
  const gap = Math.round(W * 0.008);
  const titleH = Math.round(H * (layoutId === 'fullbleed' ? 0.30 : 0.29));
  const artH = H - titleH - gap;
  const artY = 0;
  switch (layoutId) {
    case 'hero3': {
      const heroW = Math.round(W * 0.60);
      const sideW = W - heroW - gap;
      const sideH = Math.round((artH - gap) / 2);
      return {
        panels: [
          rect(0, artY, heroW, artH),
          rect(heroW + gap, artY, sideW, sideH),
          rect(heroW + gap, artY + sideH + gap, sideW, artH - sideH - gap),
        ],
        title: rect(0, H - titleH, W, titleH),
      };
    }
    case 'grid4': {
      const cw = Math.round((W - gap) / 2);
      const ch = Math.round((artH - gap) / 2);
      return {
        panels: [
          rect(0, artY, cw, ch), rect(cw + gap, artY, W - cw - gap, ch),
          rect(0, artY + ch + gap, cw, artH - ch - gap),
          rect(cw + gap, artY + ch + gap, W - cw - gap, artH - ch - gap),
        ],
        title: rect(0, H - titleH, W, titleH),
      };
    }
    case 'grid9': {
      const cw = Math.round((W - gap * 2) / 3);
      const ch = Math.round((artH - gap * 2) / 3);
      const panels = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          panels.push(rect(c * (cw + gap), artY + r * (ch + gap), cw, ch));
        }
      }
      return { panels, title: rect(0, H - titleH, W, titleH) };
    }
    case 'fullbleed': {
      return {
        panels: [rect(0, 0, W, H)],
        title: rect(0, H - titleH, W, titleH),
      };
    }
    case 'tilted': {
      const heroW = Math.round(W * 0.62);
      const heroH = Math.round(artH * 0.94);
      const snapW = Math.round(W * 0.36);
      const snapH = Math.round(artH * 0.42);
      return {
        panels: [
          rect(Math.round(W * 0.02), Math.round(artH * 0.02), heroW, heroH, -3),
          rect(Math.round(W * 0.60), Math.round(artH * 0.03), snapW, snapH, 4),
          rect(Math.round(W * 0.63), Math.round(artH * 0.50), snapW, snapH, -4),
        ],
        title: rect(0, H - titleH, W, titleH),
      };
    }
    case 'split': {
      // Diagonal split: two photos share the top half on a diagonal, one
      // wide photo spans the lower half. The diagonal is cut with clips.
      const topH = Math.round(artH * 0.55);
      return {
        panels: [
          rect(0, artY, W, topH, 0, 'diag-left'),
          rect(0, artY, W, topH, 0, 'diag-right'),
          rect(0, artY + topH + gap, W, artH - topH - gap),
        ],
        title: rect(0, H - titleH, W, titleH),
      };
    }
    default:
      return layoutPanels('hero3', W, H);
  }
}

// ------------------------------------------------------------ grade + draw

function washGradient(ctx, wash, w, h) {
  const rad = (wash.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const cx = w / 2;
  const cy = h / 2;
  const len = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
  const g = ctx.createLinearGradient(cx - dx * len, cy - dy * len, cx + dx * len, cy + dy * len);
  for (const [stop, color] of wash.stops) g.addColorStop(stop, color);
  return g;
}

// Paint one photo into one panel rectangle, graded, at cover-fit scale.
function drawPhotoInto(ctx, img, panel, slot, grade) {
  const { x, y, w, h, angle = 0, clip = null } = slot;
  const scratch = drawPhotoInto.scratch ??= document.createElement('canvas');
  const sctx = scratch.getContext('2d');
  scratch.width = Math.max(2, Math.round(w));
  scratch.height = Math.max(2, Math.round(h));
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.filter = grade.filter;
  const base = Math.max(scratch.width / img.naturalWidth, scratch.height / img.naturalHeight);
  const scale = base * (panel.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (scratch.width - dw) / 2 + (panel.ox || 0) * scratch.width * 0.25;
  const dy = (scratch.height - dh) * (panel.anchorY ?? 0.5) + (panel.oy || 0) * scratch.height * 0.25;
  sctx.drawImage(img, dx, dy, dw, dh);
  sctx.filter = 'none';
  for (const wash of grade.washes) {
    sctx.globalCompositeOperation = wash.blend;
    sctx.fillStyle = washGradient(sctx, wash, scratch.width, scratch.height);
    sctx.fillRect(0, 0, scratch.width, scratch.height);
  }
  sctx.globalCompositeOperation = 'source-over';

  ctx.save();
  if (clip === 'diag-left') {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.62, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.clip();
  } else if (clip === 'diag-right') {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w * 0.62, y + h);
    ctx.closePath();
    ctx.clip();
  }
  if (angle) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(scratch, -w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, Math.round(w * 0.012));
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  } else {
    ctx.drawImage(scratch, x, y, w, h);
  }
  ctx.restore();
}

function drawHalftone(ctx, x, y, w, h, color) {
  const step = Math.max(10, Math.round(w * 0.016));
  ctx.fillStyle = color;
  for (let gy = y + step / 2; gy < y + h; gy += step) {
    for (let gx = x + step / 2; gx < x + w; gx += step) {
      const fade = 1 - (gx - x) / w;
      const r = Math.max(0.6, step * 0.16 * (0.4 + fade));
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStarburstBadge(ctx, cx, cy, r, labelTop, labelBottom) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i += 1) {
    const ang = (i * Math.PI) / spikes - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const px = Math.cos(ang) * rr;
    const py = Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = '#1a0b2e';
  ctx.stroke();
  ctx.fillStyle = '#1a0b2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(r * 0.34)}px Anton, sans-serif`;
  ctx.fillText(labelTop, 0, -r * 0.16);
  ctx.font = `900 ${Math.round(r * 0.30)}px Anton, sans-serif`;
  ctx.fillText(labelBottom, 0, r * 0.22);
  ctx.restore();
}

function fitTitleFont(ctx, text, maxWidth, startPx, family) {
  let px = startPx;
  ctx.font = `${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${px}px ${family}`;
  }
  return px;
}

function drawTitleBlock(ctx, state, titleRect, W, H) {
  const { x, y, w, h } = titleRect;
  // Deep plum band with a neon top rule.
  ctx.fillStyle = '#160a24';
  ctx.fillRect(x, y, w, h);
  const rule = ctx.createLinearGradient(x, 0, x + w, 0);
  rule.addColorStop(0, '#ff6b35');
  rule.addColorStop(0.5, '#ff2e88');
  rule.addColorStop(1, '#00e5ff');
  ctx.fillStyle = rule;
  ctx.fillRect(x, y, w, Math.max(3, Math.round(H * 0.004)));

  // Halftone dots fading across the band.
  drawHalftone(ctx, x + w * 0.62, y + h * 0.12, w * 0.36, h * 0.76, 'rgba(255,46,136,0.20)');

  // Title: Anton, sunset gradient, dark outline, slight forward slant.
  const pad = Math.round(w * 0.045);
  const title = (state.title || DEFAULT_TITLE).toUpperCase();
  const maxTitleW = w - pad * 2 - (state.badge ? w * 0.17 : 0);
  ctx.save();
  ctx.translate(x + pad, y + h * 0.52);
  ctx.transform(1, 0, -0.05, 1, 0, 0);
  const titlePx = fitTitleFont(ctx, title, maxTitleW, Math.round(h * 0.52), 'Anton, sans-serif');
  const grad = ctx.createLinearGradient(0, -titlePx * 0.7, 0, titlePx * 0.45);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.45, '#ff6b35');
  grad.addColorStop(0.75, '#ff2e88');
  grad.addColorStop(1, '#b537f2');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12041f';
  ctx.lineWidth = Math.max(3, titlePx * 0.09);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // Subtitle: Pacifico script in neon pink with a glow.
  const subtitle = state.subtitle || '';
  if (subtitle) {
    ctx.save();
    ctx.font = `${Math.round(h * 0.20)}px Pacifico, cursive`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#ff5df2';
    ctx.shadowBlur = Math.round(h * 0.09);
    ctx.fillStyle = '#ffe9fb';
    ctx.fillText(subtitle, x + pad, y + h * 0.90);
    ctx.restore();
  }

  // Starburst badge at the right of the band.
  if (state.badge) {
    drawStarburstBadge(ctx, x + w - w * 0.085, y + h * 0.46, Math.round(h * 0.36), 'EST.', '2026');
  }
}

let grainTile = null;
function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 40);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = ctx.createPattern(tile, 'repeat');
  return grainTile;
}

// Draw the whole cover. `photos` is an array of loaded HTMLImageElements
// (or null slots). Returns nothing; throws if a needed photo is missing.
export function drawCover(ctx, state, photos, W, H) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const { panels, title } = layoutPanels(state.layout, W, H);

  // Plum backing shows through the gutters.
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, W, H);

  panels.forEach((slot, i) => {
    const panel = state.panels[i] || blankPanel(0);
    const img = photos[panel.photo];
    if (!img) return;
    drawPhotoInto(ctx, img, panel, slot, grade);
  });

  // Soft white frame lines between panels for the printed-poster read.
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = Math.max(1, Math.round(W * 0.0015));
  for (const slot of panels) {
    if (slot.angle) continue;
    ctx.strokeRect(slot.x + 0.5, slot.y + 0.5, slot.w, slot.h);
  }

  drawTitleBlock(ctx, state, title, W, H);

  if (state.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(10,2,20,0)');
    vg.addColorStop(1, 'rgba(10,2,20,0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// Panel hit-test in preview coordinates: given the preview canvas size and
// a click point, return the panel index or -1. Mirrors layoutPanels.
export function panelAt(state, px, py, previewW, previewH) {
  const coverW = 1080;
  const coverH = previewH / previewW * 1080;
  const { panels } = layoutPanels(state.layout, coverW, coverH);
  const sx = px / previewW * coverW;
  const sy = py / previewH * coverH;
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const s = panels[i];
    if (sx >= s.x && sx <= s.x + s.w && sy >= s.y && sy <= s.y + s.h) return i;
  }
  return -1;
}
