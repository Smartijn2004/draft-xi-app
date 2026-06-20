/**
 * Difficulty / dilution probe.
 *
 *   npx tsx scripts/sim-difficulty.ts
 *
 * Models a realistic draft (random club spins + a reroll budget, greedily
 * picking the best player for a still-needed slot) over the CURRENT pool, then
 * runs the real season engine on each XI. Reports the achievable team rating
 * and how often a well-drafted side goes unbeaten / immortal — so we can see
 * whether adding clubs has diluted the pool back toward "impossible".
 */
import { LEAGUE_DATA } from '../lib/data'
import { runSimulation } from '../lib/simulation'
import type { ClubSeason, DraftedPlayer, LeagueId, Player, Position } from '../lib/types'

function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

// 4-3-3 broad-position needs.
const NEED: Record<Position, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 }

function toDrafted(p: Player, i: number): DraftedPlayer {
  return { ...p, slotPosition: p.position, slotIndex: i, slotLabel: p.position }
}

// Greedy draft: spin random unused clubs; from the landed club take the best
// player that fills a still-needed slot. With rerolls left, skip a club whose
// best fit is below `threshold` (a player hunting elite talent). 0 threshold or
// 0 rerolls = take whatever lands.
function draft(pool: ClubSeason[], rerolls: number, threshold: number, r: () => number): DraftedPlayer[] {
  const need: Record<Position, number> = { ...NEED }
  const used = new Set<string>()
  const team: DraftedPlayer[] = []
  let rr = rerolls
  let guard = 0
  while (team.length < 11 && guard++ < 500) {
    const avail = pool.filter(cs => !used.has(cs.id))
    if (avail.length === 0) break
    const club = avail[Math.floor(r() * avail.length)]
    used.add(club.id)
    let best: Player | null = null
    for (const p of club.players) {
      if (need[p.position] > 0 && (!best || p.rating > best.rating)) best = p
    }
    if (!best) continue // nothing we need here; effectively a wasted spin
    if (rr > 0 && best.rating < threshold) { rr--; continue } // skip, hunt better
    team.push(toDrafted(best, team.length))
    need[best.position]--
  }
  return team
}

// Cherry-picked ceiling: the best 11 players (by 4-3-3 needs) in the whole pool.
function bestXI(pool: ClubSeason[]): DraftedPlayer[] {
  const byPos: Record<Position, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] }
  for (const cs of pool) for (const p of cs.players) byPos[p.position].push(p)
  for (const k of Object.keys(byPos) as Position[]) byPos[k].sort((a, b) => b.rating - a.rating)
  const team: DraftedPlayer[] = []
  ;(Object.keys(NEED) as Position[]).forEach(pos => {
    for (let i = 0; i < NEED[pos]; i++) if (byPos[pos][i]) team.push(toDrafted(byPos[pos][i], team.length))
  })
  return team
}

const LEAGUES: { id: LeagueId; name: string; tournament: boolean }[] = [
  { id: 'pl', name: 'Premier League', tournament: false },
  { id: 'laliga', name: 'La Liga', tournament: false },
  { id: 'seriea', name: 'Serie A', tournament: false },
  { id: 'legends', name: 'Legends', tournament: false },
  { id: 'ucl', name: 'Champions League', tournament: true },
  { id: 'worldcup', name: 'World Cup', tournament: true },
]

const DRAFTS = 400      // distinct drafted XIs per scenario
const SIMS = 25         // season sims per XI
const r = rng(12345)

function teamRating(t: DraftedPlayer[]): number {
  const w: Record<string, number> = { GK: 0.9, DEF: 1.0, MID: 1.05, FWD: 1.1 }
  return t.reduce((s, p) => s + p.rating * (w[p.position] ?? 1), 0) / (t.length || 1)
}

function pct(n: number, d: number) { return d ? (100 * n / d).toFixed(1) + '%' : '—' }

console.log(`\nDifficulty probe — ${DRAFTS} drafts × ${SIMS} sims each, normal rerolls (2), defensive tactic.\n`)

for (const L of LEAGUES) {
  const pool = LEAGUE_DATA[L.id]
  const clubCount = pool.length

  // Ceiling: best possible XI in the pool.
  const ceiling = bestXI(pool)
  const ceilRating = teamRating(ceiling)

  // Two drafter profiles.
  for (const prof of [
    { label: 'smart  (skip <86)', rerolls: 2, threshold: 86 },
    { label: 'casual (take best)', rerolls: 2, threshold: 0 },
  ]) {
    let ratingSum = 0
    let unbeaten = 0, immortal = 0, perfect = 0, trophy = 0, unbeatenTrophy = 0
    let totalSeasons = 0
    let ratingMax = 0

    for (let d = 0; d < DRAFTS; d++) {
      const xi = draft(pool, prof.rerolls, prof.threshold, r)
      if (xi.length < 11) continue
      const tr = teamRating(xi)
      ratingSum += tr
      ratingMax = Math.max(ratingMax, tr)
      for (let s = 0; s < SIMS; s++) {
        const res = runSimulation(xi, L.id, Math.floor(r() * 1e9), 'defensive')
        totalSeasons++
        if (L.tournament) {
          if (res.trophyWon) trophy++
          if (res.trophyWon && res.lost === 0) unbeatenTrophy++
        } else {
          if (res.lost === 0) unbeaten++
          if (res.lost === 0 && res.won >= 34) immortal++
          if (res.won === 38 && res.drawn === 0) perfect++
        }
      }
    }

    const avgRating = ratingSum / DRAFTS
    if (L.tournament) {
      console.log(
        `${L.name.padEnd(18)} ${prof.label}  clubs=${String(clubCount).padStart(3)}  ` +
        `avgXI=${avgRating.toFixed(1)} maxXI=${ratingMax.toFixed(1)} ceiling=${ceilRating.toFixed(1)}  ` +
        `trophy=${pct(trophy, totalSeasons)}  unbeaten-cup=${pct(unbeatenTrophy, totalSeasons)}`,
      )
    } else {
      console.log(
        `${L.name.padEnd(18)} ${prof.label}  clubs=${String(clubCount).padStart(3)}  ` +
        `avgXI=${avgRating.toFixed(1)} maxXI=${ratingMax.toFixed(1)} ceiling=${ceilRating.toFixed(1)}  ` +
        `unbeaten=${pct(unbeaten, totalSeasons)}  immortal(34W+0L)=${pct(immortal, totalSeasons)}  perfect=${pct(perfect, totalSeasons)}`,
      )
    }
  }
  console.log('')
}
