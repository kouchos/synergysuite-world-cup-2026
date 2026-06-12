/**
 * Global modal state. Components dispatch openModal(type, params) to surface a
 * modal; the Modal renderer in App.svelte reads `current` and picks the right
 * child component.
 *
 * Types currently supported: 'employee', 'team', 'game', 'prize'.
 *
 * Back-button handling: opening a modal pushes one history entry, so the
 * browser/OS back action closes the dialog instead of leaving the page.
 * Closing by other means (X, ESC, backdrop, programmatic) consumes that entry
 * again, so the history stack never accumulates stale modal states. Navigating
 * between modals while one is open replaces `current` without pushing more
 * entries — a single back press always dismisses the dialog entirely.
 */
function createModalStore() {
  let current = $state(null);
  let historyArmed = false; // we own one pushed history entry while a modal is open

  const canUseHistory =
    typeof window !== 'undefined' && typeof window.history?.pushState === 'function';

  // A reload while a modal was open leaves our pushed entry behind (the modal
  // itself doesn't survive the reload). Consume it so the first back press
  // after a refresh isn't a confusing no-op.
  if (canUseHistory && window.history.state?.modal) {
    window.history.back();
  }

  function onPopstate() {
    // Back pressed while a modal is open → close the dialog, stay on the page.
    historyArmed = false;
    window.removeEventListener('popstate', onPopstate);
    current = null;
  }

  return {
    get current() {
      return current;
    },
    open(type, params = {}) {
      if (canUseHistory && !historyArmed) {
        window.history.pushState({ modal: true }, '');
        window.addEventListener('popstate', onPopstate);
        historyArmed = true;
      }
      current = { type, params };
    },
    close() {
      current = null;
      if (canUseHistory && historyArmed) {
        historyArmed = false;
        window.removeEventListener('popstate', onPopstate);
        window.history.back(); // consume the entry pushed by open()
      }
    },
    // Convenience helpers
    employee(id) {
      this.open('employee', { id });
    },
    team(code) {
      this.open('team', { code });
    },
    game(matchId) {
      this.open('game', { matchId });
    },
    // category: 'overall' | 'worst' | 'cards' | 'boot'
    prize(category) {
      this.open('prize', { category });
    },
  };
}

export const modal = createModalStore();
