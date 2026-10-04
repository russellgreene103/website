// Retro effects shared by the homepage and /vibe. Each feature sets itself up only if its elements exist.

// Every feature sets itself up inside feature(): if one throws, the error is logged with its name and
// the rest of the page carries on. (The contact form lives in contact.js, so not even a broken or
// stale copy of this file can stop it.)
function feature(name, setup) {
  try {
    return setup();
  } catch (err) {
    console.error(`[retro] ${name} failed to set up:`, err);
    return undefined;
  }
}

const textOf = (el, sel) => el.querySelector(sel).textContent.trim();

const LINKEDIN_URL = 'https://www.linkedin.com/in/russellgreene/';

// Same-site links (case studies) open in this tab; everything else opens in a new one
function openLink(href) {
  const url = new URL(href, location.href);
  if (url.origin === location.origin) location.assign(url.href);
  else window.open(url.href, '_blank', 'noopener');
}

// Phones and tablets: taps instead of hover (desktop never matches this)
const TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// Accent themes: the colours match the inline <head> script and retro.css
const THEMES = { blue: '#1f3bd6', green: '#10633b', red: '#c52e13', yellow: '#d7a13f' };
const currentTheme = () => (THEMES[document.documentElement.dataset.theme] ? document.documentElement.dataset.theme : 'blue');
const themePhoto = theme => (theme === 'blue' ? '/Russell_Greene_Headshot-520.webp' : `/Russell_Greene_Headshot_${theme}-520.webp`);
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

// Switch the whole site's accent (the headshot listens for retro:theme and redraws)
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEMES[theme];
  document.dispatchEvent(new CustomEvent('retro:theme', { detail: theme }));
}

// A /vibe project's name without its Local badge
function projectName(row) {
  return [...row.querySelector('.project-name').childNodes]
    .filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
}

// Letter-grid pixel art: each letter becomes one path with class g-<letter>, one rectangle per run
// (g-I ink, g-P pixel blue, g-C currentColor; g-Q and g-S the accent's highlight and shadow; fixed
// greys g-E, g-D, g-M, g-L and white g-W; food colours that stay put across themes: g-K crust,
// g-Y cheese, g-R pepperoni); '.' is empty
function gridSvg(rows, cell = 2) {
  const paths = {};
  rows.forEach((row, y) => {
    for (const { 0: run, index: x } of row.matchAll(/([^.])\1*/g)) {
      const c = run[0], w = run.length * cell;
      paths[c] = (paths[c] || '') + `M${x * cell} ${y * cell}h${w}v${cell}h-${w}z`;
    }
  });
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
const PIXEL_ICONS = feature('Pixel icon art', () => {
  const ENVELOPE_BODY = ['CCCCCCCCCC', 'CC......CC', 'C.C....C.C', 'C..C..C..C', 'C...CC...C', 'C........C', 'CCCCCCCCCC'];
  const ENVELOPE_OPEN = ['....CC....', '..CC..CC..', 'CC......CC', 'C........C', 'C..C..C..C', 'C...CC...C', 'C........C', 'C........C', 'CCCCCCCCCC'];
  const ARROW_DOWN = ['..C..', '..C..', '..C..', 'CCCCC', '.CCC.', '..C..'];
  // The /vibe pizza slice, drawn with C for crust; C is already currentColor, so crust becomes K
  const PIZZA = [
    'CCCCCCCCCCC',
    'CCCCCCCCCCC',
    'IYYYYYYYYYI',
    '.IYRRYYYYI.',
    '.IYRRYYRYI.',
    '..IYYYRRI..',
    '..IYYYYYI..',
    '...IYRYI...',
    '...IYYYI...',
    '....IYI....',
    '.....I.....',
  ].map(row => row.replace(/C/g, 'K'));
  const ENTER = ['........C.', '........C.', '..C.....C.', '.CC.....C.', 'CCCCCCCCC.', '.CC.......', '..C.......'];
  return {
    envelope: [stamp(10, 9, [[ENVELOPE_BODY, 0, 2]]), ENVELOPE_OPEN],
    enter: [stamp(11, 7, [[ENTER, 1, 0]]), stamp(11, 7, [[ENTER, 0, 0]])],
    arrowDown: [stamp(5, 7, [[ARROW_DOWN, 0, 0]]), stamp(5, 7, [[ARROW_DOWN, 0, 1]])],
    arrowUp: [stamp(5, 7, [[[...ARROW_DOWN].reverse(), 0, 1]]), stamp(5, 7, [[[...ARROW_DOWN].reverse(), 0, 0]])],
    pizza: [PIZZA],
  };
}) || {};

feature('Pixel icons', () => {
  document.querySelectorAll('[data-icon]').forEach(slot => {
    const frames = PIXEL_ICONS[slot.dataset.icon];
    if (frames) slot.innerHTML = frames.map(f => gridSvg(f)).join('');
  });
});

// Core expertise icons: 24×24 shaded pixel art, several frames each. Frames are run-length encoded
// (a count before a letter repeats it) with the letters gridSvg knows: I is the ink outline, P the
// accent, Q and S its highlight and shadow, D M L the fixed greys and W white. `rest` is the frame
// shown when idle; `ms` is the step between frames.
const XP_ICON_DATA = {
  meeples: { ms: 150, rest: 0, frames: [
    '3.3I12.3I5.I3DI10.I3MI3.IDM3DI8.IML3MI2.IDM3DI8.IML3MI2.2I3D2I8.2I3M2I.I7DI6.I7MI.IM4DI8.IL4MI2.I2DI2DI8.I2MI2MI2.I2DI2DI8.I2MI2MI3.2I.2I4.2P4.2I.2I13.2P20.2P2W2P18.2P2W2P20.2P14.3I5.2P5.3I5.I3LI10.I3PI3.ILW3LI8.IPQ3PI2.ILW3LI8.IPQ3PI2.2I3L2I8.2I3P2I.I7LI6.I7PI.IW4LI8.IQ4PI2.I2LI2LI8.I2PI2PI2.I2LI2LI8.I2PI2PI3.2I.2I10.2I.2I2.',
    '.IDM3DI10.3I4.IDM3DI9.I3MI3.2I3D2I8.IML3MI.I7DI7.IML3MI2.IM4DI8.2I3M2I2.I2DI2DI7.I7MI.I2DI2DI8.IL4MI3.2I.2I9.I2MI2MI17.I2MI2MI18.2I.2I13.2P21.P2WP20.P2WP21.2P14.3I12.3I5.I3LI10.I3PI3.ILW3LI8.IPQ3PI2.ILW3LI8.IPQ3PI2.2I3L2I8.2I3P2I.I7LI6.I7PI.IW4LI8.IQ4PI2.I2LI2LI8.I2PI2PI2.I2LI2LI8.I2PI2PI3.2I.2I10.2I.2I2.',
    '3.3I10.IML3MI3.I3DI9.IML3MI2.IDM3DI8.2I3M2I2.IDM3DI7.I7MI.2I3D2I8.IL4MI.I7DI7.I2MI2MI2.IM4DI8.I2MI2MI2.I2DI2DI9.2I.2I3.I2DI2DI18.2I.2I28.2P21.P2WP20.P2WP21.2P14.3I12.3I5.I3LI10.I3PI3.ILW3LI8.IPQ3PI2.ILW3LI8.IPQ3PI2.2I3L2I8.2I3P2I.I7LI6.I7PI.IW4LI8.IQ4PI2.I2LI2LI8.I2PI2PI2.I2LI2LI8.I2PI2PI3.2I.2I10.2I.2I2.',
    '3.3I12.3I5.I3DI10.I3MI3.IDM3DI8.IML3MI2.IDM3DI8.IML3MI2.2I3D2I8.2I3M2I.I7DI6.I7MI.IM4DI8.IL4MI2.I2DI2DI8.I2MI2MI2.I2DI2DI8.I2MI2MI3.2I.2I4.2P4.2I.2I13.2P20.2P2W2P18.2P2W2P3.3I14.2P4.I3PI5.3I5.2P3.IPQ3PI3.I3LI9.IPQ3PI2.ILW3LI8.2I3P2I2.ILW3LI7.I7PI.2I3L2I8.IQ4PI.I7LI7.I2PI2PI2.IW4LI8.I2PI2PI2.I2LI2LI9.2I.2I3.I2LI2LI18.2I.2I17.',
    '3.3I12.3I5.I3DI10.I3MI3.IDM3DI8.IML3MI2.IDM3DI8.IML3MI2.2I3D2I8.2I3M2I.I7DI6.I7MI.IM4DI8.IL4MI2.I2DI2DI8.I2MI2MI2.I2DI2DI8.I2MI2MI3.2I.2I4.2P4.2I.2I13.2P20.2P2W2P12.3I3.2P2W2P11.I3LI4.2P12.ILW3LI3.2P5.3I4.ILW3LI9.I3PI3.2I3L2I8.IPQ3PI.I7LI7.IPQ3PI2.IW4LI8.2I3P2I2.I2LI2LI7.I7PI.I2LI2LI8.IQ4PI3.2I.2I9.I2PI2PI17.I2PI2PI18.2I.2I2.',
    '28.3I10.3I7.I3DI8.I3MI5.IDM3DI6.IML3MI4.IDM3DI6.IML3MI4.2I3D2I6.2I3M2I3.I7DI4.I7MI3.IM4DI6.IL4MI4.I2DI2DI6.I2MI2MI4.I2DI2DI2.2P2.I2MI2MI5.2I.2I3.2P3.2I.2I12.2P2W2P18.2P2W2P13.3I4.2P4.3I7.I3LI3.2P3.I3PI5.ILW3LI6.IPQ3PI4.ILW3LI6.IPQ3PI4.2I3L2I6.2I3P2I3.I7LI4.I7PI3.IW4LI6.IQ4PI4.I2LI2LI6.I2PI2PI4.I2LI2LI6.I2PI2PI5.2I.2I8.2I.2I27.',
    '28.3I10.3I7.I3DI8.I3MI5.IDM3DI6.IML3MI4.IDM3DI6.IML3MI4.2I3D2I6.2I3M2I3.I7DI4.I7MI3.IM4DI6.IL4MI4.I2DI2DI2.2Q2.I2MI2MI4.I2DI2DI2.2P2.I2MI2MI5.2I.2I2.4P2.2I.2I11.Q2P2W2PQ16.Q2P2W2PQ12.3I3.4P3.3I7.I3LI3.2P3.I3PI5.ILW3LI2.2Q2.IPQ3PI4.ILW3LI6.IPQ3PI4.2I3L2I6.2I3P2I3.I7LI4.I7PI3.IW4LI6.IQ4PI4.I2LI2LI6.I2PI2PI4.I2LI2LI6.I2PI2PI5.2I.2I8.2I.2I27.',
    '28.3I10.3I7.I3DI8.I3MI5.IDM3DI6.IML3MI4.IDM3DI6.IML3MI4.2I3D2I6.2I3M2I3.I7DI4.I7MI3.IM4DI6.IL4MI4.I2DI2DI2.2Q2.I2MI2MI4.I2DI2DI2.2P2.I2MI2MI5.2I.2I2.4P2.2I.2I11.Q2P2W2PQ16.Q2P2W2PQ12.3I3.4P3.3I7.I3LI3.2P3.I3PI5.ILW3LI2.2Q2.IPQ3PI4.ILW3LI6.IPQ3PI4.2I3L2I6.2I3P2I3.I7LI4.I7PI3.IW4LI6.IQ4PI4.I2LI2LI6.I2PI2PI4.I2LI2LI6.I2PI2PI5.2I.2I8.2I.2I27.',
    '28.3I10.3I7.I3DI8.I3MI5.IDM3DI6.IML3MI4.IDM3DI6.IML3MI4.2I3D2I6.2I3M2I3.I7DI4.I7MI3.IM4DI6.IL4MI4.I2DI2DI6.I2MI2MI4.I2DI2DI2.2P2.I2MI2MI5.2I.2I3.2P3.2I.2I12.2P2W2P18.2P2W2P13.3I4.2P4.3I7.I3LI3.2P3.I3PI5.ILW3LI6.IPQ3PI4.ILW3LI6.IPQ3PI4.2I3L2I6.2I3P2I3.I7LI4.I7PI3.IW4LI6.IQ4PI4.I2LI2LI6.I2PI2PI4.I2LI2LI6.I2PI2PI5.2I.2I8.2I.2I27.',
    '3.3I12.3I5.I3DI10.I3MI3.IDM3DI8.IML3MI2.IDM3DI8.IML3MI2.2I3D2I8.2I3M2I.I7DI6.I7MI.IM4DI8.IL4MI2.I2DI2DI8.I2MI2MI2.I2DI2DI8.I2MI2MI3.2I.2I4.2P4.2I.2I13.2P20.2P2W2P18.2P2W2P20.2P14.3I5.2P5.3I5.I3LI10.I3PI3.ILW3LI8.IPQ3PI2.ILW3LI8.IPQ3PI2.2I3L2I8.2I3P2I.I7LI6.I7PI.IW4LI8.IQ4PI2.I2LI2LI8.I2PI2PI2.I2LI2LI8.I2PI2PI3.2I.2I10.2I.2I2.',
  ] },
  rocket: { ms: 110, rest: 0, frames: [
    '.M9.2I9.M2.M8.I2DI8.M11.I2DI19.IL2DLI12.L5.I4LI5.L11.ILW4LI16.ILW4LI16.ILQPLPSI9.M6.IQ4PSI6.M2.M5.2IQ4PS2I5.M7.ISIQ4PSISI12.ISIQ4PSISI9.L2.I2SI4PI2SI2.L9.4IMLML4I15.I4MI18.I4LI10.M8.4I8.M2.M9.2W9.M11.4Q20.Q2PQ13.L7.2P7.L15.P59.',
    '12.2I21.I2DI20.I2DI10.M8.IL2DLI6.M2.M8.I4LI6.M10.ILW4LI16.ILW4LI10.L5.ILQPLPSI3.L12.IQ4PSI15.2IQ4PS2I13.ISIQ4PSISI6.M5.ISIQ4PSISI3.M2.M5.I2SI4PI2SI3.M8.4IMLML4I15.I4MI11.L6.I4LI4.L14.4I20.4W20.4Q10.M9.Q2PQ7.M2.M9.Q2PQ7.M13.2P22.P14.L16.L3.',
    '11.2I21.I2DI13.L6.I2DI6.L12.IL2DLI18.I4LI17.ILW4LI9.M6.ILW4LI6.M2.M6.ILQPLPSI6.M9.IQ4PSI15.2IQ4PS2I10.L2.ISIQ4PSISI2.L9.ISIQ4PSISI12.I2SI4PI2SI12.4IMLML4I7.M7.I4MI7.M2.M7.I4LI7.M11.4I21.2W14.L6.4Q6.L14.2Q22.2P36.M20.M2.M20.M.',
    '10.2I13.M7.I2DI9.M2.M7.I2DI9.M9.IL2DLI18.I4LI13.L3.ILW4LI5.L10.ILW4LI16.ILQPLPSI16.IQ4PSI10.M4.2IQ4PS2I6.M2.M3.ISIQ4PSISI5.M6.ISIQ4PSISI12.I2SI4PI2SI10.L.4IMLML4I3.L11.I4MI18.I4LI19.4I12.M7.4W9.M2.M7.4Q9.M10.Q2PQ20.Q2PQ14.L6.2P8.L13.P37.',
    '3.L7.2I7.L13.I2DI20.I2DI19.IL2DLI10.M7.I4LI7.M2.M6.ILW4LI6.M9.ILW4LI16.ILQPLPSI11.L4.IQ4PSI4.L10.2IQ4PS2I13.ISIQ4PSISI12.ISIQ4PSISI7.M4.I2SI4PI2SI4.M2.M4.4IMLML4I4.M10.I4MI18.I4LI12.L6.4I6.L14.2W21.4Q20.Q2PQ11.M9.2P9.M2.M10.P9.M49.',
    '12.2I21.I2DI20.I2DI12.L6.IL2DLI4.L13.I4LI17.ILW4LI16.ILW4LI8.M7.ILQPLPSI5.M2.M7.IQ4PSI5.M9.2IQ4PS2I13.ISIQ4PSISI8.L3.ISIQ4PSISI.L10.I2SI4PI2SI12.4IMLML4I15.I4MI9.M8.I4LI6.M2.M9.4I7.M13.2W21.4Q12.L8.2Q6.L15.2P59.M20.M.',
    '11.2I21.I2DI11.M8.I2DI8.M2.M7.IL2DLI7.M10.I4LI17.ILW4LI11.L4.ILW4LI4.L11.ILQPLPSI16.IQ4PSI15.2IQ4PS2I8.M4.ISIQ4PSISI4.M2.M4.ISIQ4PSISI4.M7.I2SI4PI2SI12.4IMLML4I9.L5.I4MI5.L12.I4LI19.4I20.4W11.M8.4Q8.M2.M8.Q2PQ8.M11.Q2PQ21.2P14.L7.P8.L27.',
    '10.2I15.L5.I2DI7.L12.I2DI19.IL2DLI18.I4LI11.M5.ILW4LI7.M2.M5.ILW4LI7.M8.ILQPLPSI16.IQ4PSI12.L2.2IQ4PS2I4.L8.ISIQ4PSISI12.ISIQ4PSISI12.I2SI4PI2SI8.M3.4IMLML4I5.M2.M6.I4MI8.M9.I4LI19.4I14.L6.2W8.L12.4Q20.Q2PQ21.2P13.M9.P10.M2.M20.M25.',
  ] },
  globe: { ms: 100, rest: 0, frames: [
    '57.6I16.2IL2PLPS2I12.2IQ3P2LDL2D2I9.IPQ4P2LP2SW2DI8.IQ4P3LDLW2DSI7.I6P4L4DSDI6.I6P3L3DW2DSI5.I7P4LDW2DW2SI4.I2L7PLDW4D2SI4.I2L7P2L2DW2D2SI4.I3L7PSDW2DW2SI4.I4L5PSPW4D2SI4.I4L6PS2DW2D2SI5.I3L5P2SDW2DWSI6.I2L7PSW3D2SI7.IL6P2S2DWDSI8.IL5PSP2SW3SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I2PL2PD2I12.2IQP4LDL2D2I9.IPQ2P3L2P5DI8.IQ2P5LDLD2SQI7.I4P6L2D2S2DI6.I4P5L4D2SQI5.I5P6L3D3SDI4.I6P4LDQ2D4SI4.I6P5L3D4SI4.IL7P2L4D4SI4.I2L6PLDLQ2D4SI4.I2L6P2LQ3D4SI5.IL6PL5D3SI6.I7P2LDQD4SI7.I6PLDQ2D3SI8.I6PSPD5SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2IL2P2LD2I12.2IQ5LDL2D2I9.IPQ3L2P2L2DQ2DI8.IQ7LDPS3DI7.I2P8L2SDQ2DI6.I2P7LD4S2DI5.I3P8LD3S2DSI4.I4P6L2D6SI4.I4P7LD6SI4.I6P4L2D6SI4.I6P3LDLD6SI4.I6P4LQD6SI5.I5P3L2D6SI6.I5P4LD6SI7.I4P3LDQ5SI8.I6PDP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I2P3LD2I12.2I6LDL2D2I9.IP2L3P3L2DW2DI8.I7LPSLW2DWI7.IP7L2P6DI6.I8LP3SW2DSI5.IP8L2P2S2DWSDI4.I2P7LP8SI4.I2P7L2P7SI4.I3P6LP8SI4.I4P5LSP7SI4.I4P5LP8SI5.I3P5L8SI6.I3P5LP7SI7.I2P5L7SI8.I4P2LSP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2IP4LD2I12.2I6LDL2D2I9.ILQ2P5L5DI8.I5LP2LDL3DQI7.I6LP3L3DQ2DI6.I6L3P4DSDQI5.I6L4PL3DSQ2DI4.I6L4P7SDI4.I6L5P6SDI4.IP5L4P8SI4.I2P4L3PSP7SI4.I2P4L4P8SI5.IP5L2P8SI6.IP5L3P7SI7.IP4L2P7SI8.I2P2L2PSP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I5LD2I12.2I6LDL2D2I9.IPQ7L2DQ2DI8.I3LP4LDLQ3DI7.I4LP5L3DQ2DI6.I3L4P2LD2SQ2DSI5.I4L4P3LDS3D2SI4.I4L6P5S2DQI4.I4L7P4S3DI4.I4L6P7SDI4.I4L5PSP5SDQI4.I4L6P6S2DI5.I3L5P7SDI6.I4L5P7SI7.I3L4P7SI8.IPL4PSP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I5LD2I12.2I6LDL2D2I9.IP8L2DW2SI8.ILP6LDLW2DSI7.I2LP7L4D2SI6.IL3P4LPS2DW3SI5.I2L3P4L2PDWD4SI4.I2L8P3S3D2SI4.I2L9P2SW2D2SI4.I2L8P5SW2DI4.I2L7PSP3S3DWI4.I2L8P4S2DWDI5.IL7P5SDWDI6.I2L7P5S2DI7.IL6P6SDI8.IL5PSP5SWI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I5LD2I12.2I6LDLDS2I9.I9L2D3SI8.IQ7LDLD3SI7.IP9L2D4SI6.I2P4LP2L2D5SI5.IL2P3L2P3LD6SI4.I10PDQ2D4SI4.I10PL3D4SI4.I10P2S3DQDSI4.I9PSPS2DQ2DSI4.IL9P2S4DQDI5.I8P3S3DQDI6.I9P3SDQ2DI7.I7P4S3DI8.I6PSP4SDQI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I5LS2I12.2I6LDL2S2I9.I9L5SI8.I8LDP4SI7.I10L6SI6.IP2L2P4L7SI5.IP3L2P4LP7SI4.I8P2L2D6SI4.I8P3LD6SI4.I10P2DQ2D3SI4.I9PSL3DQ3SI4.I10PQ2DQ2D2SI5.I8PS2DQ3DSI6.I9PS3DQDSI7.I7P2S2DQDSI8.I6PSP2SQ2DSI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I4LPS2I12.2I6LSP2S2I9.I7L2P5SI8.I7LPSP4SI7.I8L2P6SI6.IL2P3L3P7SI5.I2L2P3L4P7SI4.I5P4LP8SI4.I5P4L2P7SI4.I7P3L2DW5SI4.I7P2LDLWD5SI4.I7P3L3DW4SI5.I6P2L3DWD3SI6.I8PLDW2D3SI7.I7P4DW2SI8.I6PSP2DW3SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I3L2PS2I12.2I5LPSP2S2I9.I5L4P5SI8.I5L3PSP4SI7.I6L4P6SI6.IP3L5P7SI5.ILP3L6P7SI4.I3P3L4P8SI4.I3P3L5P7SI4.I5P5L8SI4.I5P4LDP7SI4.I5P5LQD6SI5.I4P4L3D5SI6.I6P3LDQ5SI7.I5P2LDQD4SI8.I6PSLD5SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2IL4PS2I12.2I3L3PSP2S2I9.I3L6P5SI8.I3L5PSP4SI7.I4L6P6SI6.I2L7P7SI5.I3L8P7SI4.IP3L6P8SI4.IP3L7P7SI4.I2P6L2P8SI4.I2P6LPSP7SI4.I3P7L8SI5.I2P6LD7SI6.I4P5L7SI7.I3P4LD6SI8.I5PLDP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I5PD2I12.2IL5PSPSD2I9.I2L7P3S2DI8.IL7PSP3SWI7.I2L8P4S2DI6.I9P7SI5.IL10P7SI4.I2L8P8SI4.I2L9P7SI4.IP4L5P8SI4.IP4L4PSP7SI4.IP6L3P8SI5.I6L2P8SI6.I2P4L3P7SI7.IP4L2P7SI8.I3P3LSP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I4PLD2I12.2IQ5PSL2D2I9.IPQ7P2S3DI8.IQ7PSPS2DQI7.I10P2SDQ2DI6.I9P7SI5.I11P7SI4.I10P8SI4.I11P7SI4.I3L7P8SI4.I3L6PSP7SI4.I5L5P8SI5.I4L4P8SI6.I4L5P7SI7.I3L4P7SI8.IP3L2PSP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I2P3LD2I12.2IQ4PLDL2D2I9.IPQ7P2DQ2DI8.IQ7PSLQ3DI7.I10P3DQ2DI6.I9P6SDI5.I11P5S2DI4.I10P8SI4.I11P7SI4.IL9P8SI4.IL8PSP7SI4.I3L7P8SI5.I2L6P8SI6.I2L7P7SI7.IL6P7SI8.I2L4PSP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2IP4LD2I12.2IQ3P2LDL2D2I9.IPQ5P2L2DW2DI8.IQ6PLDLW2DWI7.I8P2L5DSI6.I9P4S2DWI5.I11P3SDWDSI4.I10P7SWI4.I11P6SDI4.I10P8SI4.I9PSP7SI4.IL9P8SI5.I8P8SI6.IL8P7SI7.I7P7SI8.IL5PSP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I5LD2I12.2IQP4LDL2D2I9.IPQ3P4L4DSI8.IQ4P3LDL3DSI7.I6P4L3DQ2SI6.I9P2S3D2SI5.I11PS3D3SI4.I10P6S2DI4.I11P5SQDI4.I10P7SDI4.I9PSP6SDI4.I10P7SDI5.I8P7SDI6.I9P6SDI7.I7P7SI8.I6PSP5SQI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I5LD2I12.2IQ5LDLDS2I9.IPQP6L2DQ2SI8.IQ2P5LDLQ3SI7.I4P6L2D4SI6.I9P3D4SI5.I10PLDQ5SI4.I10P3SDQ2DQI4.I11P2SQ4DI4.I10P5S3DI4.I9PSP4S2DQI4.I10P5S3DI5.I8P6S2DI6.I9P4SQ2DI7.I7P5S2DI8.I6PSP4SDSI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I5LS2I12.2I6LDL2S2I9.IPQ7LD4SI8.IQ7LDP4SI7.I2P8L6SI6.I6P3LD6SI5.I7P4L7SI4.I10PSW4D2SI4.I11P2DW2D2SI4.I10P3S2DWDSI4.I9PSP2S4DSI4.I10P3SW2DWSI5.I8P4S2DWDI6.I9P2S3D2SI7.I7P3SDWDSI8.I6PSP2SW3SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I4LPS2I12.2I6LSP2S2I9.I8LP5SI8.I6L2PSP4SI7.I7L3P6SI6.I4P3L2P7SI5.I5P3L3P7SI4.I8P2LDQ2D4SI4.I8P3L3D4SI4.I10P5DQ2SI4.I9PSLQ2DQD2SI4.I10PQ4D3SI5.I8PS5D2SI6.I9PDQD4SI7.I7PSQ2D3SI8.I6PSPD5SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I2L2PLD2I12.2I4L2PSP2S2I9.I6L3P4SDI8.I4L4PSP3SDI7.I5L5P5SDI6.I2P3L4P6SDI5.I3P3L5P5S2DI4.I6P4L2D6SI4.I6P5LD6SI4.I8P2L2DQ5SI4.I8PLDL2D5SI4.I8P2LQ2D5SI5.I7PL3DQ4SI6.I7P2LD6SI7.I6PLDQ5SI8.I6PDP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2IL2P2LS2I12.2I2L4PSPSD2I9.I4L5P2SWDSI8.I2L6PSP2SDWI7.I3L7P3S3DI6.I3L6P4S2DWI5.IP3L7P3SDW2DI4.I4P5LP6SDWI4.I3P6L2P5SWDI4.I5P5LD6SDI4.I5P4LDL6SWI4.I5P5LD6SDI5.I4P4L2D6SI6.I5P3LP6SDI7.I4P3L7SI8.I4P2LSP6SI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I2P2LPS2I12.2IL5PSL2D2I9.I2L7P3D2SI8.IL7PSP3DQI7.IL9PS2DQ2DI6.IL8P2S4DQI5.I2L9PS3DQ2DI4.I2P4L4P4SQ3DI4.IP5L5P3S2DQDI4.I3P5L2P6S2DI4.I3P5LPSP5S2DI4.I3P5L2P5SDQDI5.I2P5LP6SQDI6.I3P3L3P5S2DI7.I2P3L2P6SDI8.I2P2L2PSP5SQI9.2I5P5S2I12.2I2P4S2I16.6I57.',
    '57.6I16.2I2L2PLS2I12.2IQ4PLDL2D2I9.ILQ5P2LD3SDI8.IQ7PDLQ3DI7.I9PL3DQ2DI6.I9P3DQ3DI5.I10PLDQ4DSI4.I4L6P2S2DQ2DQI4.I4L7PSDQ4DI4.IP5L4P3S5DI4.IP5L3PSP2SDQ2DQI4.IP5L4P3SQ3DSI5.IP4L3P4S4DI6.IP3L5P3SDQ2DI7.I3L4P4SQ2DI8.IPL4PSP4SDSI9.2I5P5S2I12.2I2P4S2I16.6I57.',
  ] },
  tower: { ms: 230, rest: 7, frames: [
    '12.I23.I23.I23.I22.2I20.2IL3I16.2I6L2I13.I10LI12.3I6L3I12.IM3I2L2I2DI12.IM2IM2ID2IDI12.I5MID2IDI12.I5MI4DI12.IM2I2MI4DI12.IM2I2MID2IDI12.I5MID2IDI12.I5MI4DI12.IM2I2MI4DI12.IM2I2MID2IDI12.I2M2IMID2IDI12.I2M2IMI4DI13.4IMI2D2I16.2IM3I20.2I11.',
    '12.I23.I23.I23.I22.2I20.2IL3I16.2I6L2I13.I10LI12.3I6L3I12.IM3I2L2I2DI12.IM2IM2ID2IDI12.I5MID2IDI12.I5MI4DI12.IM2I2MI4DI12.IM2I2MID2IDI12.I5MID2IDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I2M2IMID2QDI12.I2M2IMI4DI13.4IMI2D2I16.2IM3I20.2I11.',
    '12.I23.I23.I23.I22.2I20.2IL3I16.2I6L2I13.I10LI12.3I6L3I12.IM3I2L2I2DI12.IM2IM2ID2IDI12.I5MID2IDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I5MID2QDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I2M2IMID2QDI12.I2M2IMI4DI13.4IMI2D2I16.2IM3I20.2I11.',
    '12.I2P21.IP22.I23.I22.2I20.2IL3I16.2I6L2I13.I10LI12.3I6L3I12.IMWQI2L2I2DI12.IM2QM2IDWQDI12.I5MID2QDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I5MID2QDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I2M2QMID2QDI12.I2M2PMI4DI13.2I2PMI2D2I16.2IM3I20.2I11.',
    '12.I2P21.IP22.I23.I22.2I20.2IL3I16.2I6L2I13.I10LI12.3I6L3I12.IM2WI2L2I2DI12.IM2WM2ID2WDI12.I5MID2WDI12.I5MI4DI12.IM2W2MI4DI12.IM2W2MID2WDI12.I5MID2WDI12.I5MI4DI12.IM2W2MI4DI12.IM2W2MID2WDI12.I2M2WMID2WDI12.I2M2WMI4DI13.2I2WMI2D2I16.2IM3I20.2I11.',
    '12.I4P19.IPQPQ19.I3P20.I22.2I20.2IL3I16.2I6L2I13.I10LI12.3I6L3I12.IMWQI2L2I2DI12.IM2QM2IDWQDI12.I5MID2QDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I5MID2QDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I2M2QMID2QDI12.I2M2PMI4DI13.2I2PMI2D2I16.2IM3I20.2I11.',
    '12.I4P19.IPQ2P19.I3P20.I22.2I20.2IL3I16.2I6L2I13.I10LI12.3I6L3I12.IMWQI2L2I2DI12.IM2QM2IDWQDI12.I5MID2QDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I5MID2QDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I2M2QMID2QDI12.I2M2PMI4DI13.2I2PMI2D2I16.2IM3I20.2I11.',
    '12.I4P19.IPQPQ19.I3P20.I22.2I20.2IL3I16.2I6L2I13.I10LI12.3I6L3I12.IMWQI2L2I2DI12.IM2QM2IDWQDI12.I5MID2QDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I5MID2QDI12.I5MI4DI12.IMWQ2MI4DI12.IM2Q2MIDWQDI12.I2M2QMID2QDI12.I2M2PMI4DI13.2I2PMI2D2I16.2IM3I20.2I11.',
  ] },
};

// Draws each icon at its rest frame and steps one at a time: loop() while a skill is hovered, focused
// or pinned, once() when a skill is tapped open. Reduced motion always shows the rest frame, and a
// hidden tab pauses the steps.
const expertiseIcons = feature('Expertise icons', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const decode = code => code.replace(/(\d*)(\D)/g, (_, n, c) => c.repeat(n || 1)).match(/.{24}/g);
  const icons = new Map();
  document.querySelectorAll('[data-xp-icon]').forEach(slot => {
    const data = XP_ICON_DATA[slot.dataset.xpIcon];
    if (!data) return;
    const svgs = data.frames.map(code => gridSvg(decode(code)));
    icons.set(slot, { ...data, slot, svgs, frame: data.rest });
    slot.innerHTML = svgs[data.rest];
  });

  let active = null, looping = false, left = 0, timer = 0;

  const draw = (icon, frame) => {
    if (icon.frame === frame) return;
    icon.frame = frame;
    icon.slot.innerHTML = icon.svgs[frame];
  };

  function tick() {
    const icon = icons.get(active);
    draw(icon, (icon.frame + 1) % icon.svgs.length);
    if (!looping && --left <= 0) { active = null; return; }
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (active && !document.hidden) timer = setTimeout(tick, icons.get(active).ms);
  }

  function stop() {
    clearTimeout(timer);
    if (active) draw(icons.get(active), icons.get(active).rest);
    active = null;
  }

  // Start one icon from its rest frame; any other stops first, so only one ever moves
  function play(item, loop) {
    const slot = item && item.querySelector('[data-xp-icon]');
    if (slot === active && loop && looping) return;
    stop();
    if (!icons.has(slot) || reduceMotion.matches) return;
    active = slot;
    looping = loop;
    left = icons.get(slot).svgs.length;
    schedule();
  }

  document.addEventListener('visibilitychange', schedule);
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) stop(); });

  return { loop: item => play(item, true), once: item => play(item, false), stop };
});

// One mosaic tier: the image cover-cropped into the canvas at one sample per block, blown back up
function drawMosaic(canvas, img, block) {
  const W = canvas.width, H = canvas.height;
  const cols = Math.ceil(W / block), rows = Math.ceil(H / block);
  const small = document.createElement('canvas');
  small.width = cols;
  small.height = rows;
  const sctx = small.getContext('2d');
  sctx.imageSmoothingQuality = 'high';
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const sw = W / scale, sh = H / scale;
  sctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, cols, rows);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, cols * block, rows * block);
}

// Click effects: six stepped pixel effects on a 4px grid, one per click (or tap), never the same twice
// in a row. Elements come from fixed pools, so the pool sizes cap what's on screen.
function makeClickEffects() {
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

  return function fire(x, y) {
    lastEffect = pickEffect();
    EFFECTS[lastEffect](x, y);
  };
}

// Pixel cursor — only on devices with a fine pointer that can hover
feature('Pixel cursor', function () {
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

  // Row previews that follow the pointer: work rows get a media card, /vibe project rows get a
  // DOS window that types out their details
  const OPEN_MS = 120, TYPE_MS = 150;
  const pad = n => String(n).padStart(2, '0');
  // Each row type: how to find it, its link, and how it previews (a media card, or what the window says)
  const ROW_TYPES = [
    { selector: '.work-item', link: '.work-link', card: true },
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
  const WINDOW_SELECTOR = ROW_TYPES.filter(t => t.describe).map(t => t.selector).join(', ');
  const rowType = row => ROW_TYPES.find(t => row.matches(t.selector));

  let win = null, winName = null, winBody = null, cells = [];
  let activeRow = null, winW = 0, winH = 0, typeTimer = 0, typeTick = 0;

  if (document.querySelector(WINDOW_SELECTOR)) {
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
  function followPos(w, h) {
    const flipX = mx + 20 + w + 6 > innerWidth;
    const flipY = my + 16 + h + 6 > innerHeight;
    return { x: Math.round(flipX ? mx - 20 - w : mx + 20), y: Math.round(flipY ? my - 16 - h : my + 16), flipX, flipY };
  }

  function follow(el, w, h) {
    const { x, y, flipX, flipY } = followPos(w, h);
    el.style.translate = `${x}px ${y}px`;
    el.style.transformOrigin = `${flipX ? 'right' : 'left'} ${flipY ? 'bottom' : 'top'}`;
  }

  function placeWindow() {
    if (win && win.classList.contains('is-open')) follow(win, winW, winH);
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


  // Work preview card: the case study image in a DOS frame, resolving through mosaic tiers
  // (the headshot's 16px, 8px, 4px blocks, then the real image) each time it shows a new row
  const CARD_W = 320, CARD_H = 200, CARD_TIERS = [16, 8, 4], CARD_STEP_MS = 70;
  const workRows = [...document.querySelectorAll('.work-item[data-media]')];
  const mediaCache = new Map(); // url → Image, loading or loaded
  let card = null, cardImg, cardMosaic, cardName, cardCount, cardFallback;
  let cardRow = null, cardW = 0, cardH = 0, cardToken = 0, mosaicTimer = 0;

  function loadMedia(url) {
    if (!mediaCache.has(url)) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      mediaCache.set(url, img);
    }
    return mediaCache.get(url);
  }

  if (workRows.length) {
    card = document.createElement('div');
    card.className = 'work-card';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML =
      '<div class="work-card-bar"><span class="work-card-name"></span><span class="work-card-count"></span></div>' +
      '<div class="work-card-media"><img alt=""><canvas></canvas><span class="work-card-fallback"></span></div>';
    document.body.append(card);
    cardImg = card.querySelector('img');
    cardMosaic = card.querySelector('canvas');
    cardMosaic.width = CARD_W;
    cardMosaic.height = CARD_H;
    cardName = card.querySelector('.work-card-name');
    cardCount = card.querySelector('.work-card-count');
    cardFallback = card.querySelector('.work-card-fallback');
    card.addEventListener('animationend', () => {
      if (card.classList.contains('is-closing')) card.className = 'work-card';
    });
    document.fonts.load("8px 'Silkscreen'"); // the title bar's font, ready before the first hover

    // Preload once the page is idle: rows in view first, then the rest, one at a time
    const preload = () => {
      const inView = workRows.filter(r => {
        const b = r.getBoundingClientRect();
        return !r.hidden && b.bottom > 0 && b.top < innerHeight;
      });
      const queue = [...inView, ...workRows.filter(r => !inView.includes(r))];
      const next = () => {
        const row = queue.shift();
        if (!row) return;
        const img = loadMedia(row.dataset.media);
        if (img.complete) next();
        else ['load', 'error'].forEach(type => img.addEventListener(type, next, { once: true }));
      };
      next();
    };
    const whenIdle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500));
    if (document.readyState === 'complete') whenIdle(preload);
    else window.addEventListener('load', () => whenIdle(preload), { once: true });
  }

  // The featured row's entrance: when the card opens onto it from closed (the pointer arriving from
  // outside the list), three ink outlines step from its thumbnail to where the
  // card will sit, 50ms apart, then the card opens as usual. Row to row, the open card just swaps.
  const ZOOM_STEPS = [1 / 3, 2 / 3, 1], ZOOM_MS = 50;
  const zoomBoxes = [];
  let zoomRow = null, zoomTimer = 0;

  function stopZoom() {
    clearTimeout(zoomTimer);
    zoomRow = null;
    zoomBoxes.forEach(b => { b.hidden = true; });
  }

  function zoomOpen(row) {
    if (!zoomBoxes.length) {
      for (let i = 0; i < ZOOM_STEPS.length; i++) {
        const b = document.createElement('div');
        b.className = 'work-zoom';
        b.setAttribute('aria-hidden', 'true');
        b.hidden = true;
        document.body.append(b);
        zoomBoxes.push(b);
      }
    }
    if (!cardW) {
      // Measure the closed card once, invisibly
      card.style.visibility = 'hidden';
      card.style.display = 'block';
      cardW = card.offsetWidth;
      cardH = card.offsetHeight;
      card.style.display = card.style.visibility = '';
    }
    zoomRow = row;
    const from = row.querySelector('.work-feature').getBoundingClientRect();
    let k = 0;
    const step = () => {
      if (k < ZOOM_STEPS.length) {
        const t = ZOOM_STEPS[k], to = followPos(cardW, cardH), b = zoomBoxes[k++];
        const lerp = (a, z) => Math.round(a + (z - a) * t);
        b.style.translate = `${lerp(from.left, to.x)}px ${lerp(from.top, to.y)}px`;
        b.style.width = `${lerp(from.width, cardW)}px`;
        b.style.height = `${lerp(from.height, cardH)}px`;
        b.hidden = false;
        zoomTimer = setTimeout(step, ZOOM_MS);
      } else {
        stopZoom();
        showCard(row, true);
      }
    };
    step();
  }

  function showCard(row, zoomed = false) {
    if (!card) return;
    if (zoomRow) {
      if (row === zoomRow) return;
      stopZoom(); // another row, or nothing: the card does what it would have without the entrance
    }
    if (row === cardRow) return;
    if (row && !cardRow && !zoomed && row.classList.contains('is-featured') && !reduceMotion.matches) {
      zoomOpen(row);
      return;
    }
    const wasOpen = !!cardRow;
    cardRow = row;
    const token = ++cardToken; // later rows win; anything still pending for an older row stops
    clearTimeout(mosaicTimer);
    if (!row) {
      card.className = reduceMotion.matches ? 'work-card' : 'work-card is-closing';
      return;
    }
    if (!wasOpen) card.className = 'work-card is-open';
    card.classList.remove('is-missing');

    const client = textOf(row, '.work-client');
    const all = [...document.querySelectorAll('.work-item')];
    cardName.textContent = `[■] ${client}`;
    cardCount.textContent = `${pad(all.indexOf(row) + 1)}/${pad(all.length)}`;
    cardFallback.textContent = client;

    const img = loadMedia(row.dataset.media);
    cardImg.src = img.src;
    // Cover the frame in cobalt until this row's image is ready to resolve
    const ctx = cardMosaic.getContext('2d');
    ctx.fillStyle = getComputedStyle(root).getPropertyValue('--pixel').trim() || '#1f3bd6';
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    cardMosaic.hidden = false;

    const resolve = () => {
      if (token !== cardToken) return;
      if (!img.naturalWidth) { card.classList.add('is-missing'); cardMosaic.hidden = true; return; }
      if (reduceMotion.matches) { cardMosaic.hidden = true; return; }
      let k = 0;
      const step = () => {
        if (token !== cardToken) return;
        if (k < CARD_TIERS.length) {
          drawMosaic(cardMosaic, img, CARD_TIERS[k++]);
          mosaicTimer = setTimeout(step, CARD_STEP_MS);
        } else cardMosaic.hidden = true;
      };
      step();
    };
    if (img.complete) resolve();
    else ['load', 'error'].forEach(type => img.addEventListener(type, resolve, { once: true }));

    if (!cardW) { cardW = card.offsetWidth; cardH = card.offsetHeight; }
    placeCard();
  }

  function placeCard() {
    if (card && card.classList.contains('is-open')) follow(card, cardW, cardH);
  }

  function setState(target) {
    if (!target || !target.closest) return;
    const field = target.closest('input, textarea, [data-hide-cursor]');
    const row = !field && target.closest(ROW_SELECTOR);
    const link = !field && (row || target.closest('a, button, [role="button"]'));
    overField = !!field;
    root.classList.toggle('cursor-over-field', overField);
    root.classList.toggle('cursor-link', !!link);
    const type = row && rowType(row);
    showCard(type && type.card ? row : null);
    showWindow(type && !type.card ? row : null);
  }

  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    mx = e.clientX;
    my = e.clientY;
    cursor.style.translate = `${Math.round(mx)}px ${Math.round(my)}px`;
    root.classList.add('cursor-visible');
    setState(e.target);
    placeWindow();
    placeCard();

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
    showCard(null);
  });

  // Whole list rows open their link; the link itself still handles its own clicks and keyboard use
  document.addEventListener('click', e => {
    if (e.pointerType === 'touch' || !e.target.closest) return;
    const row = e.target.closest(ROW_SELECTOR);
    if (!row || e.target.closest('a')) return;
    const link = row.querySelector(rowType(row).link);
    if (link) openLink(link.href);
  });

  const clickFx = makeClickEffects();

  document.addEventListener('mousedown', e => {
    if (e.button !== 0 || overField || reduceMotion.matches) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    clickFx(e.clientX, e.clientY);
  });
});

// Touch: taps get the click effects, and tapping anywhere on a list row opens its link
feature('Touch taps', function () {
  if (!TOUCH) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // A tap is a touch that lifts close to where it started. Scrolls cancel the pointer (or travel),
  // so they never fire. Listeners are passive and the effects ignore pointers, so nothing waits on them.
  let clickFx = null, tap = null;
  document.addEventListener('pointerdown', e => {
    tap = null;
    if (e.pointerType !== 'touch' || !e.isPrimary || reduceMotion.matches) return;
    if (e.target.closest && e.target.closest('input, textarea, select, .rocks-pad')) return;
    tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
  }, { passive: true });
  document.addEventListener('pointerup', e => {
    if (!tap || e.pointerId !== tap.id) return;
    const { x, y, t } = tap;
    tap = null;
    if (Math.hypot(e.clientX - x, e.clientY - y) > 10 || e.timeStamp - t > 600) return;
    clickFx = clickFx || makeClickEffects(); // the pools are only built once someone taps
    clickFx(e.clientX, e.clientY);
  }, { passive: true });
  document.addEventListener('pointercancel', () => { tap = null; }, { passive: true });

  document.addEventListener('click', e => {
    const row = e.target.closest && e.target.closest('.work-item, .project-item');
    if (!row || e.target.closest('a')) return;
    const link = row.querySelector('.work-link, .project-link');
    if (link) link.click();
  });
});

// Touch work thumbnails: each row gets a small square of its case study image. It loads as the row
// nears the screen, and the first time the row comes into view it resolves through the same mosaic
// tiers as the desktop preview card (16px, 8px, 4px, then the real image).
feature('Work thumbnails', function () {
  const list = document.getElementById('work-list');
  const rows = list ? [...list.querySelectorAll('.work-item[data-media]:not(.is-featured)')] : [];
  if (!TOUCH || !rows.length || !('IntersectionObserver' in window)) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SIZE = 64, TIERS = [16, 8, 4], STEP_MS = 110;

  list.classList.add('has-thumbs');
  const thumbs = new Map(rows.map(row => {
    const thumb = document.createElement('span');
    thumb.className = 'work-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    thumb.innerHTML = `<img alt="" decoding="async"><canvas width="${SIZE}" height="${SIZE}"></canvas>`;
    row.prepend(thumb);
    return [row, thumb];
  }));

  const load = row => {
    const img = thumbs.get(row).querySelector('img');
    if (!img.getAttribute('src')) img.src = row.dataset.media;
    return img;
  };

  function reveal(row) {
    const thumb = thumbs.get(row);
    const img = load(row);
    const canvas = thumb.querySelector('canvas');
    if (reduceMotion.matches) { canvas.hidden = true; return; }
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--pixel').trim() || '#1f3bd6';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const resolve = () => {
      if (!img.naturalWidth) return; // no image: the cobalt square stays
      let k = 0;
      const step = () => {
        if (k < TIERS.length) {
          drawMosaic(canvas, img, TIERS[k++]);
          setTimeout(step, STEP_MS);
        } else canvas.hidden = true;
      };
      step();
    };
    if (img.complete) resolve();
    else ['load', 'error'].forEach(type => img.addEventListener(type, resolve, { once: true }));
  }

  // Two watchers: one fetches a little ahead of the scroll, the other starts the reveal once the
  // row is mostly on screen. Rows hidden by the collapsed list are skipped until they're shown.
  const near = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      near.unobserve(e.target);
      load(e.target);
    }
  }, { rootMargin: '300px 0px' });
  const seen = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      seen.unobserve(e.target);
      reveal(e.target);
    }
  }, { threshold: 0.6 });
  rows.forEach(row => { near.observe(row); seen.observe(row); });
});

// Featured work: the inline script after the list moved one project to the top and gave it an empty
// image frame. Its image loads as the row nears the screen (the 1080px copy on phones, through srcset),
// and the first time the frame is mostly in view it resolves through the mosaic tiers, then stays.
feature('Featured work', function () {
  const frame = document.querySelector('#work-list .work-feature');
  if (!frame) return;
  frame.dataset.claimed = 'true';
  const img = frame.querySelector('img');
  const load = () => { if (!img.getAttribute('srcset')) img.srcset = img.dataset.srcset; };
  if (!('IntersectionObserver' in window)) { load(); return; }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TIERS = [16, 8, 4], STEP_MS = 110;

  // A cobalt cover until the reveal (reduced motion: none, the image just appears)
  const canvas = document.createElement('canvas');
  canvas.hidden = reduceMotion.matches;
  frame.append(canvas);

  function reveal() {
    load();
    if (reduceMotion.matches) { canvas.hidden = true; return; }
    const resolve = () => {
      if (!img.naturalWidth) return; // no image: the cobalt frame stays
      // With srcset, naturalWidth is scaled by the chosen density, so the mosaic samples a plain
      // copy of the same file (already cached), whose sizes are its real pixels
      const src = new Image();
      src.src = img.currentSrc;
      src.decode().then(() => run(src), () => { canvas.hidden = true; });
    };
    const run = src => {
      canvas.width = frame.clientWidth;
      canvas.height = frame.clientHeight;
      let k = 0;
      const step = () => {
        if (k < TIERS.length) {
          drawMosaic(canvas, src, TIERS[k++]);
          setTimeout(step, STEP_MS);
        } else canvas.hidden = true;
      };
      step();
    };
    if (img.complete && img.naturalWidth) resolve();
    else img.addEventListener('load', resolve, { once: true });
  }

  const near = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    near.disconnect();
    load();
  }, { rootMargin: '300px 0px' });
  const seen = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    seen.disconnect();
    reveal();
  }, { threshold: 0.6 });
  near.observe(frame);
  seen.observe(frame);
});

// Retro headshot — the photo is DOS-dithered onto a canvas above it. On hover the whole image
// resolves through a colour mosaic tier by tier, then the canvas clears to show the real photo.
// Clicking (or tapping, or Enter/Space) cycles the site's accent colour through the mosaic.
// Each theme has its own photo; on the recoloured ones a cutout mask marks the backdrop.
feature('Headshot', function () {
  const wrap = document.querySelector('.hero-photo-wrap');
  const img = wrap && wrap.querySelector('.hero-photo');
  if (!wrap || !img) return;

  const root = document.documentElement;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const CELL = 4;                 // on-screen size of one dither pixel, in CSS px
  const TIER_MS = 250;            // time per mosaic tier
  const REVERSE_MS = 80;          // time per tier when the reveal steps back down
  const CYCLE_MS = 70;            // time per tier when a click changes the colour
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
  // Colour cycle: `rebuilt` runs once the next theme's photo has been redrawn
  const ORDER = ['blue', 'green', 'red', 'yellow'];
  let cycling = false, hovering = false, rebuilt = null;

  const isBlue = (r, g, b) => b - (r + g) / 2 > 70;
  const threshold = (x, y) => (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;

  let theme = currentTheme(), accent = hexRgb(THEMES[theme]);
  const mask = new Image();
  let maskLoaded = null;
  // Blue keeps its original colour test; the recoloured photos need the mask, loaded only then
  const loadMask = () => {
    if (!maskLoaded) {
      maskLoaded = new Promise(resolve => {
        mask.onload = mask.onerror = resolve;
        mask.src = '/Russell_Greene_Headshot_mask-520.webp';
      });
    }
    return maskLoaded;
  };
  const ready = () => (theme === 'blue' ? Promise.resolve() : loadMask());

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
    const data = sctx.getImageData(0, 0, cols, rows);
    // The mask, sampled with the same crop: where it's dark, the cell is backdrop
    data.backdrop = null;
    if (theme !== 'blue' && mask.naturalWidth) {
      // Its own canvas: reading one canvas twice makes Chrome warn (and switch it to a slower path)
      const msrc = document.createElement('canvas');
      msrc.width = cols;
      msrc.height = rows;
      const mctx = msrc.getContext('2d');
      mctx.imageSmoothingQuality = 'high';
      mctx.drawImage(mask, (iw - sw) * px, (ih - sh) * py, sw, sh, 0, 0, cols, rows);
      const m = mctx.getImageData(0, 0, cols, rows).data;
      data.backdrop = new Uint8Array(cols * rows).map((_, p) => (m[p * 4] < 128 ? 1 : 0));
    }
    return data;
  }

  function dither(data) {
    const d = data.data;
    const n = cols * rows;
    const lum = new Float32Array(n), blue = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
      lum[p] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      blue[p] = data.backdrop ? data.backdrop[p] : (isBlue(r, g, b) ? 1 : 0);
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
        if (blue[p] && theme !== 'blue') {
          // Recoloured backdrops are flat, so they dither straight to the theme colour
          const i = p * 4;
          d[i] = accent[0]; d[i + 1] = accent[1]; d[i + 2] = accent[2]; d[i + 3] = 255;
          continue;
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
    dithered.backdrop = base.backdrop;
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

  // Runs for the first photo and again whenever a theme switch loads another
  function onLoad() {
    ready().then(() => {
      build();
      render();
      maybeStart();
      afterRebuild();
    });
  }

  function afterRebuild() {
    const done = rebuilt;
    rebuilt = null;
    if (done) done();
  }

  // The next colour's photo (and the mask it needs), fetched ahead so a click never waits on it
  const preloaded = {};
  function preload() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    if (!preloaded[next]) {
      preloaded[next] = new Image();
      preloaded[next].src = themePhoto(next);
    }
    if (next !== 'blue') loadMask();
  }

  // Walk one stage per CYCLE_MS toward `target`, now or after the first interval, then call `done`
  function walk(target, now, done) {
    clearInterval(stageTimer);
    const tick = () => {
      if (stage !== target) stage += target > stage ? 1 : -1;
      render();
      if (stage !== target) return;
      clearInterval(stageTimer);
      done();
    };
    stageTimer = setInterval(tick, CYCLE_MS);
    if (now) tick();
  }

  // Step down to the 16px tier, switch the whole site's theme there, then resolve back up to the
  // real photo in the new colour. Clicks during a cycle are ignored.
  function cycle() {
    if (cycling) return;
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    const switchTo = () => {
      setTheme(next);
      announcer.textContent = `Accent color: ${next}`;
    };
    if (reduceMotion.matches) {
      clearInterval(stageTimer);
      stage = PHOTO_STAGE;
      render();
      switchTo();
      return;
    }
    cycling = true;
    preload();
    waiting(true);
    walk(1, true, () => {
      stageTimer = setTimeout(() => {
        rebuilt = () => walk(PHOTO_STAGE, false, () => {
          cycling = false;
          waiting(false);
          preload();
          // Pointer or keyboard focus left during the cycle: settle back to the dither like a hover would
          if (fine && !hovering && !wrap.matches(':focus-visible')) stepStage(0, REVERSE_MS);
        });
        switchTo();
      }, CYCLE_MS);
    });
  }

  layout();
  new ResizeObserver(layout).observe(img);

  const io = new IntersectionObserver(entries => {
    onScreen = entries.some(e => e.isIntersecting);
    maybeStart();
    if (started) io.disconnect();
  });
  io.observe(wrap);

  img.addEventListener('load', onLoad);
  img.addEventListener('error', () => { canvas.remove(); afterRebuild(); }); // fall back to the plain <img>
  if (img.complete && img.naturalWidth) onLoad();

  // The headshot is a button that changes the colour, announced politely
  const announcer = document.createElement('p');
  announcer.className = 'visually-hidden';
  announcer.setAttribute('aria-live', 'polite');
  document.body.append(announcer);
  const label = () => wrap.setAttribute('aria-label', `Change accent color (current: ${theme})`);
  wrap.setAttribute('role', 'button');
  wrap.tabIndex = 0;
  label();

  // Any theme switch (a click here or COLOR in the terminal): swap to that theme's photo; its load
  // event rebuilds the dither and mosaics
  document.addEventListener('retro:theme', e => {
    theme = e.detail;
    accent = hexRgb(THEMES[theme]);
    img.src = themePhoto(theme);
    label();
  });

  wrap.addEventListener('pointerenter', preload);
  wrap.addEventListener('focus', preload);
  wrap.addEventListener('click', cycle);
  wrap.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!e.repeat) cycle();
  });

  if (fine) {
    wrap.addEventListener('pointerenter', e => {
      if (e.pointerType === 'touch') return;
      hovering = true;
      if (!cycling) stepStage(PHOTO_STAGE, TIER_MS);
    });
    wrap.addEventListener('pointerleave', e => {
      if (e.pointerType === 'touch') return;
      hovering = false;
      if (!cycling) stepStage(0, REVERSE_MS);
    });
    wrap.addEventListener('blur', () => {
      if (!hovering && !cycling) stepStage(0, REVERSE_MS);
    });
  }
});

// The dither canvas now covers the photo (or the headshot couldn't set up): let the photo show.
// The page's head script hides it until here so the real photo never paints before the dither.
document.documentElement.classList.remove('photo-pending');

// Hidden DOS terminal — backtick anywhere (outside form fields) or the prompt clock opens it
const retroTerminal = feature('Terminal', function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const PROMPT = 'C:\\>';
  const LINKEDIN = LINKEDIN_URL;
  const CLOSE_MS = 120;
  // Touch: tappable commands above the prompt (ROCKS stays a secret)
  const KEYS = ['HELP', 'DIR', 'WHOAMI', 'COLOR', 'TIME'];
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

    // Touch: the prompt line leaves the scrolling screen and sits under a row of command keys at
    // the bottom of the window, so it stays in view above the on-screen keyboard
    if (TOUCH) {
      const keys = document.createElement('div');
      keys.className = 'dos-term-keys';
      keys.setAttribute('role', 'group');
      keys.setAttribute('aria-label', 'Commands');
      keys.innerHTML = KEYS.map(k => `<button type="button" class="dos-term-key" data-cmd="${k}">${k}</button>`).join('');
      screen.after(keys);
      keys.after(overlay.querySelector('.dos-term-line'));
      // Pressing a key never takes focus, so an open keyboard stays open (and a closed one stays closed).
      // A tap acts on touchend and cancels the rest of the tap there: WebKit drops the click if
      // pointerdown is cancelled instead. Mouse and keyboard presses come through click.
      const runKey = key => { if (key && !launching && !game) submit(key.dataset.cmd); };
      let touchKey = null;
      keys.addEventListener('touchstart', e => {
        const t = e.changedTouches[0];
        touchKey = { key: e.target.closest('.dos-term-key'), x: t.clientX, y: t.clientY };
      }, { passive: true });
      keys.addEventListener('touchend', e => {
        const t = e.changedTouches[0], start = touchKey;
        touchKey = null;
        if (!start || !start.key || Math.hypot(t.clientX - start.x, t.clientY - start.y) > 10) return;
        e.preventDefault();
        runKey(start.key);
      });
      keys.addEventListener('mousedown', e => e.preventDefault());
      keys.addEventListener('click', e => runKey(e.target.closest('.dos-term-key')));
    }

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

  // Run a line as if it had been typed at the prompt
  function submit(line) {
    setInput('');
    print(PROMPT + line);
    if (line.trim()) {
      history.push(line);
      historyAt = history.length;
    }
    run(line);
  }

  // Touch: while the terminal is open the page behind it can't scroll (iOS ignores overflow on its
  // own, so the body is pinned in place), and the overlay tracks the visual viewport so the window
  // always fits above the on-screen keyboard
  let lockedY = 0;
  function lockPage(on) {
    if (on) {
      lockedY = window.scrollY;
      document.body.style.top = `-${lockedY}px`;
      root.classList.add('term-locked');
    } else {
      root.classList.remove('term-locked');
      document.body.style.top = '';
      // Jump straight back (older Safari rejects behavior: 'instant'; the page's smooth scrolling is paused instead)
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, lockedY);
      root.style.scrollBehavior = '';
    }
  }

  function fitViewport() {
    const vv = window.visualViewport;
    if (!vv || !isOpen) return;
    overlay.style.setProperty('--vv-top', `${vv.offsetTop}px`);
    overlay.style.setProperty('--vv-height', `${vv.height}px`);
    screen.scrollTop = screen.scrollHeight;
  }

  function trackViewport(on) {
    const vv = window.visualViewport;
    if (!vv) return;
    const method = on ? 'addEventListener' : 'removeEventListener';
    vv[method]('resize', fitViewport);
    vv[method]('scroll', fitViewport);
    if (!on) return;
    overlay.classList.add('is-fit');
    fitViewport();
  }

  function onInputKey(e) {
    if (launching) { e.preventDefault(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      submit(input.value);
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
      if (TOUCH) {
        lockPage(true);
        trackViewport(true);
      }
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
    if (TOUCH) {
      trackViewport(false);
      lockPage(false);
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: TOUCH });
  }

  // What DIR lists: the work list on the homepage, the vibe projects once /vibe is unlocked
  function listing() {
    if (document.getElementById('gate') && !document.querySelector('#content.visible')) return null;
    const work = [...document.querySelectorAll('.work-item')];
    if (work.length) {
      return { dir: 'C:\\WORK', ext: 'PRJ', items: work.map(r => ({ title: textOf(r, '.work-title'), href: r.querySelector('.work-link').href })) };
    }
    const vibe = [...document.querySelectorAll('.project-item')];
    if (!vibe.length) return { dir: null, items: [] };
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
    if (!list.items.length) { print('File not found'); return; }
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
    openLink(item.href);
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
    script.src = '/rocks.js?v=a6fce7cb';
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });

  // Largest whole-number scale of the 320×200 screen that fits the window (0 if it doesn't fit)
  function rocksScale() {
    const width = window.innerWidth - 32 - 40;             // overlay gutters, frame and padding
    const height = window.innerHeight * 0.88 - 80;         // top offset, title bar
    return Math.min(3, Math.floor(Math.min(width / 320, height / 200)));
  }

  // Touch: any scale that fits (phones are too small for whole numbers). Upright, the buttons sit
  // under the screen; sideways, they flank it. `rotate` is set when turning the phone would give
  // a noticeably bigger screen.
  const ROCKS_MIN_TOUCH = 0.75;
  function rocksTouchFit() {
    const w = window.innerWidth, h = window.innerHeight;
    const CHROME_W = 44, CHROME_H = 100;      // overlay gutters, frame, title bar and padding
    const PAD_H = 150, PAD_W = 270;          // buttons below (upright) or at the sides (sideways)
    const fit = (width, height, upright) => Math.min(3,
      (width - CHROME_W - (upright ? 0 : PAD_W)) / 320,
      (height - CHROME_H - (upright ? PAD_H : 0)) / 200);
    const upright = h > w;
    const scale = fit(w, h, upright);
    return { scale, rotate: upright && fit(h, w, false) > scale * 1.25 };
  }

  function refitRocks() {
    if (!game) return;
    const { scale, rotate } = rocksTouchFit();
    game.resize(Math.max(ROCKS_MIN_TOUCH, scale));
    gameHost.classList.toggle('wants-rotate', rotate);
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
    const scale = touch ? rocksTouchFit().scale : rocksScale();
    if (scale < (touch ? ROCKS_MIN_TOUCH : 1)) {
      print('', 'ROCKS.EXE needs a bigger screen than this one.', 'Try it on a computer or a larger window.', '');
      return;
    }
    overlay.classList.add('is-game');
    gameHost.hidden = false;
    title.textContent = 'C:\\RUSSELL\\ROCKS.EXE';
    const background = getComputedStyle(root).getPropertyValue('--pixel').trim() || '#1f3bd6';
    game = window.RocksGame.create(gameHost, { scale, touch, background, theme: currentTheme(), announce, onExit: endRocks });
    if (touch) {
      refitRocks();
      window.addEventListener('resize', refitRocks);
    }
    gameHost.focus();
    announce(touch
      ? 'ROCKS.EXE is running. Tap FIRE to start. Buttons on the left turn and thrust; on the right, fire and jump to hyperspace. EXIT returns to the prompt.'
      : 'ROCKS.EXE is running. Press Space to start. Arrow keys or W A S D turn and thrust, Space fires, Down or S jumps to hyperspace, P pauses, M toggles sound, Escape quits.');
  }

  function restoreTerminal() {
    window.removeEventListener('resize', refitRocks);
    gameHost.classList.remove('wants-rotate');
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
    // Touch: back at the prompt without throwing up the keyboard
    if (TOUCH) closeBox.focus({ preventScroll: true });
    else input.focus();
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
      'COLOR     Change the accent color',
      'VER       Version',
      'CLS       Clear the screen',
      'EXIT      Close the terminal',
      '',
      'Some commands are not listed here...'),
    dir,
    open: openItem,
    whoami: () => print('RUSSELL GREENE', 'Executive Producer @ BUCK // NYC', 'Winning the work, building the team, protecting the idea.', 'Off the clock: science, video games, and programming.'),
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
    // A nod to DOS COLOR: lists the themes, or switches the whole site until the next page load
    color: arg => {
      const names = Object.keys(THEMES);
      if (!arg) {
        print(...names.map(n => `${n === currentTheme() ? '*' : ' '} ${n.toUpperCase()}`), '', 'Type COLOR and a name to switch, e.g. COLOR RED.');
        return;
      }
      if (!THEMES[arg]) { print('Invalid color. Try BLUE, GREEN, RED or YELLOW.'); return; }
      setTheme(arg);
      print(`Color set to ${arg.toUpperCase()}.`);
    },
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
    const command = Object.prototype.hasOwnProperty.call(COMMANDS, cmd) ? COMMANDS[cmd] : null; // Object.hasOwn needs Safari 15.4
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
    // Open and run a line as if it had been typed (the footer's HELP key)
    run: line => { open(); submit(line); },
    get game() { return game; }, // for testing the running game
  };
});

// Prompt-style clock at the right of the menu bar: C:\NYC> 9:27 AM, opens the terminal
feature('Prompt clock', function () {
  const clock = document.querySelector('.prompt-clock');
  if (!clock) return;
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
  // The prefix is its own span so the narrowest screens can show just the time
  clock.innerHTML = '<span class="prompt-prefix">C:\\NYC&gt; </span><time></time><b class="block-cursor" aria-hidden="true"></b>';
  clock.setAttribute('role', 'button');
  clock.tabIndex = 0;
  const time = clock.querySelector('time');

  function tick() {
    const now = new Date();
    time.textContent = fmt.format(now);
    // The name starts with the visible text (voice control users say what they see), then says what it does
    clock.setAttribute('aria-label', `C:\\NYC> ${fmt.format(now)}, New York time. Open terminal`);
    setTimeout(tick, 60000 - (now.getTime() % 60000) + 50); // just after the next minute
  }
  tick();

  const openTerminal = () => { if (retroTerminal) retroTerminal.open(); };
  clock.addEventListener('click', openTerminal);
  clock.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openTerminal();
  });
});

// Footer function keys: HELP needs the terminal, so it stays hidden until there is one to open.
// (The real F1 to F3 are left alone; browsers keep some of them.)
feature('Function keys', function () {
  const help = document.querySelector('.fkey[data-fkey="help"]');
  if (!help || !retroTerminal) return;
  help.addEventListener('click', () => retroTerminal.run('HELP'));
  help.hidden = false;
});

// DOS section labels: each label becomes a command line (C:\> DIR WORK) that types itself out the
// first time it scrolls into view. Screen readers (and no-JS visitors) get the plain label text.
feature('Section labels', function () {
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
    visual.append(el('span', 'dl-prompt', label.dataset.prompt || 'C:\\>'), ' ', cmd);
    label.textContent = '';
    label.append(el('span', 'dl-sr', plain), visual);
    label.classList.add('has-dos-label');
    return { visual, cmd, text: label.dataset.command || COMMANDS[plain.toLowerCase()] || plain.toUpperCase() };
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
});

// Partner sequence: a DOS menu selection bar steps through the names once, the first time they're seen
feature('Partner sequence', function () {
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
});

// Core expertise readout: resting on a skill (or tapping, clicking to pin, or focusing it) shows
// its related work and types its description into a DOS-style panel under the grid. On touch
// screens and narrow windows the same panel opens inline, right under the tapped skill, instead.
feature('Expertise readout', function () {
  const section = document.querySelector('.expertise');
  const items = section ? [...section.querySelectorAll('.expertise-item')] : [];
  const details = section && section.querySelector('.expertise-details');
  if (!items.length || !details) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover)').matches;
  const inlineQuery = window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 660px)');
  const CHAR_MS = 12;
  const icons = expertiseIcons || { loop() {}, once() {}, stop() {} };
  let inline = false;

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
    if (inline) return; // inline, the panel is only as tall as the open skill needs
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
  let intentTimer = 0, overPanel = false, pointerFocus = false, focusPinned = null, hovered = null;

  // With a mouse, the hovered skill's icon loops (else the pinned one's) and every other rests
  function syncIcon() {
    if (inline || !canHover) return;
    const item = hovered || pinned;
    if (item) icons.loop(item);
    else icons.stop();
  }

  // Put a skill (or the idle prompt) on the panel. Re-showing the same skill only refreshes
  // the prompt line, so pinning or unpinning never restarts the typing.
  function show(item) {
    items.forEach(i => {
      i.classList.toggle('is-selected', i === item);
      if (inline) i.setAttribute('aria-expanded', String(i === item));
      else if (canHover) i.setAttribute('aria-pressed', String(i === pinned));
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
    // Tapped open, the icon plays through once and settles, so nothing loops on a phone
    if (inline || !canHover) {
      if (item) icons.once(item);
      else icons.stop();
    }
    if (inline) {
      // Move the panel under the open skill before it fills, so the live region is in place
      panel.hidden = !item;
      if (item) item.after(panel);
    }
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
    syncIcon();
  }

  // Panel under the grid, or inline under each skill; switching (say, resizing past 660px) starts fresh
  function setMode() {
    inline = inlineQuery.matches;
    section.classList.toggle('xp-inline', inline);
    clearInterval(typeTimer);
    clearTimeout(intentTimer);
    shown = null;
    pinned = null;
    focusPinned = null;
    hovered = null;
    icons.stop();
    items.forEach(i => {
      i.classList.remove('is-selected');
      i.removeAttribute('aria-pressed');
      i.removeAttribute('aria-expanded');
      if (inline) i.setAttribute('aria-expanded', 'false');
    });
    panel.querySelector('.xp-announce').textContent = '';
    fill(panel, null);
    if (inline) {
      panel.hidden = true;
      panel.style.height = '';
    } else {
      details.before(panel);
      panel.hidden = false;
      measure();
    }
  }

  setMode();
  // Chrome can fire change without the result changing (a zoom or a screenshot); only a real switch resets
  inlineQuery.addEventListener('change', () => { if (inlineQuery.matches !== inline) setMode(); });
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
  panel.addEventListener('mouseenter', () => { overPanel = true; clearTimeout(intentTimer); });
  panel.addEventListener('mouseleave', () => { overPanel = false; });

  items.forEach(item => {
    if (canHover) {
      item.addEventListener('mouseenter', () => {
        hovered = item;
        syncIcon();
        clearTimeout(intentTimer);
        intentTimer = setTimeout(() => {
          if (!pinned && !overPanel && !inline) show(item);
        }, INTENT_MS);
      });
      item.addEventListener('mouseleave', () => {
        clearTimeout(intentTimer);
        if (hovered === item) hovered = null;
        syncIcon();
      });
    }
    item.addEventListener('pointerdown', () => { pointerFocus = true; });
    // Keyboard focus pins the focused skill; focus that comes from a click or tap is left to the click
    item.addEventListener('focus', () => {
      if (pointerFocus) { pointerFocus = false; return; }
      if (inline) return; // inline skills open with Enter or Space, like any disclosure
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
      if (inline || !canHover) {
        // Touch: tapping the shown skill again closes it (inline) or returns to the idle prompt
        show(item === shown ? null : item);
        return;
      }
      // A keyboard "click" (Enter/Space) arrives with detail 0; keep it pinned rather than toggling off
      if (e.detail === 0 && pinned === item) return;
      focusPinned = null;
      pin(pinned === item ? null : item);
    });
  });
});

// DOS buttons: a keyboard press gets the same pushed-in look as a mouse press
feature('DOS buttons', function () {
  const PRESS_MS = 120;
  document.addEventListener('keydown', e => {
    const button = e.target.closest && e.target.closest('.dos-button');
    if (!button || (e.key !== 'Enter' && e.key !== ' ')) return;
    button.classList.add('is-pressed');
    setTimeout(() => button.classList.remove('is-pressed'), PRESS_MS);
  });
});

// Name glitch: every 2–5 seconds two or three letters (sometimes one) of the hero heading briefly
// pixelate (6px blocks, then 4px, then 3px, then the real letter). Each glitch is a canvas laid over
// the letter, measured with a Range, so the heading's text, layout and reading order are never touched.
feature('Name glitch', function () {
  const heading = document.querySelector('.hero h1');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!heading || reduceMotion.matches || !('IntersectionObserver' in window)) return;
  const STEP_MS = 110, BLOCKS = [6, 4, 3];
  const MIN_WAIT = 2000, MAX_WAIT = 5000;
  const MULTI_CHANCE = 0.4, TINT_CHANCE = 1 / 3;
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

  function glitchLetter({ node, i, ch }, tinted) {
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
    const ink = tinted ? (root.getPropertyValue('--pixel').trim() || '#1f3bd6') : style.color;

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
    // Never a letter that glitched last time
    const pool = all.filter(l => !last.has(`${l.node.textContent}:${l.i}`));
    // About 40% of glitches hit two or three letters at once; about 1 in 3 is tinted in the theme colour
    const count = Math.random() < MULTI_CHANCE ? 2 + Math.floor(Math.random() * 2) : 1;
    const tinted = Math.random() < TINT_CHANCE;
    const picked = [];
    while (picked.length < count && pool.length) picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
    last = new Set(picked.map(l => `${l.node.textContent}:${l.i}`));
    picked.forEach(l => glitchLetter(l, tinted));
  }

  function schedule() {
    setTimeout(() => {
      if (onScreen && !document.hidden) glitch();
      schedule();
    }, MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT));
  }

  document.fonts.ready.then(schedule);
});

// Work list: the first six rows, then a DOS button that lists the rest in, one row at a time.
// Without JS every row shows and there's no button.
feature('Work list', function () {
  const list = document.getElementById('work-list');
  const rows = list ? [...list.querySelectorAll('.work-item')] : [];
  const SHOWN = 6, ROW_MS = 40;
  if (rows.length <= SHOWN) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const extra = rows.slice(SHOWN);
  extra.forEach(row => { row.hidden = true; });

  const wrap = document.createElement('div');
  wrap.className = 'work-more';
  wrap.innerHTML =
    `<button type="button" class="dos-button" aria-controls="${list.id}" aria-expanded="false">` +
      '<span class="dos-button-icon" aria-hidden="true"></span><span class="dos-button-label"></span>' +
      '<b class="block-cursor dos-button-cursor" aria-hidden="true"></b>' +
    '</button>';
  list.after(wrap);
  const button = wrap.querySelector('button');
  const icon = button.querySelector('.dos-button-icon');
  const label = button.querySelector('.dos-button-label');
  let timer = 0;

  function render(expanded) {
    button.setAttribute('aria-expanded', String(expanded));
    label.textContent = expanded ? 'Show less' : `Show all ${rows.length}`;
    icon.innerHTML = PIXEL_ICONS[expanded ? 'arrowUp' : 'arrowDown'].map(f => gridSvg(f)).join('');
  }
  render(false);

  button.addEventListener('click', () => {
    clearInterval(timer);
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    render(expanded);
    if (!expanded) {
      extra.forEach(row => { row.hidden = true; });
      if (list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: 'start' });
      return;
    }
    if (reduceMotion.matches) {
      extra.forEach(row => { row.hidden = false; });
      return;
    }
    // Rows scroll in like a directory listing
    let i = 0;
    const reveal = () => {
      extra[i++].hidden = false;
      if (i >= extra.length) clearInterval(timer);
    };
    reveal();
    timer = setInterval(reveal, ROW_MS);
  });
});

// Case-study loops (the hero and every other .case-video): muted, each playing only while at least a quarter of it
// is on screen. Nothing is fetched until then (preload="none"). Each lies over its poster picture, transparent until
// a frame of it has been painted, so the picture never blinks to black. The hero's button is the page-wide motion
// control: it pauses or plays every loop, and the choice holds for the visit (sessionStorage). Reduced motion never
// autoplays: every picture stays until the visitor presses Play.
// Films (.case-film-video) are the visitor's to start: never autoplayed, and starting one pauses any other.
feature('Case video', function () {
  const films = [...document.querySelectorAll('.case-film-video')];
  films.forEach(film => {
    // The poster is whichever file the picture under it chose (720 or 1280), so it costs no extra request
    const img = film.parentElement.querySelector('.case-poster img');
    const setPoster = () => { if (img.currentSrc) film.poster = img.currentSrc; };
    if (img) {
      if (img.complete && img.naturalWidth) setPoster();
      else img.addEventListener('load', setPoster, { once: true });
    }
  });
  // One film at a time: starting any film pauses every other (looked up when it starts, so later ones count too)
  document.addEventListener('play', e => {
    if (!e.target.matches || !e.target.matches('.case-film-video')) return;
    document.querySelectorAll('.case-film-video').forEach(other => { if (other !== e.target && !other.paused) other.pause(); });
  }, true);

  const videos = [...document.querySelectorAll('.case-video')];
  const button = document.querySelector('.case-video-toggle');
  if (!videos.length || !button) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const label = button.querySelector('.dos-button-label');
  const KEY = 'case-motion';
  const stored = (() => { try { return sessionStorage.getItem(KEY); } catch { return null; } })();
  let wanted = !reduceMotion.matches && stored !== 'paused';
  const inView = new Map(videos.map(v => [v, false]));

  // Show each video once a frame of it is on screen (its first frame is its poster, so the swap is invisible)
  videos.forEach(video => {
    const reveal = () => video.classList.add('has-frame');
    video.addEventListener('playing', () => {
      if (video.classList.contains('has-frame')) return;
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(reveal);
      else video.addEventListener('timeupdate', reveal, { once: true });
    });
  });

  function render() {
    label.textContent = wanted ? 'Pause animations' : 'Play animations';
  }

  function sync(video) {
    if (wanted && inView.get(video)) {
      const p = video.play();
      // Autoplay refused (low-power mode, say): offer Play instead. A pause that interrupts play() is not a refusal.
      if (p && p.catch) p.catch(e => { if (e && e.name === 'NotAllowedError' && wanted) { wanted = false; render(); videos.forEach(sync); } });
    } else if (!video.paused) video.pause();
  }

  button.addEventListener('click', () => {
    wanted = !wanted;
    try { sessionStorage.setItem(KEY, wanted ? 'playing' : 'paused'); } catch {}
    render();
    videos.forEach(sync);
  });
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) { wanted = false; render(); videos.forEach(sync); }
  });

  if (!('IntersectionObserver' in window)) {
    videos.forEach(v => inView.set(v, true));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        inView.set(e.target, e.isIntersecting && e.intersectionRatio >= 0.25);
        sync(e.target);
      });
    }, { threshold: [0, 0.25] });
    videos.forEach(v => io.observe(v));
  }
  render();
  button.hidden = false;
  videos.forEach(sync);
});
