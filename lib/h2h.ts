// Pure, deterministic head-to-head duel between two XIs (by overall rating).
// A two-legged tie (each side hosts once); level aggregate goes to penalties.
// Deterministic from a seed string so the same matchup always resolves the
// same way — fair and shareable.

export type DuelLeg = { aGoals: number; bGoals: number }
export type DuelResult = {
  legs: [DuelLeg, DuelLeg]
  aggA: number
  aggB: number
  winner: 'A' | 'B'
  pens?: { a: number; b: number }
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function poisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= rng() } while (p > L)
  return k - 1
}

// One match: `home` rating already includes its home bonus. Returns goals for
// the home side (h) and away side (a).
function oneMatch(homeRating: number, awayRating: number, rng: () => number): { h: number; a: number } {
  const diff = homeRating - awayRating
  const lambdaH = Math.max(0.2, 0.95 + diff / 15)
  const lambdaA = Math.max(0.18, 0.95 - diff / 19)
  return { h: poisson(lambdaH, rng), a: poisson(lambdaA, rng) }
}

export function simulateDuel(ratingA: number, ratingB: number, seedStr: string): DuelResult {
  const rng = makeRng(hashStr(seedStr))
  const HOME = 2.5
  // Leg 1: A at home.
  const l1 = oneMatch(ratingA + HOME, ratingB, rng)
  // Leg 2: B at home.
  const l2 = oneMatch(ratingB + HOME, ratingA, rng)
  const legs: [DuelLeg, DuelLeg] = [
    { aGoals: l1.h, bGoals: l1.a },
    { aGoals: l2.a, bGoals: l2.h },
  ]
  const aggA = legs[0].aGoals + legs[1].aGoals
  const aggB = legs[0].bGoals + legs[1].bGoals

  if (aggA !== aggB) {
    return { legs, aggA, aggB, winner: aggA > aggB ? 'A' : 'B' }
  }
  // Penalty shootout — edge by rating, then sudden-death coin flip.
  const pWin = 1 / (1 + Math.exp(-(ratingA - ratingB) / 12))
  const aWins = rng() < pWin
  const pensWinner = 4 + Math.floor(rng() * 2) // 4 or 5
  const pensLoser = Math.floor(rng() * pensWinner) // strictly fewer
  return {
    legs, aggA, aggB,
    winner: aWins ? 'A' : 'B',
    pens: aWins ? { a: pensWinner, b: pensLoser } : { a: pensLoser, b: pensWinner },
  }
}
