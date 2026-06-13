import { ALL_CLUB_SEASONS } from './data'
import type { DraftedPlayer, LeagueId, Player } from './types'

export type DraftComparison = { player: DraftedPlayer; best: Player | null; missed: number }

// Compares each drafted player against the best alternative who could fill the
// same sub-position in that club-season. Shared by the results screen's Draft
// Review and the "Perfect Draft" achievement so both agree exactly.
export function computeDraftReview(team: DraftedPlayer[], leagueId: LeagueId): {
  comparisons: DraftComparison[]
  totalMissed: number
  optimalCount: number
  isPerfect: boolean
} {
  const comparisons: DraftComparison[] = team.map(player => {
    const clubSeason = ALL_CLUB_SEASONS.find(
      cs => cs.club === player.club && cs.season === player.season && cs.league === leagueId
    )
    if (!clubSeason) return { player, best: null, missed: 0 }
    const playerAltPos = player.altPositions ?? []
    const byAlt = playerAltPos.length > 0
      ? clubSeason.players.filter(p => (p.altPositions ?? []).some(ap => playerAltPos.includes(ap)))
      : []
    const samePos = byAlt.length > 0
      ? byAlt
      : clubSeason.players.filter(p => p.position === player.position)
    if (samePos.length === 0) return { player, best: null, missed: 0 }
    const best = samePos.reduce((b, p) => (p.rating > b.rating ? p : b), samePos[0])
    // Compare by name: data may carry duplicate ids, so an id check can pit a
    // player against himself.
    const missed = best.name !== player.name ? best.rating - player.rating : 0
    return { player, best: missed > 0 ? best : null, missed }
  })

  const totalMissed = comparisons.reduce((s, c) => s + c.missed, 0)
  const optimalCount = comparisons.filter(c => c.missed === 0).length
  return { comparisons, totalMissed, optimalCount, isPerfect: totalMissed === 0 }
}
