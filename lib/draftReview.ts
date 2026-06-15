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
// For each slot you filled, the highest-rated player available in this game
// mode who could play it — so even if you couldn't grab him this run, you learn
// who the best option is for next time. A real draft lets you pick each player
// only once, so the report does too: players already in your XI are credited to
// their own slot, and any star suggested for one slot is reserved so it can't
// be suggested again at an identical slot elsewhere in the formation.
export type BestPick = { name: string; rating: number; club: string; season: string }
export type BestXIRow = {
  player: DraftedPlayer
  best: BestPick | null
  // The player(s) tied at the top available rating for this slot (up to 3).
  // Empty when you already hold the best available — you can pick any one.
  options: BestPick[]
  gap: number
}

export function computeModeBestXI(team: DraftedPlayer[], pool: Player[]): {
  rows: BestXIRow[]
  gotBest: number
  totalGap: number
} {
  // One physical player can be drafted once. Seed the "spent" set with everyone
  // already in your XI, then add each star as it's credited to a slot below.
  const used = new Set(team.map(p => p.name))

  // Collapse a player's multiple seasons to his single best-rated entry, so the
  // same name can't occupy two option slots and ratings reflect his peak.
  const bestByName = new Map<string, Player>()
  for (const p of pool) {
    const cur = bestByName.get(p.name)
    if (!cur || p.rating > cur.rating) bestByName.set(p.name, p)
  }
  const uniquePool = [...bestByName.values()]

  const toPick = (p: Player): BestPick => ({ name: p.name, rating: p.rating, club: p.club, season: p.season })

  const rows: BestXIRow[] = team.map(player => {
    const fits = player.slotLabel
      ? (p: Player) => canFillSlotLabel(p, player.slotLabel)
      : (p: Player) => p.position === player.position

    // Your own player is always eligible for his own slot; everyone else must
    // be a player not already in — or credited to — the XI.
    const candidates = uniquePool
      .filter(p => fits(p) && (p.name === player.name || !used.has(p.name)))
      .sort((a, b) => b.rating - a.rating)

    if (candidates.length === 0) return { player, best: null, options: [], gap: 0 }

    const top = candidates[0]
    // You already hold the best available for this slot (or an equal of it).
    if (top.name === player.name || top.rating <= player.rating) {
      return { player, best: null, options: [], gap: 0 }
    }

    // Surface the player(s) tied at the top rating — up to 3 — and reserve them
    // all, so an equally-rated star isn't dangled again at the next same slot.
    const options = candidates.filter(c => c.rating === top.rating).slice(0, 3)
    for (const o of options) used.add(o.name)

    return {
      player,
      best: toPick(top),
      options: options.map(toPick),
      gap: Math.max(0, top.rating - player.rating),
    }
  })

  const gotBest = rows.filter(r => r.gap === 0).length
  const totalGap = rows.reduce((s, r) => s + r.gap, 0)
  return { rows, gotBest, totalGap }
}
