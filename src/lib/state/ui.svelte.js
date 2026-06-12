/**
 * Small persisted UI preferences. Separate key prefix from the data cache so
 * ?nocache=1 purges never wipe user choices.
 */
const BANTER_KEY = 'synergysweep:hide-banter';
const HORN_KEY = 'synergysweep:mute-horn';
const RECAP_KEY = 'synergysweep:disable-recap';

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
  let hornMuted = $state(readFlag(HORN_KEY));
  let recapDisabled = $state(readFlag(RECAP_KEY));
  return {
    get banterHidden() {
      return banterHidden;
    },
    setBanterHidden(value) {
      banterHidden = value;
      writeFlag(BANTER_KEY, value);
    },
    get hornMuted() {
      return hornMuted;
    },
    setHornMuted(value) {
      hornMuted = value;
      writeFlag(HORN_KEY, value);
    },
    get recapDisabled() {
      return recapDisabled;
    },
    setRecapDisabled(value) {
      recapDisabled = value;
      writeFlag(RECAP_KEY, value);
    },
  };
}

export const ui = createUiStore();
