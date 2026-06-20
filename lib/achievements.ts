import type { LeagueId } from './types'

export type AchievementCategory = 'Performance' | 'Mastery' | 'Drafting' | 'Dedication'

export type Achievement = {
  id: string
  name: string
  description: string
  emoji: string
  category: AchievementCategory
}

// Everything a predicate needs to decide if an achievement is earned this
// season. Cumulative fields reflect state AFTER this season is recorded.
export type AchievementCtx = {
  // This season
  leagueId: LeagueId
  format: 'league' | 'tournament'
  won: number
  drawn: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  trophyWon: boolean
  isPerfect: boolean
  eliminated: boolean
  finalPosition?: number
  teamRating: number
  topScorerGoals: number
  perfectDraft: boolean
  longestUnbeatenRun: number
  // Cumulative (post-update)
  totalSeasons: number
  totalTrophies: number
  totalInvincibles: number
  leaguesPlayed: number
  leaguesWon: number
  dailyStreak: number
}

type Def = Achievement & { check: (c: AchievementCtx) => boolean }

// Master catalogue. Order here is the display order in the trophy cabinet.
const DEFS: Def[] = [
  // ── Performance ──
  { id: 'first-blood', name: 'Kickoff', emoji: '⚽', category: 'Performance',
    description: 'Play your first season.', check: c => c.totalSeasons >= 1 },
  { id: 'champion', name: 'Champion', emoji: '🥇', category: 'Performance',
    description: 'Win a league or lift a trophy.', check: c => c.trophyWon },
  { id: 'invincible', name: 'Invincible', emoji: '🛡️', category: 'Performance',
    description: 'Finish a full league season unbeaten.', check: c => c.format === 'league' && c.lost === 0 && (c.won + c.drawn + c.lost) > 0 },
  { id: 'unbeaten-champion', name: 'Untouchable Champion', emoji: '🏵️', category: 'Performance',
    description: 'Win a knockout trophy (Champions League or World Cup) without losing a match.', check: c => c.format === 'tournament' && c.trophyWon && c.lost === 0 },
  { id: 'unbeaten-run', name: 'On a Tear', emoji: '🚂', category: 'Performance',
    description: 'String together a 25-match unbeaten run.', check: c => c.longestUnbeatenRun >= 25 },
  { id: 'perfect', name: 'Immortal', emoji: '👑', category: 'Performance',
    description: 'Sweep a knockout — win the Champions League or World Cup winning every single match.',
    check: c => c.format === 'tournament' && c.isPerfect },
  { id: 'perfect-league', name: 'Perfect Season', emoji: '💎', category: 'Performance',
    description: 'The holy grail — win 34+ of a league season with zero defeats. Believed impossible… for now.',
    check: c => c.format === 'league' && c.lost === 0 && c.won >= 34 },
  { id: 'wc2026-champion', name: 'World Champions 2026', emoji: '🌎', category: 'Performance',
    description: 'Win the World Cup 2026 live event.', check: c => c.leagueId === 'worldcup2026' && c.trophyWon },
  { id: 'centurion', name: 'Centurion', emoji: '💯', category: 'Performance',
    description: 'Reach 100 points in a league season.', check: c => c.format === 'league' && c.points >= 100 },
  { id: 'goal-machine', name: 'Goal Machine', emoji: '🎯', category: 'Performance',
    description: 'Score 100 goals in a season.', check: c => c.goalsFor >= 100 },
  { id: 'fortress', name: 'Fortress', emoji: '🧱', category: 'Performance',
    description: 'Concede 20 or fewer in a league season.', check: c => c.format === 'league' && c.goalsAgainst <= 20 && (c.won + c.drawn + c.lost) >= 38 },
  { id: 'golden-boot', name: 'Golden Boot', emoji: '👟', category: 'Performance',
    description: 'Have a player score 25+ in one season.', check: c => c.topScorerGoals >= 25 },

  // ── Mastery ──
  { id: 'globetrotter', name: 'Globetrotter', emoji: '🌍', category: 'Mastery',
    description: 'Play a season in all 5 competitions.', check: c => c.leaguesPlayed >= 5 },
  { id: 'conqueror', name: 'Conqueror', emoji: '🗺️', category: 'Mastery',
    description: 'Win a trophy in 3 different competitions.', check: c => c.leaguesWon >= 3 },
  { id: 'treble', name: 'Serial Winner', emoji: '🏆', category: 'Mastery',
    description: 'Win 5 trophies in total.', check: c => c.totalTrophies >= 5 },
  { id: 'dynasty', name: 'Dynasty', emoji: '👑', category: 'Mastery',
    description: 'Win 10 trophies in total.', check: c => c.totalTrophies >= 10 },
  { id: 'untouchable', name: 'Untouchable', emoji: '🔱', category: 'Mastery',
    description: 'Go unbeaten 3 times.', check: c => c.totalInvincibles >= 3 },

  // ── Drafting ──
  { id: 'perfect-draft', name: 'Perfect Draft', emoji: '🧠', category: 'Drafting',
    description: 'Draft the best available player for every slot.', check: c => c.perfectDraft },
  { id: 'galacticos', name: 'Galácticos', emoji: '✨', category: 'Drafting',
    description: 'Build a squad rated 90 or higher.', check: c => c.teamRating >= 90 },
  { id: 'underdog', name: 'Underdog Story', emoji: '🐕', category: 'Drafting',
    description: 'Win a trophy with a squad rated under 84.', check: c => c.trophyWon && c.teamRating < 84 },

  // ── Dedication ──
  { id: 'regular', name: 'Regular', emoji: '📅', category: 'Dedication',
    description: 'Play 10 seasons.', check: c => c.totalSeasons >= 10 },
  { id: 'veteran', name: 'Veteran', emoji: '🎖️', category: 'Dedication',
    description: 'Play 50 seasons.', check: c => c.totalSeasons >= 50 },
  { id: 'streak-week', name: 'Daily Devotee', emoji: '🔥', category: 'Dedication',
    description: 'Reach a 7-day daily-challenge streak.', check: c => c.dailyStreak >= 7 },
  { id: 'streak-month', name: 'Unbroken', emoji: '⚡', category: 'Dedication',
    description: 'Reach a 30-day daily-challenge streak.', check: c => c.dailyStreak >= 30 },
]

export const ACHIEVEMENTS: Achievement[] = DEFS.map(({ check, ...a }) => a)

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = ['Performance', 'Mastery', 'Drafting', 'Dedication']

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id)
}

// Returns the ids of every achievement currently satisfied by the context.
// The caller diffs against already-unlocked ids to find what's newly earned.
export function evaluateAchievements(ctx: AchievementCtx): string[] {
  return DEFS.filter(d => d.check(ctx)).map(d => d.id)
}
