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

Build is feature-complete and waiting on real-tournament data:

- [x] Project scaffold (Vite + Svelte 5 + Tailwind 4)
- [x] `config/employees.json` driving everything — real spreadsheet picks wired in
- [x] Persistent 4-tile prize header + auto-switching view tabs
- [x] Pool view: group tables with owner colour stripes + live/upcoming/recent sidebar
- [x] Knockout bracket: R32 → R16 → QF → SF → Final + 3rd place, TBD slots before the draw resolves
- [x] Winners view: champion hero + three secondary prize cards
- [x] Next-match countdown banner (live-score banner when a match is in play)
- [x] Subtle fade transitions between views
- [x] ESPN adapter + openfootball baseline + localStorage stale-while-revalidate cache
- [x] Adaptive refresh: 60s live · 5min matchday · 30min off-period
- [x] Footer sync indicator + per-source diagnostics + "using cached data" fallback
- [x] Two mock fixtures (`?mock=1` mid-tournament, `?mock=final` end-state)
- [x] GitHub Pages deploy workflow + Playwright screenshot script

## Local development

```bash
npm install
npm run dev
```

Opens on `http://localhost:5173`. Default is **live mode** — fetches ESPN + openfootball on first paint and refreshes adaptively. The initial render uses the mock fixture so there's never a blank page during the first fetch.

Flags:

- `?mock=1` — force mid-tournament mock (recommended for dev so you're not hammering ESPN)
- `?mock=final` — load the post-final mock so the Winners view and resolved bracket render
- `VITE_MOCK=1 npm run dev` — make mock the default for the whole session

### Data layer

```
openfootball/worldcup.json  →  fixture skeleton + group structure (6h TTL)
ESPN scoreboard             →  per-match status, scores, basic events  (30s live / 5min idle)
ESPN standings              →  group tables                            (60s live / 10min idle)
ESPN summary (per match)    →  full goalscorers + cards backfill       (30s live / 24h once final)
config/employees.json       →  apply owner mapping
                                          ↓
                          internal `State` shape  ←  same shape as MOCK_STATE
                                          ↓
                       4 derived prize leaderboards + 3 views
```

The adapter is the only file that knows ESPN field names — if ESPN ever breaks, swap `lib/data/adapter.js` for an API-Football Pro implementation without touching the views.

### Footer diagnostics

The footer's source label reports which data sources are actually feeding the UI:

| Footer says | Means |
| --- | --- |
| `openfootball + ESPN · synced HH:MM:SS` | Both sources reachable. Live scores overlaid on baseline fixtures. |
| `openfootball · ESPN unreachable · synced HH:MM:SS` | ESPN failed (404/timeout/CORS). The view falls back to the openfootball schedule with no live overlay. Adapter likely needs a tweak — see below. |
| `no data sources reachable` | Both endpoints failed and no localStorage cache. UI keeps the last good snapshot if one exists, otherwise the mock baseline. |
| `mock data` / `mock (final state)` | Forced via `?mock=1` / `?mock=final`. Network was never attempted. |

`· using cached data` appended in red means the last refresh erred — we're serving stale localStorage entries while we keep trying.

### If ESPN goes wrong

Three things tend to break ESPN's hidden API:

1. **Wrong league slug.** Currently `/soccer/fifa.world/`. If scoreboard returns 404, try `/soccer/fifa.worldcup/` or `/soccer/fifa.worldcup.2026/` in `src/lib/data/espn.js`.
2. **Team abbreviation mismatch.** ESPN sometimes uses `SAU` for Saudi Arabia (FIFA: `KSA`) or `IRI` for Iran (FIFA: `IRN`). Drop an alias map at the top of `src/lib/data/adapter.js` and translate inside `teamCodeFromCompetitor()`.
3. **Round labels.** Knockout detection reads `competition.notes[].headline`. If ESPN labels them differently the date-based fallback (`>= 27 June` = knockout) still bins matches into the right stage — they just won't get a round name. Update `KNOCKOUT_PATTERNS` in `adapter.js` to match the new strings.

### Swapping the adapter to API-Football Pro

If ESPN becomes uncooperative, replace `lib/data/adapter.js`:

```js
// pseudo-sketch — API-Football Pro
const HEADERS = { 'x-apisports-key': import.meta.env.VITE_APIFOOTBALL_KEY };

export async function fetchLiveState() {
  const fixtures = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026', { headers: HEADERS }).then(r => r.json());
  const standings = await fetch('https://v3.football.api-sports.io/standings?league=1&season=2026', { headers: HEADERS }).then(r => r.json());
  // ... normalise into the same State shape the views expect
}
```

The views, store, prize derivations, and mock fixtures stay untouched — they only consume the State shape produced here. Put the key in repo Secrets and wire it through the workflow as `VITE_APIFOOTBALL_KEY`.

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
