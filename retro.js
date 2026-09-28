// Retro effects shared by the homepage and /vibe. Each feature sets itself up only if its elements exist.

const textOf = (el, sel) => el.querySelector(sel).textContent.trim();

// A /vibe project's name without its Local badge
function projectName(row) {
  return [...row.querySelector('.project-name').childNodes]
    .filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
}

// Letter-grid pixel art: each letter becomes one path with class g-<letter>
// (g-I ink, g-P pixel blue, g-C currentColor); '.' is empty
function gridSvg(rows, cell = 2) {
  const paths = {};
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '.') paths[c] = (paths[c] || '') + `M${x * cell} ${y * cell}h${cell}v${cell}h-${cell}z`;
  }));
  const w = rows[0].length * cell, h = rows.length * cell;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">` +
    Object.entries(paths).map(([c, d]) => `<path class="g-${c}" d="${d}"/>`).join('') + '</svg>';
}

// Place small sprites onto a blank w×h grid
function stamp(w, h, sprites) {
  const grid = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const [rows, x, y] of sprites) {
    rows.forEach((row, j) => [...row].forEach((c, i) => {
      if (c !== '.' && grid[y + j] && x + i >= 0 && x + i < w) grid[y + j][x + i] = c;
    }));
  }
  return grid.map(r => r.join(''));
}

// Two-frame pixel icons, drawn into any element with a matching data-icon
const PIXEL_ICONS = (() => {
  const person = head => [`.${head}.`, '...', 'III', 'III', 'III', 'I.I'];
  const PLUG = ['.III..', '.IIIPP', 'IIII..', 'IIII..', '.IIIPP', '.III..'];
  const SOCKET = ['III', '.II', 'III', 'III', '.II', 'III'];
  const BLOCK = ['IIII', 'I..I', 'IIII'], TOP = ['PPPP', 'P..P', 'PPPP'];
  // A globe whose meridians (and one blue city) shift a column per frame, so it turns
  const globe = shift => Array.from({ length: 10 }, (_, y) => Array.from({ length: 10 }, (_, x) => {
    const d = Math.hypot(x - 4.5, y - 4.5);
    if (d > 4.8) return '.';
    if (d > 3.8) return 'I';
    if (x === 5 + shift && y === 6) return 'P';
    return y === 4 || (x - shift) % 3 === 1 ? 'I' : '.';
  }).join(''));
  const ENVELOPE_BODY = ['CCCCCCCCCC', 'CC......CC', 'C.C....C.C', 'C..C..C..C', 'C...CC...C', 'C........C', 'CCCCCCCCCC'];
  const ENVELOPE_OPEN = ['....CC....', '..CC..CC..', 'CC......CC', 'C........C', 'C..C..C..C', 'C...CC...C', 'C........C', 'C........C', 'CCCCCCCCCC'];
  const ENTER = ['........C.', '........C.', '..C.....C.', '.CC.....C.', 'CCCCCCCCC.', '.CC.......', '..C.......'];
  return {
    people: [stamp(11, 10, [[person('I'), 0, 3], [person('P'), 4, 2], [person('I'), 8, 3]]),
             stamp(11, 10, [[person('I'), 0, 2], [person('P'), 4, 3], [person('I'), 8, 2]])],
    plug: [stamp(10, 10, [[PLUG, 0, 2], [SOCKET, 7, 2]]), stamp(10, 10, [[['II', 'II'], 0, 4], [PLUG, 2, 2], [SOCKET, 7, 2]])],
    globe: [globe(0), globe(1)],
    // Rest on the settled stack; the loop lifts the top block and drops it back into place
    blocks: [stamp(10, 10, [[BLOCK, 1, 7], [BLOCK, 5, 7], [TOP, 3, 4]]), stamp(10, 10, [[BLOCK, 1, 7], [BLOCK, 5, 7], [TOP, 3, 1]])],
    envelope: [stamp(10, 9, [[ENVELOPE_BODY, 0, 2]]), ENVELOPE_OPEN],
    enter: [stamp(11, 7, [[ENTER, 1, 0]]), stamp(11, 7, [[ENTER, 0, 0]])],
  };
})();

document.querySelectorAll('[data-icon]').forEach(slot => {
  const frames = PIXEL_ICONS[slot.dataset.icon];
  if (frames) slot.innerHTML = frames.map(f => gridSvg(f)).join('');
});

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
  document.body.append(cursor);
  root.classList.add('has-cursor');

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
        const name = projectName(row);
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
    const field = target.closest('input, textarea, [data-hide-cursor]');
    const row = !field && target.closest(ROW_SELECTOR);
    const link = !field && (row || target.closest('a, button, [role="button"]'));
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

  // Click effects: six stepped pixel effects on a 4px grid, one per click, never the same twice
  // in a row. Elements come from fixed pools, so the pool sizes cap what's on screen.
  const INK = 'var(--ink)', BLUE = 'var(--pixel)';
  const WORDS = ['+100', 'RAD', 'OK!', 'WOW', 'NICE'];
  const rand = (a, b) => a + Math.random() * (b - a);
  const grid = v => Math.round(v / 4) * 4;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function makePool(n, className) {
    return Array.from({ length: n }, () => {
      const el = document.createElement('div');
      el.className = className;
      el.setAttribute('aria-hidden', 'true');
      document.body.append(el);
      return el;
    });
  }
  const fxBits = makePool(72, 'fx-bit');
  const fxWords = makePool(3, 'fx-word');
  let nextBitFx = 0, nextWord = 0, lastEffect = -1;

  // n+1 hard-cut keyframes; each step lasts longer than the one before, so motion starts fast and settles
  function stepped(n, at) {
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const f = at(t);
      return {
        offset: f.offset ?? Math.pow(t, 1.35),
        easing: 'steps(1, end)',
        transform: `translate(${grid(f.x || 0)}px, ${grid(f.y || 0)}px) scale(${f.s ?? 1})`,
        opacity: f.o ?? 1,
      };
    });
  }

  function spawn(x, y, { w = 4, h = w, color = INK, frames, duration }) {
    const el = fxBits[nextBitFx];
    nextBitFx = (nextBitFx + 1) % fxBits.length;
    el.getAnimations().forEach(a => a.cancel());
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.background = color;
    el.style.translate = `${grid(x - w / 2)}px ${grid(y - h / 2)}px`;
    el.animate(frames, { duration, fill: 'forwards' });
  }

  const mixed = blueShare => (Math.random() < blueShare ? BLUE : INK);

  // a. Burst: 16 pixels out in every direction, arcing down with gravity as they fade
  function burstFx(x, y) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + rand(-0.2, 0.2);
      const dist = rand(20, 56), drop = rand(12, 32);
      spawn(x, y, {
        w: Math.random() < 0.3 ? 8 : 4, color: mixed(0.35), duration: rand(420, 640),
        frames: stepped(6, t => ({
          x: Math.cos(angle) * dist * easeOut(t),
          y: Math.sin(angle) * dist * easeOut(t) + drop * t * t,
          s: t > 0.65 ? 0.5 : 1,
          o: t < 1 ? 1 : 0,
        })),
      });
    }
  }

  // b. Shockwave: four rings, each wider, thinner and bluer, shown one after another
  function shockwaveFx(x, y) {
    const RINGS = [[8, 12], [16, 12], [24, 10], [32, 8]]; // radius, pixel count
    const WINDOWS = [0, 0.14, 0.32, 0.58, 1];              // uneven: early rings flash by
    const spin = rand(0, Math.PI), duration = rand(360, 440);
    RINGS.forEach(([radius, count], k) => {
      for (let i = 0; i < count; i++) {
        const angle = spin + (i / count) * Math.PI * 2;
        const start = WINDOWS[k], end = WINDOWS[k + 1];
        const frames = [];
        if (start > 0) frames.push({ offset: 0, opacity: 0, easing: 'steps(1, end)' });
        frames.push({ offset: start, opacity: 1, easing: 'steps(1, end)' });
        frames.push({ offset: end, opacity: 0, easing: 'steps(1, end)' });
        if (end < 1) frames.push({ offset: 1, opacity: 0 });
        spawn(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, {
          color: k < 2 ? INK : BLUE, duration, frames,
        });
      }
    });
  }

  // c. Fountain: a spray shoots up and falls back down past the click point
  function fountainFx(x, y) {
    const count = 12 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const vx = rand(-44, 44), rise = rand(36, 72), fall = rand(16, 40);
      // y(t) = -v·t + (g/2)·t², peaking at -rise and ending at +fall
      const v = 2 * (rise + Math.sqrt(rise * rise + rise * fall)), g = 2 * (fall + v);
      spawn(x, y, {
        w: Math.random() < 0.25 ? 8 : 4, color: mixed(0.4), duration: rand(620, 820),
        frames: stepped(8, t => ({ offset: t, x: vx * t, y: -v * t + (g / 2) * t * t, o: t < 1 ? 1 : 0 })),
      });
    }
  }

  // d. Firework: a rocket climbs, hangs for a beat, then pops into a small burst
  function fireworkFx(x, y) {
    const height = grid(rand(52, 68)), duration = rand(880, 1000);
    const LAUNCH_END = 0.36, POP = 0.5;
    const rocket = [0, 1, 2, 3, 4].map(i => ({
      offset: LAUNCH_END * Math.pow(i / 4, 1.3), easing: 'steps(1, end)',
      transform: `translate(0px, ${grid(-height * easeOut(i / 4))}px)`, opacity: 1,
    }));
    rocket.push({ offset: POP, transform: `translate(0px, ${-height}px)`, opacity: 0, easing: 'steps(1, end)' });
    rocket.push({ offset: 1, transform: `translate(0px, ${-height}px)`, opacity: 0 });
    spawn(x, y, { color: INK, duration, frames: rocket });

    const sparks = 9 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sparks; i++) {
      const angle = (i / sparks) * Math.PI * 2 + rand(-0.25, 0.25);
      const dist = rand(12, 28);
      const frames = [{ offset: 0, opacity: 0, easing: 'steps(1, end)' }];
      for (let k = 0; k <= 5; k++) {
        const t = k / 5;
        frames.push({
          offset: POP + (1 - POP) * Math.pow(t, 1.35), easing: 'steps(1, end)',
          transform: `translate(${grid(Math.cos(angle) * dist * easeOut(t))}px, ${grid(Math.sin(angle) * dist * easeOut(t) + 16 * t * t)}px)`,
          opacity: k < 5 ? 1 : 0,
        });
      }
      spawn(x, y - height, { color: mixed(0.6), duration, frames });
    }
  }

  // e. Score popup: a word jumps up in steps, then blinks out
  function scoreFx(x, y) {
    const el = fxWords[nextWord];
    nextWord = (nextWord + 1) % fxWords.length;
    el.getAnimations().forEach(a => a.cancel());
    el.textContent = WORDS[Math.floor(Math.random() * WORDS.length)];
    el.style.translate = `${grid(x + rand(-8, 8))}px ${grid(y) - 12}px`;
    const rise = [0, 12, 20, 28, 32];
    const frames = rise.map((dy, i) => ({
      offset: [0, 0.08, 0.2, 0.34, 0.5][i], easing: 'steps(1, end)',
      transform: `translate(-50%, ${-dy}px)`, opacity: 1,
    }));
    [[0.64, 0], [0.74, 1], [0.84, 0], [0.9, 1], [1, 0]].forEach(([offset, opacity]) =>
      frames.push({ offset, easing: 'steps(1, end)', transform: 'translate(-50%, -32px)', opacity }));
    el.animate(frames, { duration: rand(650, 800), fill: 'forwards' });
  }

  // f. CRT glitch: broken scanline strips flicker and jitter around the click for ~200ms
  function glitchFx(x, y) {
    const strips = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < strips; i++) {
      const w = grid(rand(16, 64)), h = Math.random() < 0.3 ? 8 : 4;
      const color = i % 2 ? BLUE : INK;
      const frames = Array.from({ length: 7 }, (_, k) => ({
        offset: Math.pow(k / 6, 1.2), easing: 'steps(1, end)',
        transform: `translate(${grid(rand(-8, 8))}px, 0px)`,
        opacity: k === 6 ? 0 : (k === 0 || Math.random() < 0.7 ? 1 : 0),
      }));
      spawn(x + rand(-40, 40), y + rand(-24, 24), {
        w, h, duration: rand(180, 240), frames,
        color: `repeating-linear-gradient(90deg, ${color} 0 8px, transparent 8px 12px)`,
      });
    }
  }

  const EFFECTS = [burstFx, shockwaveFx, fountainFx, fireworkFx, scoreFx, glitchFx];

  function pickEffect() {
    if (lastEffect < 0) return Math.floor(Math.random() * EFFECTS.length);
    const i = Math.floor(Math.random() * (EFFECTS.length - 1));
    return i >= lastEffect ? i + 1 : i;
  }

  document.addEventListener('mousedown', e => {
    if (e.button !== 0 || overField || reduceMotion.matches) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    lastEffect = pickEffect();
    EFFECTS[lastEffect](e.clientX, e.clientY);
  });
})();

// Retro headshot — the photo is DOS-dithered onto a canvas above it. On hover (or tap) the whole
// image resolves through a colour mosaic tier by tier, then the canvas clears to show the real photo.
(function () {
  const wrap = document.querySelector('.hero-photo-wrap');
  const img = wrap && wrap.querySelector('.hero-photo');
  if (!wrap || !img) return;

  const root = document.documentElement;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const CELL = 4;                 // on-screen size of one dither pixel, in CSS px
  const TIER_MS = 250;            // time per mosaic tier
  const REVERSE_MS = 80;          // time per tier when the reveal steps back down
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
  // Reveal stage: 0 = dither, 1..TIER_BLOCKS.length = mosaic tiers, TIER_BLOCKS.length + 1 = real photo
  const PHOTO_STAGE = TIER_BLOCKS.length + 1;
  let stage = 0, stageTimer = 0;

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
    ctx.fillStyle = `rgb(${PAPER})`;
    if (!dithered) { ctx.fillRect(0, 0, cols, rows); return; }
    ctx.putImageData(dithered, 0, 0);
    const shown = Math.ceil(rows * progress);
    if (shown < rows) ctx.fillRect(0, shown, cols, rows - shown);
    // The whole image (as far as the dial-up load has drawn) shows the current stage
    const tier = stage > 0 && tiers[stage - 1];
    if (tier) ctx.putImageData(tier, 0, 0, 0, 0, cols, shown);
    else if (stage === PHOTO_STAGE) ctx.clearRect(0, 0, cols, shown);
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

  // The hourglass cursor shows while a hover reveal is still resolving
  function waiting(on) {
    if (fine) root.classList.toggle('cursor-wait', on);
  }

  // Step one stage at a time toward `target`, starting now. Resolving shows the
  // hourglass; stepping back down doesn't. Either can start from wherever the last one stopped.
  function stepStage(target, ms) {
    clearInterval(stageTimer);
    const resolving = target > stage;
    if (reduceMotion.matches) {
      stage = target;
      waiting(false);
      render();
      return;
    }
    waiting(resolving);
    const step = () => {
      if (stage !== target) stage += resolving ? 1 : -1;
      render();
      if (stage !== target) return;
      clearInterval(stageTimer);
      waiting(false);
    };
    step();
    if (stage !== target) stageTimer = setInterval(step, ms);
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
      if (e.pointerType !== 'touch') stepStage(PHOTO_STAGE, TIER_MS);
    });
    wrap.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'touch') stepStage(0, REVERSE_MS);
    });
  } else {
    // Touch: tap runs the tiers forward, tap again runs them back
    let open = false;
    wrap.addEventListener('click', () => {
      open = !open;
      stepStage(open ? PHOTO_STAGE : 0, open ? TIER_MS : REVERSE_MS);
    });
  }
})();

// Hidden DOS terminal — backtick anywhere (outside form fields) or the prompt clock opens it
const retroTerminal = (function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const PROMPT = 'C:\\>';
  const LINKEDIN = 'https://www.linkedin.com/in/russellgreene/';
  const CLOSE_MS = 120;
  const nyc = opts => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', ...opts });

  let overlay, screen, output, input, typed, closeBox, title, gameHost, announcer;
  let game = null, launching = false;
  let isOpen = false, booted = false, lastFocus = null, closeTimer = 0;
  const history = [];
  let historyAt = 0;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'dos-term-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="dos-term" role="dialog" aria-modal="true" aria-labelledby="dos-term-title">' +
        '<div class="dos-term-frame">' +
          '<div class="dos-term-title">' +
            '<button type="button" class="dos-term-close" aria-label="Close terminal">[■]</button>' +
            '<span id="dos-term-title">C:\\RUSSELL\\COMMAND.COM</span>' +
          '</div>' +
          '<div class="dos-term-screen">' +
            '<div class="dos-term-output" aria-live="polite"></div>' +
            '<div class="dos-term-line">' +
              '<span class="dos-term-prompt" aria-hidden="true"></span>' +
              '<span class="dos-term-typed" aria-hidden="true"></span>' +
              '<b class="block-cursor" aria-hidden="true"></b>' +
              '<input class="dos-term-input" type="text" aria-label="Command" autocomplete="off" ' +
                'autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go">' +
            '</div>' +
            '<div class="dos-term-game" tabindex="-1" hidden></div>' +
          '</div>' +
          '<p class="dos-term-announce" aria-live="polite"></p>' +
        '</div>' +
      '</div>';
    document.body.append(overlay);
    screen = overlay.querySelector('.dos-term-screen');
    output = overlay.querySelector('.dos-term-output');
    input = overlay.querySelector('.dos-term-input');
    typed = overlay.querySelector('.dos-term-typed');
    closeBox = overlay.querySelector('.dos-term-close');
    title = overlay.querySelector('#dos-term-title');
    gameHost = overlay.querySelector('.dos-term-game');
    announcer = overlay.querySelector('.dos-term-announce');
    overlay.querySelector('.dos-term-prompt').textContent = PROMPT;

    closeBox.addEventListener('click', close);
    // The visible line mirrors the (transparent) input, so the block cursor always sits at the end
    input.addEventListener('input', () => { typed.textContent = input.value; });
    input.addEventListener('keydown', onInputKey);
    screen.addEventListener('click', () => (game ? gameHost : input).focus());
    // Keep focus inside the dialog: Tab moves between the close box and the input (or the game)
    overlay.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const main = game ? gameHost : input;
      (document.activeElement === main ? closeBox : main).focus();
    });
  }

  function print(...lines) {
    for (const line of lines) {
      const div = document.createElement('div');
      div.textContent = line;
      output.append(div);
    }
    screen.scrollTop = screen.scrollHeight;
  }

  function setInput(value) {
    input.value = value;
    typed.textContent = value;
  }

  function onInputKey(e) {
    if (launching) { e.preventDefault(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const line = input.value;
      setInput('');
      print(PROMPT + line);
      if (line.trim()) {
        history.push(line);
        historyAt = history.length;
      }
      run(line);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!history.length) return;
      e.preventDefault();
      historyAt = Math.max(0, Math.min(history.length, historyAt + (e.key === 'ArrowUp' ? -1 : 1)));
      setInput(history[historyAt] || '');
    }
  }

  function open() {
    if (!overlay) build();
    clearTimeout(closeTimer);
    if (!isOpen) {
      isOpen = true;
      lastFocus = document.activeElement;
      overlay.hidden = false;
      overlay.classList.remove('is-closing');
      overlay.classList.add('is-open');
      if (!booted) {
        booted = true;
        print('RUSSELL-DOS Version 6.22', '(C)Copyright Russell Greene 2026.', '', 'Type HELP for a list of commands.', '');
      }
    }
    input.focus(); // synchronous, so touch devices raise the on-screen keyboard
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    launching = false;
    stopRocks();
    overlay.classList.remove('is-open');
    const finish = () => { overlay.hidden = true; overlay.classList.remove('is-closing'); };
    if (reduceMotion.matches) finish();
    else {
      overlay.classList.add('is-closing');
      closeTimer = setTimeout(finish, CLOSE_MS);
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // What DIR lists: the work list on the homepage, the vibe projects once /vibe is unlocked
  function listing() {
    if (document.getElementById('gate') && !document.querySelector('#content.visible')) return null;
    const work = [...document.querySelectorAll('.work-item')];
    if (work.length) {
      return { dir: 'C:\\WORK', ext: 'PRJ', items: work.map(r => ({ title: textOf(r, '.work-title'), href: r.querySelector('.work-link').href })) };
    }
    const vibe = [...document.querySelectorAll('.project-item')];
    return { dir: 'C:\\VIBE', ext: 'EXE', items: vibe.map(r => ({ title: projectName(r), href: r.querySelector('.project-link').href })) };
  }

  // 8.3 names: up to eight characters, or six plus ~N when the name is longer
  function shortNames(items) {
    const used = new Set();
    return items.map(({ title }) => {
      const base = title.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'FILE';
      if (base.length <= 8 && !used.has(base)) { used.add(base); return base; }
      let n = 1;
      while (used.has(`${base.slice(0, 6)}~${n}`)) n++;
      const name = `${base.slice(0, 6)}~${n}`;
      used.add(name);
      return name;
    });
  }

  // Stable pseudo-random numbers from a title, so sizes and dates don't change between visits
  function hash(str) {
    let h = 2166136261;
    for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }

  // One DIR line: stable size and timestamp derived from the title
  function dirEntry(index, name, ext, title) {
    const size = 4096 + (hash(title) % 190) * 512;
    const d = hash(`${title}:date`);
    const month = String(1 + d % 12).padStart(2, '0');
    const day = String(1 + (d >>> 4) % 28).padStart(2, '0');
    const year = String(19 + (d >>> 9) % 7);
    const hour = 1 + (d >>> 12) % 12, minute = String((d >>> 16) % 60).padStart(2, '0');
    const ampm = (d >>> 22) % 2 ? 'p' : 'a';
    return {
      size,
      line: `${index.padStart(2)}  ${name.padEnd(8)} ${ext} ${size.toLocaleString('en-US').padStart(7)}  ` +
        `${month}-${day}-${year}  ${String(hour).padStart(2)}:${minute}${ampm}`,
    };
  }

  function dir() {
    const list = listing();
    if (!list) { print('Access denied'); return; }
    const names = shortNames(list.items);
    const entries = list.items.map((item, i) => dirEntry(String(i + 1), names[i], list.ext, item.title));
    // The easter egg's clue: listed last, with no number, so OPEN N never reaches it
    entries.push(dirEntry('', 'ROCKS', 'EXE', 'ROCKS.EXE'));
    const total = entries.reduce((n, e) => n + e.size, 0);
    print(' Volume in drive C is RUSSELL', ` Directory of ${list.dir}`, '', ...entries.map(e => e.line));
    print(`${String(entries.length).padStart(9)} file(s) ${total.toLocaleString('en-US').padStart(11)} bytes`, '', 'Type OPEN N to open a file.');
  }

  function openItem(arg) {
    const list = listing();
    if (!list) { print('Access denied'); return; }
    const item = list.items[parseInt(arg, 10) - 1];
    if (!item) { print('File not found'); return; }
    print(`Opening ${item.title}...`);
    window.open(item.href, '_blank', 'noopener');
  }

  function time() {
    const now = new Date();
    const parts = Object.fromEntries(nyc({ weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' })
      .formatToParts(now).map(p => [p.type, p.value]));
    print(`Current time is ${nyc({ hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(now)} (New York)`,
      `Current date is ${parts.weekday} ${parts.month}-${parts.day}-${parts.year}`);
  }

  // ROCKS.EXE: the game code loads on demand and takes over the screen area of the terminal
  function announce(text) {
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = text; }, 50);
  }

  const loadRocks = () => window.RocksGame ? Promise.resolve() : new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/rocks.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });

  // Largest whole-number scale of the 320×200 screen that fits the window (0 if it doesn't fit)
  function rocksScale(touch) {
    const width = window.innerWidth - 32 - 40;             // overlay gutters, frame and padding
    const height = window.innerHeight * 0.88 - 80 - (touch ? 64 : 0); // top offset, title bar, touch pad
    return Math.min(3, Math.floor(Math.min(width / 320, height / 200)));
  }

  function rocks() {
    if (launching || game) return;
    launching = true;
    const loaded = loadRocks();
    const lines = ['Loading ROCKS.EXE...', '640K OK', 'EGA graphics detected'];
    let i = 0;
    const next = () => {
      if (!launching) return;
      if (i < lines.length) {
        print(lines[i++]);
        setTimeout(next, reduceMotion.matches ? 0 : 350);
        return;
      }
      loaded.then(startRocks, () => {
        launching = false;
        print('ROCKS.EXE is missing or damaged.');
      });
    };
    next();
  }

  function startRocks() {
    if (!launching) return;
    launching = false;
    const touch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const scale = rocksScale(touch);
    if (scale < 1) {
      print('', 'ROCKS.EXE needs a bigger screen than this one.', 'Try it on a computer or a larger window.', '');
      return;
    }
    overlay.classList.add('is-game');
    gameHost.hidden = false;
    title.textContent = 'C:\\RUSSELL\\ROCKS.EXE';
    const background = getComputedStyle(root).getPropertyValue('--pixel').trim() || '#1f3bd6';
    game = window.RocksGame.create(gameHost, { scale, touch, background, announce, onExit: endRocks });
    gameHost.focus();
    announce(touch
      ? 'ROCKS.EXE is running. Tap FIRE to start. Buttons below the game turn left and right, thrust, fire, and jump to hyperspace.'
      : 'ROCKS.EXE is running. Press Space to start. Arrow keys or W A S D turn and thrust, Space fires, Down or S jumps to hyperspace, P pauses, M toggles sound, Escape quits.');
  }

  function restoreTerminal() {
    overlay.classList.remove('is-game');
    gameHost.hidden = true;
    gameHost.textContent = '';
    title.textContent = 'C:\\RUSSELL\\COMMAND.COM';
  }

  // Esc inside the game: back to the prompt with the score
  function endRocks(score) {
    game = null;
    restoreTerminal();
    print(`Thanks for playing. Score: ${score}.`);
    input.focus();
  }

  // Closing the terminal: stop the loop and any sound, no message
  function stopRocks() {
    if (!game) return;
    game.stop();
    game = null;
    restoreTerminal();
  }

  function win() {
    print('Starting Windows 3.1...');
    root.classList.add('cursor-wait');
    setTimeout(() => {
      root.classList.remove('cursor-wait');
      print('Just kidding.');
    }, 2000);
  }

  const COMMANDS = {
    help: () => print(
      'HELP      This list',
      'DIR       List files',
      'OPEN N    Open file N from DIR',
      'WHOAMI    About Russell',
      'CONTACT   Get in touch',
      'LINKEDIN  Open LinkedIn',
      'VIBE      Go to /vibe',
      'HOME      Go to the homepage',
      'TIME      New York time and date',
      'VER       Version',
      'CLS       Clear the screen',
      'EXIT      Close the terminal',
      '',
      'Some commands are not listed here...'),
    dir,
    open: openItem,
    whoami: () => print('RUSSELL GREENE', 'Executive Producer @ BUCK // NYC', 'Architecting complex productions for global brands.', 'Off the clock: science, video games, and little worlds like this one.'),
    contact: () => {
      const contact = document.getElementById('contact');
      if (!contact) { location.href = '/#contact'; return; }
      close();
      contact.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    },
    linkedin: () => { print('Opening LinkedIn...'); window.open(LINKEDIN, '_blank', 'noopener'); },
    vibe: () => { location.href = '/vibe'; },
    home: () => { location.href = '/'; },
    time,
    ver: () => print('', 'RUSSELL-DOS Version 6.22', ''),
    cls: () => { output.textContent = ''; },
    exit: close,
    win,
    rocks,
    'rocks.exe': rocks,
    format: arg => print(/^c:?$/.test(arg) ? 'Nice try.' : 'Bad command or file name'),
  };

  function run(line) {
    const [cmd = '', ...rest] = line.trim().toLowerCase().split(/\s+/);
    if (!cmd) return;
    const command = Object.hasOwn(COMMANDS, cmd) ? COMMANDS[cmd] : null;
    if (command) command(rest.join(' '));
    else print('Bad command or file name');
  }

  document.addEventListener('keydown', e => {
    if (isOpen) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      return;
    }
    if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.isContentEditable || (t.closest && t.closest('input, textarea, select'))) return;
    e.preventDefault();
    open();
  });

  return {
    open,
    get game() { return game; }, // for testing the running game
  };
})();

// Prompt-style clock in the hero meta line: C:\NYC> 9:27 AM, opens the terminal
(function () {
  const clock = document.querySelector('.prompt-clock');
  if (!clock) return;
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
  clock.innerHTML = 'C:\\NYC&gt; <time></time><b class="block-cursor" aria-hidden="true"></b>';
  clock.setAttribute('role', 'button');
  clock.tabIndex = 0;
  const time = clock.querySelector('time');

  function tick() {
    const now = new Date();
    time.textContent = fmt.format(now);
    clock.setAttribute('aria-label', `New York, ${fmt.format(now)}. Open terminal`);
    setTimeout(tick, 60000 - (now.getTime() % 60000) + 50); // just after the next minute
  }
  tick();

  clock.addEventListener('click', () => retroTerminal.open());
  clock.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    retroTerminal.open();
  });
})();

// DOS section labels: each label becomes a command line (C:\> DIR WORK) that types itself out the
// first time it scrolls into view. Screen readers (and no-JS visitors) get the plain label text.
(function () {
  const labels = [...document.querySelectorAll('.section-label')];
  if (!labels.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const CHAR_MS = 40, CURSOR_LINGER_MS = 600;
  const COMMANDS = {
    'core expertise': 'TYPE EXPERTISE.TXT',
    'selected work': 'DIR WORK',
    'selected partners': 'DIR PARTNERS',
    'get in touch': 'MAIL RUSSELL',
    'all projects': 'DIR VIBE',
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  function build(label) {
    // Line breaks in the markup (Core<br>Expertise) count as spaces
    const plain = [...label.childNodes].map(n => n.nodeName === 'BR' ? ' ' : n.textContent).join('').replace(/\s+/g, ' ').trim();
    const visual = el('span', 'dos-label');
    visual.setAttribute('aria-hidden', 'true');
    const cmd = el('span', 'dl-cmd');
    visual.append(el('span', 'dl-prompt', 'C:\\>'), ' ', cmd);
    label.textContent = '';
    label.append(el('span', 'dl-sr', plain), visual);
    label.classList.add('has-dos-label');
    return { visual, cmd, text: COMMANDS[plain.toLowerCase()] || plain.toUpperCase() };
  }

  function type({ visual, cmd, text }) {
    visual.classList.add('is-shown');
    const cursor = el('b', 'block-cursor');
    let i = 0;
    cmd.append(cursor);
    const timer = setInterval(() => {
      i++;
      cmd.textContent = text.slice(0, i);
      cmd.append(cursor);
      if (i < text.length) return;
      clearInterval(timer);
      setTimeout(() => cursor.remove(), CURSOR_LINGER_MS);
    }, CHAR_MS);
  }

  const parts = labels.map(build);

  // Reduced motion (or no IntersectionObserver): every command drawn at once
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    for (const p of parts) {
      p.cmd.textContent = p.text;
      p.visual.classList.add('is-shown');
    }
    return;
  }

  // Watch the command line itself: the label element can stretch to its whole grid row (taller
  // than the viewport), which would never reach the threshold
  const byVisual = new Map(parts.map(p => [p.visual, p]));
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      type(byVisual.get(entry.target));
    }
  }, { threshold: 0.6 });
  byVisual.forEach((p, visual) => io.observe(visual));
})();

// Partner sequence: a DOS menu selection bar steps through the names once, the first time they're seen
(function () {
  const section = document.querySelector('.partners');
  const names = section ? [...section.querySelectorAll('.partner-name')] : [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!names.length || reduceMotion.matches || !('IntersectionObserver' in window)) return;
  const STEP_MS = 120;

  const io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    io.disconnect();
    section.classList.add('is-sequencing');
    let i = 0;
    const timer = setInterval(() => {
      names.forEach((name, k) => name.classList.toggle('is-lit', k === i));
      if (i++ < names.length) return;
      clearInterval(timer);
      section.classList.remove('is-sequencing');
    }, STEP_MS);
  }, { threshold: 0.5 });
  io.observe(section);
})();

// Core expertise readout: resting on a skill (or tapping, clicking to pin, or focusing it) shows
// its related work and types its description into a DOS-style panel under the grid
(function () {
  const section = document.querySelector('.expertise');
  const items = section ? [...section.querySelectorAll('.expertise-item')] : [];
  const details = section && section.querySelector('.expertise-details');
  if (!items.length || !details) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover)').matches;
  const CHAR_MS = 12;

  const panel = document.createElement('div');
  panel.className = 'xp-panel';
  panel.setAttribute('aria-live', 'polite');
  panel.innerHTML =
    '<div class="xp-screen" aria-hidden="true"><div class="xp-prompt"></div><div class="xp-text"></div></div>' +
    '<p class="xp-announce"></p><p class="xp-see"></p>';
  details.before(panel);
  section.classList.add('xp-ready');

  const cursor = () => {
    const b = document.createElement('b');
    b.className = 'block-cursor';
    return b;
  };

  function skill(item) {
    const detail = document.getElementById(item.getAttribute('aria-controls'));
    return {
      name: item.querySelector('.expertise-name').textContent.trim(),
      dir: item.dataset.dir,
      desc: detail.querySelector('.expertise-desc').textContent.trim(),
      links: [...detail.querySelectorAll('.expertise-see a')],
    };
  }

  // Fill a panel for a skill (or the idle prompt). The SEE links show right away; only the
  // description types, so `typed` limits just that line.
  function fill(target, item, { typed = Infinity, pinned = false } = {}) {
    const prompt = target.querySelector('.xp-prompt');
    const see = target.querySelector('.xp-see');
    prompt.textContent = '';
    see.textContent = '';
    if (!item) {
      prompt.append('C:\\EXPERTISE>', cursor());
      const hint = document.createElement('span');
      hint.className = 'xp-hint';
      hint.textContent = canHover ? 'hover a skill' : 'tap a skill';
      prompt.append(hint);
      setText(target, '', false);
      return;
    }
    const { dir, desc, links } = skill(item);
    prompt.append(`C:\\EXPERTISE\\${dir}>`);
    if (pinned) {
      const mark = document.createElement('span');
      mark.className = 'xp-pinned';
      mark.textContent = '[PINNED]';
      prompt.append(mark);
    }
    setText(target, desc.slice(0, typed), true);
    see.append('SEE: ');
    links.forEach((a, i) => see.append(i ? ', ' : '', a.cloneNode(true)));
  }

  function setText(target, text, withCursor) {
    const el = target.querySelector('.xp-text');
    el.textContent = text;
    if (withCursor) el.append(cursor());
  }

  // Fixed height: the tallest of all states at the current width, so hovering never shifts layout
  function measure() {
    const probe = panel.cloneNode(true);
    probe.removeAttribute('aria-live');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = `position:absolute;visibility:hidden;height:auto;width:${panel.offsetWidth}px`;
    panel.parentNode.append(probe);
    let tallest = 0;
    for (const item of [null, ...items]) {
      fill(probe, item, { pinned: !!item });
      tallest = Math.max(tallest, probe.offsetHeight);
    }
    probe.remove();
    panel.style.height = `${tallest}px`;
  }

  let shown = null, pinned = null, typeTimer = 0;

  // Put a skill (or the idle prompt) on the panel. Re-showing the same skill only refreshes
  // the prompt line, so pinning or unpinning never restarts the typing.
  function show(item) {
    items.forEach(i => {
      i.classList.toggle('is-selected', i === item);
      if (canHover) i.setAttribute('aria-pressed', String(i === pinned));
    });
    if (item === shown) {
      const prompt = panel.querySelector('.xp-prompt');
      const mark = prompt.querySelector('.xp-pinned');
      if (item && pinned === item && !mark) {
        const m = document.createElement('span');
        m.className = 'xp-pinned';
        m.textContent = '[PINNED]';
        prompt.append(m);
      } else if (mark && pinned !== item) mark.remove();
      return;
    }
    shown = item;
    clearInterval(typeTimer);
    const announce = panel.querySelector('.xp-announce');
    if (!item) {
      announce.textContent = '';
      fill(panel, null);
      return;
    }
    const { name, desc } = skill(item);
    announce.textContent = `${name}: ${desc}`;
    if (reduceMotion.matches) { fill(panel, item, { pinned: pinned === item }); return; }
    let typed = 0;
    fill(panel, item, { typed: 0, pinned: pinned === item });
    typeTimer = setInterval(() => {
      typed++;
      setText(panel, desc.slice(0, typed), true);
      if (typed >= desc.length) clearInterval(typeTimer);
    }, CHAR_MS);
  }

  function pin(item) {
    pinned = item;
    show(item || shown);
  }

  fill(panel, null);
  measure();
  // Re-measure when the column width changes (the height it sets would otherwise re-trigger this)
  let measuredWidth = panel.offsetWidth;
  new ResizeObserver(() => {
    if (panel.offsetWidth === measuredWidth) return;
    measuredWidth = panel.offsetWidth;
    measure();
  }).observe(panel.parentNode);
  document.fonts.ready.then(measure);

  // Hover intent: a skill only takes over the panel after the pointer rests on it, never while
  // the pointer is inside the panel, and never while another skill is pinned
  const INTENT_MS = 150;
  let intentTimer = 0, overPanel = false;
  panel.addEventListener('mouseenter', () => { overPanel = true; clearTimeout(intentTimer); });
  panel.addEventListener('mouseleave', () => { overPanel = false; });

  let pointerFocus = false, focusPinned = null;
  items.forEach(item => {
    if (canHover) {
      item.addEventListener('mouseenter', () => {
        clearTimeout(intentTimer);
        intentTimer = setTimeout(() => {
          if (!pinned && !overPanel) show(item);
        }, INTENT_MS);
      });
      item.addEventListener('mouseleave', () => clearTimeout(intentTimer));
    }
    item.addEventListener('pointerdown', () => { pointerFocus = true; });
    // Keyboard focus pins the focused skill; focus that comes from a click or tap is left to the click
    item.addEventListener('focus', () => {
      if (pointerFocus) { pointerFocus = false; return; }
      focusPinned = item;
      pin(item);
    });
    item.addEventListener('blur', () => {
      if (focusPinned !== item) return;
      focusPinned = null;
      if (pinned === item) pin(null);
    });
    item.addEventListener('click', e => {
      pointerFocus = false;
      clearTimeout(intentTimer);
      if (!canHover) {
        // Touch: tapping the shown skill again returns to the idle prompt
        show(item === shown ? null : item);
        return;
      }
      // A keyboard "click" (Enter/Space) arrives with detail 0; keep it pinned rather than toggling off
      if (e.detail === 0 && pinned === item) return;
      focusPinned = null;
      pin(pinned === item ? null : item);
    });
  });
})();

// DOS buttons: a keyboard press gets the same pushed-in look as a mouse press
(function () {
  const PRESS_MS = 120;
  document.addEventListener('keydown', e => {
    const button = e.target.closest && e.target.closest('.dos-button');
    if (!button || (e.key !== 'Enter' && e.key !== ' ')) return;
    button.classList.add('is-pressed');
    setTimeout(() => button.classList.remove('is-pressed'), PRESS_MS);
  });
})();

// Name glitch: every 5–12 seconds one or two letters of the hero heading briefly pixelate (6px
// blocks, then 3px, then the real letter). Each glitch is a canvas laid over the letter, measured
// with a Range, so the heading's text, layout and reading order are never touched.
(function () {
  const heading = document.querySelector('.hero h1');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!heading || reduceMotion.matches || !('IntersectionObserver' in window)) return;
  const STEP_MS = 80, BLOCKS = [6, 3];
  const MIN_WAIT = 5000, MAX_WAIT = 12000;
  heading.classList.add('glitch-host');

  let onScreen = false, last = new Set();
  new IntersectionObserver(entries => { onScreen = entries.some(e => e.isIntersecting); }).observe(heading);

  // Every visible letter in the heading: its text node and offset (upright and italic alike)
  function letters() {
    const found = [];
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      [...node.textContent].forEach((ch, i) => { if (/\S/.test(ch)) found.push({ node, i, ch }); });
    }
    return found;
  }

  function glitchLetter({ node, i, ch }) {
    // Measured fresh each time, so resizes and late font loads never leave it misaligned
    const range = document.createRange();
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const box = range.getBoundingClientRect(), host = heading.getBoundingClientRect();
    if (!box.width || !box.height) return;

    const style = getComputedStyle(node.parentElement);
    const pad = Math.ceil(box.height * 0.15); // room for italic overhang
    const w = Math.ceil(box.width) + pad * 2, h = Math.ceil(box.height);

    // The real glyph, drawn once as a coverage mask
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const m = mask.getContext('2d');
    m.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    m.textBaseline = 'alphabetic';
    const metrics = m.measureText(ch);
    m.fillText(ch, pad, metrics.fontBoundingBoxAscent ?? h * 0.8);
    const alpha = m.getImageData(0, 0, w, h).data;

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.className = 'glitch-letter';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    Object.assign(canvas.style, {
      left: `${box.left - host.left - pad}px`, top: `${box.top - host.top}px`, width: `${w}px`, height: `${h}px`,
    });
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const root = getComputedStyle(document.documentElement);
    const paper = root.getPropertyValue('--paper').trim() || '#f5f3ef';
    const ink = Math.random() < 0.25 ? (root.getPropertyValue('--pixel').trim() || '#1f3bd6') : style.color;

    // One stage: blocks touching the glyph are papered over (hiding the real letter); the solid ones get ink
    function draw(block) {
      ctx.clearRect(0, 0, w, h);
      for (let by = 0; by < h; by += block) {
        for (let bx = 0; bx < w; bx += block) {
          let sum = 0, n = 0;
          for (let y = by; y < Math.min(by + block, h); y++) {
            for (let x = bx; x < Math.min(bx + block, w); x++) { sum += alpha[(y * w + x) * 4 + 3]; n++; }
          }
          const cover = sum / (n * 255);
          if (cover <= 0.02) continue;
          ctx.fillStyle = cover > 0.4 ? ink : paper;
          ctx.fillRect(bx, by, block, block);
        }
      }
    }

    draw(BLOCKS[0]);
    heading.append(canvas);
    BLOCKS.slice(1).forEach((block, k) => setTimeout(() => draw(block), (k + 1) * STEP_MS));
    setTimeout(() => canvas.remove(), BLOCKS.length * STEP_MS);
  }

  function glitch() {
    const all = letters();
    // One letter usually, sometimes two; never one that glitched last time
    const pool = all.filter(l => !last.has(`${l.node.textContent}:${l.i}`));
    const count = Math.random() < 0.3 ? 2 : 1;
    const picked = [];
    while (picked.length < count && pool.length) picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
    last = new Set(picked.map(l => `${l.node.textContent}:${l.i}`));
    picked.forEach(glitchLetter);
  }

  function schedule() {
    setTimeout(() => {
      if (onScreen && !document.hidden) glitch();
      schedule();
    }, MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT));
  }

  document.fonts.ready.then(schedule);
})();
