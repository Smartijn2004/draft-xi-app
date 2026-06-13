import type { LeagueId, SeasonResult, DraftedPlayer } from './types'
import { evaluateAchievements, getAchievement, type Achievement } from './achievements'
import { computeDraftReview } from './draftReview'

// All persistence lives under a single versioned key. Every read/write is
// guarded: SSR (no window) and private-mode (storage throws) both degrade
// to in-memory defaults without crashing.
const STORAGE_KEY = 'draftxi:v1'

export type CareerStats = {
  seasonsPlayed: number
  trophies: number
  invincibles: number
  perfectSeasons: number
  bestPoints: number
  bestPointsLeague: LeagueId | null
  totalWon: number
  totalDrawn: number
  totalLost: number
  goalsFor: number
  goalsAgainst: number
}

export type HallOfFameEntry = {
  date: string
  leagueId: LeagueId
  points: number
  trophyWon: boolean
  isPerfect: boolean
  teamRating: number
  team: { name: string; rating: number; position: string }[]
}

export type DailyRecord = {
  date: string
  leagueId: LeagueId
  won: number
  drawn: number
  lost: number
  points: number
  trophyWon: boolean
  isPerfect: boolean
  finalPosition?: number
  eliminated?: boolean
  eliminatedAt?: string
  results: ('W' | 'D' | 'L')[]
  team?: { name: string; rating: number }[]
}

export type LeagueStats = {
  seasonsPlayed: number
  trophies: number
  invincibles: number
  bestPoints: number
  bestFinish: number | null // leagues: best (lowest) final position; tournaments: 1 if ever won
  bestTeam: HallOfFameEntry | null // best XI drafted in this competition, by points
}

export type StoredState = {
  career: CareerStats
  streak: { current: number; best: number; lastDate: string | null }
  hallOfFame: HallOfFameEntry[]
  daily: Record<string, DailyRecord>
  leagues: Partial<Record<LeagueId, LeagueStats>>
  achievements: Record<string, string> // achievementId -> ISO date unlocked
}

const DEFAULT_STATE: StoredState = {
  career: {
    seasonsPlayed: 0,
    trophies: 0,
    invincibles: 0,
    perfectSeasons: 0,
    bestPoints: 0,
    bestPointsLeague: null,
    totalWon: 0,
    totalDrawn: 0,
    totalLost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  },
  streak: { current: 0, best: 0, lastDate: null },
  hallOfFame: [],
  daily: {},
  leagues: {},
  achievements: {},
}

export function loadState(): StoredState {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_STATE)
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_STATE)
    const parsed = JSON.parse(raw) as Partial<StoredState>
    return {
      career: { ...DEFAULT_STATE.career, ...parsed.career },
      streak: { ...DEFAULT_STATE.streak, ...parsed.streak },
      hallOfFame: Array.isArray(parsed.hallOfFame) ? parsed.hallOfFame : [],
      daily: parsed.daily && typeof parsed.daily === 'object' ? parsed.daily : {},
      leagues: parsed.leagues && typeof parsed.leagues === 'object' ? parsed.leagues : {},
      achievements: parsed.achievements && typeof parsed.achievements === 'object' ? parsed.achievements : {},
    }
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

function saveState(state: StoredState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode / quota exceeded — play on without persistence.
  }
}

// ── Season recording ─────────────────────────────────────────────────────────

export type SeasonRecordOutcome = {
  career: CareerStats
  newBestPoints: boolean
  firstTrophy: boolean
  newAchievements: Achievement[]
}

const TOURNAMENT_LEAGUES: LeagueId[] = ['ucl', 'worldcup']

export function recordSeason(
  result: SeasonResult,
  leagueId: LeagueId,
  team: DraftedPlayer[],
): SeasonRecordOutcome {
  const state = loadState()
  const points = result.won * 3 + result.drawn
  const career = state.career
  const isTournament = TOURNAMENT_LEAGUES.includes(leagueId)

  career.seasonsPlayed += 1
  const firstTrophy = result.trophyWon && career.trophies === 0
  if (result.trophyWon) career.trophies += 1
  const unbeaten = result.lost === 0 && result.matches.length > 0
  if (unbeaten) career.invincibles += 1
  if (result.isPerfect) career.perfectSeasons += 1
  career.totalWon += result.won
  career.totalDrawn += result.drawn
  career.totalLost += result.lost
  career.goalsFor += result.goalsFor
  career.goalsAgainst += result.goalsAgainst
  const newBestPoints = points > career.bestPoints
  if (newBestPoints) {
    career.bestPoints = points
    career.bestPointsLeague = leagueId
  }

  const entry: HallOfFameEntry = {
    date: getTodayKey(),
    leagueId,
    points,
    trophyWon: result.trophyWon,
    isPerfect: result.isPerfect,
    teamRating: result.teamRating,
    team: team.map(p => ({ name: p.name, rating: p.rating, position: p.position })),
  }
  state.hallOfFame = [...state.hallOfFame, entry]
    .sort((a, b) => b.points - a.points || Number(b.trophyWon) - Number(a.trophyWon))
    .slice(0, 3)

  // Per-league stats
  const ls: LeagueStats = state.leagues[leagueId] ?? {
    seasonsPlayed: 0, trophies: 0, invincibles: 0, bestPoints: 0, bestFinish: null, bestTeam: null,
  }
  ls.seasonsPlayed += 1
  if (result.trophyWon) ls.trophies += 1
  if (unbeaten) ls.invincibles += 1
  if (!ls.bestTeam || points > ls.bestTeam.points) ls.bestTeam = entry
  ls.bestPoints = Math.max(ls.bestPoints, points)
  if (!isTournament && result.finalPosition !== undefined) {
    ls.bestFinish = ls.bestFinish === null ? result.finalPosition : Math.min(ls.bestFinish, result.finalPosition)
  } else if (isTournament && result.trophyWon) {
    ls.bestFinish = 1
  }
  state.leagues[leagueId] = ls

  // Achievements — evaluate against post-update cumulative state
  const leaguesPlayed = Object.values(state.leagues).filter(l => l && l.seasonsPlayed > 0).length
  const leaguesWon = Object.values(state.leagues).filter(l => l && l.trophies > 0).length
  const ctx = {
    format: (isTournament ? 'tournament' : 'league') as 'tournament' | 'league',
    won: result.won, drawn: result.drawn, lost: result.lost, points,
    goalsFor: result.goalsFor, goalsAgainst: result.goalsAgainst,
    trophyWon: result.trophyWon, isPerfect: result.isPerfect, eliminated: result.eliminated,
    finalPosition: result.finalPosition, teamRating: result.teamRating,
    topScorerGoals: result.topScorers[0]?.goals ?? 0,
    perfectDraft: computeDraftReview(team, leagueId).isPerfect,
    totalSeasons: career.seasonsPlayed, totalTrophies: career.trophies,
    totalInvincibles: career.invincibles, leaguesPlayed, leaguesWon,
    dailyStreak: state.streak.best,
  }
  const satisfied = evaluateAchievements(ctx)
  const today = getTodayKey()
  const newAchievements: Achievement[] = []
  for (const id of satisfied) {
    if (!state.achievements[id]) {
      state.achievements[id] = today
      const a = getAchievement(id)
      if (a) newAchievements.push(a)
    }
  }

  saveState(state)
  return { career: { ...career }, newBestPoints, firstTrophy, newAchievements }
}

export function getLeagueStats(): Partial<Record<LeagueId, LeagueStats>> {
  return loadState().leagues
}

export function getUnlockedAchievements(): Record<string, string> {
  return loadState().achievements
}

// One read for everything the profile / trophy-cabinet screen needs.
export function getProfile(): Pick<StoredState, 'career' | 'streak' | 'leagues' | 'achievements' | 'hallOfFame'> {
  const s = loadState()
  return { career: s.career, streak: s.streak, leagues: s.leagues, achievements: s.achievements, hallOfFame: s.hallOfFame }
}

// ── Daily challenge ──────────────────────────────────────────────────────────

// Challenge #1 corresponds to this UTC date.
const DAILY_EPOCH = Date.UTC(2026, 5, 12) // 2026-06-12

export const DAILY_LEAGUE_ORDER: LeagueId[] = ['pl', 'laliga', 'seriea', 'ucl', 'worldcup']

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

// Deterministic 32-bit hash of the date key — used to seed spins and the sim
// so every player gets the same challenge on the same day.
export function dateSeed(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Same LCG as lib/simulation.ts so daily spins share its statistical behavior.
export function seededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function getDailyChallengeNumber(key: string = getTodayKey()): number {
  const [y, m, d] = key.split('-').map(Number)
  const days = Math.round((Date.UTC(y, m - 1, d) - DAILY_EPOCH) / 86400000)
  return Math.max(1, days + 1)
}

export function getDailyLeague(key: string = getTodayKey()): LeagueId {
  return DAILY_LEAGUE_ORDER[(getDailyChallengeNumber(key) - 1) % DAILY_LEAGUE_ORDER.length]
}

export function getDailyRecord(key: string = getTodayKey()): DailyRecord | null {
  return loadState().daily[key] ?? null
}

export function getStreak(): StoredState['streak'] {
  return loadState().streak
}

export function getCareer(): CareerStats {
  return loadState().career
}

function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) - 86400000).toISOString().slice(0, 10)
}

// Records today's daily result and advances the streak. Returns the updated
// streak so the results screen can show it immediately.
export function recordDaily(record: DailyRecord): StoredState['streak'] {
  const state = loadState()
  if (state.daily[record.date]) return state.streak // already played — keep first result

  state.daily[record.date] = record
  const { streak } = state
  streak.current = streak.lastDate === previousDayKey(record.date) ? streak.current + 1 : 1
  streak.best = Math.max(streak.best, streak.current)
  streak.lastDate = record.date

  saveState(state)
  return { ...streak }
}
