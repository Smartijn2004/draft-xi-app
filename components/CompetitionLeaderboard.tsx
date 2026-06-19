'use client'
import { useEffect, useRef, useState } from 'react'
import { getPlayerId } from '@/lib/playerIdentity'
import { PointsBoard, type PointsView } from '@/components/PointsBoard'

export type SeasonForBoard = {
  won: number; drawn: number; lost: number
  isPerfect: boolean; trophyWon: boolean
}

type Phase = 'loading' | 'noname' | 'ready' | 'hidden'

// Shown on a casual league results screen. Auto-submits the season to the
// competition's all-time best-season board (kept only if it's the player's
// best) and shows where they rank.
export function CompetitionLeaderboard({
  leagueId, leagueName, nickname, result, accent = '#34d399',
}: {
  leagueId: string
  leagueName: string
  nickname: string | null
  // When provided, this season is submitted (best-of kept server-side).
  result?: SeasonForBoard
  accent?: string
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [view, setView] = useState<PointsView | null>(null)
  const resultRef = useRef(result)
  resultRef.current = result

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const playerId = getPlayerId()
        if (nickname && resultRef.current) {
          try {
            const r = await fetch('/api/competition-leaderboard', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leagueId, playerId, nickname, ...resultRef.current }),
            })
            const v = (await r.json()) as PointsView
            if (active && v.available) { setView(v); setPhase('ready'); return }
          } catch { /* fall through to a plain read */ }
        }
        const res = await fetch(`/api/competition-leaderboard?league=${encodeURIComponent(leagueId)}&playerId=${encodeURIComponent(playerId)}`)
        const v = (await res.json()) as PointsView
        if (!active) return
        if (!v.available) { setPhase('hidden'); return }
        setView(v)
        setPhase(nickname ? 'ready' : 'noname')
      } catch {
        if (active) setPhase('hidden')
      }
    })()
    return () => { active = false }
  }, [leagueId, nickname])

  if (phase === 'hidden') return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">🏆 {leagueName} — Best Seasons</h3>
        {view && view.total > 0 && (
          <span className="text-xs font-semibold text-slate-400">{view.total} player{view.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {phase === 'loading' && <div className="py-6 text-center text-xs text-slate-500">Loading rankings…</div>}

      {phase === 'noname' && (
        <p className="mb-3 rounded-lg px-3 py-2 text-xs font-semibold text-center" style={{ background: accent + '1a', color: accent }}>
          ☝️ Set a username above to add your best season.
        </p>
      )}

      {(phase === 'ready' || phase === 'noname') && view && (
        <PointsBoard view={view} accent={accent} emptyLabel="No seasons logged yet — be the first!" />
      )}
    </div>
  )
}
