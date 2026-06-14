'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isWorldCup2026Active, worldCup2026DaysLeft } from '@/lib/event'

// Only shows while the real World Cup 2026 is on. Checked after mount so the
// statically-prerendered home page reflects the actual current date.
export function WorldCupEventCard() {
  const [active, setActive] = useState(false)
  const [daysLeft, setDaysLeft] = useState(0)
  useEffect(() => {
    setActive(isWorldCup2026Active())
    setDaysLeft(worldCup2026DaysLeft())
  }, [])

  if (!active) return null

  return (
    <section className="relative z-10 px-6 pb-4">
      <Link
        href="/game?league=worldcup2026"
        className="group relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 rounded-2xl border p-5 w-full max-w-4xl mx-auto transition-all duration-200 hover:-translate-y-1 active:scale-[0.99] overflow-hidden"
        style={{ background: 'linear-gradient(120deg, #16a34a26, #16a34a0a 60%, transparent)', borderColor: '#16a34a66' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px opacity-80"
          style={{ background: 'linear-gradient(90deg, transparent, #22c55e, transparent)' }} />
        <div className="text-4xl shrink-0">🌎</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: '#ef444422', color: '#f87171' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live event
            </span>
            <span className="text-xs font-bold text-green-400">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
          </div>
          <h2 className="text-lg font-black text-white leading-tight mt-1">World Cup 2026</h2>
          <p className="text-xs text-slate-400 mt-1">
            Draft today&apos;s international stars at current form — 14 contenders, knockout to glory. Only here while the tournament is on.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-black text-white transition-transform group-hover:scale-105"
          style={{ background: '#16a34a', boxShadow: '0 6px 22px #16a34a55' }}>
          Enter the World Cup →
        </span>
      </Link>
    </section>
  )
}
