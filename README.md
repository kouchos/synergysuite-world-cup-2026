# SynergySuite World Cup 2026 Sweepstake

A static web app that tracks our office's FIFA World Cup 2026 sweepstake. Designed to live full-screen on a TV in the office and auto-refresh as the tournament runs (11 June – 19 July 2026).

## What it does

Eight employees, each drew six teams. The app tracks four prizes across the tournament:

1. **Winning team** — whose team wins the final
2. **Worst team** — earliest exit → fewest points → worst GD → fewest goals scored
3. **Most cards** — weighted card total across an employee's six teams (yellow = 1pt, red = 2pt)
4. **Golden boot** — top scorer's owner takes the prize

A persistent header keeps the four current leaders visible at all times. Three views (Pool stage, Knockout ladder, Winners) auto-switch with tournament phase but are always reachable via the tab strip.

## Tech

- Svelte 5 + Vite + Tailwind CSS 4 → small static bundle that deploys cleanly to GitHub Pages
- Data: ESPN's public scoreboard / summary / standings endpoints (no key required) primary; openfootball/worldcup.json baseline fixtures; API-Football Pro documented as paid fallback if ESPN's unofficial schema ever breaks
- A `MOCK_DATA` fixture lets the UI run offline before/between matches

## Status

Checkpoint 1 of an incremental build:

- [x] Project scaffold (Vite + Svelte 5 + Tailwind 4)
- [x] `config/employees.json` schema with placeholder picks
- [x] Mock data fixture exercising all four prizes
- [x] Persistent 4-tile header
- [x] Always-visible Pool/Knockout/Winners tab strip
- [x] Pool view with group tables + live/upcoming/recent strip
- [x] GitHub Pages deploy workflow
- [x] Playwright screenshot script (`npm run screenshots`)
- [x] Knockout view bracket (R32 → R16 → QF → SF → Final + 3rd place, with TBD slots)
- [ ] Winners view
- [ ] ESPN adapter wired to the store
- [ ] openfootball baseline integration
- [ ] Transitions / countdown / polish

## Local development

```bash
npm install
npm run dev
```

Opens on `http://localhost:5173`. Currently always runs against mock data (live integration arrives in a later checkpoint).

Flags:

- `?mock=1` — force mock mode (default for now)
- `?nocache=1` — bypass localStorage cache (once live data is wired)

### Capturing screenshots

`screenshots/` holds reference captures of each view at TV (1920×1080) and laptop (1366×768) sizes. To regenerate them:

```bash
npx playwright install chromium   # one-off
npm run dev                       # in one terminal
npm run screenshots               # in another
```

Output lands in `screenshots/`.

## GitHub Pages setup

This repo deploys to GitHub Pages via the workflow at `.github/workflows/deploy.yml`.

1. Push the `main` branch (or merge your feature branch into it).
2. In the repo on GitHub: **Settings → Pages → Source: GitHub Actions**.
3. The `Deploy to GitHub Pages` workflow runs on every push to `main`. Once green, the site is live at `https://<owner>.github.io/<repo>/`.
4. The Vite `base` is set automatically from the repo name via `VITE_BASE` in the workflow, so the bundle's asset URLs work on the Pages subpath without further config.

If you fork or rename the repo, the `base` will pick up the new name on the next deploy — no manual changes needed.

## Updating the employee–team mapping

The single source of truth is [`config/employees.json`](./config/employees.json).

```json
{
  "employees": [
    {
      "id": "niall",
      "name": "Niall",
      "color": "#ef4444",
      "teams": [
        { "fifaCode": "BRA", "topTier": true  },
        { "fifaCode": "AUS", "topTier": false },
        { "fifaCode": "NOR", "topTier": false },
        { "fifaCode": "CIV", "topTier": false },
        { "fifaCode": "KSA", "topTier": false },
        { "fifaCode": "TUN", "topTier": false }
      ]
    }
  ]
}
```

- `id` — unique slug, lowercase
- `name` — display name shown on badges
- `color` — hex string used everywhere this employee's teams appear (CSS-valid)
- `teams` — exactly 6 entries; exactly one must have `topTier: true` (the seeded top-tier draw)
- `fifaCode` — 3-letter FIFA/ISO code (e.g. `BRA`, `ENG`, `MEX`). See `src/lib/data/teams.js` for the supported set; add new entries there if a team isn't listed yet

To update the picks: edit the file, commit, push. The deploy workflow rebuilds the site automatically.

## Data sources & attribution

- **Live tournament data**: ESPN's public soccer endpoints (`site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/*`) — undocumented but publicly accessible. We accept that these can change without notice; an API-Football Pro fallback is the documented escape hatch.
- **Baseline fixtures & venues**: [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) (public domain).
- **Flags**: rendered as Unicode flag emoji — no asset pipeline needed.

## Licence

Internal project — no public licence.
