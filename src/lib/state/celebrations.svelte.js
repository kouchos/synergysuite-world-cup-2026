/**
 * Goal celebration queue. The store's live refresh pushes goals detected
 * between snapshots; GoalFlash renders `current` as a full-screen takeover.
 * One celebration shows at a time (~4.5s, or until clicked away); a short
 * queue handles multi-goal refreshes without spamming the room.
 */
import { detectGoals } from './goalDiff.js';
import { teamOwner } from './prizes.js';

const DISPLAY_MS = 4500;
const MAX_QUEUED = 3;

function createCelebrations() {
  let current = $state(null);
  const queue = [];
  let timer = null;

  function show(c) {
    current = c;
    clearTimeout(timer);
    timer = setTimeout(dismiss, DISPLAY_MS);
  }

  function dismiss() {
    clearTimeout(timer);
    timer = null;
    current = null;
    if (queue.length) show(queue.shift());
  }

  function push(c) {
    if (!current) show(c);
    else if (queue.length < MAX_QUEUED) queue.push(c);
  }

  /** Diff two snapshots and queue a flash for every goal found. */
  function fromSnapshots(prev, next, employees) {
    for (const goal of detectGoals(prev, next)) {
      push({ ...goal, owner: teamOwner(goal.team, employees) });
    }
  }

  return {
    get current() {
      return current;
    },
    push,
    dismiss,
    fromSnapshots,
  };
}

export const celebrations = createCelebrations();
