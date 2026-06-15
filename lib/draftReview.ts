import { ALL_CLUB_SEASONS } from './data'
import { canFillSlotLabel } from './positions'
import type { DraftedPlayer, LeagueId, Player } from './types'

// ── (1) Per-spin optimality (for the "Perfect Draft" achievement) ────────────
// Did you pick the best player you COULD have from each club-season you spun?
// This stays achievable — it's a measure of draft skill, not luck.
export function computeSquadOptimality(team: DraftedPlayer[], leagueId: LeagueId): {
  optimalCount: number
  isPerfect: boolean
} {
  let optimal = 0
  for (const player of team) {
    const clubSeason =
      ALL_CLUB_SEASONS.find(cs => cs.club === player.club && cs.season === player.season && cs.league === leagueId) ??
      ALL_CLUB_SEASONS.find(cs => cs.club === player.club && cs.season === player.season)
    if (!clubSeason) { optimal++; continue }
    let candidates = player.slotLabel
      ? clubSeason.players.filter(p => canFillSlotLabel(p, player.slotLabel))
      : []
    if (candidates.length === 0) candidates = clubSeason.players.filter(p => p.position === player.position)
    if (candidates.length === 0) { optimal++; continue }
    const best = candidates.reduce((b, p) => (p.rating > b.rating ? p : b), candidates[0])
    if (best.name === player.name || best.rating <= player.rating) optimal++
  }
  return { optimalCount: optimal, isPerfect: optimal === team.length }
}

// ── (2) Mode-best XI (for the results "Draft Review" scout report) ───────────
// For each slot you filled, the highest-rated player available ANYWHERE in this
// game mode who could play that slot — so even if you couldn't grab him this
// run, you learn who the best option is for next time.
export type BestXIRow = {
  player: DraftedPlayer
  best: { name: string; rating: number; club: string; season: string } | null
  gap: number
}

export function computeModeBestXI(team: DraftedPlayer[], pool: Player[]): {
  rows: BestXIRow[]
  gotBest: number
  totalGap: number
} {
  // Names already used elsewhere in the XI can't be a "better pick" for this
  // slot — you can't field the same player twice. Allow only the slot's own
  // player plus players not used anywhere else.
  const teamNames = new Set(team.map(p => p.name))
  const rows: BestXIRow[] = team.map(player => {
    const fits = player.slotLabel
      ? (p: Player) => canFillSlotLabel(p, player.slotLabel)
      : (p: Player) => p.position === player.position
    const candidates = pool.filter(p => fits(p) && (p.name === player.name || !teamNames.has(p.name)))
    if (candidates.length === 0) return { player, best: null, gap: 0 }
    const best = candidates.reduce((b, p) => (p.rating > b.rating ? p : b), candidates[0])
    // By name: if you already have the player (any season), you have the best.
    const gap = best.name === player.name ? 0 : Math.max(0, best.rating - player.rating)
    return {
      player,
      best: { name: best.name, rating: best.rating, club: best.club, season: best.season },
      gap,
    }
  })
  const gotBest = rows.filter(r => r.gap === 0).length
  const totalGap = rows.reduce((s, r) => s + r.gap, 0)
  return { rows, gotBest, totalGap }
}
