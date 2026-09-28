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
| `index.html` | Homepage. Page-specific CSS is inline in `<head>`, as is the pre-paint theme script (always blue; `?theme=blue\|green\|red\|yellow` forces one for testing) |
| `vibe/index.html` | Password-gated `/vibe` project page. Same theme script, same `retro.js` |
| `retro.css` | Shared retro/DOS styles: theme tokens, pixel cursor, DOS windows, terminal, work cards, dither canvas |
| `retro.js` | Shared retro effects for both pages. Each feature is an IIFE that sets itself up only if its elements exist |
| `rocks.js` | ROCKS.EXE game (`window.RocksGame`), loaded on demand from the terminal |
| `Russell_Greene_Headshot.png` | Blue headshot; `_green`, `_red`, `_yellow` variants; `_mask.png` marks the backdrop on recoloured photos |
| `work-media/` | Case-study images (`.webp`) for the work preview cards |
| `favicon.svg` | Favicon |

## retro.js systems

- **Themes:** `THEMES` (blue, green, red, yellow) must match the head script and `retro.css`. `setTheme()` sets `html[data-theme]` and the theme-color meta, then fires `retro:theme`; listeners (e.g. the headshot) react to that event. Reload always returns to blue.
- **Headshot:** the photo is Bayer-dithered onto a canvas, with a dial-up band reveal on first view. Hover resolves through mosaic tiers (16px, 8px, 4px, then the real photo) and steps back down on leave.
- **Click-to-cycle colours:** click, tap, or Enter/Space on the headshot (`role="button"`) goes blue → green → red → yellow. It steps down to 16px, switches the site theme there, then resolves up in the new photo. The next photo is preloaded on the first pointer enter or focus. Changes are announced through an aria-live region.
- **Pixel cursor** (fine pointers only): the arrow, the hand (`html.cursor-link`, over links, buttons and `[role=button]`), and the hourglass (`html.cursor-wait`, which wins over the hand). Hidden over form fields.
- **Click effects:** a random pixel burst on mousedown, never the same effect twice in a row.
- **Work preview cards:** hovering a work row shows its image in a DOS frame that resolves through mosaic tiers. DOS preview windows serve the other row types.
- **Terminal:** press backtick or click the prompt clock. Commands: HELP, DIR, OPEN, WHOAMI, CONTACT, LINKEDIN, VIBE, HOME, TIME, VER, COLOR (lists themes, or `COLOR RED` switches until reload), CLS, EXIT, WIN, FORMAT, and the secret `ROCKS` / `ROCKS.EXE`, which lazy-loads `rocks.js`.
- **DOS section labels** type themselves out as commands (`C:\> DIR WORK`); the **partner list** runs a menu selection bar once.
- **Expertise panel:** resting on, focusing, tapping or clicking (to pin) a skill types its description and related work into a DOS panel.
- **Name glitch:** every 2–5s, a few letters of the hero `<h1>` pixelate through canvas overlays. The heading text itself is never touched.
- **Work list:** shows six rows, and a DOS button lists the rest.

## Design rules

- The design language is DOS / pixel / Windows 3.1: pixel-art SVG sprites, double-line frames, hard offset shadows, block cursors.
- Animation is stepped (`steps()`, timer-driven tiers), never smooth easing.
- Colour comes from tokens only: `--pixel` (accent fill), `--on-pixel` (text on that fill), `--pixel-text` (accent text on `--paper`). Yellow uses a darker `--pixel-text` and ink `--on-pixel` for contrast.
- Text contrast is at least 4.5:1 in every theme.
- Honour `prefers-reduced-motion` everywhere: skip steps and animations and apply the final state instantly.
- Screen reader text is preserved: effects are `aria-hidden` overlays or visually-hidden copies, and the real text stays intact. Everything works without JS (it stays blue and static).

## Testing

- Serve over local HTTP, since canvas `getImageData` needs it: `python3 -m http.server 8765`.
- Use headless Chrome through `puppeteer-core`, pointed at `/Applications/Google Chrome.app`. Install it in a scratch dir, not the repo.
- `requestAnimationFrame` and CSS animations often don't advance in headless mode, so drive timers or seek animations directly. `setInterval`/`setTimeout`-based tiers do run.
- **Never** launch Chrome with a persistent `--user-data-dir`, because it hangs.
- Useful checks: read the `.hero-dither` canvas pixels (opaque vs cleared, uniform 4×4 blocks = the 16px tier), the `html` classes `cursor-wait` and `cursor-link`, and `html[data-theme]`. Emulate touch (`hasTouch`, `isMobile`) and `prefers-reduced-motion` for those paths.

## Deploy verification

- After pushing, poll the live URL (preview or production) with a cache-buster until it serves the new files, e.g. `curl -s "https://russellgreene.com/retro.js?cb=$RANDOM" | grep -q <new marker>`. Deploys usually land within about 30s.
- The Cloudflare Pages check on GitHub (`gh api .../check-runs`) can get stuck. Trust the live files, not the check.
