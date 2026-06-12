// Optimal-team simulation — mirrors simulation.ts math exactly
// Run with: node scripts/optimal-test.mjs

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function poissonSample(lambda, rng) {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= rng() } while (p > L)
  return k - 1
}

function simulateMatch(myRating, oppRating, rng) {
  const effectiveRating = myRating + 3 // PLAYER_ADVANTAGE
  const diff = (effectiveRating - oppRating) / 9
  const rawWin = 1 / (1 + Math.exp(-diff))
  const draw = Math.max(0.05, 0.22 - Math.abs(diff) * 0.05)
  const win = Math.max(0.05, rawWin * (1 - draw))
  const r = rng()
  const result = r < win ? 'W' : r < win + draw ? 'D' : 'L'
  let myGoals = poissonSample(Math.max(0.1, 0.6 + (effectiveRating - oppRating) / 30), rng)
  let oppGoals = poissonSample(Math.max(0.05, 0.6 - (effectiveRating - oppRating) / 30), rng)
  if (result === 'W' && myGoals <= oppGoals) myGoals = oppGoals + 1
  else if (result === 'D') { const g = Math.max(myGoals, oppGoals); myGoals = g; oppGoals = g }
  else if (result === 'L' && myGoals >= oppGoals) oppGoals = myGoals + 1
  return { result, myGoals, oppGoals }
}

function simulateMatchAI(ratingA, ratingB, rng) {
  const diff = (ratingA - ratingB) / 9
  const rawWin = 1 / (1 + Math.exp(-diff))
  const draw = Math.max(0.05, 0.22 - Math.abs(diff) * 0.05)
  const win = Math.max(0.05, rawWin * (1 - draw))
  const r = rng()
  const result = r < win ? 'W' : r < win + draw ? 'D' : 'L'
  let goalsA = poissonSample(Math.max(0.1, 0.6 + (ratingA - ratingB) / 30), rng)
  let goalsB = poissonSample(Math.max(0.05, 0.6 - (ratingA - ratingB) / 30), rng)
  if (result === 'W' && goalsA <= goalsB) goalsA = goalsB + 1
  else if (result === 'D') { const g = Math.max(goalsA, goalsB); goalsA = g; goalsB = g }
  else if (result === 'L' && goalsA >= goalsB) goalsB = goalsA + 1
  return { result, goalsA, goalsB }
}

// PL opponents (from simulation.ts)
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

function buildLeagueTable(playerMatches, opponents, rng) {
  const rows = new Map()
  rows.set('Your XI', { team: 'Your XI', isPlayer: true, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 })
  for (const opp of opponents) {
    rows.set(opp.name, { team: opp.name, isPlayer: false, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 })
  }
  for (const m of playerMatches) {
    const pr = rows.get('Your XI')
    const or = rows.get(m.opponent)
    if (!or) continue
    pr.played++; or.played++
    pr.gf += m.myGoals; pr.ga += m.oppGoals
    or.gf += m.oppGoals; or.ga += m.myGoals
    if (m.result === 'W') { pr.won++; or.lost++ }
    else if (m.result === 'D') { pr.drawn++; or.drawn++ }
    else { pr.lost++; or.won++ }
  }
  for (let i = 0; i < opponents.length; i++) {
    for (let j = i + 1; j < opponents.length; j++) {
      const a = opponents[i], b = opponents[j]
      const rA = rows.get(a.name), rB = rows.get(b.name)
      const g1 = simulateMatchAI(a.rating + 2, b.rating - 2, rng)
      rA.played++; rB.played++
      rA.gf += g1.goalsA; rA.ga += g1.goalsB
      rB.gf += g1.goalsB; rB.ga += g1.goalsA
      if (g1.result === 'W') { rA.won++; rB.lost++ }
      else if (g1.result === 'D') { rA.drawn++; rB.drawn++ }
      else { rA.lost++; rB.won++ }
      const g2 = simulateMatchAI(b.rating + 2, a.rating - 2, rng)
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
    .sort((a, b) => b.points !== a.points ? b.points - a.points : (b.gf - b.ga) - (a.gf - a.ga))
    .map((r, i) => ({ ...r, position: i + 1 }))
}

// calcTeamRating from simulation.ts
function calcTeamRating(players) {
  if (players.length === 0) return 70
  const weights = { GK: 0.9, DEF: 1.0, MID: 1.05, FWD: 1.1 }
  const total = players.reduce((s, p) => s + p.rating * (weights[p.position] ?? 1), 0)
  return total / players.length
}

// ── Three teams to test ─────────────────────────────────────────────────────

// "Absolute best" — cherry-picked from all PL data
const DREAM_TEAM = [
  { name: 'Peter Schmeichel', position: 'GK', rating: 91 },
  { name: 'Trent Alexander-Arnold', position: 'DEF', rating: 90 },
  { name: 'Jaap Stam', position: 'DEF', rating: 91 },
  { name: 'Rio Ferdinand', position: 'DEF', rating: 91 },
  { name: 'Andrew Robertson', position: 'DEF', rating: 89 },
  { name: 'Roy Keane', position: 'MID', rating: 94 },
  { name: 'Kevin De Bruyne', position: 'MID', rating: 94 },
  { name: 'Steven Gerrard', position: 'MID', rating: 93 },
  { name: 'Thierry Henry', position: 'FWD', rating: 96 },
  { name: 'Erling Haaland', position: 'FWD', rating: 96 },
  { name: 'Cristiano Ronaldo', position: 'FWD', rating: 95 },
]

// "Realistic optimal" — good players, plausible spin luck
const REALISTIC_TEAM = [
  { name: 'Alisson', position: 'GK', rating: 90 },
  { name: 'Trent Alexander-Arnold', position: 'DEF', rating: 90 },
  { name: 'Virgil van Dijk', position: 'DEF', rating: 90 },
  { name: 'John Terry', position: 'DEF', rating: 91 },
  { name: 'Andrew Robertson', position: 'DEF', rating: 89 },
  { name: 'Kevin De Bruyne', position: 'MID', rating: 94 },
  { name: 'Yaya Touré', position: 'MID', rating: 92 },
  { name: 'Frank Lampard', position: 'MID', rating: 92 },
  { name: 'Thierry Henry', position: 'FWD', rating: 96 },
  { name: 'Mohamed Salah', position: 'FWD', rating: 93 },
  { name: 'Alan Shearer', position: 'FWD', rating: 94 },
]

// "Good but unlucky spins" — decent players, some 85-88s
const DECENT_TEAM = [
  { name: 'Hugo Lloris', position: 'GK', rating: 88 },
  { name: 'Kyle Walker', position: 'DEF', rating: 86 },
  { name: 'Toby Alderweireld', position: 'DEF', rating: 88 },
  { name: 'Jan Vertonghen', position: 'DEF', rating: 87 },
  { name: 'Andrew Robertson', position: 'DEF', rating: 89 },
  { name: 'David Silva', position: 'MID', rating: 92 },
  { name: 'Christian Eriksen', position: 'MID', rating: 88 },
  { name: 'N\'Golo Kanté', position: 'MID', rating: 88 },
  { name: 'Eden Hazard', position: 'FWD', rating: 93 },
  { name: 'Harry Kane', position: 'FWD', rating: 91 },
  { name: 'Raheem Sterling', position: 'FWD', rating: 89 },
]

function runSeason(players, seed) {
  const rng = seededRandom(seed)
  const teamRating = calcTeamRating(players)
  const opponents = [...PL_OPPONENTS]

  // Build home + away fixtures and shuffle
  const fixtures = []
  opponents.forEach(opp => {
    fixtures.push({ ...opp, isHome: true })
    fixtures.push({ ...opp, isHome: false })
  })
  for (let i = fixtures.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [fixtures[i], fixtures[j]] = [fixtures[j], fixtures[i]]
  }

  const matches = fixtures.map(f => {
    const homeBonus = f.isHome ? 2 : -2
    const { result, myGoals, oppGoals } = simulateMatch(teamRating + homeBonus, f.rating, rng)
    return { opponent: f.name, result, myGoals, oppGoals }
  })

  const won = matches.filter(m => m.result === 'W').length
  const drawn = matches.filter(m => m.result === 'D').length
  const lost = matches.filter(m => m.result === 'L').length
  const pts = won * 3 + drawn

  const table = buildLeagueTable(matches, opponents, rng)
  const pos = table.find(e => e.isPlayer)?.position ?? 20
  const topTeam = table[0]

  return { teamRating: teamRating.toFixed(1), won, drawn, lost, pts, pos, topTeam: `${topTeam.team} (${topTeam.points}pts)` }
}

// Seeds to use for 5 tests
const SEEDS = [12345, 99887, 54321, 77777, 11111]

console.log('\n══════════════════════════════════════════════════════════')
console.log('  DRAFT XI — OPTIMAL PLAY SIMULATION (5 SEASONS EACH)')
console.log('══════════════════════════════════════════════════════════')

for (const [label, team] of [
  ['DREAM TEAM (best possible PL picks, ~95.8 rating)', DREAM_TEAM],
  ['REALISTIC OPTIMAL  (very good spins, ~91.6 rating)', REALISTIC_TEAM],
  ['DECENT TEAM  (solid but unlucky spins, ~89.2 rating)', DECENT_TEAM],
]) {
  const rating = calcTeamRating(team)
  console.log(`\n▶ ${label}`)
  console.log(`  Team rating: ${rating.toFixed(2)}  (effective in matches: ${(rating + 3).toFixed(2)})`)
  console.log(`  ${'Season'.padEnd(8)} ${'W-D-L'.padEnd(12)} ${'Pts'.padEnd(6)} ${'Pos'.padEnd(6)} Champion`)
  for (let i = 0; i < 5; i++) {
    const r = runSeason(team, SEEDS[i])
    const wdl = `${r.won}-${r.drawn}-${r.lost}`.padEnd(12)
    const pos = r.pos === 1 ? '🏆 1st' : `   ${r.pos}${r.pos <= 4 ? ' (UCL)' : ''}`
    console.log(`  Season ${i + 1}  ${wdl} ${String(r.pts).padEnd(6)} ${pos.padEnd(14)} ${r.topTeam}`)
  }
}

console.log('\n══════════════════════════════════════════════════════════')
console.log('  OPPONENT RATINGS (fixed, NOT derived from player primes)')
console.log('══════════════════════════════════════════════════════════')
console.log('  PL opponents range: 69 (Luton) → 92 (Man City)')
const avg = PL_OPPONENTS.reduce((s, o) => s + o.rating, 0) / PL_OPPONENTS.length
console.log(`  Average PL opponent: ${avg.toFixed(1)}`)
console.log('\n  Note: opponents are hardcoded modern-era team ratings,')
console.log('  completely independent of the historical player pool.')
console.log('  They do NOT update based on which clubs you spin.')
console.log('')
