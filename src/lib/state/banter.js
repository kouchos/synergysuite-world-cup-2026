/**
 * The Banter Banner — auto-generated office trash talk derived from current
 * state. Pure: state + employees in, an array of one-liners out. The banner
 * component rotates through whatever this returns; empty array = no banner.
 */
import { teamFor } from '../data/teams.js';
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
          `${first.employee.name} and ${second.employee.name} are level on ${first.pts} pts — goal difference is doing the talking`,
        );
      } else if (gap <= 3) {
        lines.push(
          `${first.employee.name} leads the race by ${plural(gap, 'pt')} — one ${second.employee.name} win flips it`,
        );
      } else {
        lines.push(
          `${first.employee.name} is running away with it — ${plural(gap, 'pt')} clear of ${second.employee.name}`,
        );
      }
      const last = overall[overall.length - 1];
      if (last.pts === 0) {
        lines.push(`${last.employee.name} is still on 0 pts — six teams, zero wins, full confidence`);
      }
    }

    // ── Cards race ──
    const cards = mostCardsLeaderboard(state, employees);
    if (cards[0]?.points > 0) {
      const leader = cards[0];
      lines.push(
        `${leader.employee.name} tops the cards table with ${plural(leader.points, 'pt')} (${leader.yellow}×🟨 ${leader.red}×🟥)`,
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
        lines.push(`${saint.employee.name}'s teams haven't picked up a single card — suspiciously well behaved`);
      }
    }

    // ── Wooden spoon ──
    const spoon = worstTeamRanking(state, employees)[0];
    if (spoon) {
      const t = teamFor(spoon.row.fifaCode);
      lines.push(
        spoon.owner
          ? `${t.name} are holding the wooden spoon 🥄 — ${spoon.owner.name}'s pride is on the line`
          : `${t.name} are holding the wooden spoon 🥄`,
      );
    }

    // ── Golden boot ──
    const boot = goldenBootTable(state, employees);
    if (boot[0]) {
      const top = boot[0];
      if (boot[1] && boot[1].goals === top.goals) {
        lines.push(`${top.player} and ${boot[1].player} locked on ${top.goals} — the boot race is wide open`);
      } else if (top.owner) {
        lines.push(
          `${top.player} leads the golden boot with ${plural(top.goals, 'goal')} — quietly delighting ${top.owner.name}`,
        );
      } else {
        lines.push(`${top.player} leads the golden boot with ${plural(top.goals, 'goal')}`);
      }
    }
  }

  // ── Derbies — owners' teams meeting head to head ──
  const allMatches = [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])];
  const derbyOf = (m) => {
    const ho = m.home ? teamOwner(m.home, employees) : null;
    const ao = m.away ? teamOwner(m.away, employees) : null;
    return ho && ao && ho.id !== ao.id ? { ho, ao } : null;
  };

  const liveDerby = allMatches.find((m) => m.status === 'live' && derbyOf(m));
  if (liveDerby) {
    const { ho, ao } = derbyOf(liveDerby);
    const ht = teamFor(liveDerby.home);
    const at = teamFor(liveDerby.away);
    lines.push(
      `Derby LIVE: ${ho.name}'s ${ht.name} ${liveDerby.homeGoals}–${liveDerby.awayGoals} ${ao.name}'s ${at.name} — bragging rights in play`,
    );
  }

  const nextDerby = allMatches
    .filter((m) => m.status === 'scheduled' && m.utc && derbyOf(m))
    .sort((a, b) => new Date(a.utc) - new Date(b.utc))[0];
  if (nextDerby) {
    const { ho, ao } = derbyOf(nextDerby);
    const ht = teamFor(nextDerby.home);
    const at = teamFor(nextDerby.away);
    lines.push(
      `Derby alert ⚔️ ${ho.name}'s ${ht.name} meet ${ao.name}'s ${at.name} — ${formatKickoff(nextDerby.utc)}`,
    );
  }

  return lines;
}
