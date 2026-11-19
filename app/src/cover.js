// Cover Snap's drawing engine: turns photos, a caption and a colour grade into a
// multi-panel GTA-style poster on any canvas, at any of the three post sizes.
// Everything here is drawn by hand with the canvas 2D API — no Rockstar artwork,
// no borrowed images, only the user's own photos (or the kit's sample photos)
// plus gradients, a sun disc and bold lettering we draw ourselves.

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
};

// Each layout is a list of panels, in fractions of the cover's width and height.
// The first panel is the hero: the biggest one, where the sun disc is drawn.
export const LAYOUTS = {
  grid: {
    label: 'Sunset Grid',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.62 },
      { x: 0, y: 0.62, w: 0.5, h: 0.38 },
      { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
    ],
  },
  trio: {
    label: 'Neon Trio',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  strip: {
    label: 'Hero + Strip',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.72 },
      { x: 0, y: 0.72, w: 1 / 3, h: 0.28 },
      { x: 1 / 3, y: 0.72, w: 1 / 3, h: 0.28 },
      { x: 2 / 3, y: 0.72, w: 1 / 3, h: 0.28 },
    ],
  },
};

// A grade is a sunset/neon colour treatment painted over every panel after the
// photo: a top tint, a bottom wash, and the colours of the sun disc and caption.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    top: 'rgba(255, 170, 60, 0.10)',
    bottom: 'rgba(214, 48, 120, 0.42)',
    sun: ['rgba(255, 236, 170, 0.95)', 'rgba(255, 110, 60, 0.85)', 'rgba(255, 60, 120, 0)'],
    caption: '#ffffff',
    glow: 'rgba(255, 90, 60, 0.9)',
    filter: 'saturate(1.15) contrast(1.05)',
  },
  neon: {
    label: 'Neon Nights',
    top: 'rgba(0, 229, 255, 0.12)',
    bottom: 'rgba(255, 0, 128, 0.45)',
    sun: ['rgba(190, 250, 255, 0.95)', 'rgba(0, 229, 255, 0.8)', 'rgba(255, 0, 128, 0)'],
    caption: '#ffffff',
    glow: 'rgba(0, 229, 255, 0.95)',
    filter: 'saturate(1.35) contrast(1.1)',
  },
  dusk: {
    label: 'Palm Dusk',
    top: 'rgba(90, 60, 180, 0.14)',
    bottom: 'rgba(30, 10, 60, 0.5)',
    sun: ['rgba(255, 220, 180, 0.9)', 'rgba(255, 130, 80, 0.75)', 'rgba(120, 40, 180, 0)'],
    caption: '#ffe9c9',
    glow: 'rgba(150, 80, 255, 0.9)',
    filter: 'saturate(1.1) contrast(1.08)',
  },
  noir: {
    label: 'Midnight Noir',
    top: 'rgba(10, 10, 30, 0.10)',
    bottom: 'rgba(5, 5, 20, 0.55)',
    sun: ['rgba(230, 230, 240, 0.9)', 'rgba(160, 160, 200, 0.6)', 'rgba(10, 10, 30, 0)'],
    caption: '#ffffff',
    glow: 'rgba(200, 200, 255, 0.8)',
    filter: 'grayscale(0.75) contrast(1.15)',
  },
};

export const CAPTION_STYLES = {
  solid: { label: 'Solid + outline' },
  neon: { label: 'Neon glow' },
  sunset: { label: 'Sunset gradient' },
};

/** The state drawCover reads: photos, which photo fills each panel, layout, grade, texts. */
export function defaultState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    size: 'wide',
    caption: 'Sunset Heist',
    subcaption: 'One last job under the palms',
    captionStyle: 'solid',
    photos: [null, null, null],
    // Per-photo crop: zoom 1..3, and offsets -1..1 inside the panel.
    crops: [
      { zoom: 1, ox: 0, oy: 0 },
      { zoom: 1, ox: 0, oy: 0 },
      { zoom: 1, ox: 0, oy: 0 },
    ],
    // panels[i] is the index of the photo shown in panel i.
    panels: [0, 1, 2],
  };
}

/** Draws one photo into a panel rect, cover-fit, honouring its zoom and offsets. */
function drawPhotoInPanel(ctx, photo, crop, rect) {
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * crop.zoom;
  const pw = iw * scale;
  const ph = ih * scale;
  // Offsets slide the photo inside the panel, up to the spare room the zoom made.
  const spareX = Math.max(0, (pw - rect.w) / 2);
  const spareY = Math.max(0, (ph - rect.h) / 2);
  const dx = rect.x + (rect.w - pw) / 2 - crop.ox * spareX;
  const dy = rect.y + (rect.h - ph) / 2 - crop.oy * spareY;
  ctx.drawImage(photo, dx, dy, pw, ph);
}

/** Paints a panel's empty state: a dark checker of diagonal stripes, so a missing photo reads as a slot. */
function drawEmptyPanel(ctx, rect) {
  ctx.fillStyle = '#241a33';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = Math.max(2, rect.w * 0.01);
  for (let x = -rect.h; x < rect.w + rect.h; x += rect.w * 0.08) {
    ctx.beginPath();
    ctx.moveTo(rect.x + x, rect.y);
    ctx.lineTo(rect.x + x + rect.h, rect.y + rect.h);
    ctx.stroke();
  }
  ctx.restore();
}

/** A setting sun disc, drawn with radial gradients, top-right of the hero panel. */
function drawSun(ctx, hero, grade) {
  const r = Math.min(hero.w, hero.h) * 0.26;
  const cx = hero.x + hero.w * 0.76;
  const cy = hero.y + hero.h * 0.34;
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, grade.sun[0]);
  g.addColorStop(0.55, grade.sun[1]);
  g.addColorStop(1, grade.sun[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Retro sun stripes: thin dark cuts across the disc only, poster style.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 8, 30, 0.35)';
  ctx.fillRect(cx - r, cy + r * 0.35, r * 2, Math.max(2, r * 0.06));
  ctx.fillRect(cx - r, cy + r * 0.62, r * 2, Math.max(2, r * 0.09));
  ctx.restore();
}

/** Bold caption lettering, fitted to the width, with the chosen style. */
function drawCaption(ctx, w, h, state, grade) {
  const text = (state.caption || '').trim().toUpperCase();
  const sub = (state.subcaption || '').trim();
  if (!text && !sub) return;
  const bandTop = h * 0.8;
  const band = ctx.createLinearGradient(0, bandTop, 0, h);
  band.addColorStop(0, 'rgba(12, 4, 24, 0)');
  band.addColorStop(0.45, 'rgba(12, 4, 24, 0.72)');
  band.addColorStop(1, 'rgba(12, 4, 24, 0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandTop, w, h - bandTop);

  const maxWidth = w * 0.9;
  let size = h * 0.115;
  const font = (s) => `${s}px Anton, 'Arial Black', sans-serif`;
  ctx.font = font(size);
  try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas: no letter-spacing */ }
  while (text && ctx.measureText(text).width > maxWidth && size > h * 0.03) {
    size -= 2;
    ctx.font = font(size);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cy = h - h * 0.055;
  if (text) {
    ctx.save();
    if (state.captionStyle === 'sunset') {
      const fg = ctx.createLinearGradient(0, cy - size, 0, cy);
      fg.addColorStop(0, '#fff3c4');
      fg.addColorStop(0.5, '#ffb347');
      fg.addColorStop(1, '#ff2e88');
      ctx.fillStyle = fg;
    } else {
      ctx.fillStyle = grade.caption;
    }
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = 'rgba(10, 2, 20, 0.9)';
    ctx.lineJoin = 'round';
    if (state.captionStyle === 'neon') {
      ctx.shadowColor = grade.glow;
      ctx.shadowBlur = size * 0.45;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = size * 0.12;
    }
    ctx.strokeText(text, w / 2, cy);
    ctx.fillText(text, w / 2, cy);
    ctx.restore();
  }
  if (sub) {
    const subSize = Math.max(12, h * 0.026);
    ctx.font = `600 ${subSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`; } catch { /* see above */ }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillText(sub.toUpperCase(), w / 2, cy - size * 1.18);
    ctx.shadowBlur = 0;
  }
  try { ctx.letterSpacing = '0px'; } catch { /* see above */ }
}

/**
 * Draws the whole cover onto `canvas` at its own pixel size, from `state`.
 * The canvas is cleared first; photos are read only from memory, never uploaded.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.grid;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const gutter = Math.max(4, Math.round(w * 0.008));
  const radius = Math.max(2, Math.round(w * 0.006));

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((p, i) => {
    const rect = {
      x: p.x * w + (p.x > 0 ? gutter / 2 : 0),
      y: p.y * h + (p.y > 0 ? gutter / 2 : 0),
      w: p.w * w - (p.x > 0 ? gutter / 2 : 0) - (p.x + p.w < 1 ? gutter / 2 : 0),
      h: p.h * h - (p.y > 0 ? gutter / 2 : 0) - (p.y + p.h < 1 ? gutter / 2 : 0),
    };
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
    else ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const photo = state.photos[state.panels[i] ?? 0] ?? null;
    const crop = state.crops[state.panels[i] ?? 0] ?? { zoom: 1, ox: 0, oy: 0 };
    if (photo) {
      try { ctx.filter = grade.filter; } catch { /* filter unsupported: draw plain */ }
      drawPhotoInPanel(ctx, photo, crop, rect);
      try { ctx.filter = 'none'; } catch { /* see above */ }
    } else {
      drawEmptyPanel(ctx, rect);
    }
    // Colour grade: a warm wash from the top, a deep wash at the foot.
    const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    wash.addColorStop(0, grade.top);
    wash.addColorStop(1, grade.bottom);
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (i === 0 && photo && rect.w >= rect.h * 0.7) drawSun(ctx, rect, grade);
    ctx.restore();
    // A pale keyline around each panel, poster-grid style.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
    else ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.stroke();
  });

  // Vignette: darkened corners pull the eye to the middle of the poster.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(8, 2, 18, 0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  drawCaption(ctx, w, h, state, grade);
}
