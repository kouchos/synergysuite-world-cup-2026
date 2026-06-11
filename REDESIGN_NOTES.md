# Redesign Notes — SynergySuite World Cup 2026 Sweepstake

Branch: `fable-redesign`. This document is the contract for the visual/UX
redesign: Phase 1 inventories everything the current app shows and does
(all of it must survive), Phase 2 records the design direction and
rationale, Phase 4 records the verification checklist.

---

## Phase 1 — Audit of the existing app

Baseline ("before") screenshots: `screenshots/baseline/` — every view at
mobile (375px), tablet (768px) and desktop (1440px), captured with
`scripts/baseline-screenshots.mjs` against `?mock=1` / `?mock=final`.

### 1.1 Information displayed (complete inventory)

**Persistent header — 4 prize tiles** (only once any match activity exists;
pre-tournament it is replaced by a hero):
1. *Overall leader*: employee name + colour bar, total pts, total GD.
2. *Worst team*: team flag + name, owner name + colour dot, pts, GD.
3. *Most cards*: employee name + colour bar, yellow count, red count, weighted pts (Y=1, R=2).
4. *Golden boot*: team flag, player name, owner name + dot, goal count.

**Pre-tournament hero** (before first ball kicked): brand logo (with ⚽
fallback if the image 404s), "World Cup 2026 — Sweepstake live tracker"
kicker, kickoff date of first real-team match, first fixture (flags, names,
time-until), note that prize tiles populate later.

**View tabs**: Pool stage / Knockout ladder / Winners. Active state; "auto"
badge when the selected view matches the tournament phase (group → knockout
→ winners auto-switching, manual override always possible).

**Countdown / live banner** (between tabs and main view):
- Live match in play → LIVE pulse dot, flags, names, score, minute.
- Otherwise → next scheduled match with two known teams: flags, names,
  ticking `kickoff in Xd Xh Xm` countdown (1s tick).
- Hidden when neither exists (e.g. tournament over).

**Pool view**:
- 12 group tables (A–L; 6 in mock). Per group: header "Group X"; per team
  row: owner colour stripe (clickable → employee modal), flag, name,
  top-tier ★ marker, P W D L GD Pts. Row click → team modal.
- "Waiting for group data…" empty state.
- Sidebar: *Live now* (match cards), *Upcoming* (next 8 by kickoff),
  *Recent results* (last 8). Each MatchCard: both teams' flag+name
  (→ team modal), owner badges (→ employee modal), centre = score + FT /
  LIVE+minute, or kickoff date-time for scheduled; centre click → game modal
  (only for real ESPN ids, not `of-` baseline ids).

**Knockout view**:
- Bracket columns R32 → R16 → QF → SF → Final, plus Third place under the
  Final column. CSS connector ticks between rounds.
- Each cell: home/away rows with owner colour bar (→ employee modal), flag,
  FIFA code (→ team modal), score or kickoff time (→ game modal), winner
  emphasised, live ring + minute on in-play match, TBD/placeholder slots
  ("1A", "W74") rendered as italic labels.
- Empty state copy when no knockout matches exist yet.

**Winners view**:
- Pre-final placeholder: 🏆, "Tournament still in progress", final date.
- Post-final: Champion hero (flag, country, winning owner badge, beaten
  opponent + opponent's owner + score "2–1 in the final"); three prize
  cards: Worst team (🥄, flag, team, owner, pts/GD/GF), Most cards (owner
  badge, Y/R counts, weighted pts), Golden boot (👟 flag, player, team,
  owner, goals).

**Employee modal** (click any employee anywhere):
- Hero: initial avatar in employee colour, "Sweepstake player", name,
  pts · GD · ordinal overall place.
- Prize positions (4 mini-cards): Overall rank + best team; Worst-team
  status (🥄 "Currently leading" or —) + their worst pick; Cards rank + pts
  + their most-carded team; Golden-boot status + their top contender
  (player + goals). Each links to team modal.
- "Their six picks": 6 team cards (flag, name, ★ top-tier, group, pts, GD;
  "no group data" fallback) → team modal.
- Recent results (last 5 played/live) and Upcoming (next 5) for their teams
  → game modal.
- Note shown when ESPN is unreachable (drill-down disabled).

**Team modal** (click any team):
- Hero: big flag, "Top-tier pick"/"Team" + group, name, sweepstake owner
  badge (→ employee modal), ESPN crest logo when known.
- Tabs: *Overview* (group performance: Pts/P/GD/GF + W/D/L; ESPN record +
  up to 6 record stats), *Squad* (ESPN roster grouped by position,
  PlayerCards with headshot/jersey/position; loading + "no data"/"ESPN id
  not yet known" fallbacks), *Schedule* (all fixtures: kickoff, teams,
  score or "vs", live minute / FT marker → game modal), *Group* (mini
  table with this team highlighted, group-mates → team modal).

**Game modal** (click any score/match centre):
- Title varies: "Live match" / "Match report" / "Match preview"; accent
  colour varies (rose/emerald/sky).
- Hero: both teams (flag, name, owner badge → team/employee modals), score
  or kickoff, LIVE + minute / "Full time" / "Kickoff"; venue 📍; broadcast
  channels 📺 when ESPN provides them.
- Key events timeline: minute, ⚽/🟨/🟥, player, team; home events left-
  aligned, away right-aligned.
- ESPN extras: team stats comparison rows; lineups (Starting XI + bench per
  side, PlayerCards); article headline/description notes.
- Loading / "no ESPN match id" / error fallbacks.

**Modal shell**: accent top border, title, × button, ESC + backdrop close,
body scroll lock, scrollable content, fade/scale transition.

**Footer**: app name; "syncing…" pulse while fetching; "· using cached
data" in red after a failed refresh (title = error); source label
(`openfootball + ESPN`, `… unreachable`, `no data sources reachable`,
`mock data`, `mock (final state)`) + `synced HH:MM:SS` (Europe/Dublin)
or `no sync yet`.

### 1.2 Interactions, features and states

- View switching (3 tabs), auto phase-following with manual override.
- Click-through graph: employee ↔ team ↔ game modals from header tiles,
  group rows, owner stripes, match cards, bracket cells, winners cards.
- ESPN-gated interactivity: when ESPN is unreachable, team/game drill-downs
  are disabled (buttons disabled, hover suppression, explanatory note).
  Game modal additionally requires a non-`of-` match id.
- Live updates: adaptive refresh (60s live / 5min matchday / 30min idle),
  stale-while-revalidate localStorage cache, fire-and-forget event
  backfill, per-source diagnostics.
- 1-second countdown tick; live pulse animations.
- URL flags: `?mock=1` (mid-tournament), `?mock=final` (end state),
  `?nocache=1` (purge cache); `VITE_MOCK=1` build default.
- Empty states: pre-tournament hero, "Waiting for group data…", knockout
  empty copy, winners "still in progress", modal loading/error/no-data.
- Mobile behaviour today: everything stacks single-column; bracket
  horizontally scrollable.
- Tests: Playwright smoke (mock-only), modal interaction, network suites;
  screenshots script; GitHub Pages deploy workflow.

### 1.3 Data sources & update mechanism (unchanged by redesign)

- `openfootball/worldcup.json` baseline fixtures + groups (6h TTL).
- ESPN scoreboard / standings / summary / team / schedule / roster
  endpoints (TTLs 30s–24h, live-aware).
- `config/employees.json` → owner mapping (8 employees × 6 teams, one
  top-tier each, employee colour).
- `lib/data/adapter.js` merges everything into one `State` shape, the same
  shape as the two mock fixtures. Views never see ESPN field names.
- Store: central 30s tick scheduling, diagnostics, espnReachable flag.

### 1.4 Information architecture

Single page; persistent header (prizes) → tabs → countdown strip → active
view → footer. Three drill-down modal types layered on top, cross-linked.
Phase drives the default view. Designed TV-first (1920×1080) with laptop
as secondary; mobile is a straight reflow.

### 1.5 Honest critique of the current UI

- **Generic Tailwind-dark look.** Translucent `bg-white/10`-style rounded
  cards on a green gradient, ring-1 borders everywhere, Inter/system type.
  It reads "internal tool built quickly", not "designed product". Every
  surface is the same recipe: rounded-xl + ring + low-opacity fill.
- **No typographic voice.** One font, mostly one weight axis. Scores,
  countdowns, prize numbers — the emotional payload of a sweepstake — are
  set in the same face as footnotes. Nothing is condensed, nothing is
  display-weight; tracking-widest uppercase labels are the only flourish
  and they're used identically ~20 times, so hierarchy flattens out.
- **Weak hierarchy.** The four prize tiles are equal boxes, so "who's
  winning" doesn't lead. Only the leader of each category is visible —
  the chase (2nd–8th) is hidden in modals, which kills the fun of a
  sweepstake. The live banner is a thin grey strip; the most exciting
  thing on the page is visually the quietest.
- **Mobile is an afterthought.** At 375px the four prize tiles stack to
  ~700px of header before any content; the group tables become a wall of
  twelve near-identical tables; the bracket needs blind horizontal
  scrolling with no affordance; the live banner wraps awkwardly.
- **Dead space / TV bias.** Bracket columns stretch full-width with huge
  vertical gaps at desktop; group tables sit in a loose grid with ragged
  bottoms; footer floats detached.
- **No motion language.** A single 180ms fade between views; no feedback
  on data refresh, no score-change emphasis, no entrance choreography,
  no press states. Hover = underline, which feels like a document, not an
  app.
- **Low-craft details.** Emoji used as iconography (🟨🟥📍📺👟🥄) renders
  inconsistently across platforms; flag emoji at 5xl look fuzzy; the
  employee colour system (8 raw Tailwind hues) is applied as unrelated
  full-saturation chips with white text that fails contrast on yellow
  (`#eab308`) and orange; the winner emphasis in bracket cells
  (white vs stone-300) is nearly invisible.
- **Accessibility gaps.** Group-table rows are clickable `<tr>`s with no
  keyboard path; tab strip isn't a real `tablist`; colour stripes are the
  only owner signal in tables (no text alternative visible); no
  `prefers-reduced-motion` handling for the pulse/transition animations;
  contrast of `text-stone-400` on `pitch-light` surfaces is borderline.

---

## Phase 2 — Design direction

*(written before the build; see Phase 4 for the verification pass)*

### Concept: **“Floodlight”** — night-match broadcast graphics

A sweepstake tracker is banter infrastructure. It should feel like the
on-screen graphics package of a World Cup night game: near-black stadium
dark, one electric accent, condensed display type for anything with a
number in it, and information arranged like a broadcast scoreboard —
not like a SaaS dashboard.

**Colour system** (dark-first, committed — there is no light mode):
- Ink `#0A0C10` → `#10141B` elevation ramp (blue-black, not green; the
  green field look stays on the pitch, i.e. in accents, not as wallpaper).
- **Volt** `#C8F542` — the single brand accent: active tab, leaders, key
  numbers, focus rings. Volt on ink is ~14:1 contrast and unmistakably
  "stadium under floodlights".
- Live = signal red `#FF4D5D`; gold `#F2C14E` reserved for trophies/prizes;
  utility text greys with AA contrast (`#9AA3B2` minimum on cards).
- The 8 employee colours from `config/employees.json` stay as the data
  layer's identity; they're rendered as bars/edges/tints rather than
  solid chips with white text (fixes the yellow/orange contrast failures —
  chips now use the colour as a tinted background with the colour itself
  for text on dark).
- Surfaces: flat fills + 1px hairlines, sharp 4–10px radii, and a single
  signature detail used sparingly: a **clipped corner** (broadcast
  lower-third cut) on hero panels, plus thin scanline/pitch-hash textures.

**Typography**:
- **Archivo (variable, width axis)** self-hosted via Fontsource — one
  family, huge range: *Expanded Black italic uppercase* for the brand,
  scores, countdown digits and prize names (the broadcast voice);
  *normal width* 400–700 for body/UI; *semi-condensed* caps for table
  headers and kickers. Tabular numerals everywhere numbers live.
- Scale rhythm: 11px caps kickers / 13–14px body / 17px card titles /
  clamp()-based display sizes for scores and heroes.

**Information architecture changes** (presentation only — all data kept):
- New top bar: compact brand block + live/next-match ticker + sync status,
  so the most volatile info is always at the very top.
- The four prize tiles become a **prize podium strip**: "Overall leader"
  gets the widest, loudest cell; the other three are compact. On mobile
  they form a swipeable/compact 2×2, not 700px of stacked cards.
- New **race strip**: all 8 employees as ranked chips (rank, colour, name,
  pts) right under the prizes — the missing "chase" view; animates
  reordering. (Additive; nothing removed.)
- Pool view: groups get tighter scoreboard tables with zebra hairlines;
  sidebar becomes "Matchday" rail with day-grouped cards.
- Bracket: same structure, tightened cells, visible round header bar, and
  on mobile a horizontal snap-scroll with round pager instead of a blind
  overflow.
- Winners: full-bleed champion hero with gold treatment + confetti-free
  restraint (subtle rays), prize cards in the podium language.

**Motion with intent** (all gated behind `prefers-reduced-motion`):
- View switches: short fade/slide with staggered card entrances.
- Race strip + leaderboards: FLIP reorder animations.
- Score changes: pop-scale + volt flash keyed on value change.
- Live elements: soft pulse; countdown seconds tick.
- Hover/press: 1px lift + hairline brighten; buttons compress on press.
- Modals: scale-spring in, accent bar sweep.

**Non-negotiables carried through**: static GitHub Pages deploy unchanged
(fonts bundled, no external CDNs), semantic HTML + real tablist/keyboard
paths, WCAG AA contrast, snappy load (one variable font file, no new JS
deps beyond what exists).

---

## Phase 4 — Verification

*(completed at the end of the build — see checklist below)*
