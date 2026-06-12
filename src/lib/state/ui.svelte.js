/**
 * Small persisted UI preferences. Separate key prefix from the data cache so
 * ?nocache=1 purges never wipe user choices.
 */
const BANTER_KEY = 'synergysweep:hide-banter';

function readFlag(key) {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // storage unavailable — preference just won't persist
  }
}

function createUiStore() {
  let banterHidden = $state(readFlag(BANTER_KEY));
  return {
    get banterHidden() {
      return banterHidden;
    },
    setBanterHidden(value) {
      banterHidden = value;
      writeFlag(BANTER_KEY, value);
    },
  };
}

export const ui = createUiStore();
