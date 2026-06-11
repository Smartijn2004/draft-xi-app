import type {
  DraftedPlayer, LeagueId, MatchResult, SeasonResult, GroupStanding, GoalEvent, PlayerStat, Position, LeagueTableEntry
} from './types'

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function calcTeamRating(players: DraftedPlayer[]): number {
  if (players.length === 0) return 70
  const weights: Record<string, number> = { GK: 0.9, DEF: 1.0, MID: 1.05, FWD: 1.1 }
  const total = players.reduce((s, p) => s + p.rating * (weights[p.position] ?? 1), 0)
  return total / players.length
}

function poissonSample(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do { k++; p *= rng() } while (p > L)
  return k - 1
}

// Weights for picking goal scorers by position
const SCORER_WEIGHTS: Record<Position, number> = {
  GK: 0, DEF: 0.3, MID: 1.5, FWD: 4.0
}
// Weights for picking assist providers by position
const ASSIST_WEIGHTS: Record<Position, number> = {
  GK: 0, DEF: 0.5, MID: 2.5, FWD: 2.0
}

// Generic opponent scorer names pool
const OPP_SCORER_NAMES = [
  'Silva', 'Martinez', 'Garcia', 'Fernandez', 'Müller', 'Kane', 'Salah', 'Benzema',
  'Lewandowski', 'De Bruyne', 'Mané', 'Son', 'Firmino', 'Sterling', 'Vardy',
  'Werner', 'Havertz', 'Grealish', 'Rashford', 'Bruno', 'Mount', 'Saka',
  'Bellingham', 'Gnabry', 'Sancho', 'Diallo', 'Osimhen', 'Vlahovic', 'Lautaro',
  'Giroud', 'Morata', 'Aubameyang', 'Lacazette', 'Cavani', 'Suárez', 'Falcao',
]

function pickScorer(
  players: DraftedPlayer[],
  weights: Record<Position, number>,
  rng: () => number,
  exclude?: string
): string {
  const eligible = players.filter(p => p.name !== exclude && weights[p.position as Position] > 0)
  if (eligible.length === 0) return players[0]?.name ?? 'Unknown'
  const totalW = eligible.reduce((s, p) => s + weights[p.position as Position], 0)
  if (totalW === 0) return eligible[Math.floor(rng() * eligible.length)].name
  let r = rng() * totalW
  for (const p of eligible) {
    r -= weights[p.position as Position]
    if (r <= 0) return p.name
  }
  return eligible[eligible.length - 1].name
}

function generateMyGoalEvents(
  count: number,
  players: DraftedPlayer[],
  rng: () => number
): GoalEvent[] {
  const events: GoalEvent[] = []
  for (let i = 0; i < count; i++) {
    const minute = Math.floor(90 * rng()) + 1
    const scorer = pickScorer(players, SCORER_WEIGHTS, rng)
    const assist = rng() < 0.72
      ? pickScorer(players, ASSIST_WEIGHTS, rng, scorer)
      : undefined
    events.push({ minute, scorer, assist })
  }
  return events.sort((a, b) => a.minute - b.minute)
}

function generateOppGoalEvents(count: number, rng: () => number): GoalEvent[] {
  const events: GoalEvent[] = []
  for (let i = 0; i < count; i++) {
    const minute = Math.floor(90 * rng()) + 1
    const scorer = OPP_SCORER_NAMES[Math.floor(rng() * OPP_SCORER_NAMES.length)]
    events.push({ minute, scorer })
  }
  return events.sort((a, b) => a.minute - b.minute)
}

// The player's team gets a small tactical advantage over the AI opponents.
const PLAYER_ADVANTAGE = 3

function simulateMatch(
  myRating: number,
  oppRating: number,
  rng: () => number,
  players?: DraftedPlayer[]
): { result: 'W' | 'D' | 'L'; myGoals: number; oppGoals: number; scorers: GoalEvent[]; opponentScorers: GoalEvent[] } {
  const effectiveRating = myRating + PLAYER_ADVANTAGE
  const diff = (effectiveRating - oppRating) / 9
  const rawWin = 1 / (1 + Math.exp(-diff))
  const draw = Math.max(0.05, 0.22 - Math.abs(diff) * 0.05)
  const win = Math.max(0.05, rawWin * (1 - draw))

  const r = rng()
  let result: 'W' | 'D' | 'L'
  if (r < win) result = 'W'
  else if (r < win + draw) result = 'D'
  else result = 'L'

  const effectiveDiff = effectiveRating - oppRating
  const λMy = 0.6 + effectiveDiff / 30
  const λOpp = 0.6 - effectiveDiff / 30
  let myGoals = poissonSample(Math.max(0.1, λMy), rng)
  let oppGoals = poissonSample(Math.max(0.05, λOpp), rng)

  // Reconcile goals with result
  if (result === 'W' && myGoals <= oppGoals) {
    myGoals = oppGoals + 1
  } else if (result === 'D') {
    const g = Math.max(myGoals, oppGoals)
    myGoals = g; oppGoals = g
  } else if (result === 'L' && myGoals >= oppGoals) {
    oppGoals = myGoals + 1
  }

  const scorers = players
    ? generateMyGoalEvents(myGoals, players, rng)
    : Array.from({ length: myGoals }, (_, i) => ({ minute: Math.floor(90 * rng()) + 1, scorer: 'Goal' }))
  const opponentScorers = generateOppGoalEvents(oppGoals, rng)

  return { result, myGoals, oppGoals, scorers, opponentScorers }
}

// ─── League opponents ────────────────────────────────────────────────────────

const PL_OPPONENTS = [
  { name: 'Manchester City', rating: 92 },
  { name: 'Liverpool', rating: 91 },
  { name: 'Arsenal', rating: 89 },
  { name: 'Chelsea', rating: 87 },
  { name: 'Manchester United', rating: 85 },
  { name: 'Tottenham', rating: 84 },
  { name: 'Newcastle', rating: 82 },
  { name: 'Aston Villa', rating: 81 },
  { name: 'West Ham', rating: 79 },
  { name: 'Brighton', rating: 78 },
  { name: 'Wolves', rating: 77 },
  { name: 'Everton', rating: 76 },
  { name: 'Fulham', rating: 75 },
  { name: 'Brentford', rating: 74 },
  { name: 'Crystal Palace', rating: 73 },
  { name: 'Leicester City', rating: 72 },
  { name: 'Nottm Forest', rating: 71 },
  { name: 'Burnley', rating: 70 },
  { name: 'Luton Town', rating: 69 },
]

const LALIGA_OPPONENTS = [
  { name: 'Real Madrid', rating: 94 },
  { name: 'Barcelona', rating: 92 },
  { name: 'Atletico Madrid', rating: 88 },
  { name: 'Athletic Bilbao', rating: 82 },
  { name: 'Real Sociedad', rating: 81 },
  { name: 'Villarreal', rating: 80 },
  { name: 'Sevilla', rating: 79 },
  { name: 'Valencia', rating: 78 },
  { name: 'Betis', rating: 77 },
  { name: 'Osasuna', rating: 74 },
  { name: 'Celta Vigo', rating: 73 },
  { name: 'Getafe', rating: 72 },
  { name: 'Las Palmas', rating: 71 },
  { name: 'Girona', rating: 76 },
  { name: 'Mallorca', rating: 70 },
  { name: 'Rayo Vallecano', rating: 70 },
  { name: 'Alaves', rating: 69 },
  { name: 'Cadiz', rating: 68 },
  { name: 'Granada', rating: 67 },
]

const SERIEA_OPPONENTS = [
  { name: 'Inter Milan', rating: 90 },
  { name: 'AC Milan', rating: 88 },
  { name: 'Juventus', rating: 89 },
  { name: 'Napoli', rating: 87 },
  { name: 'Roma', rating: 83 },
  { name: 'Lazio', rating: 82 },
  { name: 'Atalanta', rating: 84 },
  { name: 'Fiorentina', rating: 79 },
  { name: 'Torino', rating: 76 },
  { name: 'Bologna', rating: 77 },
  { name: 'Udinese', rating: 74 },
  { name: 'Sassuolo', rating: 73 },
  { name: 'Sampdoria', rating: 72 },
  { name: 'Empoli', rating: 71 },
  { name: 'Hellas Verona', rating: 70 },
  { name: 'Lecce', rating: 69 },
  { name: 'Monza', rating: 74 },
  { name: 'Salernitana', rating: 67 },
  { name: 'Cagliari', rating: 68 },
]

const UCL_OPPONENTS = [
  { name: 'Bayern Munich', rating: 93 },
  { name: 'PSG', rating: 90 },
  { name: 'Real Madrid', rating: 94 },
  { name: 'Barcelona', rating: 91 },
  { name: 'Manchester City', rating: 92 },
  { name: 'Liverpool', rating: 90 },
  { name: 'Chelsea', rating: 87 },
  { name: 'AC Milan', rating: 88 },
  { name: 'Inter Milan', rating: 89 },
  { name: 'Juventus', rating: 87 },
  { name: 'Atletico Madrid', rating: 87 },
  { name: 'Borussia Dortmund', rating: 86 },
  { name: 'Ajax', rating: 84 },
  { name: 'Porto', rating: 83 },
  { name: 'Benfica', rating: 82 },
  { name: 'Napoli', rating: 86 },
]

const WC_OPPONENTS = [
  { name: 'Brazil', rating: 92 },
  { name: 'Argentina', rating: 93 },
  { name: 'France', rating: 91 },
  { name: 'Germany', rating: 90 },
  { name: 'Spain', rating: 89 },
  { name: 'England', rating: 87 },
  { name: 'Italy', rating: 86 },
  { name: 'Netherlands', rating: 86 },
  { name: 'Portugal', rating: 88 },
  { name: 'Croatia', rating: 84 },
  { name: 'Uruguay', rating: 83 },
  { name: 'Belgium', rating: 85 },
  { name: 'Colombia', rating: 82 },
  { name: 'Senegal', rating: 81 },
  { name: 'Morocco', rating: 82 },
]

function getLeagueOpponents(league: LeagueId) {
  if (league === 'laliga') return LALIGA_OPPONENTS
  if (league === 'seriea') return SERIEA_OPPONENTS
  return PL_OPPONENTS
}

function shuffleOpponents<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

function buildStats(matches: MatchResult[]): { topScorers: PlayerStat[]; playerOfSeason: PlayerStat | null } {
  const map = new Map<string, PlayerStat>()
  for (const m of matches) {
    for (const e of m.scorers) {
      const s = map.get(e.scorer) ?? { name: e.scorer, goals: 0, assists: 0 }
      s.goals++
      map.set(e.scorer, s)
      if (e.assist) {
        const a = map.get(e.assist) ?? { name: e.assist, goals: 0, assists: 0 }
        a.assists++
        map.set(e.assist, a)
      }
    }
  }
  const topScorers = [...map.values()]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 5)
  return { topScorers, playerOfSeason: topScorers[0] ?? null }
}

function getAchievements(
  won: number, drawn: number, lost: number,
  goalsFor: number, goalsAgainst: number,
  trophyWon: boolean, leagueId: LeagueId
): string[] {
  const achievements: string[] = []
  if (leagueId === 'pl' || leagueId === 'laliga' || leagueId === 'seriea') {
    if (won === 38 && drawn === 0) achievements.push('PERFECT SEASON')
    else if (lost === 0) achievements.push('INVINCIBLE')
    if (won * 3 + drawn >= 95) achievements.push('CHAMPIONS')
    else if (won * 3 + drawn >= 79) achievements.push('TOP 4')
    if (goalsFor >= 100) achievements.push('100 GOALS')
    if (goalsAgainst <= 20) achievements.push('FORTRESS DEFENCE')
    if (won * 3 + drawn < 30) achievements.push('RELEGATION BATTLE')
  } else {
    if (trophyWon && lost === 0 && drawn === 0) achievements.push('PERFECT RUN')
    if (trophyWon) achievements.push('TROPHY WINNERS')
    else if (lost === 0) achievements.push('UNBEATEN')
  }
  return achievements
}

function simulateMatchWithScore(
  ratingA: number, ratingB: number, rng: () => number
): { result: 'W' | 'D' | 'L'; goalsA: number; goalsB: number } {
  const diff = (ratingA - ratingB) / 9
  const rawWin = 1 / (1 + Math.exp(-diff))
  const draw = Math.max(0.05, 0.22 - Math.abs(diff) * 0.05)
  const win = Math.max(0.05, rawWin * (1 - draw))
  const r = rng()
  const result: 'W' | 'D' | 'L' = r < win ? 'W' : r < win + draw ? 'D' : 'L'
  let goalsA = poissonSample(Math.max(0.1, 0.6 + (ratingA - ratingB) / 30), rng)
  let goalsB = poissonSample(Math.max(0.05, 0.6 - (ratingA - ratingB) / 30), rng)
  if (result === 'W' && goalsA <= goalsB) goalsA = goalsB + 1
  else if (result === 'D') { const g = Math.max(goalsA, goalsB); goalsA = g; goalsB = g }
  else if (result === 'L' && goalsA >= goalsB) goalsB = goalsA + 1
  return { result, goalsA, goalsB }
}

function buildLeagueTable(
  playerMatches: MatchResult[],
  opponents: { name: string; rating: number }[],
  rng: () => number
): LeagueTableEntry[] {
  type Row = { team: string; isPlayer: boolean; played: number; won: number; drawn: number; lost: number; gf: number; ga: number }
  const rows = new Map<string, Row>()
  rows.set('Your XI', { team: 'Your XI', isPlayer: true, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 })
  for (const opp of opponents) {
    rows.set(opp.name, { team: opp.name, isPlayer: false, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 })
  }

  // Apply player's match results
  for (const m of playerMatches) {
    const pr = rows.get('Your XI')!
    const or = rows.get(m.opponent)
    if (!or) continue
    pr.played++; or.played++
    pr.gf += m.myGoals; pr.ga += m.oppGoals
    or.gf += m.oppGoals; or.ga += m.myGoals
    if (m.result === 'W') { pr.won++; or.lost++ }
    else if (m.result === 'D') { pr.drawn++; or.drawn++ }
    else { pr.lost++; or.won++ }
  }

  // Simulate all opponent H2H fixtures (home + away)
  for (let i = 0; i < opponents.length; i++) {
    for (let j = i + 1; j < opponents.length; j++) {
      const a = opponents[i]; const b = opponents[j]
      const rA = rows.get(a.name)!; const rB = rows.get(b.name)!
      // A hosts B
      const g1 = simulateMatchWithScore(a.rating + 2, b.rating - 2, rng)
      rA.played++; rB.played++
      rA.gf += g1.goalsA; rA.ga += g1.goalsB
      rB.gf += g1.goalsB; rB.ga += g1.goalsA
      if (g1.result === 'W') { rA.won++; rB.lost++ }
      else if (g1.result === 'D') { rA.drawn++; rB.drawn++ }
      else { rA.lost++; rB.won++ }
      // B hosts A
      const g2 = simulateMatchWithScore(b.rating + 2, a.rating - 2, rng)
      rB.played++; rA.played++
      rB.gf += g2.goalsA; rB.ga += g2.goalsB
      rA.gf += g2.goalsB; rA.ga += g2.goalsA
      if (g2.result === 'W') { rB.won++; rA.lost++ }
      else if (g2.result === 'D') { rB.drawn++; rA.drawn++ }
      else { rB.lost++; rA.won++ }
    }
  }

  return [...rows.values()]
    .map(r => ({ ...r, points: r.won * 3 + r.drawn }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return (b.gf - b.ga) - (a.gf - a.ga)
    })
    .map((r, i) => ({ ...r, position: i + 1 }))
}

// ─── Simulation functions ──────────────────────────────────────────────────

export function simulateLeagueSeason(
  players: DraftedPlayer[],
  league: LeagueId,
  seed?: number
): SeasonResult {
  const rng = seededRandom(seed ?? Math.floor(Math.random() * 1e9))
  const teamRating = calcTeamRating(players)
  const opponents = [...getLeagueOpponents(league)]

  const fixtures: { name: string; rating: number; isHome: boolean }[] = []
  opponents.forEach(opp => {
    fixtures.push({ ...opp, isHome: true })
    fixtures.push({ ...opp, isHome: false })
  })
  for (let i = fixtures.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [fixtures[i], fixtures[j]] = [fixtures[j], fixtures[i]]
  }

  const matches: MatchResult[] = fixtures.map(f => {
    const homeBonus = f.isHome ? 2 : -2
    const { result, myGoals, oppGoals, scorers, opponentScorers } =
      simulateMatch(teamRating + homeBonus, f.rating, rng, players)
    return {
      opponent: f.name,
      opponentRating: f.rating,
      result,
      myGoals,
      oppGoals,
      scorers,
      opponentScorers,
      round: f.isHome ? 'H' : 'A',
    }
  })

  const won = matches.filter(m => m.result === 'W').length
  const drawn = matches.filter(m => m.result === 'D').length
  const lost = matches.filter(m => m.result === 'L').length
  const gf = matches.reduce((s, m) => s + m.myGoals, 0)
  const ga = matches.reduce((s, m) => s + m.oppGoals, 0)
  const pts = won * 3 + drawn
  const trophyWon = pts >= 95

  const { topScorers, playerOfSeason } = buildStats(matches)
  const achievements = getAchievements(won, drawn, lost, gf, ga, trophyWon, league)
  const leagueTable = buildLeagueTable(matches, opponents, rng)

  return {
    matches, points: pts, won, drawn, lost,
    goalsFor: gf, goalsAgainst: ga,
    isPerfect: lost === 0 && drawn === 0,
    eliminated: false,
    trophyWon,
    teamRating,
    topScorers,
    playerOfSeason,
    achievements,
    leagueTable,
  }
}

function groupSimulate(
  teamRating: number,
  groupOpps: { name: string; rating: number }[],
  rng: () => number,
  matchLabelPrefix: string,
  players: DraftedPlayer[]
): { matches: MatchResult[]; standings: GroupStanding[]; advanced: boolean } {
  const standings: GroupStanding[] = [
    { team: 'Your XI', rating: teamRating, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, isPlayer: true },
    ...groupOpps.map(o => ({ team: o.name, rating: o.rating, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, isPlayer: false }))
  ]

  const matches: MatchResult[] = []

  groupOpps.forEach((opp, idx) => {
    const { result, myGoals, oppGoals, scorers, opponentScorers } =
      simulateMatch(teamRating, opp.rating, rng, players)
    matches.push({
      opponent: opp.name, opponentRating: opp.rating, result, myGoals, oppGoals,
      scorers, opponentScorers,
      matchLabel: `${matchLabelPrefix} · Match ${idx + 1}`, round: 'GS',
    })
    const st = standings.find(s => s.team === 'Your XI')!
    const oppSt = standings.find(s => s.team === opp.name)!
    st.played++; oppSt.played++
    st.gf += myGoals; st.ga += oppGoals
    oppSt.gf += oppGoals; oppSt.ga += myGoals
    if (result === 'W') { st.won++; st.points += 3; oppSt.lost++ }
    else if (result === 'D') { st.drawn++; st.points += 1; oppSt.drawn++; oppSt.points++ }
    else { st.lost++; oppSt.won++; oppSt.points += 3 }
  })

  for (let i = 0; i < groupOpps.length; i++) {
    for (let j = i + 1; j < groupOpps.length; j++) {
      const a = groupOpps[i], b = groupOpps[j]
      const { result, myGoals, oppGoals } = simulateMatch(a.rating, b.rating, rng)
      const stA = standings.find(s => s.team === a.name)!
      const stB = standings.find(s => s.team === b.name)!
      stA.played++; stB.played++
      stA.gf += myGoals; stA.ga += oppGoals
      stB.gf += oppGoals; stB.ga += myGoals
      if (result === 'W') { stA.won++; stA.points += 3; stB.lost++ }
      else if (result === 'D') { stA.drawn++; stA.points += 1; stB.drawn++; stB.points++ }
      else { stA.lost++; stB.won++; stB.points += 3 }
    }
  }

  standings.sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga))
  const advanced = standings.findIndex(s => s.isPlayer) < 2

  return { matches, standings, advanced }
}

export function simulateUCL(players: DraftedPlayer[], seed?: number): SeasonResult {
  const rng = seededRandom(seed ?? Math.floor(Math.random() * 1e9))
  const teamRating = calcTeamRating(players)
  const pool = shuffleOpponents(UCL_OPPONENTS, rng)
  const groupOpps = pool.slice(0, 3)

  const { matches: groupMatches, standings, advanced } = groupSimulate(
    teamRating, groupOpps, rng, 'Group Stage', players
  )

  const rounds = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']
  const oppPool = shuffleOpponents(pool.slice(3), rng)
  const allMatches = [...groupMatches]
  let eliminated = !advanced
  let eliminatedAt = advanced ? '' : 'Group Stage'

  if (advanced) {
    rounds.forEach((round, i) => {
      if (eliminated) return
      const opp = oppPool[i] ?? { name: 'Unknown Opponent', rating: 85 + i * 2 }
      const bonus = i * 1.5
      const { result, myGoals, oppGoals, scorers, opponentScorers } =
        simulateMatch(teamRating, opp.rating + bonus, rng, players)
      allMatches.push({ opponent: opp.name, opponentRating: opp.rating, result, myGoals, oppGoals, scorers, opponentScorers, round })
      if (result !== 'W') { eliminated = true; eliminatedAt = round }
    })
  }

  const won = allMatches.filter(m => m.result === 'W').length
  const drawn = allMatches.filter(m => m.result === 'D').length
  const lost = allMatches.filter(m => m.result === 'L').length
  const gf = allMatches.reduce((s, m) => s + m.myGoals, 0)
  const ga = allMatches.reduce((s, m) => s + m.oppGoals, 0)
  const trophyWon = !eliminated

  const { topScorers, playerOfSeason } = buildStats(allMatches)
  const achievements = getAchievements(won, drawn, lost, gf, ga, trophyWon, 'ucl')

  return {
    matches: allMatches, points: won * 3 + drawn, won, drawn, lost,
    goalsFor: gf, goalsAgainst: ga,
    isPerfect: lost === 0 && drawn === 0,
    eliminated, eliminatedAt, trophyWon, teamRating,
    groupStandings: [standings],
    topScorers, playerOfSeason, achievements,
  }
}

export function simulateWorldCup(players: DraftedPlayer[], seed?: number): SeasonResult {
  const rng = seededRandom(seed ?? Math.floor(Math.random() * 1e9))
  const teamRating = calcTeamRating(players)
  const pool = shuffleOpponents(WC_OPPONENTS, rng)
  const groupOpps = pool.slice(0, 3)

  const { matches: groupMatches, standings, advanced } = groupSimulate(
    teamRating, groupOpps, rng, 'Group Stage', players
  )

  const rounds = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']
  const oppPool = shuffleOpponents(pool.slice(3), rng)
  const allMatches = [...groupMatches]
  let eliminated = !advanced
  let eliminatedAt = advanced ? '' : 'Group Stage'

  if (advanced) {
    rounds.forEach((round, i) => {
      if (eliminated) return
      const opp = oppPool[i] ?? { name: 'Unknown', rating: 83 + i * 2 }
      const { result, myGoals, oppGoals, scorers, opponentScorers } =
        simulateMatch(teamRating, opp.rating + i * 2, rng, players)
      allMatches.push({ opponent: opp.name, opponentRating: opp.rating, result, myGoals, oppGoals, scorers, opponentScorers, round })
      if (result === 'L') { eliminated = true; eliminatedAt = round }
    })
  }

  const won = allMatches.filter(m => m.result === 'W').length
  const drawn = allMatches.filter(m => m.result === 'D').length
  const lost = allMatches.filter(m => m.result === 'L').length
  const gf = allMatches.reduce((s, m) => s + m.myGoals, 0)
  const ga = allMatches.reduce((s, m) => s + m.oppGoals, 0)
  const trophyWon = !eliminated

  const { topScorers, playerOfSeason } = buildStats(allMatches)
  const achievements = getAchievements(won, drawn, lost, gf, ga, trophyWon, 'worldcup')

  return {
    matches: allMatches, points: won * 3 + drawn, won, drawn, lost,
    goalsFor: gf, goalsAgainst: ga,
    isPerfect: lost === 0 && drawn === 0,
    eliminated, eliminatedAt, trophyWon, teamRating,
    groupStandings: [standings],
    topScorers, playerOfSeason, achievements,
  }
}

export function runSimulation(players: DraftedPlayer[], leagueId: LeagueId, seed?: number): SeasonResult {
  if (leagueId === 'ucl') return simulateUCL(players, seed)
  if (leagueId === 'worldcup') return simulateWorldCup(players, seed)
  return simulateLeagueSeason(players, leagueId, seed)
}
