/**
 * FIFA 3-letter code → display name + flag emoji.
 * Covers exactly the 48 teams across the office sweepstake.
 * Used by mock data and (later) by the ESPN adapter for stable team identity.
 */
export const TEAMS = {
  ALG: { name: 'Algeria', flag: '🇩🇿' },
  ARG: { name: 'Argentina', flag: '🇦🇷' },
  AUS: { name: 'Australia', flag: '🇦🇺' },
  AUT: { name: 'Austria', flag: '🇦🇹' },
  BEL: { name: 'Belgium', flag: '🇧🇪' },
  BIH: { name: 'Bosnia & Herz.', flag: '🇧🇦' },
  BRA: { name: 'Brazil', flag: '🇧🇷' },
  CAN: { name: 'Canada', flag: '🇨🇦' },
  CIV: { name: "Côte d'Ivoire", flag: '🇨🇮' },
  COD: { name: 'DR Congo', flag: '🇨🇩' },
  COL: { name: 'Colombia', flag: '🇨🇴' },
  CPV: { name: 'Cape Verde', flag: '🇨🇻' },
  CRO: { name: 'Croatia', flag: '🇭🇷' },
  CUW: { name: 'Curaçao', flag: '🇨🇼' },
  CZE: { name: 'Czechia', flag: '🇨🇿' },
  ECU: { name: 'Ecuador', flag: '🇪🇨' },
  EGY: { name: 'Egypt', flag: '🇪🇬' },
  ENG: { name: 'England', flag: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}' },
  ESP: { name: 'Spain', flag: '🇪🇸' },
  FRA: { name: 'France', flag: '🇫🇷' },
  GER: { name: 'Germany', flag: '🇩🇪' },
  GHA: { name: 'Ghana', flag: '🇬🇭' },
  HAI: { name: 'Haiti', flag: '🇭🇹' },
  IRN: { name: 'Iran', flag: '🇮🇷' },
  IRQ: { name: 'Iraq', flag: '🇮🇶' },
  JOR: { name: 'Jordan', flag: '🇯🇴' },
  JPN: { name: 'Japan', flag: '🇯🇵' },
  KOR: { name: 'South Korea', flag: '🇰🇷' },
  KSA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  MAR: { name: 'Morocco', flag: '🇲🇦' },
  MEX: { name: 'Mexico', flag: '🇲🇽' },
  NED: { name: 'Netherlands', flag: '🇳🇱' },
  NOR: { name: 'Norway', flag: '🇳🇴' },
  NZL: { name: 'New Zealand', flag: '🇳🇿' },
  PAN: { name: 'Panama', flag: '🇵🇦' },
  PAR: { name: 'Paraguay', flag: '🇵🇾' },
  POR: { name: 'Portugal', flag: '🇵🇹' },
  QAT: { name: 'Qatar', flag: '🇶🇦' },
  RSA: { name: 'South Africa', flag: '🇿🇦' },
  SCO: { name: 'Scotland', flag: '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}' },
  SEN: { name: 'Senegal', flag: '🇸🇳' },
  SUI: { name: 'Switzerland', flag: '🇨🇭' },
  SWE: { name: 'Sweden', flag: '🇸🇪' },
  TUN: { name: 'Tunisia', flag: '🇹🇳' },
  TUR: { name: 'Turkey', flag: '🇹🇷' },
  URU: { name: 'Uruguay', flag: '🇺🇾' },
  USA: { name: 'United States', flag: '🇺🇸' },
  UZB: { name: 'Uzbekistan', flag: '🇺🇿' },
};

export function teamFor(code) {
  return TEAMS[code] ?? { name: code, flag: '🏳️' };
}
