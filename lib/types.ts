export type LeagueId = 'pl' | 'laliga' | 'seriea' | 'ucl' | 'worldcup' | 'legends' | 'worldcup2026'
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'
export type Format = 'league' | 'tournament'

export type Player = {
  id: string
  name: string
  position: Position
  // Specific slot positions this player can fill (e.g. ['ST'], ['CM','DM'], ['LB','CB']).
  // If absent, any slot matching the broad `position` is valid (backward-compatible).
  altPositions?: string[]
  rating: number
  club: string
  season: string
  nationality?: string
}

export type ClubSeason = {
  id: string
  club: string
  shortName: string
  season: string
  league: LeagueId
  color: string
  players: Player[]
}

export type LeagueConfig = {
  id: LeagueId
  name: string
  shortName: string
  color: string
  bgColor: string
  borderColor: string
  accentClass: string
  bgClass: string
  description: string
  format: Format
  totalGames: number
  perfectLabel: string
  goalLabel: string
  clubs: number
  seasons: string
  tagline: string
  groupStageGames?: number
  knockoutRounds?: string[]
}

export type DraftedPlayer = Player & {
  slotPosition: Position
  slotIndex: number
  slotLabel: string
}

export type Formation = {
  name: string
  slots: { position: Position; label: string }[]
}

export type GoalEvent = {
  minute: number
  scorer: string
  assist?: string
}

export type MatchResult = {
  opponent: string
  opponentRating: number
  result: 'W' | 'D' | 'L'
  myGoals: number
  oppGoals: number
  scorers: GoalEvent[]
  opponentScorers: GoalEvent[]
  matchLabel?: string
  round?: string
}

export type GroupStanding = {
  team: string
  rating: number
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
  isPlayer: boolean
}

export type PlayerStat = {
  name: string
  goals: number
  assists: number
}

export type LeagueTableEntry = {
  position: number
  team: string
  isPlayer: boolean
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
}

export type Difficulty = 'easy' | 'normal' | 'hard'
export type Tactic = 'attacking' | 'balanced' | 'defensive'

export type SeasonResult = {
  matches: MatchResult[]
  points: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  isPerfect: boolean
  eliminated: boolean
  eliminatedAt?: string
  trophyWon: boolean
  teamRating: number
  groupStandings?: GroupStanding[][]
  finalPosition?: number
  topScorers: PlayerStat[]
  playerOfSeason: PlayerStat | null
  achievements: string[]
  leagueTable?: LeagueTableEntry[]
}

export type GameState = {
  leagueId: LeagueId
  phase: 'draft' | 'simulate' | 'results'
  currentSpin: ClubSeason | null
  team: DraftedPlayer[]
  formation: string
  hardMode: boolean
  seasonResult: SeasonResult | null
  usedSpins: string[]
  spinCount: number
}

export const FORMATION_DESCRIPTIONS: Record<string, string> = {
  '4-3-3': 'Three attackers, wide press',
  '4-4-2': 'Classic balance, twin strikers',
  '4-2-3-1': 'Defensive shield, lone striker',
  '3-5-2': 'Wing-back width, twin strikers',
  '4-5-1': 'Midfield dominance, lone striker',
  '3-4-3': 'Total attack, three forwards',
  '5-4-1': 'Defensive fortress, counter-attack',
}

export const FORMATIONS: Record<string, Formation> = {
  '4-3-3': {
    name: '4-3-3',
    slots: [
      { position: 'GK', label: 'GK' },
      { position: 'DEF', label: 'LB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'RB' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'CM' },
      { position: 'FWD', label: 'LW' },
      { position: 'FWD', label: 'ST' },
      { position: 'FWD', label: 'RW' },
    ],
  },
  '4-4-2': {
    name: '4-4-2',
    slots: [
      { position: 'GK', label: 'GK' },
      { position: 'DEF', label: 'LB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'RB' },
      { position: 'MID', label: 'LM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'RM' },
      { position: 'FWD', label: 'ST' },
      { position: 'FWD', label: 'ST' },
    ],
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    slots: [
      { position: 'GK', label: 'GK' },
      { position: 'DEF', label: 'LB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'RB' },
      { position: 'MID', label: 'DM' },
      { position: 'MID', label: 'DM' },
      { position: 'MID', label: 'LM' },
      { position: 'MID', label: 'AM' },
      { position: 'MID', label: 'RM' },
      { position: 'FWD', label: 'ST' },
    ],
  },
  '3-5-2': {
    name: '3-5-2',
    slots: [
      { position: 'GK', label: 'GK' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'MID', label: 'LWB' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'RWB' },
      { position: 'FWD', label: 'ST' },
      { position: 'FWD', label: 'ST' },
    ],
  },
  '4-5-1': {
    name: '4-5-1',
    slots: [
      { position: 'GK', label: 'GK' },
      { position: 'DEF', label: 'LB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'RB' },
      { position: 'MID', label: 'LM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'RM' },
      { position: 'FWD', label: 'ST' },
    ],
  },
  '3-4-3': {
    name: '3-4-3',
    slots: [
      { position: 'GK', label: 'GK' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'MID', label: 'LM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'RM' },
      { position: 'FWD', label: 'LW' },
      { position: 'FWD', label: 'ST' },
      { position: 'FWD', label: 'RW' },
    ],
  },
  '5-4-1': {
    name: '5-4-1',
    slots: [
      { position: 'GK', label: 'GK' },
      { position: 'DEF', label: 'LWB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'CB' },
      { position: 'DEF', label: 'RWB' },
      { position: 'MID', label: 'LM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'CM' },
      { position: 'MID', label: 'RM' },
      { position: 'FWD', label: 'ST' },
    ],
  },
}
