// ROCKS.EXE — an original asteroid-field arcade game for the RUSSELL-DOS terminal.
// Loaded on demand by retro.js. RocksGame.create(host, options) builds a game inside `host`;
// update() advances one fixed 1/60s step and render() draws a frame, so both can be driven directly.
window.RocksGame = (function () {
  const W = 320, H = 200;          // EGA resolution
  const STEP_MS = 1000 / 60;
  const TAU = Math.PI * 2;
  const STORE_KEY = 'rocks-high-scores';

  // Colours from the 16-colour EGA palette, as little-endian RGBA words for the pixel buffer
  const rgba = hex => {
    const n = parseInt(hex.replace('#', ''), 16);
    return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
  };
  const C = {
    black: rgba('#000000'), white: rgba('#FFFFFF'), lgray: rgba('#AAAAAA'), dgray: rgba('#555555'),
    lcyan: rgba('#55FFFF'), yellow: rgba('#FFFF55'), lgreen: rgba('#55FF55'), lred: rgba('#FF5555'),
    lmagenta: rgba('#FF55FF'),
  };
  const ROCK_COLORS = [C.lgray, C.lcyan, C.yellow];

  // 3×5 bitmap font, one string of 15 bits per glyph, read row by row
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101010010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
    8: '111101111101111', 9: '111101111001110',
    ':': '000010000010000', '.': '000000000000010', '!': '010010010000010', '-': '000000111000000',
    '/': '001001010100100', '?': '110001010000010', ',': '000000000010100', '+': '000010111010000',
    '>': '100010001010100', '<': '001010100010001', '(': '010100100100010', ')': '010001001001010',
    '_': '000000000000111', "'": '010010000000000', ' ': '000000000000000',
  };

  const SHIP = [[7, 0], [-5, -5], [-2, 0], [-5, 5]];
  const ROCK_RADIUS = { 3: 16, 2: 9, 1: 5 };
  const ROCK_POINTS = { 3: 20, 2: 50, 1: 100 };
  const CONTROLS = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], thrust: ['ArrowUp', 'KeyW'],
    fire: ['Space'], hyper: ['ArrowDown', 'KeyS'],
  };

  function loadScores() {
    try {
      const list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(list) ? list.filter(e => e && typeof e.s === 'number').slice(0, 5) : [];
    } catch { return []; }
  }

  function saveScores(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* storage unavailable: keep playing */ }
  }

  function create(host, { onExit = () => {}, announce = () => {}, scale = 2, touch = false, background = '#1f3bd6' } = {}) {
    const BG = rgba(background);
    const canvas = document.createElement('canvas');
    canvas.className = 'rocks-canvas';
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    canvas.dataset.hideCursor = '';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'ROCKS.EXE game screen');
    host.append(canvas);
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(W, H);
    const buf = new Uint32Array(image.data.buffer);

    // ── Drawing ──
    function plot(x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      buf[y * W + x] = c;
    }

    function rect(x, y, w, h, c) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) plot(x + i, y + j, c);
    }

    // Bresenham: whole pixels only, so shapes stay crisp and chunky
    function line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        plot(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }

    function poly(points, x, y, angle, c) {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const pts = points.map(([px, py]) => [x + px * cos - py * sin, y + px * sin + py * cos]);
      pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; line(p[0], p[1], q[0], q[1], c); });
    }

    // Draw something near an edge again on the far side, so it wraps smoothly
    function wrapped(x, y, r, draw) {
      const xs = [x], ys = [y];
      if (x < r) xs.push(x + W); else if (x > W - r) xs.push(x - W);
      if (y < r) ys.push(y + H); else if (y > H - r) ys.push(y - H);
      for (const wx of xs) for (const wy of ys) draw(wx, wy);
    }

    function text(str, x, y, c, size = 1, align = 'left', shadow = true) {
      if (shadow) glyphs(str, x + size, y + size, C.black, size, align);
      glyphs(str, x, y, c, size, align);
    }

    function glyphs(str, x, y, c, size, align) {
      str = String(str).toUpperCase();
      const width = str.length * 4 * size - size;
      if (align === 'center') x -= Math.floor(width / 2);
      else if (align === 'right') x -= width;
      [...str].forEach((ch, i) => {
        const g = FONT[ch] || FONT['?'];
        for (let b = 0; b < 15; b++) {
          if (g[b] === '1') rect(x + i * 4 * size + (b % 3) * size, y + Math.floor(b / 3) * size, size, size, c);
        }
      });
    }

    // ── World ──
    const world = {
      state: 'title', paused: false, frame: 0, score: 0, lives: 3, wave: 0, nextLife: 10000,
      ship: null, rocks: [], bullets: [], particles: [], scores: loadScores(),
      waveTimer: 0, respawnTimer: 0, overTimer: 0, beatTimer: 0, beatHigh: false,
      initials: ['A', 'A', 'A'], initialsAt: 0, lastScore: 0, sound: false,
    };
    const down = new Set(), pressed = new Set();

    const rand = (a, b) => a + Math.random() * (b - a);
    const wrapX = x => (x + W) % W, wrapY = y => (y + H) % H;
    function dist(a, b) {
      let dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
      if (dx > W / 2) dx = W - dx;
      if (dy > H / 2) dy = H - dy;
      return Math.hypot(dx, dy);
    }

    function makeRock(size, x, y, speed) {
      const angle = rand(0, TAU);
      const r = ROCK_RADIUS[size];
      const n = 8 + Math.floor(Math.random() * 4);
      const shape = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * TAU + rand(-0.25, 0.25);
        const rr = r * rand(0.7, 1.08);
        return [Math.cos(a) * rr, Math.sin(a) * rr];
      });
      return {
        x, y, size, r, shape, color: ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)],
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, rot: rand(0, TAU), spin: rand(-0.02, 0.02),
      };
    }

    function spawnShip() {
      world.ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, alive: true, invuln: 150, thrusting: false };
    }

    function startWave() {
      world.wave++;
      const count = Math.min(3 + world.wave, 11);
      const speed = 0.3 + 0.06 * world.wave;
      for (let i = 0; i < count; i++) {
        let x, y;
        do { x = rand(0, W); y = rand(0, H); } while (Math.hypot(x - W / 2, y - H / 2) < 70);
        world.rocks.push(makeRock(3, x, y, speed * rand(0.8, 1.3)));
      }
      world.maxRocks = count * 7; // every large rock eventually becomes up to 7 pieces
    }

    function attract() {
      world.rocks = [];
      for (let i = 0; i < 5; i++) world.rocks.push(makeRock(1 + (i % 3), rand(0, W), rand(0, H), 0.35));
    }

    function newGame() {
      Object.assign(world, { state: 'playing', score: 0, lives: 3, wave: 0, nextLife: 10000, rocks: [], bullets: [], particles: [], waveTimer: 90 });
      spawnShip();
      world.wave = 0;
      announce('Game started. Arrow keys or W A S D to turn and thrust, Space to fire, Down or S for hyperspace, P to pause, M for sound, Escape to quit.');
    }

    function burst(x, y, count, colors, speed = 1.6) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU), s = rand(0.3, speed);
        world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: Math.floor(rand(20, 45)), color: colors[i % colors.length] });
      }
    }

    function splitRock(rock, index) {
      world.rocks.splice(index, 1);
      burst(rock.x, rock.y, 6 + rock.size * 4, [rock.color, C.white]);
      sound.crunch(0.12 + rock.size * 0.05);
      if (rock.size > 1) {
        const speed = Math.hypot(rock.vx, rock.vy) * (rock.size === 3 ? 1.4 : 1.3);
        for (let k = 0; k < 2; k++) world.rocks.push(makeRock(rock.size - 1, rock.x, rock.y, speed));
      }
    }

    function addScore(points) {
      world.score += points;
      if (world.score >= world.nextLife) {
        world.lives++;
        world.nextLife += 10000;
        sound.jingle();
      }
    }

    function killShip() {
      const s = world.ship;
      s.alive = false;
      burst(s.x, s.y, 28, [C.white, C.yellow, C.lred], 2.2);
      sound.crunch(0.45);
      world.lives--;
      world.respawnTimer = 100;
    }

    function gameOver() {
      world.state = 'over';
      world.overTimer = 150;
      world.lastScore = world.score;
    }

    const isTopScore = score => score > 0 && (world.scores.length < 5 || score > world.scores[world.scores.length - 1].s);

    function submitInitials() {
      const entry = { n: world.initials.join(''), s: world.lastScore };
      world.scores = [...world.scores, entry].sort((a, b) => b.s - a.s).slice(0, 5);
      saveScores(world.scores);
      world.state = 'scores';
    }

    // ── One fixed 1/60s step ──
    function update() {
      world.frame++;
      const hit = action => CONTROLS[action].some(k => pressed.has(k));
      const held = action => CONTROLS[action].some(k => down.has(k));
      const edge = action => { const h = hit(action); CONTROLS[action].forEach(k => pressed.delete(k)); return h; };

      if (world.paused) { pressed.clear(); return; }

      if (world.state === 'title' || world.state === 'scores') {
        if (edge('fire')) newGame();
      }

      if (world.state === 'playing') {
        const s = world.ship;
        if (s && s.alive) {
          if (held('left')) s.a -= 0.08;
          if (held('right')) s.a += 0.08;
          s.thrusting = held('thrust');
          if (s.thrusting) { s.vx += Math.cos(s.a) * 0.06; s.vy += Math.sin(s.a) * 0.06; }
          s.vx *= 0.992; s.vy *= 0.992;
          const v = Math.hypot(s.vx, s.vy);
          if (v > 3) { s.vx *= 3 / v; s.vy *= 3 / v; }
          s.x = wrapX(s.x + s.vx); s.y = wrapY(s.y + s.vy);
          if (s.invuln > 0) s.invuln--;
          if (edge('fire') && world.bullets.length < 4) {
            world.bullets.push({ x: s.x + Math.cos(s.a) * 7, y: s.y + Math.sin(s.a) * 7, vx: s.vx + Math.cos(s.a) * 3.5, vy: s.vy + Math.sin(s.a) * 3.5, life: 40 });
            sound.fire();
          }
          if (edge('hyper')) {
            s.x = rand(10, W - 10); s.y = rand(10, H - 10); s.vx = 0; s.vy = 0;
            sound.hyper();
            if (Math.random() < 0.1) killShip();
          }
        } else if (s) {
          if (--world.respawnTimer <= 0) {
            if (world.lives > 0) spawnShip(); else gameOver();
          }
        }

        for (let i = world.bullets.length - 1; i >= 0; i--) {
          const b = world.bullets[i];
          b.x = wrapX(b.x + b.vx); b.y = wrapY(b.y + b.vy);
          if (--b.life <= 0) world.bullets.splice(i, 1);
        }
      }

      for (const r of world.rocks) {
        r.x = wrapX(r.x + r.vx); r.y = wrapY(r.y + r.vy); r.rot += r.spin;
      }

      if (world.state === 'playing') {
        for (let i = world.bullets.length - 1; i >= 0; i--) {
          const b = world.bullets[i];
          const j = world.rocks.findIndex(r => dist(r, b) < r.r);
          if (j < 0) continue;
          world.bullets.splice(i, 1);
          addScore(ROCK_POINTS[world.rocks[j].size]);
          splitRock(world.rocks[j], j);
        }
        const s = world.ship;
        if (s && s.alive && s.invuln <= 0) {
          const j = world.rocks.findIndex(r => dist(r, s) < r.r + 4);
          if (j >= 0) {
            addScore(ROCK_POINTS[world.rocks[j].size]);
            splitRock(world.rocks[j], j);
            killShip();
          }
        }
        // Wave cleared: announce the next one, then bring it in
        if (!world.rocks.length) {
          if (world.waveTimer <= 0) world.waveTimer = 110;
          if (--world.waveTimer <= 0) startWave();
        }
        // Heartbeat: two low notes that quicken as the field thins out
        if (world.rocks.length && --world.beatTimer <= 0) {
          const share = Math.min(1, world.rocks.length / Math.max(1, world.maxRocks || 1));
          world.beatTimer = Math.round(14 + share * 46);
          world.beatHigh = !world.beatHigh;
          sound.beat(world.beatHigh);
        }
      }

      if (world.state === 'over' && --world.overTimer <= 0) {
        if (isTopScore(world.lastScore)) {
          world.state = 'entry';
          world.initials = ['A', 'A', 'A'];
          world.initialsAt = 0;
        } else world.state = 'scores';
      }

      for (let i = world.particles.length - 1; i >= 0; i--) {
        const p = world.particles[i];
        p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97;
        if (--p.life <= 0) world.particles.splice(i, 1);
      }
      pressed.clear();
    }

    // ── Drawing a frame ──
    function drawShipIcon(x, y, c) {
      poly([[0, -4], [3, 3], [0, 1], [-3, 3]], x, y, 0, c);
    }

    function drawScores(y) {
      text('HIGH SCORES', W / 2, y, C.yellow, 1, 'center');
      for (let i = 0; i < 5; i++) {
        const e = world.scores[i];
        const row = e ? `${i + 1}. ${e.n}  ${String(e.s).padStart(6, ' ')}` : `${i + 1}. ---  ${'0'.padStart(6, ' ')}`;
        text(row, W / 2, y + 10 + i * 8, e ? C.white : C.lgray, 1, 'center');
      }
    }

    const blink = (period = 30) => world.frame % period < period * 0.6;

    function render() {
      buf.fill(BG);

      if (world.state !== 'entry') {
        for (const r of world.rocks) wrapped(r.x, r.y, r.r + 2, (x, y) => poly(r.shape, x, y, r.rot, r.color));
      }
      for (const b of world.bullets) rect(b.x - 1, b.y - 1, 2, 2, C.lgreen);
      for (const p of world.particles) if (p.life > 12 || p.life % 4 < 2) plot(p.x, p.y, p.color);

      const s = world.ship;
      if (world.state === 'playing' && s && s.alive && (s.invuln <= 0 || world.frame % 8 < 5)) {
        wrapped(s.x, s.y, 9, (x, y) => {
          poly(SHIP, x, y, s.a, C.white);
          if (s.thrusting && world.frame % 4 < 2) {
            poly([[-3, -2], [-7 - Math.floor(Math.random() * 3), 0], [-3, 2]], x, y, s.a, world.frame % 8 < 4 ? C.yellow : C.lred);
          }
        });
      }

      if (world.state === 'playing' || world.state === 'over') {
        text(String(world.score), 4, 3, C.white);
        const hi = Math.max(world.score, world.scores[0] ? world.scores[0].s : 0);
        text(`HI ${hi}`, W / 2, 3, C.yellow, 1, 'center');
        for (let i = 0; i < Math.min(world.lives, 6); i++) drawShipIcon(W - 6 - i * 9, 7, C.white);
        if (world.state === 'playing' && !world.rocks.length && world.waveTimer > 0) {
          text(`WAVE ${world.wave + 1}`, W / 2, H / 2 - 6, C.white, 2, 'center');
        }
      }

      if (world.state === 'title') {
        // Chunky logo: a dark drop shadow, then the letters
        text('ROCKS', W / 2 + 3, 25, C.black, 7, 'center', false);
        text('ROCKS', W / 2, 22, C.yellow, 7, 'center', false);
        if (blink()) text('PRESS SPACE TO START', W / 2, 70, C.white, 1, 'center');
        drawScores(88);
        text('ARROWS OR WASD: TURN/THRUST  SPACE: FIRE', W / 2, 150, C.lcyan, 1, 'center');
        text('DOWN: HYPERSPACE  P: PAUSE  ESC: QUIT', W / 2, 160, C.lcyan, 1, 'center');
        text(`M: SOUND ${world.sound ? 'ON' : 'OFF'}`, W / 2, 176, C.white, 1, 'center');
        text('(C) 2026 RUSSELL-DOS', W / 2, 190, C.lgray, 1, 'center');
      }

      if (world.state === 'over') {
        text('GAME OVER', W / 2, 80, C.white, 3, 'center');
        text(`SCORE ${world.lastScore}`, W / 2, 104, C.yellow, 1, 'center');
      }

      if (world.state === 'entry') {
        text('GAME OVER', W / 2, 30, C.white, 3, 'center');
        text(`SCORE ${world.lastScore}`, W / 2, 56, C.yellow, 1, 'center');
        text('NEW HIGH SCORE! ENTER YOUR INITIALS', W / 2, 76, C.white, 1, 'center');
        world.initials.forEach((ch, i) => {
          const x = W / 2 - 30 + i * 22;
          text(ch, x, 96, i === world.initialsAt ? C.yellow : C.white, 4);
          if (i === world.initialsAt && blink(20)) rect(x, 118, 11, 2, C.yellow);
        });
        text('TYPE OR UP/DOWN, ENTER TO CONFIRM', W / 2, 140, C.lcyan, 1, 'center');
      }

      if (world.state === 'scores') {
        text('GAME OVER', W / 2, 24, C.white, 3, 'center');
        text(`SCORE ${world.lastScore}`, W / 2, 50, C.yellow, 1, 'center');
        drawScores(72);
        if (blink()) text('PRESS SPACE TO PLAY AGAIN', W / 2, 136, C.white, 1, 'center');
      }

      if (world.paused) {
        rect(W / 2 - 50, H / 2 - 14, 100, 28, C.black);
        text('PAUSED', W / 2, H / 2 - 9, C.white, 2, 'center');
        text('P TO RESUME', W / 2, H / 2 + 5, C.lgray, 1, 'center');
      }

      ctx.putImageData(image, 0, 0);
    }

    // ── Sound: PC-speaker-style square waves, off until M ──
    let audio = null;
    const sound = {
      ctx() {
        if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch { audio = null; } }
        return audio;
      },
      tone(freq, dur, when = 0, vol = 0.04) {
        if (!world.sound || !audio) return;
        const t = audio.currentTime + when;
        const osc = audio.createOscillator(), gain = audio.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.setValueAtTime(0, t + dur);
        osc.connect(gain).connect(audio.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      },
      crunch(dur) {
        if (!world.sound || !audio) return;
        // Stepped square noise: random ±1 held for a few samples at a time, fading in steps
        const len = Math.floor(audio.sampleRate * dur);
        const buffer = audio.createBuffer(1, len, audio.sampleRate);
        const data = buffer.getChannelData(0);
        let v = 1;
        for (let i = 0; i < len; i++) {
          if (i % 24 === 0) v = Math.random() < 0.5 ? -1 : 1;
          data[i] = v * (1 - Math.floor((i / len) * 4) / 4) * 0.06;
        }
        const src = audio.createBufferSource();
        src.buffer = buffer;
        src.connect(audio.destination);
        src.start();
      },
      fire() { this.tone(1200, 0.03); this.tone(900, 0.03, 0.03); },
      hyper() { [300, 500, 800].forEach((f, i) => this.tone(f, 0.03, i * 0.03)); },
      beat(high) { this.tone(high ? 62 : 55, 0.09, 0, 0.06); },
      jingle() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.08, i * 0.09)); },
    };

    function toggleSound() {
      world.sound = !world.sound;
      if (world.sound && sound.ctx()) audio.resume();
    }

    function setPaused(on) {
      if (world.state === 'title' || world.state === 'entry') return;
      world.paused = on;
    }

    // ── Input ──
    const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyP', 'KeyM', 'Enter', 'Escape', 'Backspace']);

    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (world.state === 'entry' && /^Key[A-Z]$/.test(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        world.initials[world.initialsAt] = e.code.slice(3);
        world.initialsAt = Math.min(2, world.initialsAt + 1);
        return;
      }
      if (!GAME_KEYS.has(e.code)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') { quit(); return; }
      if (world.state === 'entry') {
        const at = world.initialsAt, letter = world.initials[at].charCodeAt(0) - 65;
        if (e.code === 'ArrowUp') world.initials[at] = String.fromCharCode(65 + (letter + 1) % 26);
        if (e.code === 'ArrowDown') world.initials[at] = String.fromCharCode(65 + (letter + 25) % 26);
        if (e.code === 'ArrowLeft' || e.code === 'Backspace') world.initialsAt = Math.max(0, at - 1);
        if (e.code === 'ArrowRight') world.initialsAt = Math.min(2, at + 1);
        if (e.code === 'Enter') submitInitials();
        return;
      }
      if (e.code === 'KeyP') { setPaused(!world.paused); return; }
      if (e.code === 'KeyM') { toggleSound(); return; }
      if (!e.repeat) pressed.add(e.code);
      down.add(e.code);
    }

    function onKeyUp(e) {
      if (!GAME_KEYS.has(e.code)) return;
      e.preventDefault();
      down.delete(e.code);
    }

    const onBlur = () => setPaused(true);
    const onVisibility = () => { if (document.hidden) setPaused(true); };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    // Touch: on-screen pixel buttons, each tracking its own touches so several can be held at once
    if (touch) {
      const pad = document.createElement('div');
      pad.className = 'rocks-pad';
      const BUTTONS = [['ArrowLeft', 'L', 'Rotate left'], ['ArrowRight', 'R', 'Rotate right'], ['ArrowUp', 'THR', 'Thrust'], ['Space', 'FIRE', 'Fire'], ['ArrowDown', 'HYP', 'Hyperspace']];
      for (const [code, label, name] of BUTTONS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rocks-button';
        b.textContent = label;
        b.setAttribute('aria-label', name);
        const release = () => { down.delete(code); b.classList.remove('is-down'); };
        b.addEventListener('pointerdown', e => {
          e.preventDefault();
          try { b.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
          b.classList.add('is-down');
          // In initials entry the pad doubles as letter controls: thrust/hyper change, fire confirms
          if (world.state === 'entry') {
            const map = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', Space: world.initialsAt < 2 ? 'ArrowRight' : 'Enter' };
            onKeyDown({ code: map[code], preventDefault() {}, stopPropagation() {} });
            return;
          }
          pressed.add(code);
          down.add(code);
        });
        b.addEventListener('pointerup', release);
        b.addEventListener('pointercancel', release);
        b.addEventListener('lostpointercapture', release);
        pad.append(b);
      }
      host.append(pad);
    }

    // ── Loop: fixed 60Hz updates, drawing on animation frames ──
    let running = true, raf = 0, last = performance.now(), acc = 0;
    function loop(now) {
      if (!running) return;
      acc += Math.min(250, now - last);
      last = now;
      while (acc >= STEP_MS) { update(); acc -= STEP_MS; }
      render();
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      if (audio) { try { audio.close(); } catch { /* already closed */ } audio = null; }
      host.textContent = '';
    }

    function quit() {
      const score = world.state === 'playing' ? world.score : world.lastScore;
      stop();
      onExit(score);
    }

    attract();
    render();
    raf = requestAnimationFrame(loop);

    return {
      update, render, stop, world,
      // Test hooks: feed keys straight into the input state
      press(code) { pressed.add(code); down.add(code); },
      release(code) { down.delete(code); },
      key(code) { onKeyDown({ code, preventDefault() {}, stopPropagation() {} }); },
    };
  }

  return { create, W, H };
})();
