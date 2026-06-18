'use client'
import { useEffect, useRef, useState } from 'react'
import { getPlayerId } from '@/lib/playerIdentity'

type Row = { rank: number; nickname: string; wins: number }
type View = { available: boolean; total: number; top: Row[]; you: Row | null }

type Phase = 'loading' | 'noname' | 'ready' | 'hidden'

const DIFF_LABEL: Record<string, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }

// Cumulative "cups won" board for a live event, separate per difficulty. If the
// just-finished run was a cup win (winRunId set) and a username exists, the win
// is recorded once (idempotent server-side via the runId).
export function EventLeaderboard({
  event, difficulty, nickname, winRunId, title = 'Cup Wins', accent = '#16a34a',
}: {
  event: string
  difficulty: string
  nickname: string | null
  winRunId: string | null
  title?: string
  accent?: string
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [view, setView] = useState<View | null>(null)
  const submittedRun = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const playerId = getPlayerId()
        const qs = `event=${encodeURIComponent(event)}&difficulty=${encodeURIComponent(difficulty)}&playerId=${encodeURIComponent(playerId)}`
        // Record the win first (once) when we have a name + a fresh winning run.
        if (nickname && winRunId && submittedRun.current !== winRunId) {
          submittedRun.current = winRunId
          try {
            const r = await fetch('/api/event-leaderboard', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event, difficulty, playerId, nickname, runId: winRunId }),
            })
            const v = (await r.json()) as View
            if (active && v.available) { setView(v); setPhase('ready'); return }
          } catch { /* fall through to a plain read */ }
        }
        const res = await fetch(`/api/event-leaderboard?${qs}`)
        const v = (await res.json()) as View
        if (!active) return
        if (!v.available) { setPhase('hidden'); return }
        setView(v)
        setPhase(nickname ? 'ready' : 'noname')
      } catch {
        if (active) setPhase('hidden')
      }
    })()
    return () => { active = false }
  }, [event, difficulty, nickname, winRunId])

  if (phase === 'hidden') return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">🏆 {title}</h3>
        <span className="text-xs font-semibold" style={{ color: accent }}>
          {DIFF_LABEL[difficulty] ?? difficulty}
          {view && view.total > 0 && <span className="text-slate-400"> · {view.total} winner{view.total !== 1 ? 's' : ''}</span>}
        </span>
      </div>

      {phase === 'loading' && (
        <div className="py-6 text-center text-xs text-slate-500">Loading rankings…</div>
      )}

      {phase === 'noname' && (
        <p className="mb-3 rounded-lg px-3 py-2 text-xs font-semibold text-center"
          style={{ background: accent + '1a', color: accent }}>
          ☝️ Set a username above to climb the cup-wins board.
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
    return <p className="py-4 text-center text-xs text-slate-500">No cups won yet — be the first to lift it!</p>
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
      </span>
      <span className="shrink-0 text-sm font-black text-white tabular-nums">
        {row.wins} <span className="text-[11px] font-semibold text-slate-500">🏆</span>
      </span>
    </div>
  )
}
