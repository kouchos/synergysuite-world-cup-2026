/**
 * The Banter Banner — auto-generated office trash talk derived from current
 * state. Pure: state + employees in, an array of one-liners out. The banner
 * component rotates through whatever this returns; empty array = no banner.
 *
 * Editorial policy (by popular demand of an Irish office): the tone is
 * cheeky-to-insulting, and England get singled out — their lines appear
 * twice per rotation and are negative regardless of results. A 5–0 England
 * win is still, fundamentally, an England problem.
 */
import { teamFor, TEAMS } from '../data/teams.js';
import { formatKickoff } from '../format.js';
import {
  hasMatchActivity,
  overallLeaderboard,
  mostCardsLeaderboard,
  worstTeamRanking,
  goldenBootTable,
  teamOwner,
} from './prizes.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Evergreen England jabs — true regardless of the score, the fixture, or the
 * laws of physics. Added to every England rotation so the slagging never runs dry.
 */
const ENGLAND_EVERGREEN = [
  'Harry Kane is overrated — a trophy cabinet emptier than an English pub at closing',
  "Three Lions on the shirt, zero on the mantelpiece since '66",
  'England fans already booking flights to the final they will not reach',
  'The Premier League is the best in the world, the national team is not — funny that',
  "Gareth's heirs still can't take a penalty to save their lives, or the nation's",
  'England: peaked in 1966 and never let anyone forget it',
  'A golden generation every four years, a quarter-final exit every four years',
  'Jude Bellingham carrying ten lads who think the hard work is the celebration',
  'It is statistically more likely to rain in Manchester than for England to win a shootout',
  'The only thing coming home is the squad, early, again',
  "England's tactical masterplan: hoof it long, look surprised, blame the pitch",
  "'It's Coming Home' has been on repeat since 1996 — thirty years of false advertising",
  'England win every pre-tournament press conference and lose every semi-final that matters',
  "England's penalty practice: extensive, famous, completely useless",
  'The wall chart says England, the history books say Germany on penalties',
  'If passion won trophies England would have fifteen. It does not, and they have one',
  'New tournament, new kit, same England',
  "England sing the anthem like they've already won — then the football starts",
  'The Three Lions have seen things. Mostly penalty misses, in slow motion, on ITV',
  "England invented football specifically so everyone else could beat them at it",
];

/**
 * Snarky interjections for the live-commentary feed of England games — written
 * to read like a rogue co-commentator who has wandered in from an Irish pub.
 * Woven in by injectEnglandSnark() at a rate of one per 5–8 real entries.
 */
const COMMENTARY_SNARK = [
  "Meanwhile, the England fans have started singing about it coming home. Historians remain sceptical.",
  "Tactical update: England have switched from a 4-2-3-1 to a state of mild national panic.",
  "England knock it sideways. And backwards. And sideways again. Progress, of a very English sort.",
  "A reminder for viewers just joining: England have won exactly one World Cup, and it predates colour television.",
  "VAR is currently checking whether England are any good. The check is complete. Play on.",
  "The England bench looks nervous. The fans look nervous. The pigeons above the stadium look nervous.",
  "'Sixty years of hurt' is trending again. It trends every four years, like clockwork.",
  "Somewhere in Dublin, an entire office is watching this with a very large bag of popcorn.",
  "The BBC montage team are on standby. They are always on standby. They know.",
  "England's game plan appears to be 1966 nostalgia delivered at walking pace.",
  "Sweet Caroline is warming up in the stands — a song about clinging to hope. Fitting.",
  "The England manager scribbles furiously in his notebook. Sources say it just reads 'help'.",
  "Stat attack: England are unbeaten in World Cups they have won.",
  "The Three Lions on the shirt exchange a knowing look. They've been here before.",
];

/** Bracketed digs appended to England goals in the key-events feeds. */
const ENGLAND_GOAL_QUIPS = [
  'probably offside',
  'VAR is having a look, live in hope',
  'scored against the run of history',
  "that's the peak — downhill from here",
  'BBC montage intensifies',
  "calm down, it's still not coming home",
  '1966 flashbacks incoming',
  "they'll still find a way to ruin this",
  'even a broken clock',
  'the pubs of Ireland fall briefly silent',
];

/** Cheap deterministic hash → 32-bit uint, for stable snark placement. */
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tiny seeded PRNG (mulberry32) so the snark rate is random-ish but stable. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isEnglandMatch(match) {
  return match?.home === 'ENG' || match?.away === 'ENG';
}

/**
 * Weave snarky anti-England interjections into a commentary feed at a rate of
 * one per 5–8 real entries. The feed arrives newest-first and grows from the
 * top during live games, so placement is computed from the oldest entry up —
 * that way already-placed snark never moves or reshuffles as new commentary
 * lands. Fully deterministic per match id.
 */
export function injectEnglandSnark(items, matchId) {
  if (!items?.length) return items ?? [];
  const rand = mulberry32(hashString(String(matchId ?? 'ENG')));
  const nextGap = () => 5 + Math.floor(rand() * 4); // 5–8 real comments per snark
  let snarkIdx = Math.floor(rand() * COMMENTARY_SNARK.length);
  let gap = nextGap();
  let sinceSnark = 0;
  const out = [];
  // Oldest → newest so positions are append-only, then flip back.
  for (const item of [...items].reverse()) {
    out.push(item);
    sinceSnark += 1;
    if (sinceSnark >= gap) {
      out.push({
        sequence: `snark-${out.length}`,
        clock: '🎙️',
        text: COMMENTARY_SNARK[snarkIdx % COMMENTARY_SNARK.length],
        kind: 'snark',
      });
      snarkIdx += 1;
      sinceSnark = 0;
      gap = nextGap();
    }
  }
  return out.reverse();
}

/**
 * The bracketed jab for an England goal in the key-events feeds —
 * "55' Kane (probably offside)". Deterministic per goal so it doesn't
 * change on re-render.
 */
export function englandGoalQuip(ev, matchId) {
  const key = `${matchId ?? ''}:${ev?.minute ?? ''}:${ev?.player ?? ''}`;
  return ENGLAND_GOAL_QUIPS[hashString(key) % ENGLAND_GOAL_QUIPS.length];
}

/** Did England lose this (finished) match — on goals or, classically, on pens? */
export function englandLostMatch(m) {
  if (!isEnglandMatch(m) || m.status !== 'final' || m.homeGoals == null) return false;
  const gf = m.home === 'ENG' ? m.homeGoals : m.awayGoals;
  const ga = m.home === 'ENG' ? m.awayGoals : m.homeGoals;
  if (gf !== ga) return gf < ga;
  if (m.homeShootout == null || m.awayShootout == null) return false;
  const sf = m.home === 'ENG' ? m.homeShootout : m.awayShootout;
  const sa = m.home === 'ENG' ? m.awayShootout : m.homeShootout;
  return sf < sa;
}

const EXIT_ROUND_LABELS = {
  R32: 'the round of 32',
  R16: 'the round of 16',
  QF: 'a quarter-final',
  SF: 'a semi-final',
  Third: 'the third-place playoff',
  Final: 'the final',
};

/**
 * The full send-off for when England get knocked out — an over-the-top roast
 * for the recap dialog. Returns { headline, chant, lines } or null if the
 * match isn't actually an England knockout defeat.
 */
export function englandExitRoast(match, employees) {
  if (!englandLostMatch(match)) return null;
  const opp = teamFor(match.home === 'ENG' ? match.away : match.home);
  const gf = match.home === 'ENG' ? match.homeGoals : match.awayGoals;
  const ga = match.home === 'ENG' ? match.awayGoals : match.homeGoals;
  const onPens = gf === ga;
  const round = EXIT_ROUND_LABELS[match.round] ?? 'the knockouts';
  const owner = teamOwner('ENG', employees);
  const years = new Date().getFullYear() - 1966;

  const lines = [
    onPens
      ? `Beaten by ${opp.name} on penalties in ${round} — some traditions really are sacred`
      : `Beaten ${ga}–${gf} by ${opp.name} in ${round} — the Three Lions are now three lads in the Heathrow arrivals lounge`,
    `${years} years of hurt just signed a four-year extension. See you in 2030 for the exact same montage`,
    'The BBC package is ready: slow-motion tears, Nessun Dorma, a shot of a sad man in a waistcoat, roll credits',
    "Sweet Caroline has left the building. Good times never seemed so gone",
    "Football's coming home — via a connecting flight, without the trophy, in economy",
    'The wall charts of England can now be recycled responsibly. Please remove the drawing pins first',
  ];
  if (owner) lines.push(`Condolences to ${owner.name}, who drew England and therefore never had a chance`);

  return {
    headline: "They're going home, they're going home, England's going home!",
    chant: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F} ✈️ 🏠',
    lines,
  };
}

function allMatches(state) {
  return [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])];
}

/** England-specific digs — always negative, win, lose or draw. */
export function englandLines(state, employees) {
  const lines = [];
  if (!TEAMS.ENG) return lines;
  const owner = teamOwner('ENG', employees);
  const matches = allMatches(state).filter((m) => m.home === 'ENG' || m.away === 'ENG');

  const live = matches.find((m) => m.status === 'live');
  if (live) {
    const gf = live.home === 'ENG' ? live.homeGoals : live.awayGoals;
    const ga = live.home === 'ENG' ? live.awayGoals : live.homeGoals;
    const opp = teamFor(live.home === 'ENG' ? live.away : live.home);
    if (gf > ga) lines.push(`England lead ${opp.name} ${gf}–${ga} — relax, there's still plenty of time to ruin it`);
    else if (gf < ga) lines.push(`England trail ${opp.name} ${ga}–${gf} — ah here, this is just lovely`);
    else lines.push(`England level with ${opp.name} — penalties loom, and we all know how that ends`);
  }

  const lastPlayed = matches
    .filter((m) => m.status === 'final' && m.homeGoals != null)
    .sort((a, b) => new Date(b.utc) - new Date(a.utc))[0];
  if (lastPlayed) {
    const gf = lastPlayed.home === 'ENG' ? lastPlayed.homeGoals : lastPlayed.awayGoals;
    const ga = lastPlayed.home === 'ENG' ? lastPlayed.awayGoals : lastPlayed.homeGoals;
    const opp = teamFor(lastPlayed.home === 'ENG' ? lastPlayed.away : lastPlayed.home);
    if (gf > ga && gf - ga >= 3) {
      lines.push(`England put ${gf} past ${opp.name} and the BBC montage is already in production. It's still not coming home`);
    } else if (gf > ga) {
      lines.push(`England beat ${opp.name} ${gf}–${ga} — sixty years of hurt, briefly paused. Normal service will resume`);
    } else if (gf === ga) {
      lines.push(`England held ${gf}–${ga} by ${opp.name} — the most England result imaginable`);
    } else {
      lines.push(
        `${opp.name} beat England ${ga}–${gf} — somewhere, an entire Irish office cheers${owner ? ` (sorry ${owner.name})` : ''}`,
      );
    }
  }

  const next = matches
    .filter((m) => m.status === 'scheduled' && m.utc)
    .sort((a, b) => new Date(a.utc) - new Date(b.utc))[0];
  if (next) {
    const opp = teamFor(next.home === 'ENG' ? next.away : next.home);
    lines.push(`England face ${opp.name} ${formatKickoff(next.utc)} — the nation expects, history disagrees`);
  }

  // Always-on classic, so the rotation never goes an England-free cycle.
  lines.push(`Sixty years of hurt and counting — it's not coming home`);
  // Plus a rotating evergreen jab, kept fresh by the day of the tournament.
  const pick = ENGLAND_EVERGREEN[new Date().getDate() % ENGLAND_EVERGREEN.length];
  lines.push(pick);
  // And the running tally since Wembley, 30 July 1966. Who's counting? We are.
  const days = Math.floor((Date.now() - Date.UTC(1966, 6, 30)) / 86_400_000);
  lines.push(`Day ${days.toLocaleString('en-IE')} of England not winning a World Cup — but who's counting`);
  return lines;
}

export function banterLines(state, employees) {
  const lines = [];
  const active = hasMatchActivity(state);

  if (active) {
    // ── Overall race ──
    const overall = overallLeaderboard(state, employees);
    if (overall.length >= 2 && overall[0].pts > 0) {
      const [first, second] = overall;
      const gap = first.pts - second.pts;
      if (gap === 0) {
        lines.push(
          `${first.employee.name} and ${second.employee.name} are level on ${first.pts} pts — goal difference is doing the talking, loudly`,
        );
      } else if (gap <= 3) {
        lines.push(
          `${first.employee.name} leads the race by ${plural(gap, 'pt')} — one ${second.employee.name} win flips it, not that ${first.employee.name} will stop going on about it`,
        );
      } else {
        lines.push(
          `${first.employee.name} is ${plural(gap, 'pt')} clear and has become genuinely insufferable about it`,
        );
      }
      const last = overall[overall.length - 1];
      if (last.pts === 0) {
        lines.push(`${last.employee.name} is still on 0 pts — six teams and not one of them could be bothered`);
      }
    }

    // ── Cards race ──
    const cards = mostCardsLeaderboard(state, employees);
    if (cards[0]?.points > 0) {
      const leader = cards[0];
      lines.push(
        `${leader.employee.name} tops the cards table with ${plural(leader.points, 'pt')} (${leader.yellow}×🟨 ${leader.red}×🟥) — their teams tackle first and apologise never`,
      );
      const chaser = cards[1];
      if (chaser && chaser.points < leader.points) {
        const toLead = leader.points - chaser.points + 1;
        lines.push(
          `${chaser.employee.name} only needs ${plural(Math.ceil(toLead / 2), 'more red')} to take the cards lead — start the chants`,
        );
      }
      const saint = cards[cards.length - 1];
      if (saint && saint.points === 0) {
        lines.push(
          `${saint.employee.name}'s teams haven't picked up a single card — suspiciously well behaved, the cowards`,
        );
      }
    }

    // ── Wooden spoon ──
    const spoon = worstTeamRanking(state, employees)[0];
    if (spoon) {
      const t = teamFor(spoon.row.fifaCode);
      lines.push(
        spoon.owner
          ? `${t.name} are holding the wooden spoon 🥄 — ${spoon.owner.name} insists this is all part of the plan`
          : `${t.name} are holding the wooden spoon 🥄 and nobody will even claim them`,
      );
    }

    // ── Golden boot ──
    const boot = goldenBootTable(state, employees);
    if (boot[0]) {
      const top = boot[0];
      if (boot[1] && boot[1].goals === top.goals) {
        lines.push(
          `${top.player} and ${boot[1].player} locked on ${top.goals} — the boot race is wide open and the punditry is unbearable`,
        );
      } else if (top.owner) {
        lines.push(
          `${top.player} leads the golden boot with ${plural(top.goals, 'goal')} — ${top.owner.name} taking full personal credit, obviously`,
        );
      } else {
        lines.push(`${top.player} leads the golden boot with ${plural(top.goals, 'goal')}`);
      }
    }
  }

  // ── Derbies — one employee's teams playing each other ──
  const matches = allMatches(state);
  const derbyOwner = (m) => {
    const ho = m.home ? teamOwner(m.home, employees) : null;
    const ao = m.away ? teamOwner(m.away, employees) : null;
    return ho && ao && ho.id === ao.id ? ho : null;
  };

  const liveDerby = matches.find((m) => m.status === 'live' && derbyOwner(m));
  if (liveDerby) {
    const owner = derbyOwner(liveDerby);
    const ht = teamFor(liveDerby.home);
    const at = teamFor(liveDerby.away);
    lines.push(
      `Derby LIVE: ${owner.name}'s ${ht.name} ${liveDerby.homeGoals}–${liveDerby.awayGoals} ${owner.name}'s ${at.name} — ${owner.name} wins either way. And loses`,
    );
  }

  const nextDerby = matches
    .filter((m) => m.status === 'scheduled' && m.utc && derbyOwner(m))
    .sort((a, b) => new Date(a.utc) - new Date(b.utc))[0];
  if (nextDerby) {
    const owner = derbyOwner(nextDerby);
    const ht = teamFor(nextDerby.home);
    const at = teamFor(nextDerby.away);
    lines.push(
      `Derby alert ⚔️ ${owner.name}'s ${ht.name} meet ${owner.name}'s ${at.name} — ${formatKickoff(nextDerby.utc)}. ${owner.name} can't lose. Or win`,
    );
  }

  // ── Weave in the England digs — twice per rotation, leading the cycle ──
  const eng = englandLines(state, employees);
  const weighted = [];
  const engQueue = [...eng, ...eng];
  const general = [...lines];
  while (general.length || engQueue.length) {
    if (engQueue.length) weighted.push(engQueue.shift());
    weighted.push(...general.splice(0, 2));
  }
  return weighted;
}
