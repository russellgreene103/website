# russellgreene.com

Russell Greene's personal site. Plain static HTML, CSS and JS: no build step, no package.json, no framework.
Hosted on **Cloudflare Pages**, which auto-deploys every push from GitHub (`russellgreene103/website`).
The git repo is this `website/` folder, not its parent. Run git commands from here.

## Branches

- `main` = production, https://russellgreene.com
- `delight` = preview, https://delight.website-95j.pages.dev
- Build and test on `delight`, then fast-forward `main` to ship (`git merge --ff-only delight`).
- **Never merge or push to `main` unless explicitly asked.** If a fast-forward isn't possible, stop and ask.

## Files

| File | What lives there |
|---|---|
| `index.html` | Homepage. Page-specific CSS is inline in `<head>`, as is the pre-paint theme script (always blue; `?theme=blue\|green\|red\|yellow` forces one for testing). An inline script right after the work list shuffles it per visit (`?order=fixed` keeps markup order for testing) |
| `vibe/index.html` | Password-gated `/vibe` project page. Same theme script, same `retro.js` |
| `retro.css` | Shared retro/DOS styles: theme tokens, pixel cursor, DOS windows, terminal, work cards, dither canvas |
| `retro.js` | Shared retro effects for both pages. Each feature sets itself up inside `feature(name, fn)`, so one throwing is logged by name and never stops the others |
| `contact.js` | Homepage contact form (validation and the MAIL.EXE send sequence). Its own file so a broken or stale `retro.js` can't stop the form; it only borrows retro.js art if it's there |
| `rocks.js` | ROCKS.EXE game (`window.RocksGame`), loaded on demand from the terminal |
| `Russell_Greene_Headshot.png` | Blue headshot; `_green`, `_red`, `_yellow` variants; `_mask.png` marks the backdrop on recoloured photos |
| `work-media/` | Case-study images (`.webp`) for the work preview cards |
| `favicon.svg` | Favicon |
| `og-image.png` | 1200×630 share card (see SEO) |
| `robots.txt`, `sitemap.xml` | Crawl rules and the one-URL sitemap (see SEO) |

## retro.js systems

- **Themes:** `THEMES` (blue, green, red, yellow) must match the head script and `retro.css`. `setTheme()` sets `html[data-theme]` and the theme-color meta, then fires `retro:theme`; listeners (e.g. the headshot) react to that event. Reload always returns to blue.
- **Headshot:** the photo is Bayer-dithered onto a canvas, with a dial-up band reveal on first view. Hover resolves through mosaic tiers (16px, 8px, 4px, then the real photo) and steps back down on leave.
- **Click-to-cycle colours:** click, tap, or Enter/Space on the headshot (`role="button"`) goes blue → green → red → yellow. It steps down to 16px, switches the site theme there, then resolves up in the new photo. The next photo is preloaded on the first pointer enter or focus. Changes are announced through an aria-live region.
- **Pixel cursor** (fine pointers only): the arrow, the hand (`html.cursor-link`, over links, buttons and `[role=button]`), and the hourglass (`html.cursor-wait`, which wins over the hand). Hidden over form fields.
- **Click effects:** a random pixel burst on mousedown (or a touch tap that doesn't scroll), never the same effect twice in a row. `makeClickEffects()` is shared by both.
- **Work preview cards:** hovering a work row shows its image in a DOS frame that resolves through mosaic tiers (`drawMosaic()`). DOS preview windows serve the other row types. On touch, each row gets a lazy-loaded 64px thumbnail instead, which resolves through the same tiers the first time it scrolls into view, and tapping anywhere on a work or /vibe row opens its link.
- **Terminal:** press backtick or click the prompt clock. On touch, a row of command keys (HELP, DIR, WHOAMI, COLOR, TIME) sits above the prompt at the bottom of the window, the overlay tracks `visualViewport` to stay above the keyboard, and the page behind is pinned (`html.term-locked`). Commands: HELP, DIR, OPEN, WHOAMI, CONTACT, LINKEDIN, VIBE, HOME, TIME, VER, COLOR (lists themes, or `COLOR RED` switches until reload), CLS, EXIT, WIN, FORMAT, and the secret `ROCKS` / `ROCKS.EXE`, which lazy-loads `rocks.js`. On touch, ROCKS scales to fit (not whole numbers), with thumb buttons under the screen upright or beside it sideways, plus EXIT and SND.
- **DOS section labels** type themselves out as commands (`C:\> DIR WORK`); the **partner list** runs a menu selection bar once.
- **Expertise panel:** four skills, in order: Pitching & New Business (rocket, `PITCHING`), Team & Client Leadership (meeples, `LEADERSHIP`), Scope & Budget Strategy (tower, `SCOPE-BUDGET`), Global Production (globe, `GLOBAL-OPS`). Each button's `data-dir` is its prompt name and `aria-controls` points at its no-JS `.expertise-detail` block, whose description and SEE links feed the panel; SEE links use the same URLs as the project's Selected Work row. Resting on, focusing, tapping or clicking (to pin) a skill types its description and related work into a DOS panel. On touch screens and at 660px or narrower (`.xp-inline`), the same panel opens inline under the tapped skill instead.
- **Expertise icons:** four 24×24 pixel-art icons, `meeples`, `rocket`, `globe` and `tower` (`XP_ICON_DATA`, run-length encoded frames with their own `ms` and `rest`, drawn by `gridSvg` at 2px per cell into `[data-xp-icon]`; letters I ink, P/Q/S accent fill, highlight and shadow, D M L greys, W white). Each shows its `rest` frame when idle; with a mouse it loops while its skill is hovered, focused or pinned; inline (touch or narrow) it plays through once when tapped open. Only one ever moves, a hidden tab pauses it, and reduced motion keeps the rest frame. The frames are fixed art: never redraw them. The original handoff JSON lives in the test suite's `fixtures/`, not here.
- **Name glitch:** every 2–5s, a few letters of the hero `<h1>` pixelate through canvas overlays. The heading text itself is never touched.
- **Work list:** shuffled on every visit (Fisher–Yates, by the inline script after `#work-list`, before first paint), then shows six rows and a DOS button lists the rest. Everything that counts or numbers projects (SHOW ALL, the card's FILE nn/nn, DIR and OPEN N) reads the DOM, so it follows the order on screen and needs no edits when a project is added. Without JS all rows show in markup order. New case-study images: the page's og:image, 640px wide WebP at about quality 75 (Sanity URLs can do this with `?w=640&fm=webp&q=75`).
- **Menu bar** (`nav.menubar`, both pages, styles in retro.css): DOS menu items with the first letter marked in `--pixel-text` (visual only; no letter keys are bound), inverting to a `--pixel` block on hover or focus, plus the prompt clock (C:\NYC> time) at the right on both pages. Phones tighten the bar so it stays one row at 360px; below 360px the clock drops its `C:\NYC>` prefix (`.prompt-prefix`). The bar sits on its own layer (`z-index: 1`) so its tap areas beat content that fades in beneath it.
- **Footer:** a DOS function key bar (`.fkeys`): 1 HELP, 2 WORK (or HOME on /vibe), 3 MAIL. WORK, HOME and MAIL are plain links; HELP is a button that ships `hidden` and is revealed by the Function keys feature, which runs HELP through `retroTerminal.run()`. The real F1–F3 are not bound. The homepage adds the /vibe pizza slice (`PIXEL_ICONS.pizza`; its crust, cheese and pepperoni classes `g-K`, `g-Y`, `g-R` keep fixed colours in every theme), which bobs and shows C:\VIBE on hover or focus.
- **Contact form** (`contact.js`): the submit handler is attached first and calls `preventDefault()` before anything else; the request goes out before any UI step, and if the sequence throws the visitor gets a plain MESSAGE SENT. or Abort, Retry, Fail?. JS turns off browser validation for DOS error lines under each field (`.form-error`), then swaps the form for a MAIL.EXE panel inside the same `.compose` window (sized to the form it replaces; the title bar switches from NEW MESSAGE to C:\RUSSELL\MAIL.EXE and back) that dials, fills a block progress bar and holds at 90% until Formspree answers. Success (only on a confirmed OK) flies a pixel envelope off with a click effect and offers SEND ANOTHER; failure offers Abort, Retry, Fail. The endpoint and request are unchanged. Test it with the request intercepted and mocked; never post to the real form from tests.

## Design rules

- The design language is DOS / pixel / Windows 3.1: pixel-art SVG sprites, double-line frames, hard offset shadows, block cursors.
- Animation is stepped (`steps()`, timer-driven tiers), never smooth easing.
- Colour comes from tokens only: `--pixel` (accent fill), `--on-pixel` (text on that fill), `--pixel-text` (accent text on `--paper`), `--pixel-hi` and `--pixel-lo` (the accent's bevel highlight and shadow in shaded pixel art). Yellow uses a darker `--pixel-text` and ink `--on-pixel` for contrast.
- Text contrast is at least 4.5:1 in every theme.
- Touch-only styles and behaviour sit behind `(hover: none) and (pointer: coarse)` (the `TOUCH` constant in retro.js); small-screen layout sits behind `max-width: 660px`. Desktop must stay pixel-identical when changing either.
- Honour `prefers-reduced-motion` everywhere: skip steps and animations and apply the final state instantly.
- Screen reader text is preserved: effects are `aria-hidden` overlays or visually-hidden copies, and the real text stays intact. Everything works without JS (it stays blue and static).

## SEO

- **Title** (`<title>Russell Greene — Executive Producer at BUCK</title>`) and the **meta description** are what search results show. The description is reused, character for character, by `og:description` and the JSON-LD `description`; change all three together.
- **Canonical** (`https://russellgreene.com/`) tells search engines which URL is the real one, so `www`, `http` and the `pages.dev` copies don't compete with it.
- **Person JSON-LD** (one `application/ld+json` block in the head) tells Google who the page is about: name, URL, headshot, job title, BUCK, the meta description and LinkedIn. Exactly those fields; no location.
- **Open Graph and Twitter tags** control link previews in Slack, LinkedIn, iMessage, X and the rest. Every URL in them is absolute.
- **`og-image.png`** is built from an HTML template kept outside this repo in `~/projects/russellgreene/tools/og-card/` (see its README): it captures the site's own dithered blue headshot and renders the "DOS window" card in headless Chrome. **Regenerate it whenever the name, title or headshot changes.**
- **`robots.txt`** allows everything and points to **`sitemap.xml`**, which lists only the homepage (update its `lastmod` when the homepage changes meaningfully). `_redirects` must never catch either file.
- **/vibe and /sig** carry `<meta name="robots" content="noindex">`. They must stay crawlable (never block them in robots.txt), or search engines can't read the noindex.
- Domain redirects (`www`, `http`, `pages.dev`) live in the Cloudflare dashboard, not in this repo. Preview deploys get `X-Robots-Tag: noindex` from Cloudflare automatically.

## Asset versions (cache busting)

- russellgreene.com's Cloudflare zone sends `.js`/`.css` with a 4-hour browser cache (`max-age=14400`), while HTML is always fresh. Without versioned URLs a returning visitor can get new HTML with an old script. That's how the contact form once fell through to Formspree's own page on a phone.
- So every script and stylesheet URL carries `?v=<first 8 of its sha1>`: `retro.css`, `retro.js` and `contact.js` in both pages, and `rocks.js` inside retro.js. **After changing any of them, rerun this (rocks.js first, since its version lives in retro.js):**
  `for f in rocks.js retro.css retro.js contact.js; do v=$(shasum "$f" | cut -c1-8); sed -i '' -E "s#/$f(\?v=[0-9a-f]+)?#/$f?v=$v#g" retro.js index.html vibe/index.html; done`

## Testing

- **Saved suites** live outside this repo (so they never publish) in `~/projects/russellgreene/tests/`: `icons.mjs` (expertise icons against `fixtures/`), `regress.mjs` (the current copy: bio, meta description, expertise and WHOAMI; SEO tags, og-image.png, robots.txt, sitemap.xml and noindex on /vibe and /sig; features, mobile, header, footer, contact with Formspree mocked, /vibe), `compare.mjs` (desktop pixel comparison against a baseline) and `review.mjs` (review screenshots). Run all three suites with `./run.sh [baseline-ref]` (default `main`): it serves this working tree on :8765 and a worktree of the ref on :8766. See its README.md.

- Serve over local HTTP, since canvas `getImageData` needs it: `python3 -m http.server 8765`.
- Use headless Chrome through `puppeteer-core`, pointed at `/Applications/Google Chrome.app`. Install it in a scratch dir, not the repo.
- `requestAnimationFrame` and CSS animations often don't advance in headless mode, so drive timers or seek animations directly. `setInterval`/`setTimeout`-based tiers do run.
- **Never** launch Chrome with a persistent `--user-data-dir`, because it hangs.
- **Mobile testing must include Playwright WebKit** (the iPhone 15 profile), not just Chrome device emulation: iPhones run WebKit, and Chrome emulation hides WebKit-only behaviour. Install Playwright and its browsers in a scratch dir, run the same checks in Playwright Chromium with an Android profile, and fail on any console error. Mock every formspree.io request with a route.
- WebKit drops the `click` when `pointerdown` is `preventDefault()`-ed on a touch. Act on `pointerdown` itself (game buttons), or on `touchend` with `preventDefault()` there (terminal keys, which must not take focus).
- For touch tests, launch with `--window-size` at least as big as the emulated phone (e.g. `1000,1000`); taps outside the real window hang. A tap on a work row opens a new tab, which stalls later input on the original page.
- Puppeteer element screenshots fire `matchMedia` change events without the result changing; listeners must compare against the current mode.
- Pixel comparisons of the homepage must load `/?order=fixed`, or the shuffled work list differs every time.
- Useful checks: read the `.hero-dither` canvas pixels (opaque vs cleared, uniform 4×4 blocks = the 16px tier), the `html` classes `cursor-wait` and `cursor-link`, and `html[data-theme]`. Emulate touch (`hasTouch`, `isMobile`) and `prefers-reduced-motion` for those paths.

## Deploy verification

- After pushing, poll the live URL (preview or production) with a cache-buster until it serves the new files, e.g. `curl -s "https://russellgreene.com/retro.js?cb=$RANDOM" | grep -q <new marker>`. Deploys usually land within about 30s.
- The Cloudflare Pages check on GitHub (`gh api .../check-runs`) can get stuck. Trust the live files, not the check.
