'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LEAGUE_CONFIGS } from '@/lib/data'
import {
  getDailyRecord, getTodayKey, getStreak, getCareer,
  type DailyRecord, type CareerStats,
} from '@/lib/storage'
import { getDailyChallenge } from '@/lib/dailyChallenge'
import { dailyStatusLine } from '@/lib/share'

export function DailyChallengeCard() {
  const todayKey = getTodayKey()
  const challenge = getDailyChallenge(todayKey)
  const number = challenge.number
  const league = LEAGUE_CONFIGS[challenge.hostLeague]

  // localStorage is read after mount so server and client first paint match.
  const [played, setPlayed] = useState<DailyRecord | null>(null)
  const [streak, setStreak] = useState(0)
  const [career, setCareer] = useState<CareerStats | null>(null)
  useEffect(() => {
    setPlayed(getDailyRecord(todayKey))
    setStreak(getStreak().current)
    const c = getCareer()
    if (c.seasonsPlayed > 0) setCareer(c)
  }, [todayKey])

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 space-y-3">
      <Link
        href="/game?daily=1"
        className="group relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 active:scale-[0.99] overflow-hidden"
        style={{
          background: `linear-gradient(120deg, ${league.color}1a, ${league.color}08 60%, transparent)`,
          borderColor: league.color + '55',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-80"
          style={{ background: `linear-gradient(90deg, transparent, ${league.color}, transparent)` }}
        />
        <div className="text-4xl shrink-0">📅</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: league.color }}>
              Daily Challenge #{number}
            </span>
            {streak > 1 && (
              <span className="text-xs font-bold text-amber-400">🔥 {streak}-day streak</span>
            )}
          </div>
          <h2 className="text-lg font-black text-white leading-tight mt-0.5">
            {challenge.label}
            <span className="text-slate-500 font-bold"> · {league.name}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">{challenge.description}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Same for everyone · one attempt per day</p>
        </div>
        <div className="shrink-0">
          {played ? (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              ✓ {dailyStatusLine(played)}
            </span>
          ) : (
            <span
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-black text-white transition-transform group-hover:scale-105"
              style={{ background: league.color, boxShadow: `0 6px 22px ${league.color}44` }}
            >
              Play today&apos;s draft →
            </span>
          )}
        </div>
      </Link>

      {career && (
        <Link href="/profile"
          className="flex items-center justify-center gap-6 text-center text-xs text-slate-500 hover:text-slate-300 transition-colors">
          <span><span className="font-bold text-slate-300">{career.seasonsPlayed}</span> seasons</span>
          <span><span className="font-bold text-slate-300">{career.trophies}</span> trophies 🏆</span>
          <span><span className="font-bold text-slate-300">{career.bestPoints}</span> best pts</span>
          <span className="text-slate-600">view all →</span>
        </Link>
      )}
    </div>
  )
}
