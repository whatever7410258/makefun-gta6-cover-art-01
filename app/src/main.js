// Cover Snap's page wiring: three photo slots, a layout and grade picker, per-photo
// crop sliders, click-a-panel assignment, drag-to-pan on the preview, and PNG export
// at 1080 x 1080, 1080 x 1350 or 1920 x 1080. Photos are read with FileReader into
// memory on this machine and never uploaded anywhere. A `?shot=` query instead sets
// up a fixed scene for a screenshot (see ./shots.js).
import { drawCover, defaultState, SIZES, LAYOUTS, GRADES, CAPTION_STYLES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
let activePanel = 0;

const $ = (id) => document.getElementById(id);

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function resizeCanvas() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
}

function redraw() {
  resizeCanvas();
  drawCover(canvas, state);
}

/** Refreshes the panel-assignment selects after a layout change. */
function buildPanelPickers() {
  const wrap = $('panel-pickers');
  wrap.textContent = '';
  const layout = LAYOUTS[state.layout];
  layout.panels.forEach((_, i) => {
    const label = document.createElement('label');
    label.className = 'panel-pick';
    label.textContent = i === 0 ? 'Hero panel' : `Panel ${i + 1}`;
    const select = document.createElement('select');
    select.setAttribute('aria-label', label.textContent);
    for (let p = 0; p < 3; p++) {
      const opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = `Photo ${p + 1}`;
      select.appendChild(opt);
    }
    select.value = String(state.panels[i] ?? 0);
    select.addEventListener('change', () => {
      state.panels[i] = Number(select.value);
      activePanel = i;
      redraw();
    });
    label.appendChild(select);
    wrap.appendChild(label);
  });
}

/** Builds the three photo-slot cards: file input, sample buttons, crop sliders. */
function buildPhotoSlots() {
  const wrap = $('photo-slots');
  wrap.textContent = '';
  const samples = [
    { name: 'Pier', file: 'pier.jpg' },
    { name: 'Boulevard', file: 'boulevard.jpg' },
  ];
  for (let i = 0; i < 3; i++) {
    const card = document.createElement('section');
    card.className = 'photo-slot';
    card.id = `photo-slot-${i}`;

    const head = document.createElement('h3');
    head.textContent = `Photo ${i + 1}`;
    card.appendChild(head);

    const fileLabel = document.createElement('label');
    fileLabel.textContent = 'Your photo';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      state.photos[i] = await loadImage(URL.createObjectURL(f));
      state.crops[i] = { zoom: 1, ox: 0, oy: 0 };
      syncCropSliders();
      status.textContent = `Photo ${i + 1} loaded — drag it on the preview to position it.`;
      redraw();
    });
    fileLabel.appendChild(file);
    card.appendChild(fileLabel);

    const sampleRow = document.createElement('div');
    sampleRow.className = 'sample-row';
    const sampleLabel = document.createElement('span');
    sampleLabel.textContent = 'Or try a sample:';
    sampleRow.appendChild(sampleLabel);
    samples.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = s.name;
      b.addEventListener('click', async () => {
        state.photos[i] = await loadImage(`samples/${s.file}`);
        state.crops[i] = { zoom: 1, ox: 0, oy: 0 };
        syncCropSliders();
        status.textContent = `Photo ${i + 1}: sample “${s.name}” loaded.`;
        redraw();
      });
      sampleRow.appendChild(b);
    });
    card.appendChild(sampleRow);

    const crop = state.crops[i];
    const mkSlider = (key, label, min, max, step) => {
      const lab = document.createElement('label');
      lab.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(crop[key]);
      input.dataset.slot = String(i);
      input.dataset.key = key;
      input.setAttribute('aria-label', `Photo ${i + 1} ${label}`);
      input.addEventListener('input', () => {
        state.crops[i][key] = Number(input.value);
        redraw();
      });
      lab.appendChild(input);
      return lab;
    };
    card.appendChild(mkSlider('zoom', 'Zoom', 1, 3, 0.05));
    card.appendChild(mkSlider('ox', 'Left / right', -1, 1, 0.05));
    card.appendChild(mkSlider('oy', 'Up / down', -1, 1, 0.05));
    wrap.appendChild(card);
  }
}

/** Puts the crop sliders back in step with state after a photo is (re)loaded. */
function syncCropSliders() {
  document.querySelectorAll('#photo-slots input[type=range]').forEach((input) => {
    const slot = Number(input.dataset.slot);
    input.value = String(state.crops[slot][input.dataset.key]);
  });
}

/** Builds a row of choice buttons (layout, grade, size, caption style). */
function buildChoiceRow(id, entries, current, onPick) {
  const wrap = $(id);
  wrap.textContent = '';
  Object.entries(entries).forEach(([key, value]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = value.label;
    if (key === current) b.classList.add('active');
    b.addEventListener('click', () => {
      onPick(key);
      wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
    });
    wrap.appendChild(b);
  });
}

function buildChoices() {
  buildChoiceRow('layout-row', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    state.panels = LAYOUTS[key].panels.map((_, i) => state.panels[i] ?? Math.min(i, 2));
    activePanel = 0;
    buildPanelPickers();
    redraw();
  });
  buildChoiceRow('grade-row', GRADES, state.grade, (key) => {
    state.grade = key;
    redraw();
  });
  buildChoiceRow('size-row', SIZES, state.size, (key) => {
    state.size = key;
    $('export').textContent = `Export PNG ${SIZES[key].w} x ${SIZES[key].h}`;
    redraw();
  });
  buildChoiceRow('style-row', CAPTION_STYLES, state.captionStyle, (key) => {
    state.captionStyle = key;
    redraw();
  });
}

/** Dragging the preview pans the photo of the panel under the pointer. */
function wireDrag() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const panelAt = (e) => {
    const rect = canvas.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const layout = LAYOUTS[state.layout];
    return layout.panels.findIndex((p) => fx >= p.x && fx < p.x + p.w && fy >= p.y && fy < p.y + p.h);
  };
  canvas.addEventListener('pointerdown', (e) => {
    const i = panelAt(e);
    if (i < 0) return;
    activePanel = i;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const slot = state.panels[activePanel] ?? 0;
    const crop = state.crops[slot];
    crop.ox = Math.max(-1, Math.min(1, crop.ox - ((e.clientX - lastX) / rect.width) * 2));
    crop.oy = Math.max(-1, Math.min(1, crop.oy - ((e.clientY - lastY) / rect.height) * 2));
    lastX = e.clientX;
    lastY = e.clientY;
    syncCropSliders();
    redraw();
  });
  const end = () => {
    dragging = false;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.style.cursor = 'grab';
}

function wireTextAndExport() {
  $('caption').addEventListener('input', (e) => {
    state.caption = e.target.value;
    redraw();
  });
  $('subcaption').addEventListener('input', (e) => {
    state.subcaption = e.target.value;
    redraw();
  });
  $('fill-all').addEventListener('click', () => {
    state.panels = state.panels.map(() => 0);
    buildPanelPickers();
    redraw();
    status.textContent = 'Every panel now shows Photo 1.';
  });
  $('export').addEventListener('click', () => {
    const size = SIZES[state.size];
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    drawCover(off, state);
    off.toBlob((blob) => {
      if (!blob) {
        status.textContent = 'Export failed — try again.';
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      status.textContent = `Saved cover-${size.w}x${size.h}.png`;
    }, 'image/png');
  });
}

buildPhotoSlots();
buildPanelPickers();
buildChoices();
wireDrag();
wireTextAndExport();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, async (sample) => loadImage(`samples/${sample}.jpg`));
} else {
  // Start with the two sample photos already in place, so the first thing
  // anyone sees is a finished-looking poster, not empty slots.
  Promise.all([loadImage('samples/pier.jpg'), loadImage('samples/boulevard.jpg')]).then(([pier, boulevard]) => {
    state.photos[0] = pier;
    state.photos[1] = boulevard;
    state.photos[2] = pier;
    state.crops[0] = { zoom: 1, ox: 0, oy: -0.6 };
    state.crops[2] = { zoom: 1.4, ox: 0.2, oy: -0.6 };
    redraw();
  });
  redraw();
}

// The display font loads after the first paint; redraw once it arrives so the
// caption is set in Anton, not the fallback.
if (document.fonts?.ready) document.fonts.ready.then(() => redraw());
