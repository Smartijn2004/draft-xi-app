/**
 * Difficulty / dilution + Perfect-Season-reachability probe.
 *
 *   npx tsx scripts/sim-difficulty.ts
 *
 * Models realistic drafts over the CURRENT pool, then runs the real season
 * engine. Two jobs:
 *   1. Confirm the pool isn't diluted to "impossible" (baseline unbeaten rates).
 *   2. Tune the Perfect Season (34W-0L) lever: a "chaser" build (prime ratings,
 *      max rerolls, hunts 95+ stars) on the new Total Football tactic should hit
 *      ~1%, while ordinary teams on Total Football are NOT better off (control).
 */
import { LEAGUE_DATA } from '../lib/data'
import { runSimulation } from '../lib/simulation'
import { teamChemistry } from '../lib/chemistry'
import type { ClubSeason, DraftedPlayer, LeagueId, Player, Position, Tactic } from '../lib/types'

function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

const NEED: Record<Position, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 }

// Prime rating = a player's peak across every dataset (mirrors the game's
// derived prime). Used to model a prime-ratings draft.
const PRIME = new Map<string, number>()
for (const id of Object.keys(LEAGUE_DATA) as LeagueId[]) {
  if (id === 'legends') continue // legends is the union; avoid double counting
  for (const cs of LEAGUE_DATA[id]) for (const p of cs.players) {
    if (p.rating > (PRIME.get(p.name) ?? 0)) PRIME.set(p.name, p.rating)
  }
}
const rOf = (p: Player, prime: boolean) => prime ? (PRIME.get(p.name) ?? p.rating) : p.rating

function toDrafted(p: Player, i: number, prime: boolean): DraftedPlayer {
  return { ...p, rating: rOf(p, prime), slotPosition: p.position, slotIndex: i, slotLabel: p.position }
}

const meanRating = (cs: ClubSeason) => cs.players.reduce((s, p) => s + p.rating, 0) / (cs.players.length || 1)
// Mirror of lib/data weightedSpin: bias toward stronger club-seasons.
function pickClub(avail: ClubSeason[], weighted: boolean, r: () => number): ClubSeason {
  if (!weighted) return avail[Math.floor(r() * avail.length)]
  const w = avail.map(cs => Math.pow(Math.max(1, meanRating(cs) - 74), 3))
  const total = w.reduce((a, b) => a + b, 0)
  let x = r() * total
  for (let i = 0; i < avail.length; i++) { x -= w[i]; if (x <= 0) return avail[i] }
  return avail[avail.length - 1]
}

function draft(pool: ClubSeason[], rerolls: number, threshold: number, prime: boolean, r: () => number, weighted = false, chemChase = false): DraftedPlayer[] {
  const need: Record<Position, number> = { ...NEED }
  const used = new Set<string>()
  const team: DraftedPlayer[] = []
  let rr = rerolls
  let guard = 0
  while (team.length < 11 && guard++ < 800) {
    let avail = pool.filter(cs => !used.has(cs.id))
    if (avail.length === 0) break
    // Chem-chaser: prefer club-seasons sharing a club name already in the XI,
    // to model a player deliberately stacking one squad for chemistry.
    if (chemChase && team.length > 0) {
      const have = new Set(team.map(p => p.club))
      const linked = avail.filter(cs => have.has(cs.club))
      if (linked.length > 0) avail = linked
    }
    const club = pickClub(avail, weighted, r)
    used.add(club.id)
    let best: Player | null = null
    for (const p of club.players) {
      if (need[p.position] > 0 && (!best || rOf(p, prime) > rOf(best, prime))) best = p
    }
    if (!best) continue
    if (rr > 0 && rOf(best, prime) < threshold) { rr--; continue }
    team.push(toDrafted(best, team.length, prime))
    need[best.position]--
  }
  return team
}

function teamRating(t: DraftedPlayer[]): number {
  const w: Record<string, number> = { GK: 0.9, DEF: 1.0, MID: 1.05, FWD: 1.1 }
  return t.reduce((s, p) => s + p.rating * (w[p.position] ?? 1), 0) / (t.length || 1)
}
const stars = (t: DraftedPlayer[]) => t.filter(p => p.rating >= 95).length
function pct(n: number, d: number) { return d ? (100 * n / d).toFixed(2) + '%' : '—' }

const LEAGUES: { id: LeagueId; name: string; tournament: boolean }[] = [
  { id: 'pl', name: 'Premier League', tournament: false },
  { id: 'laliga', name: 'La Liga', tournament: false },
  { id: 'seriea', name: 'Serie A', tournament: false },
  { id: 'legends', name: 'Legends', tournament: false },
  { id: 'ucl', name: 'Champions League', tournament: true },
  { id: 'worldcup', name: 'World Cup', tournament: true },
]

const DRAFTS = 400
const SIMS = 25
const r = rng(987654)

type Profile = { label: string; rerolls: number; threshold: number; prime: boolean; tactic: Tactic; chemChase?: boolean }
const PROFILES: Profile[] = [
  // Baseline "rest of the game" — must stay hard (unchanged from before).
  { label: 'baseline (smart, defensive)  ', rerolls: 2, threshold: 86, prime: false, tactic: 'defensive' },
  // Perfect-season chaser: prime ratings + max rerolls hunting 95+, Total Football.
  { label: 'chaser  (prime, TOTAL)       ', rerolls: 5, threshold: 95, prime: true, tactic: 'total' },
  // CHEM-CHASER: prime + Total Football + deliberately stacks one club for max
  // chemistry. The upper bound on how much chemistry can help a Perfect Season.
  { label: 'chem    (prime, TOTAL, stack)', rerolls: 5, threshold: 90, prime: true, tactic: 'total', chemChase: true },
  // CONTROL: ordinary season-rating team on Total Football — should NOT beat
  // the baseline's unbeaten rate (Total Football must not be a free buff).
  { label: 'control (smart, TOTAL)       ', rerolls: 2, threshold: 86, prime: false, tactic: 'total' },
]

console.log(`\nPerfect-Season probe — ${DRAFTS} drafts × ${SIMS} sims.\n`)

for (const L of LEAGUES) {
  const pool = LEAGUE_DATA[L.id]
  for (const prof of PROFILES) {
    let ratingSum = 0, starSum = 0, chemSum = 0
    let unbeaten = 0, perfect = 0, trophy = 0, unbeatenCup = 0, totalSeasons = 0
    for (let d = 0; d < DRAFTS; d++) {
      const xi = draft(pool, prof.rerolls, prof.threshold, prof.prime, r, false, prof.chemChase)
      if (xi.length < 11) continue
      ratingSum += teamRating(xi); starSum += stars(xi); chemSum += teamChemistry(xi).score
      for (let s = 0; s < SIMS; s++) {
        const res = runSimulation(xi, L.id, Math.floor(r() * 1e9), prof.tactic)
        totalSeasons++
        if (L.tournament) {
          if (res.trophyWon) trophy++
          if (res.trophyWon && res.lost === 0) unbeatenCup++
        } else {
          if (res.lost === 0) unbeaten++
          if (res.lost === 0 && res.won >= 34) perfect++
        }
      }
    }
    const tail = L.tournament
      ? `trophy=${pct(trophy, totalSeasons)} unbeaten-cup=${pct(unbeatenCup, totalSeasons)}`
      : `unbeaten=${pct(unbeaten, totalSeasons)} PERFECT(34W-0L)=${pct(perfect, totalSeasons)}`
    console.log(`${L.name.padEnd(17)} ${prof.label} avgXI=${(ratingSum / DRAFTS).toFixed(1)} stars95=${(starSum / DRAFTS).toFixed(1)} chem=${(chemSum / DRAFTS).toFixed(0)}  ${tail}`)
  }
  console.log('')
}

// Hard control: a flat ordinary XI (all 88, zero stars) on Total Football vs
// Defensive — Total Football must be WORSE for an ordinary side, never a buff.
function flatXI(rating: number): DraftedPlayer[] {
  const slots: Position[] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD']
  return slots.map((pos, i) => ({
    id: `flat-${i}`, name: `P${i}`, position: pos, rating, club: 'X', season: 'X',
    slotPosition: pos, slotIndex: i, slotLabel: pos,
  }))
}
// Legends spin weighting: does biasing toward stronger club-seasons make it
// easier to build an on-par squad (player feedback), without trivialising it?
console.log('Legends spin: uniform vs weighted (smart draft, defensive), 300×25:')
for (const weighted of [false, true]) {
  let ratingSum = 0, starSum = 0, unbeaten = 0, n = 0
  for (let d = 0; d < 300; d++) {
    const xi = draft(LEAGUE_DATA.legends, 2, 86, false, r, weighted)
    if (xi.length < 11) continue
    ratingSum += teamRating(xi); starSum += stars(xi)
    for (let s = 0; s < 25; s++) { const res = runSimulation(xi, 'legends', Math.floor(r() * 1e9), 'defensive'); n++; if (res.lost === 0) unbeaten++ }
  }
  console.log(`  ${weighted ? 'weighted' : 'uniform '}  avgXI=${(ratingSum / 300).toFixed(1)} stars95=${(starSum / 300).toFixed(1)}  unbeaten=${pct(unbeaten, n)}`)
}
console.log('')

// Tournament tactic comparison: is Total Football actually ABOVE the existing
// best knockout tactic? (Defensive is the worst for UCL — draws eliminate.)
console.log('Tournament Immortal (unbeaten-cup) by tactic, smart season-rating draft:')
for (const L of [{ id: 'ucl' as LeagueId, name: 'UCL' }, { id: 'worldcup' as LeagueId, name: 'World Cup' }]) {
  const parts: string[] = []
  for (const t of ['balanced', 'attacking', 'defensive', 'total'] as Tactic[]) {
    let cup = 0, n = 0
    for (let d = 0; d < 200; d++) {
      const xi = draft(LEAGUE_DATA[L.id], 2, 86, false, r)
      if (xi.length < 11) continue
      for (let s = 0; s < 25; s++) { const res = runSimulation(xi, L.id, Math.floor(r() * 1e9), t); n++; if (res.trophyWon && res.lost === 0) cup++ }
    }
    parts.push(`${t}=${pct(cup, n)}`)
  }
  console.log(`  ${L.name.padEnd(10)} ${parts.join('  ')}`)
}
console.log('')

console.log('Control — ordinary 88-rated XI (0 stars), PL, 4000 sims:')
for (const t of ['defensive', 'balanced', 'total'] as Tactic[]) {
  let ub = 0, n = 0
  const xi = flatXI(88)
  for (let s = 0; s < 4000; s++) { const res = runSimulation(xi, 'pl', Math.floor(r() * 1e9), t); n++; if (res.lost === 0) ub++ }
  console.log(`  ${t.padEnd(10)} unbeaten=${pct(ub, n)}`)
}
console.log('')
