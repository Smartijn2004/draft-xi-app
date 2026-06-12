import type { DailyRecord } from './storage'
import { getDailyChallengeNumber } from './storage'

// Wordle-style result grid: one emoji per match, 10 per row.
export function emojiGrid(results: ('W' | 'D' | 'L')[]): string {
  const cells = results.map(r => (r === 'W' ? '🟩' : r === 'D' ? '🟨' : '🟥'))
  const rows: string[] = []
  for (let i = 0; i < cells.length; i += 10) rows.push(cells.slice(i, i + 10).join(''))
  return rows.join('\n')
}

export function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  if (n % 10 === 1) return `${n}st`
  if (n % 10 === 2) return `${n}nd`
  if (n % 10 === 3) return `${n}rd`
  return `${n}th`
}

export function dailyStatusLine(record: DailyRecord): string {
  if (record.isPerfect) return `${record.points} pts · 🏆 PERFECT`
  if (record.trophyWon) return `${record.points} pts · 🥇 Champions`
  if (record.eliminated) return `❌ Out at ${record.eliminatedAt}`
  if (record.finalPosition) return `${record.points} pts · ${ordinal(record.finalPosition)} place`
  return `${record.points} pts`
}

// Compact one-line XI: last names with ratings.
export function teamLine(team: { name: string; rating: number }[]): string {
  const lastName = (n: string) => {
    const parts = n.trim().split(' ')
    return parts.length > 1 ? parts[parts.length - 1] : n
  }
  return `XI: ${team.map(p => `${lastName(p.name)} ${p.rating}`).join(' · ')}`
}

export function dailyShareText(record: DailyRecord, leagueName: string, streak: number): string {
  const lines = [
    `⚽ Draft XI Daily #${getDailyChallengeNumber(record.date)} — ${leagueName}`,
    dailyStatusLine(record),
    `${record.won}W ${record.drawn}D ${record.lost}L`,
  ]
  if (record.team && record.team.length > 0) lines.push(teamLine(record.team))
  if (streak > 1) lines.push(`🔥 ${streak}-day streak`)
  return lines.join('\n')
}
