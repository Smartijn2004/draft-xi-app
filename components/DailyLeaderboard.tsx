'use client'
import { useEffect, useRef, useState } from 'react'
import { getPlayerId } from '@/lib/playerIdentity'

type Row = {
  rank: number; nickname: string; points: number
  won: number; drawn: number; lost: number
  isPerfect: boolean; trophyWon: boolean
}
type View = { available: boolean; total: number; top: Row[]; you: Row | null }

export type DailyResultForBoard = {
  points: number; won: number; drawn: number; lost: number
  isPerfect: boolean; trophyWon: boolean
}

type Phase = 'loading' | 'noname' | 'ready' | 'hidden'

export function DailyLeaderboard({
  date, result, nickname, accent = '#34d399',
}: {
  date: string
  result: DailyResultForBoard
  // Username chosen on first finish. When present we auto-submit; when null we
  // still show the board with a nudge to set one (the prompt lives above us).
  nickname: string | null
  accent?: string
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [view, setView] = useState<View | null>(null)
  // Keep the latest result without it being an effect dependency (the parent
  // passes a fresh object literal each render, which would otherwise loop).
  const resultRef = useRef(result)
  resultRef.current = result

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const playerId = getPlayerId()
        const res = await fetch(`/api/leaderboard?date=${date}&playerId=${encodeURIComponent(playerId)}`)
        const v = (await res.json()) as View
        if (!active) return
        if (!v.available) { setPhase('hidden'); return }

        if (nickname) {
          // Auto-submit (idempotent server-side: one attempt per day is kept).
          try {
            const r2 = await fetch('/api/leaderboard', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ date, playerId, nickname, ...resultRef.current }),
            })
            const updated = (await r2.json()) as View
            if (active) { setView(updated); setPhase('ready') }
          } catch {
            if (active) { setView(v); setPhase('ready') }
          }
        } else {
          setView(v)
          setPhase('noname')
        }
      } catch {
        if (active) setPhase('hidden')
      }
    })()
    return () => { active = false }
  }, [date, nickname])

  if (phase === 'hidden') return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">🏆 Daily Leaderboard</h3>
        {view && view.total > 0 && (
          <span className="text-xs font-semibold text-slate-400">
            {view.total} player{view.total !== 1 ? 's' : ''} today
          </span>
        )}
      </div>

      {phase === 'loading' && (
        <div className="py-6 text-center text-xs text-slate-500">Loading rankings…</div>
      )}

      {phase === 'noname' && (
        <p className="mb-3 rounded-lg px-3 py-2 text-xs font-semibold text-center"
          style={{ background: accent + '1a', color: accent }}>
          ☝️ Set a username above to add your score to the board.
        </p>
      )}

      {(phase === 'ready' || phase === 'noname') && view && (
        <Board view={view} accent={accent} />
      )}
    </div>
  )
}

function Board({ view, accent }: { view: View; accent: string }) {
  const { top, you } = view
  const youInTop = you ? top.some(r => r.rank === you.rank) : false

  if (top.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-500">Be the first to post a score today!</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {top.map(r => (
        <RankRow key={r.rank} row={r} you={you?.rank === r.rank} accent={accent} />
      ))}
      {you && !youInTop && (
        <>
          <div className="text-center text-slate-600 text-xs py-0.5">···</div>
          <RankRow row={you} you accent={accent} />
        </>
      )}
    </div>
  )
}

function medal(rank: number): string | null {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
}

function RankRow({ row, you, accent }: { row: Row; you: boolean; accent: string }) {
  const m = medal(row.rank)
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2"
      style={you ? { background: accent + '1f', border: `1px solid ${accent}55` } : undefined}
    >
      <span className="w-7 shrink-0 text-center text-sm font-black tabular-nums" style={{ color: m ? accent : undefined }}>
        {m ?? row.rank}
      </span>
      <span className={`flex-1 min-w-0 truncate text-sm font-bold ${you ? 'text-white' : 'text-slate-200'}`}>
        {row.nickname}
        {you && <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: accent }}>you</span>}
        {row.isPerfect && <span className="ml-1" title="Flawless">👑</span>}
        {!row.isPerfect && row.trophyWon && <span className="ml-1" title="Trophy">🏆</span>}
      </span>
      <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
        {row.won}-{row.drawn}-{row.lost}
      </span>
      <span className="w-10 shrink-0 text-right text-sm font-black text-white tabular-nums">{row.points}</span>
    </div>
  )
}
