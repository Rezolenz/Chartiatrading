# CHARTIA Website

Minimal institutional trading site — Supply & Demand · Market Structure · Liquidity.

## Clean URLs

Pages use folder/`index.html` so GitHub Pages (and the local server) serve professional paths:

| URL | File |
|-----|------|
| `/` | `index.html` |
| `/pricing/` | `pricing/index.html` |
| `/roadmap/` | `roadmap/index.html` |
| `/analysis/` | `analysis/index.html` |
| `/free-training/` | `free-training/index.html` |
| `/challenge-calculator/` | `challenge-calculator/index.html` |
| `/gallery/` | `gallery/index.html` |
| `/blog/` | `blog/index.html` |
| `/blog/how-to-pass-prop-challenge/` | `blog/how-to-pass-prop-challenge/index.html` |
| … | other blog posts similarly |

All internal links and assets use root-relative paths (`/pricing/`, `/css/...`, `/assets/...`).

**Note:** If the site is hosted as a GitHub *project* site at `user.github.io/repo/` (not a custom domain or user site), change root-relative paths to include the repo base, or add `<base href="/repo/">`. Custom domains work as-is.

`.nojekyll` is included so GitHub Pages serves files without Jekyll processing.

## Payment

Checkout buttons use: https://wa.me/p/26827680176875342/2347026811827

## Community

Telegram + WhatsApp (same-day coach replies on paid plans). No Discord.

## Images

Replace placeholders in `assets/` (keep filenames). Gallery SVGs live in `assets/gallery/`.

## Run

```bash
cd chartia
npm start   # or: node server/index.js
# open http://localhost:3000
```

Static: open via any static server (clean URLs need a server that maps `/pricing/` → `pricing/index.html`).

## Lead forms

Forms save to `localStorage` for demo. Connect Formspree or WhatsApp Business API for production delivery of the starter pack.

## Brand

- Background: pure black  
- Accent: Electric Cyan `#00FFFF`  
- Fonts: Plus Jakarta Sans, Inter, JetBrains Mono  
