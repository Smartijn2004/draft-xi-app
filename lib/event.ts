// World Cup 2026 runs 11 June – 19 July 2026. The event is only playable
// while the real tournament is on; outside that window the home card hides
// and the route shows an "event ended/not started" message.
const WC2026_START = Date.UTC(2026, 5, 11)        // 2026-06-11
const WC2026_END = Date.UTC(2026, 6, 19, 23, 59)  // 2026-07-19 end of day

export function isWorldCup2026Active(now: number = Date.now()): boolean {
  return now >= WC2026_START && now <= WC2026_END
}

// Days remaining in the event (for the "X days left" countdown on the card).
export function worldCup2026DaysLeft(now: number = Date.now()): number {
  return Math.max(0, Math.ceil((WC2026_END - now) / 86400000))
}
