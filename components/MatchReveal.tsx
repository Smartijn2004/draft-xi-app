'use client'
import { useEffect, useRef, useState } from 'react'
import type { SeasonResult, LeagueConfig } from '@/lib/types'

type Props = {
  result: SeasonResult
  league: LeagueConfig
  onDone: () => void
}

const RESULT_STYLES = {
  W: { bg: '#10b98122', color: '#10b981' },
  D: { bg: '#f59e0b22', color: '#f59e0b' },
  L: { bg: '#ef444422', color: '#ef4444' },
} as const

export function MatchReveal({ result, league, onDone }: Props) {
  const matches = result.matches
  const total = matches.length
  const [revealed, setRevealed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  // Reveal instantly for users who prefer reduced motion
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(total)
      timerRef.current = setTimeout(() => doneRef.current(), 600)
      return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }
    if (revealed >= total) {
      // Brief pause on the final score before the results screen
      timerRef.current = setTimeout(() => doneRef.current(), 900)
    } else {
      // Accelerate as the season goes on
      const delay = Math.max(130, 450 - revealed * 12)
      timerRef.current = setTimeout(() => setRevealed(r => r + 1), delay)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [revealed, total, reducedMotion])

  // Keep the newest match in view
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [revealed])

  const shown = matches.slice(0, revealed)
  const won = shown.filter(m => m.result === 'W').length
  const drawn = shown.filter(m => m.result === 'D').length
  const lost = shown.filter(m => m.result === 'L').length
  const pts = won * 3 + drawn
  const finished = revealed >= total

  const skip = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setRevealed(total)
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full min-h-0">
      {/* Live tally header */}
      <div
        className="rounded-2xl border p-4 mb-4 shrink-0"
        style={{ background: league.color + '0d', borderColor: league.color + '33' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-white">
            {finished ? 'Season Complete' : 'Simulating Season'}
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {league.format === 'tournament' ? 'Match' : 'Matchday'} {revealed} / {total}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm font-black tabular-nums">
            <span className="text-emerald-400">{won}W</span>
            <span className="text-amber-400">{drawn}D</span>
            <span className="text-red-400">{lost}L</span>
          </div>
          {league.format === 'league' && (
            <div className="ml-auto text-sm font-black tabular-nums" style={{ color: league.color }}>
              {pts} pts
            </div>
          )}
        </div>
        {/* Progress track */}
        <div className="h-1 rounded-full overflow-hidden mt-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width: `${(revealed / total) * 100}%`, background: league.color }}
          />
        </div>
      </div>

      {/* Revealed matches */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
        {shown.map((m, i) => {
          const st = RESULT_STYLES[m.result]
          const isNewest = i === revealed - 1 && !finished
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/5 text-sm ${isNewest ? 'animate-pop' : ''}`}
            >
              <span
                className="w-6 h-6 rounded flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: st.bg, color: st.color }}
              >
                {m.result}
              </span>
              <span className="text-white flex-1 truncate font-medium">{m.opponent}</span>
              {m.round && (
                <span className="text-[10px] text-slate-500 shrink-0">{m.round}</span>
              )}
              <span className="text-slate-200 font-mono font-bold tabular-nums shrink-0">
                {m.myGoals}–{m.oppGoals}
              </span>
            </div>
          )
        })}
        {revealed === 0 && (
          <div className="text-center text-slate-600 text-sm py-10">Kicking off…</div>
        )}
      </div>

      {/* Skip */}
      {!finished && (
        <button
          onClick={skip}
          className="mt-4 shrink-0 w-full py-3 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-colors"
        >
          Skip to results →
        </button>
      )}
    </div>
  )
}
