/**
 * Minimal team registry: FIFA 3-letter code → display name + flag emoji.
 * Used by mock data and (later) by the ESPN adapter for stable team identity.
 * Not exhaustive yet — fleshes out as we wire real data in later checkpoints.
 */
export const TEAMS = {
  BRA: { name: 'Brazil', flag: '🇧🇷' },
  ARG: { name: 'Argentina', flag: '🇦🇷' },
  FRA: { name: 'France', flag: '🇫🇷' },
  ENG: { name: 'England', flag: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}' },
  ESP: { name: 'Spain', flag: '🇪🇸' },
  GER: { name: 'Germany', flag: '🇩🇪' },
  NED: { name: 'Netherlands', flag: '🇳🇱' },
  POR: { name: 'Portugal', flag: '🇵🇹' },
  AUS: { name: 'Australia', flag: '🇦🇺' },
  NOR: { name: 'Norway', flag: '🇳🇴' },
  CIV: { name: "Côte d'Ivoire", flag: '🇨🇮' },
  KSA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  TUN: { name: 'Tunisia', flag: '🇹🇳' },
  MEX: { name: 'Mexico', flag: '🇲🇽' },
  JPN: { name: 'Japan', flag: '🇯🇵' },
  CRO: { name: 'Croatia', flag: '🇭🇷' },
  EGY: { name: 'Egypt', flag: '🇪🇬' },
  JOR: { name: 'Jordan', flag: '🇯🇴' },
  USA: { name: 'United States', flag: '🇺🇸' },
  DEN: { name: 'Denmark', flag: '🇩🇰' },
  SUI: { name: 'Switzerland', flag: '🇨🇭' },
  GHA: { name: 'Ghana', flag: '🇬🇭' },
  UZB: { name: 'Uzbekistan', flag: '🇺🇿' },
  CAN: { name: 'Canada', flag: '🇨🇦' },
  URU: { name: 'Uruguay', flag: '🇺🇾' },
  SEN: { name: 'Senegal', flag: '🇸🇳' },
  PAR: { name: 'Paraguay', flag: '🇵🇾' },
  PAN: { name: 'Panama', flag: '🇵🇦' },
  MAR: { name: 'Morocco', flag: '🇲🇦' },
  KOR: { name: 'South Korea', flag: '🇰🇷' },
  SCO: { name: 'Scotland', flag: '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}' },
  ALG: { name: 'Algeria', flag: '🇩🇿' },
  CUW: { name: 'Curaçao', flag: '🇨🇼' },
  BEL: { name: 'Belgium', flag: '🇧🇪' },
  ECU: { name: 'Ecuador', flag: '🇪🇨' },
  NZL: { name: 'New Zealand', flag: '🇳🇿' },
  IRN: { name: 'Iran', flag: '🇮🇷' },
  HAI: { name: 'Haiti', flag: '🇭🇹' },
  AUT: { name: 'Austria', flag: '🇦🇹' },
  SRB: { name: 'Serbia', flag: '🇷🇸' },
  QAT: { name: 'Qatar', flag: '🇶🇦' },
  RSA: { name: 'South Africa', flag: '🇿🇦' },
  VEN: { name: 'Venezuela', flag: '🇻🇪' },
  COL: { name: 'Colombia', flag: '🇨🇴' },
  TUR: { name: 'Turkey', flag: '🇹🇷' },
  CPV: { name: 'Cape Verde', flag: '🇨🇻' },
  BOL: { name: 'Bolivia', flag: '🇧🇴' },
  NCL: { name: 'New Caledonia', flag: '🇳🇨' },
};

export function teamFor(code) {
  return TEAMS[code] ?? { name: code, flag: '🏳️' };
}
