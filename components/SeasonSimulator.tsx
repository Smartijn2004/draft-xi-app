'use client'
import { useState } from 'react'
import type { SeasonResult, LeagueConfig, GroupStanding, GoalEvent, LeagueTableEntry, DraftedPlayer } from '@/lib/types'

type Props = {
  result: SeasonResult
  league: LeagueConfig
  onPlayAgain: () => void
  team?: DraftedPlayer[]
}

function lastName(name: string) {
  const parts = name.trim().split(' ')
  return parts.length > 1 ? parts[parts.length - 1] : name
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  if (n % 10 === 1) return `${n}st`
  if (n % 10 === 2) return `${n}nd`
  if (n % 10 === 3) return `${n}rd`
  return `${n}th`
}

function positionBadge(pos: number, total: number): { color: string; bg: string; border: string; label: string } {
  if (pos === 1)            return { color: '#f59e0b', bg: '#f59e0b22', border: '#f59e0b44', label: 'Champions' }
  if (pos <= 4)             return { color: '#10b981', bg: '#10b98122', border: '#10b98144', label: 'Champions League' }
  if (pos <= 6)             return { color: '#3b82f6', bg: '#3b82f622', border: '#3b82f644', label: 'Europa League' }
  if (pos >= total - 2)    return { color: '#ef4444', bg: '#ef444422', border: '#ef444444', label: 'Relegated' }
  return { color: '#94a3b8', bg: '#6b728022', border: '#6b728033', label: '' }
}

export function SeasonSimulator({ result, league, onPlayAgain, team }: Props) {
  const {
    matches, won, drawn, lost, goalsFor, goalsAgainst, isPerfect, trophyWon,
    teamRating, eliminated, eliminatedAt, groupStandings,
    topScorers, playerOfSeason, achievements, leagueTable,
  } = result
  const points = won * 3 + drawn
  const accent = league.color
  const gd = goalsFor - goalsAgainst

  // E — league position
  const tableEntry = leagueTable?.find(e => e.isPlayer)
  const tablePos = tableEntry?.position
  const posStyle = tablePos ? positionBadge(tablePos, leagueTable!.length) : null

  // F — best/worst match
  const biggestWin = [...matches]
    .filter(m => m.result === 'W')
    .sort((a, b) => (b.myGoals - b.oppGoals) - (a.myGoals - a.oppGoals))[0] ?? null
  const heaviestLoss = [...matches]
    .filter(m => m.result === 'L')
    .sort((a, b) => (b.oppGoals - b.myGoals) - (a.oppGoals - a.myGoals))[0] ?? null

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">

      {/* ── Banner ── */}
      <div
        className="rounded-2xl p-6 text-center border"
        style={{ background: accent + '11', borderColor: accent + '44' }}
      >
        <div className="text-5xl mb-3">
          {isPerfect ? '🏆' : trophyWon ? '🥇' : eliminated ? '❌' : '📊'}
        </div>
        <h2 className="text-2xl font-black text-white mb-1">
          {isPerfect
            ? `Perfect ${league.perfectLabel}!`
            : trophyWon
            ? `${league.goalLabel.replace('Win', 'Won')}!`
            : eliminated
            ? `Eliminated — ${eliminatedAt}`
            : 'Season Complete'}
        </h2>
        <p className="text-sm" style={{ color: accent }}>
          Team Rating: {teamRating.toFixed(1)} · Points: {points}
        </p>
        {/* E — position badge */}
        {tablePos && posStyle && (
          <div className="mt-3 flex items-center justify-center">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border"
              style={{ background: posStyle.bg, borderColor: posStyle.border, color: posStyle.color }}
            >
              {ordinal(tablePos)} Place{posStyle.label ? ` · ${posStyle.label}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Achievements ── */}
      {achievements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {achievements.map(a => (
            <span
              key={a}
              className="text-xs font-black px-3 py-1.5 rounded-full tracking-wider uppercase"
              style={{ background: accent + '22', color: accent, border: `1px solid ${accent}44` }}
            >
              {a}
            </span>
          ))}
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Won',  value: won,  color: '#10b981' },
          { label: 'Drawn', value: drawn, color: '#f59e0b' },
          { label: 'Lost',  value: lost,  color: '#ef4444' },
          { label: 'GD',    value: `${gd > 0 ? '+' : ''}${gd}`, color: '#9ca3af' },
        ].map(s => (
          <div key={s.label} className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
            <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Goals ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-white">{goalsFor}</div>
          <div className="text-xs text-slate-500">Goals scored</div>
        </div>
        <div className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-white">{goalsAgainst}</div>
          <div className="text-xs text-slate-500">Goals conceded</div>
        </div>
      </div>

      {/* ── H: Squad Profile ── */}
      {team && team.length > 0 && (
        <SquadProfile team={team} accent={accent} />
      )}

      {/* ── Player of the Season ── */}
      {playerOfSeason && (
        <div
          className="rounded-2xl border p-4"
          style={{ background: accent + '0d', borderColor: accent + '33' }}
        >
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            ⭐ Player of the Season
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-black text-white">{playerOfSeason.name}</div>
              <div className="text-sm text-slate-400 mt-0.5">
                {playerOfSeason.goals}G · {playerOfSeason.assists}A
              </div>
            </div>
            <div
              className="text-3xl font-black w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: accent + '22', color: accent }}
            >
              {playerOfSeason.goals}
            </div>
          </div>
        </div>
      )}

      {/* ── Top Scorers ── */}
      {topScorers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Top Scorers</h3>
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5 text-slate-400">
                  <th className="text-left px-3 py-2 font-semibold">Player</th>
                  <th className="px-3 py-2 font-semibold text-center">Goals</th>
                  <th className="px-3 py-2 font-semibold text-center">Assists</th>
                </tr>
              </thead>
              <tbody>
                {topScorers.map((p, i) => (
                  <tr key={p.name} className="border-t border-white/5">
                    <td className="px-3 py-2 font-medium" style={{ color: i === 0 ? accent : '#e2e8f0' }}>
                      {i === 0 ? '🥇 ' : `${i + 1}. `}{p.name}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-emerald-400">{p.goals}</td>
                    <td className="px-3 py-2 text-center text-slate-400">{p.assists}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── F: Season Highlights ── */}
      {(biggestWin || heaviestLoss) && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Season Highlights</h3>
          <div className="grid grid-cols-2 gap-3">
            {biggestWin && (
              <HighlightCard
                label="Best Result"
                match={biggestWin}
                color="#10b981"
                icon="🏅"
              />
            )}
            {heaviestLoss && (
              <HighlightCard
                label="Worst Result"
                match={heaviestLoss}
                color="#ef4444"
                icon="💔"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Final League Table ── */}
      {leagueTable && leagueTable.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Final League Table</h3>
          <LeagueTable entries={leagueTable} accent={accent} />
        </div>
      )}

      {/* ── Group Standings (UCL/WC) ── */}
      {groupStandings && groupStandings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Group Stage</h3>
          <GroupTable standings={groupStandings[0]} accent={accent} />
        </div>
      )}

      {/* ── Match List ── */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          {league.format === 'tournament' ? 'All Matches' : 'Results'}
        </h3>
        <MatchList matches={matches} accent={accent} />
      </div>

      {/* ── Share + Play Again ── */}
      <div className="flex gap-3">
        <ShareButton result={result} league={league} />
        <button
          onClick={onPlayAgain}
          className="flex-1 py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-[1.02] hover:brightness-110"
          style={{ background: accent }}
        >
          Play Again →
        </button>
      </div>
    </div>
  )
}

// ── H: Squad Profile ─────────────────────────────────────────────────────────

function SquadProfile({ team, accent }: { team: DraftedPlayer[]; accent: string }) {
  const byPos = (pos: string) => team.filter(p => p.position === pos)
  const avgR = (ps: DraftedPlayer[]) =>
    ps.length ? ps.reduce((s, p) => s + p.rating, 0) / ps.length : 0

  const gkR  = avgR(byPos('GK'))
  const defR = avgR(byPos('DEF'))
  const midR = avgR(byPos('MID'))
  const fwdR = avgR(byPos('FWD'))

  // Normalise 60–100 → 0–1
  const norm = (v: number) => v > 0 ? Math.max(0, Math.min(1, (v - 60) / 40)) : 0

  const axes = [
    { label: 'ATK', raw: fwdR, v: norm(fwdR), angle: -Math.PI / 2 },
    { label: 'MID', raw: midR, v: norm(midR), angle: 0 },
    { label: 'DEF', raw: defR, v: norm(defR), angle: Math.PI / 2 },
    { label: 'GK',  raw: gkR,  v: norm(gkR),  angle: Math.PI },
  ]

  const cx = 80, cy = 80, r = 54, lr = 72

  const px = (scale: number, angle: number) => cx + scale * r * Math.cos(angle)
  const py = (scale: number, angle: number) => cy + scale * r * Math.sin(angle)
  const pts = (scale: number) => axes.map(a => `${px(scale, a.angle).toFixed(1)},${py(scale, a.angle).toFixed(1)}`).join(' ')

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Squad Profile</h3>
      <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-5">
        {/* Radar */}
        <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0">
          {[0.25, 0.5, 0.75, 1].map(s => (
            <polygon key={s} points={pts(s)} fill="none"
              stroke={s === 1 ? '#ffffff18' : '#ffffff0b'} strokeWidth="1" />
          ))}
          {axes.map((a, i) => (
            <line key={i} x1={cx} y1={cy}
              x2={px(1, a.angle).toFixed(1)} y2={py(1, a.angle).toFixed(1)}
              stroke="#ffffff0f" strokeWidth="1" />
          ))}
          <polygon
            points={axes.map(a => `${px(a.v, a.angle).toFixed(1)},${py(a.v, a.angle).toFixed(1)}`).join(' ')}
            fill={accent + '28'} stroke={accent} strokeWidth="1.5" strokeLinejoin="round"
          />
          {axes.map((a, i) => (
            <circle key={i}
              cx={px(a.v, a.angle).toFixed(1)} cy={py(a.v, a.angle).toFixed(1)}
              r="3" fill={accent} />
          ))}
          {axes.map((a, i) => (
            <text key={i}
              x={(cx + lr * Math.cos(a.angle)).toFixed(1)}
              y={(cy + lr * Math.sin(a.angle)).toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              fill="#94a3b8" fontSize="9" fontWeight="700"
            >
              {a.label}
            </text>
          ))}
        </svg>

        {/* Rating bars */}
        <div className="flex-1 w-full space-y-3">
          {axes.map(a => (
            <div key={a.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 font-semibold">{a.label}</span>
                <span className="font-black" style={{ color: accent }}>
                  {a.raw > 0 ? a.raw.toFixed(0) : '—'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${a.v * 100}%`, background: accent }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── F: Highlight card ─────────────────────────────────────────────────────────

function HighlightCard({
  label, match, color, icon,
}: {
  label: string
  match: SeasonResult['matches'][number]
  color: string
  icon: string
}) {
  return (
    <div
      className="rounded-xl border p-3 space-y-1"
      style={{ background: color + '0d', borderColor: color + '33' }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="font-black text-white text-sm truncate">{match.opponent}</div>
      <div className="font-black text-xl" style={{ color }}>
        {match.myGoals}–{match.oppGoals}
      </div>
      {match.scorers.length > 0 && (
        <div className="text-[10px] text-slate-500 truncate">
          ⚽ {match.scorers.map(e => `${lastName(e.scorer)} ${e.minute}'`).join('  ')}
        </div>
      )}
    </div>
  )
}

// ── Share ─────────────────────────────────────────────────────────────────────

function ShareButton({ result, league }: { result: SeasonResult; league: LeagueConfig }) {
  const [copied, setCopied] = useState(false)

  const buildText = () => {
    const { won, drawn, lost, goalsFor, goalsAgainst, trophyWon, isPerfect, eliminated, eliminatedAt, playerOfSeason, leagueTable } = result
    const pts = won * 3 + drawn
    const gd = goalsFor - goalsAgainst
    const tablePos = leagueTable?.find(e => e.isPlayer)?.position
    const status = isPerfect
      ? `Perfect ${league.perfectLabel}! 🏆`
      : trophyWon
      ? `Won the ${league.name}! 🥇`
      : eliminated
      ? `Eliminated at ${eliminatedAt}`
      : `${ordinal(tablePos ?? 0)} place · ${pts} pts`

    const lines = [
      `⚽ Draft XI — ${league.name}`,
      status,
      `${won}W ${drawn}D ${lost}L · GD ${gd > 0 ? '+' : ''}${gd}`,
    ]
    if (playerOfSeason) {
      lines.push(`🌟 POTS: ${playerOfSeason.name} (${playerOfSeason.goals}G ${playerOfSeason.assists}A)`)
    }
    lines.push('draft-xi.vercel.app')
    return lines.join('\n')
  }

  const handleShare = async () => {
    const text = buildText()
    if (navigator.share) {
      try { await navigator.share({ text }); return } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="px-6 py-4 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] border border-white/10 bg-white/5 hover:bg-white/8 text-slate-300 shrink-0"
    >
      {copied ? '✓ Copied!' : '↑ Share'}
    </button>
  )
}

// ── Match list ────────────────────────────────────────────────────────────────

function MatchList({ matches, accent }: { matches: SeasonResult['matches']; accent: string }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
      {matches.map((m, i) => {
        const isOpen = expanded === i
        const hasScorers = m.scorers.length > 0 || m.opponentScorers.length > 0
        return (
          <div key={i} className="rounded-lg bg-white/3 border border-white/5 overflow-hidden">
            <button
              className="flex items-center gap-3 px-3 py-2 text-sm w-full text-left"
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <span
                className="w-6 h-6 rounded flex items-center justify-center text-xs font-black shrink-0"
                style={{
                  background: m.result === 'W' ? '#10b98122' : m.result === 'D' ? '#f59e0b22' : '#ef444422',
                  color: m.result === 'W' ? '#10b981' : m.result === 'D' ? '#f59e0b' : '#ef4444',
                }}
              >
                {m.result}
              </span>
              <span className="text-white flex-1 truncate font-medium">{m.opponent}</span>
              {m.round && (
                <span className="text-[10px] text-slate-500 shrink-0 hidden sm:block">{m.round}</span>
              )}
              <span className="text-slate-300 font-mono tabular-nums shrink-0">
                {m.myGoals}–{m.oppGoals}
              </span>
              {hasScorers && (
                <span className="text-slate-600 text-[10px] shrink-0 ml-1">{isOpen ? '▲' : '▼'}</span>
              )}
            </button>

            {!isOpen && m.scorers.length > 0 && (
              <div className="px-3 pb-2 -mt-0.5">
                <span className="text-[10px] text-emerald-400/70">
                  ⚽ {m.scorers.map(e => `${lastName(e.scorer)} ${e.minute}'`).join('  ')}
                </span>
              </div>
            )}

            {isOpen && hasScorers && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                {m.scorers.length > 0 && (
                  <div className="space-y-1">
                    {m.scorers.map((e, j) => <GoalRow key={j} event={e} color="#10b981" />)}
                  </div>
                )}
                {m.opponentScorers.length > 0 && (
                  <div className="space-y-1">
                    {m.opponentScorers.map((e, j) => <GoalRow key={j} event={e} color="#ef4444" opponent />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function GoalRow({ event, color, opponent }: { event: GoalEvent; color: string; opponent?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-base">⚽</span>
      <span className="tabular-nums text-slate-500 w-7 shrink-0">{event.minute}'</span>
      <span className="font-semibold" style={{ color }}>
        {opponent ? lastName(event.scorer) : event.scorer}
      </span>
      {event.assist && !opponent && (
        <span className="text-slate-500">
          (assist: <span className="text-slate-400">{lastName(event.assist)}</span>)
        </span>
      )}
    </div>
  )
}

// ── League Table ──────────────────────────────────────────────────────────────

function LeagueTable({ entries, accent }: { entries: LeagueTableEntry[]; accent: string }) {
  const [expanded, setExpanded] = useState(false)
  const playerPos = entries.find(e => e.isPlayer)?.position ?? 0
  const visible = expanded ? entries : entries.slice(0, Math.max(6, playerPos + 1))
  const hasMore = entries.length > visible.length

  const posColor = (pos: number) => {
    if (pos === 1) return '#f59e0b'
    if (pos <= 4) return '#10b981'
    if (pos <= 6) return '#3b82f6'
    if (pos >= entries.length - 2) return '#ef444488'
    return '#6b7280'
  }

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-white/5 text-slate-400">
            <th className="w-7 px-2 py-2 font-semibold text-center">#</th>
            <th className="text-left px-3 py-2 font-semibold">Team</th>
            <th className="px-2 py-2 font-semibold text-center hidden sm:table-cell">P</th>
            <th className="px-2 py-2 font-semibold text-center hidden sm:table-cell">W</th>
            <th className="px-2 py-2 font-semibold text-center hidden sm:table-cell">D</th>
            <th className="px-2 py-2 font-semibold text-center hidden sm:table-cell">L</th>
            <th className="px-2 py-2 font-semibold text-center">GD</th>
            <th className="px-2 py-2 font-semibold text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(e => {
            const gd = e.gf - e.ga
            return (
              <tr key={e.team} className={`border-t border-white/5 ${e.isPlayer ? 'bg-white/5' : ''}`}>
                <td className="px-2 py-2 text-center">
                  <span className="font-bold text-[11px]" style={{ color: posColor(e.position) }}>
                    {e.position}
                  </span>
                </td>
                <td className="px-3 py-2 text-left">
                  <span className="font-semibold"
                    style={{ color: e.isPlayer ? accent : e.position <= 4 ? '#e2e8f0' : '#6b7280' }}>
                    {e.isPlayer ? '★ ' : ''}{e.team}
                  </span>
                </td>
                <td className="px-2 py-2 text-center text-slate-500 hidden sm:table-cell">{e.played}</td>
                <td className="px-2 py-2 text-center text-emerald-400 hidden sm:table-cell">{e.won}</td>
                <td className="px-2 py-2 text-center text-amber-400 hidden sm:table-cell">{e.drawn}</td>
                <td className="px-2 py-2 text-center text-red-400 hidden sm:table-cell">{e.lost}</td>
                <td className="px-2 py-2 text-center text-slate-300">{gd > 0 ? '+' : ''}{gd}</td>
                <td className="px-2 py-2 text-center font-bold text-white">{e.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {(hasMore || expanded) && (
        <button
          onClick={() => setExpanded(x => !x)}
          className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors bg-white/2 border-t border-white/5"
        >
          {expanded ? '▲ Show less' : `▼ Show all ${entries.length} teams`}
        </button>
      )}
    </div>
  )
}

function GroupTable({ standings, accent }: { standings: GroupStanding[]; accent: string }) {
  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-white/5 text-slate-400">
            <th className="text-left px-3 py-2 font-semibold">Team</th>
            <th className="px-2 py-2 font-semibold">P</th>
            <th className="px-2 py-2 font-semibold">W</th>
            <th className="px-2 py-2 font-semibold">D</th>
            <th className="px-2 py-2 font-semibold">L</th>
            <th className="px-2 py-2 font-semibold">GD</th>
            <th className="px-2 py-2 font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.team} className={`border-t border-white/5 ${s.isPlayer ? 'bg-white/5' : ''}`}>
              <td className="px-3 py-2 text-left">
                <span className="font-semibold"
                  style={{ color: s.isPlayer ? accent : i < 2 ? '#e2e8f0' : '#6b7280' }}>
                  {i < 2 ? '✓ ' : ''}{s.team}
                </span>
              </td>
              <td className="px-2 py-2 text-center text-slate-400">{s.played}</td>
              <td className="px-2 py-2 text-center text-emerald-400">{s.won}</td>
              <td className="px-2 py-2 text-center text-amber-400">{s.drawn}</td>
              <td className="px-2 py-2 text-center text-red-400">{s.lost}</td>
              <td className="px-2 py-2 text-center text-slate-300">
                {s.gf - s.ga > 0 ? '+' : ''}{s.gf - s.ga}
              </td>
              <td className="px-2 py-2 text-center font-bold text-white">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
