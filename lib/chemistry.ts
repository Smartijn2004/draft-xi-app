// Squad chemistry — a tiny, opt-in synergy layer.
//
// Players who share a squad (same `club`) link up; in the World Cup modes a
// nation's players carry `club === nationality`, so the same single rule gives
// "national-team chemistry" there for free. `nationality` adds extra links only
// when it DIFFERS from the club (cross-club countrymen) — dormant today since
// only WC players carry a nationality, but future-proof for league nationalities.
//
// Because the draft hands you one player per spin (usually a different club each
// time), a rainbow XI scores ~0 and gets no bonus — chemistry is something you
// deliberately build by chasing links with your rerolls, not a default buff.

type ChemPlayer = { club: string; nationality?: string }

export type TeamChemistry = {
  score: number            // 0–100, for the UI meter
  bonus: number            // rating points folded into the sim
  links: { label: string; count: number; kind: 'club' | 'nation' }[]  // strongest clusters
}

const CLUB_LINK_CAP = 4    // diminishing returns past 4 same-squad teammates
const NATION_LINK_CAP = 4
const CLUB_W = 1
const NATION_W = 0.6
const CHEM_FULL = 26       // raw link value that maps to 100%
export const CHEM_MAX_BONUS = 1 // max rating points a fully-linked XI can add
// Convex curve: high-rating drafts cluster around a few elite clubs by nature
// (so mid chem is "free"), so the bonus stays near-zero until chemistry is high
// and only a deliberately maxed-out, cohesive XI earns the full (small) edge.
const CHEM_CURVE = 3

export function teamChemistry(players: ChemPlayer[]): TeamChemistry {
  const n = players.length
  if (n < 2) return { score: 0, bonus: 0, links: [] }

  const clubCount = new Map<string, number>()
  const nationCount = new Map<string, number>()
  for (const p of players) {
    clubCount.set(p.club, (clubCount.get(p.club) ?? 0) + 1)
    if (p.nationality) nationCount.set(p.nationality, (nationCount.get(p.nationality) ?? 0) + 1)
  }

  let raw = 0
  for (const p of players) {
    const sameClub = (clubCount.get(p.club) ?? 1) - 1
    // Countrymen who are NOT already linked via the same club (avoids double
    // counting national-team squads, where club === nationality).
    const sameNationTotal = p.nationality ? (nationCount.get(p.nationality) ?? 1) - 1 : 0
    const sameNationExtra = p.nationality && p.nationality !== p.club ? sameNationTotal : 0
    raw += CLUB_W * Math.min(sameClub, CLUB_LINK_CAP)
        +  NATION_W * Math.min(sameNationExtra, NATION_LINK_CAP)
  }

  const chem01 = Math.max(0, Math.min(1, raw / CHEM_FULL))
  const score = Math.round(chem01 * 100)
  const bonus = Math.pow(chem01, CHEM_CURVE) * CHEM_MAX_BONUS

  // Strongest clusters for the UI (clubs/nations with 2+ players).
  const links: TeamChemistry['links'] = []
  for (const [club, count] of clubCount) if (count >= 2) links.push({ label: club, count, kind: 'club' })
  for (const [nation, count] of nationCount) {
    if (count >= 2 && !clubCount.has(nation)) links.push({ label: nation, count, kind: 'nation' })
  }
  links.sort((a, b) => b.count - a.count)

  return { score, bonus, links: links.slice(0, 4) }
}
