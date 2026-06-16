'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getPlayerId, getNickname, setNickname } from '@/lib/playerIdentity'

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

type Phase = 'loading' | 'needName' | 'ready' | 'hidden'

export function DailyLeaderboard({
  date, result, accent = '#34d399',
}: {
  date: string
  result: DailyResultForBoard
  accent?: string
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [view, setView] = useState<View | null>(null)
  const [nick, setNick] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didInit = useRef(false)

  const submit = useCallback(async (nickname: string) => {
    const playerId = getPlayerId()
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, playerId, nickname, ...result }),
    })
    if (!res.ok) throw new Error('submit failed')
    return (await res.json()) as View
  }, [date, result])

  // On mount: read the board. If we already have a nickname, submit our result
  // (idempotent server-side) and show the ranked board; otherwise ask for one.
  // didInit guards against React StrictMode's double-invoke in dev (no second
  // fetch); we deliberately don't use a cancelled flag, since the only effect
  // run must be allowed to commit its state.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    ;(async () => {
      try {
        const playerId = getPlayerId()
        const res = await fetch(`/api/leaderboard?date=${date}&playerId=${encodeURIComponent(playerId)}`)
        const v = (await res.json()) as View
        if (!v.available) { setPhase('hidden'); return }
        const saved = getNickname()
        if (saved) {
          try {
            const updated = await submit(saved)
            setView(updated)
          } catch {
            setView(v)
          }
          setPhase('ready')
        } else {
          setView(v)
          setPhase('needName')
        }
      } catch {
        setPhase('hidden')
      }
    })()
  }, [date, submit])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const name = nick.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const updated = await submit(name)
      setNickname(name)
      setView(updated)
      setPhase('ready')
    } catch {
      setError('Could not join — try again')
    } finally {
      setSubmitting(false)
    }
  }

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

      {phase === 'needName' && (
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <p className="text-xs text-slate-400">
            Pick a name to put your result on today&apos;s global board and see how you rank.
          </p>
          <div className="flex gap-2">
            <input
              value={nick}
              onChange={e => setNick(e.target.value)}
              placeholder="Your nickname"
              maxLength={24}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/25"
            />
            <button
              type="submit"
              disabled={!nick.trim() || submitting}
              className="rounded-xl px-4 py-2.5 text-sm font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: accent, boxShadow: `0 6px 22px ${accent}44` }}
            >
              {submitting ? 'Joining…' : 'Join'}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </form>
      )}

      {phase === 'ready' && view && (
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
