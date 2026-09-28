// Retro effects shared by the homepage and /vibe. Each feature sets itself up only if its elements exist.

// Pixel cursor — only on devices with a fine pointer that can hover
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // O = outline, I = fill (arrow: paper/ink, hand: ink/paper); each cell renders at 2px
  const ARROW = [
    'O...........',
    'OO..........',
    'OIO.........',
    'OIIO........',
    'OIIIO.......',
    'OIIIIO......',
    'OIIIIIO.....',
    'OIIIIIIO....',
    'OIIIIIIIO...',
    'OIIIIIIIIO..',
    'OIIIIIIIIIO.',
    'OIIIIIIOOOOO',
    'OIIIOIIO....',
    'OIIOOIIO....',
    'OIO..OIIO...',
    'OO...OIIO...',
    'O.....OIIO..',
    '......OIIO..',
    '.......OO...',
  ];
  const HAND = [
    '.....OO.........',
    '....OIIO........',
    '....OIIO........',
    '....OIIO........',
    '....OIIO........',
    '....OIIOOO......',
    '....OIIOIIOOO...',
    '....OIIOIIOIIOO.',
    '.OO.OIIOIIOIIOIO',
    'OIIOOIIIIIIIIOIO',
    'OIIIOIIIIIIIIIIO',
    '.OIIIIIIIIIIIIIO',
    '..OIIIIIIIIIIIIO',
    '..OIIIIIIIIIIIO.',
    '...OIIIIIIIIIIO.',
    '...OIIIIIIIIIO..',
    '....OIIIIIIIIO..',
    '....OIIIIIIIIO..',
    '....OOOOOOOOOO..',
  ];

  // Windows 3.1-style hourglass; sand cells are drawn as outline (ink)
  const GLASS = [
    'OOOOOOOOOOOO',
    'OOOOOOOOOOOO',
    '.OIIIIIIIIO.',
    '.OIIIIIIIIO.',
    '.OIIIIIIIIO.',
    '..OIIIIIIO..',
    '...OIIIIO...',
    '....OIIO....',
    '....OIIO....',
    '...OIIIIO...',
    '..OIIIIIIO..',
    '.OIIIIIIIIO.',
    '.OIIIIIIIIO.',
    '.OIIIIIIIIO.',
    'OOOOOOOOOOOO',
    'OOOOOOOOOOOO',
  ];
  // Per frame: first sand row in the top bulb, first sand row in the bottom bulb, falling stream
  const SAND = [[4, 14, false], [5, 13, true], [6, 12, true], [8, 11, false]];

  function hourglass([top, bottom, stream]) {
    return GLASS.map((row, y) => [...row].map((c, x) => {
      if (c !== 'I') return c;
      const sand = (y < 8 && y >= top) || (y >= 8 && y >= bottom) || (stream && x === 5 && y >= 8 && y < bottom);
      return sand ? 'O' : 'I';
    }).join(''));
  }

  function pixelSvg(rows, cls) {
    let outline = '', fill = '';
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      const cell = `M${x * 2} ${y * 2}h2v2h-2z`;
      if (c === 'O') outline += cell;
      else if (c === 'I') fill += cell;
    }));
    const w = rows[0].length * 2, h = rows.length * 2;
    return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">` +
      `<path class="px-o" d="${outline}"/><path class="px-i" d="${fill}"/></svg>`;
  }

  const cursor = document.createElement('div');
  cursor.className = 'pixel-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = pixelSvg(ARROW, 'pixel-arrow') + pixelSvg(HAND, 'pixel-hand') +
    `<div class="pixel-hourglass">${SAND.map(f => pixelSvg(hourglass(f), '')).join('')}</div>`;

  // Fixed pools, reused round-robin — the trail pool size is the on-screen cap
  function makeBits(n) {
    return Array.from({ length: n }, () => {
      const el = document.createElement('div');
      el.className = 'pixel-bit';
      el.setAttribute('aria-hidden', 'true');
      document.body.append(el);
      return el;
    });
  }
  const trail = makeBits(60);
  const burst = makeBits(8);
  document.body.append(cursor);
  root.classList.add('has-cursor');

  const BURST_DIRS = [[0, -24], [18, -18], [24, 0], [18, 18], [0, 24], [-18, 18], [-24, 0], [-18, -18]];
  const snap = v => Math.floor(v / 4) * 4;

  function play(el, classes, x, y) {
    el.className = 'pixel-bit';
    el.style.translate = `${x}px ${y}px`;
    void el.offsetWidth; // restart the animation
    el.className = `pixel-bit ${classes}`;
  }

  let mx = 0, my = 0, lastX = 0, lastY = 0, travel = 0, nextBit = 0;
  let seen = false, overField = false;

  // DOS preview window: follows the pointer over list rows and types out the row's details
  const OPEN_MS = 120, TYPE_MS = 150;
  const pad = n => String(n).padStart(2, '0');
  const textOf = (row, sel) => row.querySelector(sel).textContent.trim();
  // Each row type: how to find it, its link, and what the window says about it
  const ROW_TYPES = [
    {
      selector: '.work-item',
      link: '.work-link',
      describe: row => {
        const client = textOf(row, '.work-client');
        return { name: client, fields: [['Project:', textOf(row, '.work-title')], ['Client:', client]], notes: [] };
      },
    },
    {
      selector: '.project-item',
      link: '.project-link',
      describe: row => {
        // The Local badge sits inside the name, so read only the name's own text
        const name = [...row.querySelector('.project-name').childNodes]
          .filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
        const local = !!row.querySelector('.badge-local');
        return { name, fields: [['Project:', name], ['URL:', textOf(row, '.project-url')]], notes: local ? ['Local network only'] : [] };
      },
    },
  ];
  const ROW_SELECTOR = ROW_TYPES.map(t => t.selector).join(', ');
  const rowType = row => ROW_TYPES.find(t => row.matches(t.selector));

  let win = null, winName = null, winBody = null, cells = [];
  let activeRow = null, winW = 0, winH = 0, typeTimer = 0, typeTick = 0;

  if (document.querySelector(ROW_SELECTOR)) {
    win = document.createElement('div');
    win.className = 'dos-window';
    win.setAttribute('aria-hidden', 'true');
    win.innerHTML =
      '<div class="dos-frame">' +
        '<div class="dos-title"><span>[■]</span><span class="dos-name"></span></div>' +
        '<div class="dos-body"></div>' +
      '</div>';
    document.body.append(win);
    winName = win.querySelector('.dos-name');
    winBody = win.querySelector('.dos-body');

    // Silkscreen is only used here, so load it up front; the window is sized from its metrics
    document.fonts.load("8px 'Silkscreen'").then(() => {
      if (!activeRow) return;
      fillWindow(activeRow);
      placeWindow();
    });

    win.addEventListener('animationend', () => {
      if (win.classList.contains('is-closing')) win.className = 'dos-window';
    });
  }

  function fillWindow(row) {
    const type = rowType(row);
    const { name, fields, notes } = type.describe(row);
    const siblings = [...document.querySelectorAll(type.selector)];
    const lines = [
      ...fields,
      `File ${pad(siblings.indexOf(row) + 1)}/${pad(siblings.length)}`,
      ...notes,
      'Click to open ↗',
    ];
    winName.textContent = name;
    winBody.textContent = '';
    cells = [];
    for (const line of lines) {
      // Label/value pairs share a column grid; single lines span it
      const parts = Array.isArray(line) ? line : [line];
      for (const text of parts) {
        const el = document.createElement('span');
        if (!Array.isArray(line)) el.className = 'dos-wide';
        el.textContent = text;
        winBody.append(el);
        cells.push({ el, text });
      }
    }
    // Size to the fully typed content; typing then blanks it
    win.style.width = '';
    winW = win.offsetWidth;
    winH = win.offsetHeight;
    win.style.width = `${winW}px`;
  }

  function stopTyping() {
    clearTimeout(typeTimer);
    clearInterval(typeTick);
  }

  function typeWindow(delay) {
    stopTyping();
    if (reduceMotion.matches) return;
    cells.forEach(c => { c.el.textContent = ''; });
    const total = cells.reduce((n, c) => n + c.text.length, 0);
    typeTimer = setTimeout(() => {
      const start = performance.now();
      typeTick = setInterval(() => {
        let shown = Math.min(total, Math.ceil(total * (performance.now() - start) / TYPE_MS));
        if (shown >= total) clearInterval(typeTick);
        cells.forEach(c => {
          const k = Math.min(c.text.length, shown);
          c.el.textContent = c.text.slice(0, k);
          shown -= k;
        });
      }, 16);
    }, delay);
  }

  // 20px right and 16px below the pointer, flipping left or up at the viewport edges
  function placeWindow() {
    if (!win || !win.classList.contains('is-open')) return;
    const flipX = mx + 20 + winW + 6 > innerWidth;
    const flipY = my + 16 + winH + 6 > innerHeight;
    const x = flipX ? mx - 20 - winW : mx + 20;
    const y = flipY ? my - 16 - winH : my + 16;
    win.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
    win.style.transformOrigin = `${flipX ? 'right' : 'left'} ${flipY ? 'bottom' : 'top'}`;
  }

  function showWindow(row) {
    if (!win || row === activeRow) return;
    const wasOpen = !!activeRow;
    activeRow = row;
    if (!row) {
      stopTyping();
      win.className = reduceMotion.matches ? 'dos-window' : 'dos-window is-closing';
      return;
    }
    if (!wasOpen) win.className = 'dos-window is-open';
    fillWindow(row);
    placeWindow();
    // Opening waits for the stepped scale; switching rows blanks for a frame and retypes
    typeWindow(wasOpen ? 0 : OPEN_MS);
  }

  function setState(target) {
    if (!target || !target.closest) return;
    const field = target.closest('input, textarea');
    const row = !field && target.closest(ROW_SELECTOR);
    const link = !field && (row || target.closest('a, button'));
    overField = !!field;
    root.classList.toggle('cursor-over-field', overField);
    root.classList.toggle('cursor-link', !!link);
    showWindow(row || null);
  }

  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    mx = e.clientX;
    my = e.clientY;
    cursor.style.translate = `${Math.round(mx)}px ${Math.round(my)}px`;
    root.classList.add('cursor-visible');
    setState(e.target);
    placeWindow();

    if (!seen) { lastX = mx; lastY = my; seen = true; return; }
    travel += Math.hypot(mx - lastX, my - lastY);
    lastX = mx;
    lastY = my;
    if (travel < 6) return;
    travel = 0;
    if (overField || reduceMotion.matches) return;
    const bit = trail[nextBit];
    bit.style.setProperty('--fall', `${4 + Math.floor(Math.random() * 5)}px`); // 4–8px drop
    let classes = 'is-trail';
    if (Math.random() < 1 / 5) classes += ' is-big';
    if (Math.random() < 1 / 6) classes += ' is-blue';
    play(bit, classes, snap(mx), snap(my));
    nextBit = (nextBit + 1) % trail.length;
  });

  // Content moves under a still pointer while scrolling
  window.addEventListener('scroll', () => {
    if (seen) setState(document.elementFromPoint(mx, my));
  }, { passive: true });

  document.addEventListener('mouseout', e => {
    if (e.relatedTarget) return;
    root.classList.remove('cursor-visible');
    showWindow(null);
  });

  // Whole list rows open their link; the link itself still handles its own clicks and keyboard use
  document.addEventListener('click', e => {
    if (e.pointerType === 'touch' || !e.target.closest) return;
    const row = e.target.closest(ROW_SELECTOR);
    if (!row || e.target.closest('a')) return;
    const link = row.querySelector(rowType(row).link);
    if (link) window.open(link.href, '_blank', 'noopener');
  });

  document.addEventListener('mousedown', e => {
    if (e.button !== 0 || overField || reduceMotion.matches) return;
    const x = Math.round(e.clientX) - 2, y = Math.round(e.clientY) - 2;
    burst.forEach((el, i) => {
      el.style.setProperty('--dx', `${BURST_DIRS[i][0]}px`);
      el.style.setProperty('--dy', `${BURST_DIRS[i][1]}px`);
      play(el, i % 2 ? 'is-burst is-blue' : 'is-burst', x, y);
    });
  });
})();

// Retro headshot — the photo is DOS-dithered onto a canvas above it. Inside the reveal
// circle a colour mosaic resolves tier by tier, then the cells clear to show the real photo.
(function () {
  const wrap = document.querySelector('.hero-photo-wrap');
  const img = wrap && wrap.querySelector('.hero-photo');
  if (!wrap || !img) return;

  const root = document.documentElement;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const CELL = 4;                 // on-screen size of one dither pixel, in CSS px
  const REVEAL = 90;              // reveal radius, in CSS px
  const TIER_MS = 250;            // time per mosaic tier
  const TIER_BLOCKS = [4, 2, 1];  // mosaic block size in cells (16px, 8px, 4px), then the real photo
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const INK = [14, 14, 14], GRAY = [154, 154, 154], PAPER = [245, 243, 239], BLUE = [31, 59, 214];

  // Brightness ramps over the site colours. Saturated blues get the cobalt, everything else
  // stays neutral; blue holds across a wide band so the backdrop reads as solid cobalt, not speckle.
  const BLUE_RAMP = [[INK, 0], [BLUE, 0.1], [BLUE, 0.5], [PAPER, 0.9]];
  const GRAY_RAMP = [[INK, 0.1], [GRAY, 0.5], [PAPER, 0.85]];
  const SHARPEN = 1.2, CONTRAST = 1.5, LIFT = 0.02;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-dither';
  canvas.setAttribute('aria-hidden', 'true');
  wrap.append(canvas);
  const ctx = canvas.getContext('2d');

  let cols = 0, rows = 0, dithered = null, tiers = [];
  let progress = 0;                     // modem load: fraction of rows shown
  let started = false, onScreen = false;
  let cx = 0, cy = 0, radius = 0;       // reveal circle, CSS px relative to the photo
  let level = TIER_BLOCKS.length;       // current mosaic tier; TIER_BLOCKS.length = real photo
  let frame = 0, stepTimer = 0, tierTimer = 0;

  const isBlue = (r, g, b) => b - (r + g) / 2 > 70;
  const threshold = (x, y) => (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;

  function objectPosition() {
    return getComputedStyle(img).objectPosition.split(' ')
      .map(v => v.endsWith('%') ? parseFloat(v) / 100 : 0.5);
  }

  // The photo at one sample per cell, cropped like object-fit: cover at its object-position
  function sample() {
    const w = img.clientWidth, h = img.clientHeight;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih);
    const sw = w / scale, sh = h / scale;
    const [px, py] = objectPosition();

    const src = document.createElement('canvas');
    src.width = cols;
    src.height = rows;
    const sctx = src.getContext('2d');
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(img, (iw - sw) * px, (ih - sh) * py, sw, sh, 0, 0, cols, rows);
    return sctx.getImageData(0, 0, cols, rows);
  }

  function dither(data) {
    const d = data.data;
    const n = cols * rows;
    const lum = new Float32Array(n), blue = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
      lum[p] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      blue[p] = isBlue(r, g, b) ? 1 : 0;
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = y * cols + x;
        let l = lum[p];
        if (!blue[p]) {
          // Unsharp mask against the 3x3 neighbourhood, then an S-curve, so eyes and brows survive
          let sum = 0, count = 0;
          for (let j = -1; j <= 1; j++) {
            for (let k = -1; k <= 1; k++) {
              const yy = y + j, xx = x + k;
              if (yy >= 0 && yy < rows && xx >= 0 && xx < cols) { sum += lum[yy * cols + xx]; count++; }
            }
          }
          l += SHARPEN * (l - sum / count);
          l = (l - 0.5) * CONTRAST + 0.5 + LIFT;
        }
        const ramp = blue[p] ? BLUE_RAMP : GRAY_RAMP;
        const t = threshold(x, y);
        let k = 0;
        while (k < ramp.length - 2 && l > ramp[k + 1][1]) k++;
        const f = (l - ramp[k][1]) / (ramp[k + 1][1] - ramp[k][1]);
        const c = ramp[f > t ? k + 1 : k][0];
        const i = p * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
  }

  // Full-colour mosaics for the reveal, one per tier, at canvas resolution
  function buildTiers(base) {
    const s = base.data;
    return TIER_BLOCKS.map(block => {
      const out = new ImageData(cols, rows), d = out.data;
      for (let by = 0; by < rows; by += block) {
        for (let bx = 0; bx < cols; bx += block) {
          const ye = Math.min(by + block, rows), xe = Math.min(bx + block, cols);
          let r = 0, g = 0, b = 0, n = 0;
          for (let y = by; y < ye; y++) {
            for (let x = bx; x < xe; x++) {
              const i = (y * cols + x) * 4;
              r += s[i]; g += s[i + 1]; b += s[i + 2]; n++;
            }
          }
          for (let y = by; y < ye; y++) {
            for (let x = bx; x < xe; x++) {
              const i = (y * cols + x) * 4;
              d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; d[i + 3] = 255;
            }
          }
        }
      }
      return out;
    });
  }

  function build() {
    const base = sample();
    tiers = buildTiers(base);
    dithered = new ImageData(new Uint8ClampedArray(base.data), cols, rows);
    dither(dithered);
  }

  function render() {
    frame = 0;
    ctx.fillStyle = `rgb(${PAPER})`;
    if (!dithered) { ctx.fillRect(0, 0, cols, rows); return; }
    ctx.putImageData(dithered, 0, 0);
    const shown = Math.ceil(rows * progress);
    if (shown < rows) ctx.fillRect(0, shown, cols, rows - shown);
    if (radius <= 0) return;
    // Fill whole cells whose centres fall inside the circle, so the edge follows the grid
    const tier = tiers[level];
    const sx = cols / img.clientWidth, sy = rows / img.clientHeight;
    const y0 = Math.max(0, Math.floor((cy - radius) * sy)), y1 = Math.min(rows - 1, Math.floor((cy + radius) * sy));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5) / sy - cy;
      if (Math.abs(dy) > radius) continue;
      const half = Math.sqrt(radius * radius - dy * dy);
      const xs = Math.max(0, Math.ceil((cx - half) * sx - 0.5));
      const xe = Math.min(cols - 1, Math.floor((cx + half) * sx - 0.5));
      if (xe < xs) continue;
      if (tier) ctx.putImageData(tier, 0, 0, xs, y, xe - xs + 1, 1);
      else ctx.clearRect(xs, y, xe - xs + 1, 1);
    }
  }

  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function layout() {
    const c = Math.max(1, Math.round(img.clientWidth / CELL));
    const r = Math.max(1, Math.round(img.clientHeight / CELL));
    if (c === cols && r === rows) return;
    cols = c;
    rows = r;
    canvas.width = cols;
    canvas.height = rows;
    if (dithered) build();
    render();
  }

  // Dial-up reveal: stepped bands top to bottom, once per page load
  function maybeStart() {
    if (started || !dithered || !onScreen) return;
    started = true;
    if (reduceMotion.matches) { progress = 1; render(); return; }
    const BANDS = 12;
    let band = 0;
    const timer = setInterval(() => {
      band++;
      progress = band / BANDS;
      render();
      if (band === BANDS) clearInterval(timer);
    }, 1200 / BANDS);
  }

  function stepRadius(to, steps, ms) {
    clearInterval(stepTimer);
    if (reduceMotion.matches) { radius = to; render(); return; }
    const from = radius;
    let i = 0;
    stepTimer = setInterval(() => {
      i++;
      radius = from + (to - from) * i / steps;
      render();
      if (i === steps) clearInterval(stepTimer);
    }, ms / steps);
  }

  // The hourglass cursor shows while a hover reveal is still resolving
  function waiting(on) {
    if (fine) root.classList.toggle('cursor-wait', on);
  }

  // Each reveal session resolves from the coarsest mosaic to the real photo
  function startTiers() {
    clearInterval(tierTimer);
    level = reduceMotion.matches ? TIER_BLOCKS.length : 0;
    waiting(level < TIER_BLOCKS.length);
    if (level >= TIER_BLOCKS.length) return;
    tierTimer = setInterval(() => {
      level++;
      requestRender();
      if (level >= TIER_BLOCKS.length) {
        clearInterval(tierTimer);
        waiting(false);
      }
    }, TIER_MS);
  }

  function stopTiers() {
    clearInterval(tierTimer);
    waiting(false);
  }

  function pointAt(e) {
    const r = img.getBoundingClientRect();
    cx = e.clientX - r.left;
    cy = e.clientY - r.top;
  }

  function onLoad() {
    build();
    render();
    maybeStart();
  }

  layout();
  new ResizeObserver(layout).observe(img);

  const io = new IntersectionObserver(entries => {
    onScreen = entries.some(e => e.isIntersecting);
    maybeStart();
    if (started) io.disconnect();
  });
  io.observe(wrap);

  if (img.complete && img.naturalWidth) onLoad();
  else {
    img.addEventListener('load', onLoad);
    img.addEventListener('error', () => canvas.remove()); // fall back to the plain <img>
  }

  if (fine) {
    wrap.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'touch') startTiers();
    });
    wrap.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      clearInterval(stepTimer);
      pointAt(e);
      radius = REVEAL;
      requestRender();
    });
    wrap.addEventListener('pointerleave', () => {
      stopTiers();
      stepRadius(0, 5, 250);
    });
  } else {
    // Touch: tap toggles between the dither and the real photo, resolving through the tiers
    let open = false;
    wrap.addEventListener('click', e => {
      pointAt(e);
      open = !open;
      if (open) startTiers();
      else stopTiers();
      stepRadius(open ? Math.hypot(img.clientWidth, img.clientHeight) : 0, 4, 200);
    });
  }
})();
