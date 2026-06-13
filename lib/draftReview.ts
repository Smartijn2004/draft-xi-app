import { ALL_CLUB_SEASONS } from './data'
import { canFillSlotLabel } from './positions'
import type { DraftedPlayer, LeagueId, Player } from './types'

export type DraftComparison = { player: DraftedPlayer; best: Player | null; missed: number }

// Compares each drafted player against the best alternative who could ACTUALLY
// have filled the same slot from that club-season — i.e. a player you could
// genuinely have picked at that moment. Restricting to same-slot-eligible
// squadmates means the "better pick" is always a real, fieldable option, not
// a higher-rated player in a different role you had no room for.
// Shared by the results screen and the "Perfect Draft" achievement.
export function computeDraftReview(team: DraftedPlayer[], leagueId: LeagueId): {
  comparisons: DraftComparison[]
  totalMissed: number
  optimalCount: number
  isPerfect: boolean
} {
  const comparisons: DraftComparison[] = team.map(player => {
    // Prefer the club-season from this league; fall back to any league (e.g.
    // legends mode, which draws players from every competition).
    const clubSeason =
      ALL_CLUB_SEASONS.find(cs => cs.club === player.club && cs.season === player.season && cs.league === leagueId) ??
      ALL_CLUB_SEASONS.find(cs => cs.club === player.club && cs.season === player.season)
    if (!clubSeason) return { player, best: null, missed: 0 }

    // Candidates = squadmates who could fill the exact slot this player took.
    let candidates = player.slotLabel
      ? clubSeason.players.filter(p => canFillSlotLabel(p, player.slotLabel))
      : []
    if (candidates.length === 0) {
      // Fallback for older data without a slot label: same broad position.
      candidates = clubSeason.players.filter(p => p.position === player.position)
    }
    if (candidates.length === 0) return { player, best: null, missed: 0 }

    const best = candidates.reduce((b, p) => (p.rating > b.rating ? p : b), candidates[0])
    // Compare by name: data may carry duplicate ids, so an id check can pit a
    // player against himself.
    const missed = best.name !== player.name ? best.rating - player.rating : 0
    return { player, best: missed > 0 ? best : null, missed }
  })

  const totalMissed = comparisons.reduce((s, c) => s + c.missed, 0)
  const optimalCount = comparisons.filter(c => c.missed === 0).length
  return { comparisons, totalMissed, optimalCount, isPerfect: totalMissed === 0 }
}
