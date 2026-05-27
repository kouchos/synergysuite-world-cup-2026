/**
 * Global modal state. Components dispatch openModal(type, params) to surface a
 * modal; the Modal renderer in App.svelte reads `current` and picks the right
 * child component.
 *
 * Types currently supported: 'employee', 'team', 'game'.
 */
function createModalStore() {
  let current = $state(null);

  return {
    get current() {
      return current;
    },
    open(type, params = {}) {
      current = { type, params };
    },
    close() {
      current = null;
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
  };
}

export const modal = createModalStore();
