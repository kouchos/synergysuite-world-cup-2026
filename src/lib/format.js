const IRISH_LOCALE = 'en-IE';
const IRISH_TZ = 'Europe/Dublin';

export function formatKickoff(iso) {
  const d = new Date(iso);
  return d.toLocaleString(IRISH_LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IRISH_TZ,
  });
}

export function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(IRISH_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IRISH_TZ,
  });
}

export function timeUntil(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `in ${days}d ${hrs % 24}h`;
}
