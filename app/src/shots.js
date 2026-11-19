// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the cover alone, full-bleed. Query knobs pick the
// scene: layout, grade, size, caption, subcaption, style, and photo1..3 (a sample
// name). window.__shotReady is set once the scene is painted, after the font loads.
import { drawCover, SIZES, LAYOUTS, GRADES } from './cover.js';

function applyQuery(state, query) {
  if (query.get('layout') in LAYOUTS) state.layout = query.get('layout');
  if (query.get('grade') in GRADES) state.grade = query.get('grade');
  if (query.get('size') in SIZES) state.size = query.get('size');
  if (query.get('caption')) state.caption = query.get('caption');
  if (query.get('subcaption') !== null) state.subcaption = query.get('subcaption') ?? '';
  if (['solid', 'neon', 'sunset'].includes(query.get('style'))) state.captionStyle = query.get('style');
}

export async function runShot(shot, query, state, loadSample) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  applyQuery(state, query);
  const names = [
    query.get('photo1') ?? 'pier',
    query.get('photo2') ?? 'boulevard',
    query.get('photo3') ?? 'pier',
  ];
  for (let i = 0; i < 3; i++) state.photos[i] = await loadSample(names[i]);
  state.crops[2] = { zoom: 1.4, ox: 0.2, oy: -0.6 };
  state.crops[0] = { zoom: 1, ox: 0, oy: -0.6 };
  state.panels = LAYOUTS[state.layout].panels.map((_, i) => Math.min(i, 2));
  // Panels show the right photos in the pickers, then the cover is drawn.
  const canvas = document.getElementById('cover');
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  const captionInput = document.getElementById('caption');
  if (captionInput) captionInput.value = state.caption;
  const subInput = document.getElementById('subcaption');
  if (subInput) subInput.value = state.subcaption;
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch { /* fallback font: the scene still paints */ }
  drawCover(canvas, state);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
