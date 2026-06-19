import { ALL_CLUB_SEASONS, getClubSeasonsForLeague, LEAGUE_CONFIGS } from './data'
import { getDailyChallengeNumber, getTodayKey, dateSeed, DAILY_LEAGUE_ORDER } from './storage'
import { FORMATIONS } from './types'
import type { ClubSeason, Difficulty, LeagueId, Player } from './types'

// One of three themes rotates each day. The host league (rotating separately)
// always sets the format, opponents and theming; the constraint layers on top.
export type DailyConstraint =
  | { kind: 'league' }
  | { kind: 'decade'; decade: number }
  | { kind: 'underdog'; maxRating: number }

export type DailyChallenge = {
  number: number
  hostLeague: LeagueId
  constraint: DailyConstraint
  formation: string        // deterministic formation everyone plays that day
  difficulty: Difficulty   // deterministic difficulty everyone plays that day
  label: string        // short chip, e.g. "2010s Only"
  description: string  // one-line rules summary
}

// Decades that have plenty of club-seasons across all competitions, so a
// cross-league decade draft can always fill an XI.
const DECADES = [2000, 2010, 2020]
const UNDERDOG_CAPS = [82, 84, 85]
const FORMATION_NAMES = Object.keys(FORMATIONS)
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

// Formation and difficulty rotate independently of the theme/league so the same
// challenge rarely repeats. Different bit-shifts of the seed keep these picks
// from correlating with the decade/underdog choices (which use the raw seed).
function dailyFormation(seed: number): string {
  return FORMATION_NAMES[(seed >>> 5) % FORMATION_NAMES.length]
}
function dailyDifficulty(seed: number): Difficulty {
  return DIFFICULTIES[(seed >>> 11) % DIFFICULTIES.length]
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }
const LEAGUE_NAMES: Record<LeagueId, string> = Object.fromEntries(
  Object.values(LEAGUE_CONFIGS).map(c => [c.id, c.name]),
) as Record<LeagueId, string>

function decadeOf(season: string): number {
  // season like "2008-09" or "1998-99" -> 2000 / 1990
  const year = parseInt(season.slice(0, 4), 10)
  return Math.floor(year / 10) * 10
}

export function getDailyChallenge(dateKey: string = getTodayKey()): DailyChallenge {
  const number = getDailyChallengeNumber(dateKey)
  const hostLeague = DAILY_LEAGUE_ORDER[(number - 1) % DAILY_LEAGUE_ORDER.length]
  // Even three-day cycle (league → decade → underdog). The league rotates on a
  // 5-cycle, so host+theme only realign every 15 days — plenty of variety.
  const seed = dateSeed(dateKey)
  const theme = (number - 1) % 3
  const formation = dailyFormation(seed)
  const difficulty = dailyDifficulty(seed)
  // Appended to every description so players see the day's format up front.
  const rules = `${formation} · ${DIFFICULTY_LABEL[difficulty]}`

  if (theme === 1) {
    const decade = DECADES[seed % DECADES.length]
    return {
      number, hostLeague, constraint: { kind: 'decade', decade }, formation, difficulty,
      label: `${decade}s · Any League`,
      description: `Draft a ${decade}s XI from ANY competition, then win the ${LEAGUE_NAMES[hostLeague]} · ${rules}.`,
    }
  }
  if (theme === 2) {
    const maxRating = UNDERDOG_CAPS[seed % UNDERDOG_CAPS.length]
    return {
      number, hostLeague, constraint: { kind: 'underdog', maxRating }, formation, difficulty,
      label: `Underdogs ≤${maxRating}`,
      description: `Draft from ANY competition, no player above ${maxRating}, then win the ${LEAGUE_NAMES[hostLeague]} · ${rules}.`,
    }
  }
  return {
    number, hostLeague, constraint: { kind: 'league' }, formation, difficulty,
    label: 'Single League',
    description: `Draft from the ${LEAGUE_NAMES[hostLeague]} only · ${rules}.`,
  }
}

// The pool of club-seasons the daily spins from, given its constraint.
export function getDailySpinPool(challenge: DailyChallenge): ClubSeason[] {
  switch (challenge.constraint.kind) {
    case 'decade': {
      const d = challenge.constraint.decade
      return ALL_CLUB_SEASONS.filter(cs => decadeOf(cs.season) === d)
    }
    case 'underdog':
      // Cross-league so there are always enough sub-cap players to fill an XI.
      return ALL_CLUB_SEASONS.filter(cs =>
        cs.players.some(p => p.rating <= (challenge.constraint as { maxRating: number }).maxRating))
    case 'league':
    default:
      return getClubSeasonsForLeague(challenge.hostLeague)
  }
}

// Whether a specific player may be drafted under the constraint (on top of the
// usual slot / already-drafted checks).
export function isPlayerAllowed(challenge: DailyChallenge, player: Player): boolean {
  if (challenge.constraint.kind === 'underdog') return player.rating <= challenge.constraint.maxRating
  if (challenge.constraint.kind === 'decade') return decadeOf(player.season) === challenge.constraint.decade
  return true
}
