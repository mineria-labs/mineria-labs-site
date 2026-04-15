# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Mineria Labs** marketing/landing site for the *Mineria* mineral specimen collection app. It is a purely static HTML site deployed to **Cloudflare Pages** via a Cloudflare Worker that also handles contact form submissions.

## Architecture

### Files
- **[index.html](index.html)** — Main landing page (hero, features, pricing, about, contact CTA)
- **[contact.html](contact.html)** — Contact form page; submits JSON to `POST /contact`
- **[privacy.html](privacy.html)** / **[terms.html](terms.html)** — Legal pages
- **[_worker.js](_worker.js)** — Cloudflare Worker entry point
- **[wrangler.toml](wrangler.toml)** — Cloudflare deployment config

### Request flow
1. All requests hit `_worker.js`
2. `POST /contact` → `handleContact()` validates input, then calls the **Resend API** to send email to `support@mineria-labs.com`
3. All other requests → served as static assets via `env.ASSETS.fetch(request)`

The Worker uses `run_worker_first = true` so the Worker intercepts every request before static file serving.

### Contact form
- Client-side: `contact.html` submits JSON via `fetch('/contact', { method: 'POST', ... })`
- Spam protection: honeypot field `_gotcha`
- Email sending: Resend API (`https://api.resend.com/emails`), requires `RESEND_API_KEY` secret set in Cloudflare dashboard (must start with `re_`)

## Development & Deployment

### Local dev
```bash
npx wrangler dev
```
This serves the site locally with the Worker. The `RESEND_API_KEY` secret must be set in the Cloudflare dashboard or via `.dev.vars` for local testing.

### Deploy
```bash
npx wrangler deploy
```

### Secrets (Cloudflare Dashboard)
Set via **Settings → Variables and Secrets**:
- `RESEND_API_KEY` — Resend API key (format: `re_xxxxxxxxxx`)

## Design System

All pages share a consistent dark theme defined with CSS custom properties:
- `--bg` `#0b0b12`, `--bg2` `#13131f`, `--bg3` `#1c1c2e` — dark background layers
- `--gold` `#c9a84c` / `--gold-light` `#e8d08a` — primary accent
- `--teal` `#3ec9a7` — secondary accent
- Fonts: `Cormorant Garamond` (serif headings) + `Noto Sans JP` (body)

When editing HTML/CSS, maintain this palette and font pairing across all pages.

## Key Constraints

- No build step — plain HTML/CSS/JS only; no npm packages bundled into the frontend
- `_worker.js` is a single-file ES Module (no imports); keep it self-contained
- `.assetsignore` excludes `_worker.js`, `wrangler.toml`, `.wrangler/`, `.git/` etc. from static asset serving
