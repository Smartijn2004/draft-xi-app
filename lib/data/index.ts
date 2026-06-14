import type { ClubSeason, LeagueConfig, LeagueId } from '../types'
import { premierLeagueData } from './premier-league'
import { laLigaData } from './la-liga'
import { serieAData } from './serie-a'
import { championsLeagueData } from './champions-league'
import { worldCupData } from './world-cup'

export const ALL_CLUB_SEASONS: ClubSeason[] = [
  ...premierLeagueData,
  ...laLigaData,
  ...serieAData,
  ...championsLeagueData,
  ...worldCupData,
]

export const LEAGUE_DATA: Record<LeagueId, ClubSeason[]> = {
  pl: premierLeagueData,
  laliga: laLigaData,
  seriea: serieAData,
  ucl: championsLeagueData,
  worldcup: worldCupData,
  // Legends mode drafts from every era and competition at once.
  legends: ALL_CLUB_SEASONS,
}

export const LEAGUE_CONFIGS: Record<LeagueId, LeagueConfig> = {
  pl: {
    id: 'pl',
    name: 'Premier League',
    shortName: 'PL',
    color: '#10b981',
    bgColor: '#0d1f0a',
    borderColor: 'border-emerald-500/30',
    accentClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500',
    description: 'Build the ultimate English top-flight XI from legends spanning 1992 to today.',
    format: 'league',
    totalGames: 38,
    perfectLabel: '38-0-0',
    goalLabel: 'Win the league unbeaten',
    clubs: 34,
    seasons: '1992–2025',
    tagline: 'Can you win all 38?',
  },
  laliga: {
    id: 'laliga',
    name: 'La Liga',
    shortName: 'LL',
    color: '#ef4444',
    bgColor: '#1a0505',
    borderColor: 'border-red-500/30',
    accentClass: 'text-red-400',
    bgClass: 'bg-red-500',
    description: 'Draft Spanish football royalty — from Ronaldinho to Bellingham — and conquer La Liga.',
    format: 'league',
    totalGames: 38,
    perfectLabel: '38-0-0',
    goalLabel: 'Win La Liga unbeaten',
    clubs: 28,
    seasons: '1999–2025',
    tagline: 'Can you win all 38?',
  },
  seriea: {
    id: 'seriea',
    name: 'Serie A',
    shortName: 'SA',
    color: '#3b82f6',
    bgColor: '#030814',
    borderColor: 'border-blue-500/30',
    accentClass: 'text-blue-400',
    bgClass: 'bg-blue-500',
    description: 'Pick from Italian football\'s finest — Totti, Del Piero, Buffon, Maldini — and dominate Serie A.',
    format: 'league',
    totalGames: 38,
    perfectLabel: '38-0-0',
    goalLabel: 'Win Serie A unbeaten',
    clubs: 25,
    seasons: '1986–2025',
    tagline: 'Can you win all 38?',
  },
  ucl: {
    id: 'ucl',
    name: 'Champions League',
    shortName: 'UCL',
    color: '#f59e0b',
    bgColor: '#07101f',
    borderColor: 'border-amber-500/30',
    accentClass: 'text-amber-400',
    bgClass: 'bg-amber-500',
    description: 'Build the ultimate European XI and conquer the Champions League without losing a single game.',
    format: 'tournament',
    totalGames: 10,
    perfectLabel: '10-0',
    goalLabel: 'Lift the trophy unbeaten',
    clubs: 22,
    seasons: '1994–2025',
    tagline: 'Can you go all the way unbeaten?',
    groupStageGames: 3,
    knockoutRounds: ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final'],
  },
  worldcup: {
    id: 'worldcup',
    name: 'World Cup',
    shortName: 'WC',
    color: '#eab308',
    bgColor: '#06091a',
    borderColor: 'border-yellow-500/30',
    accentClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500',
    description: 'Assemble a dream national XI from World Cup legends and go 7 games unbeaten to lift the trophy.',
    format: 'tournament',
    totalGames: 7,
    perfectLabel: '7-0',
    goalLabel: 'Win the World Cup unbeaten',
    clubs: 21,
    seasons: '1966–2022',
    tagline: 'Can you win the World Cup?',
    groupStageGames: 3,
    knockoutRounds: ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final'],
  },
  legends: {
    id: 'legends',
    name: 'Legends League',
    shortName: 'LGN',
    color: '#a855f7',
    bgColor: '#120a1f',
    borderColor: 'border-purple-500/30',
    accentClass: 'text-purple-400',
    bgClass: 'bg-purple-500',
    description: 'Draft from every era and beat a league of the greatest XIs ever assembled.',
    format: 'league',
    totalGames: 38,
    perfectLabel: '38-0-0',
    goalLabel: 'Beat the legends unbeaten',
    clubs: 157,
    seasons: 'All eras',
    tagline: 'Can you beat the legends?',
  },
}

export function getClubSeasonsForLeague(leagueId: LeagueId): ClubSeason[] {
  return LEAGUE_DATA[leagueId] ?? []
}

export function spinClubSeason(leagueId: LeagueId, usedIds: string[]): ClubSeason | null {
  const all = getClubSeasonsForLeague(leagueId)
  const available = all.filter(cs => !usedIds.includes(cs.id))
  if (available.length === 0) return all[Math.floor(Math.random() * all.length)]
  return available[Math.floor(Math.random() * available.length)]
}
