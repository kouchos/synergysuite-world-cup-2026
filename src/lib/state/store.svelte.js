import employeesConfig from '../../../config/employees.json';
import { MOCK_STATE, MOCK_STATE_FINAL } from '../data/mock.js';

const employees = employeesConfig.employees;

function initialMockState() {
  if (typeof window === 'undefined') return MOCK_STATE;
  const flag = new URLSearchParams(window.location.search).get('mock');
  if (flag === 'final' || flag === 'end' || flag === 'winners') return MOCK_STATE_FINAL;
  return MOCK_STATE;
}

function detectPhase(state) {
  return state?.phase ?? 'group';
}

function isMockMode() {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mock') === '1') return true;
  return import.meta.env.VITE_MOCK === '1';
}

function createStore() {
  let snapshot = $state(initialMockState());
  let activeView = $state(null); // null = follow phase
  let lastSync = $state(new Date());
  let syncing = $state(false);

  const phase = $derived(detectPhase(snapshot));
  const view = $derived(activeView ?? phase);

  return {
    get state() {
      return snapshot;
    },
    get employees() {
      return employees;
    },
    get phase() {
      return phase;
    },
    get view() {
      return view;
    },
    get lastSync() {
      return lastSync;
    },
    get syncing() {
      return syncing;
    },
    setView(v) {
      activeView = v;
    },
    async refresh() {
      if (isMockMode()) {
        lastSync = new Date();
        return;
      }
      // Real ESPN fetch arrives in a later checkpoint.
      syncing = true;
      try {
        // placeholder — adapter.fetchState() will land here next
        lastSync = new Date();
      } finally {
        syncing = false;
      }
    },
  };
}

export const store = createStore();
