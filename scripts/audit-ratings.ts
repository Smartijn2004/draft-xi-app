/**
 * Rating & data sanity audit for the club-season database.
 *
 * Run with:  npm run audit:ratings
 *
 * ERRORS (exit 1) are structural problems that break drafting or scoring.
 * WARNINGS are things worth a human look (thin squads, big rating swings).
 * The REVIEW section lists the top of the rating curve so inflated ratings
 * (the "Weghorst 86" class) are easy to eyeball.
 *
 * This is intentionally dependency-light and data-only — it does not import
 * any React/Next code, so it runs fast under tsx.
 */
import { premierLeagueData } from '../lib/data/premier-league'
import { laLigaData } from '../lib/data/la-liga'
import { serieAData } from '../lib/data/serie-a'
import { championsLeagueData } from '../lib/data/champions-league'
import { worldCupData } from '../lib/data/world-cup'
import { worldCup2026Data } from '../lib/data/world-cup-2026'
import type { ClubSeason, Player, Position } from '../lib/types'

// Every dataset that is authored by hand (legends is just a union of these).
const DATASETS: { name: string; data: ClubSeason[] }[] = [
  { name: 'premier-league', data: premierLeagueData },
  { name: 'la-liga', data: laLigaData },
  { name: 'serie-a', data: serieAData },
  { name: 'champions-league', data: championsLeagueData },
  { name: 'world-cup', data: worldCupData },
  { name: 'world-cup-2026', data: worldCup2026Data },
]

const VALID_POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']
// Slot codes that altPositions may reference (mirror of the formation labels).
const VALID_SLOTS = new Set([
  'GK', 'RB', 'LB', 'CB', 'RWB', 'LWB', 'DM', 'CM', 'LM', 'RM', 'AM', 'LW', 'RW', 'ST',
])

const MIN_SQUAD = 11          // the established design: each squad is a full XI
const RATING_MIN = 50
const RATING_MAX = 99
const SPAN_WARN = 12          // same player's ratings shouldn't swing more than this
const REVIEW_FROM = 92        // top-of-curve ratings printed for a sanity eyeball

const errors: string[] = []
const warnings: string[] = []

const seenPlayerIds = new Map<string, string>()  // id -> "club season"
const seenClubIds = new Map<string, string>()
const ratingsByName = new Map<string, { rating: number; where: string }[]>()
const reviewList: { rating: number; name: string; where: string }[] = []

for (const { name: dataset, data } of DATASETS) {
  for (const cs of data) {
    const where = `${cs.club} ${cs.season} [${dataset}]`

    if (seenClubIds.has(cs.id)) {
      errors.push(`Duplicate club-season id '${cs.id}' (${where} & ${seenClubIds.get(cs.id)})`)
    } else {
      seenClubIds.set(cs.id, where)
    }

    const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }

    for (const p of cs.players) {
      // Required fields
      for (const f of ['id', 'name', 'position', 'rating', 'club', 'season'] as (keyof Player)[]) {
        if (p[f] === undefined || p[f] === null || p[f] === '') {
          errors.push(`${where}: player '${p.name ?? p.id ?? '?'}' missing field '${f}'`)
        }
      }

      // Duplicate player ids
      if (seenPlayerIds.has(p.id)) {
        errors.push(`Duplicate player id '${p.id}' (${where} & ${seenPlayerIds.get(p.id)})`)
      } else {
        seenPlayerIds.set(p.id, where)
      }

      // Position validity
      if (!VALID_POSITIONS.includes(p.position)) {
        errors.push(`${where}: '${p.name}' has invalid position '${p.position}'`)
      } else {
        counts[p.position]++
      }

      // Rating bounds
      if (typeof p.rating !== 'number' || p.rating < RATING_MIN || p.rating > RATING_MAX) {
        errors.push(`${where}: '${p.name}' rating ${p.rating} outside [${RATING_MIN}, ${RATING_MAX}]`)
      }

      // altPositions validity + GK consistency (the Ederson class of bug)
      if (p.altPositions) {
        for (const slot of p.altPositions) {
          if (!VALID_SLOTS.has(slot)) {
            warnings.push(`${where}: '${p.name}' has unknown altPosition '${slot}'`)
          }
        }
        const hasGkSlot = p.altPositions.includes('GK')
        if (p.position === 'GK' && p.altPositions.some(s => s !== 'GK')) {
          errors.push(`${where}: GK '${p.name}' has outfield altPositions [${p.altPositions.join(', ')}]`)
        }
        if (p.position !== 'GK' && hasGkSlot) {
          errors.push(`${where}: outfield '${p.name}' (${p.position}) lists 'GK' as an altPosition`)
        }
      }

      // Track for cross-season span + review list
      const arr = ratingsByName.get(p.name) ?? []
      arr.push({ rating: p.rating, where })
      ratingsByName.set(p.name, arr)
      if (p.rating >= REVIEW_FROM) reviewList.push({ rating: p.rating, name: p.name, where })
    }

    // Squad size — the whole DB is built to a full XI per club-season.
    if (cs.players.length < MIN_SQUAD) {
      errors.push(`${where}: only ${cs.players.length} players (every squad should have ≥${MIN_SQUAD})`)
    }
    // A squad with no keeper can never supply a GK when you land on it.
    if (counts.GK < 1) errors.push(`${where}: no goalkeeper`)
  }
}

// Cross-season rating swings for the same name (possible mis-rating)
for (const [pname, entries] of ratingsByName) {
  if (entries.length < 2) continue
  const ratings = entries.map(e => e.rating)
  const min = Math.min(...ratings)
  const max = Math.max(...ratings)
  if (max - min > SPAN_WARN) {
    warnings.push(`'${pname}' ratings span ${min}–${max} (${max - min}) across ${entries.length} entries — verify`)
  }
}

// ── Report ────────────────────────────────────────────────────────────────
const totalClubs = seenClubIds.size
const totalPlayers = seenPlayerIds.size
console.log(`\nAudited ${totalClubs} club-seasons / ${totalPlayers} players across ${DATASETS.length} datasets.\n`)

if (errors.length) {
  console.log(`❌ ${errors.length} ERROR(S):`)
  for (const e of errors) console.log(`   • ${e}`)
  console.log('')
}
if (warnings.length) {
  console.log(`⚠️  ${warnings.length} WARNING(S):`)
  for (const w of warnings) console.log(`   • ${w}`)
  console.log('')
}

reviewList.sort((a, b) => b.rating - a.rating)
console.log(`🔎 REVIEW — ${reviewList.length} ratings ≥ ${REVIEW_FROM} (eyeball for inflation):`)
for (const r of reviewList) console.log(`   ${r.rating}  ${r.name}  — ${r.where}`)
console.log('')

if (errors.length) {
  console.log('Audit FAILED.\n')
  process.exit(1)
} else {
  console.log(`Audit passed${warnings.length ? ` with ${warnings.length} warning(s)` : ''}.\n`)
}
