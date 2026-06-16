'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LEAGUE_CONFIGS } from '@/lib/data'
import type { LeagueId } from '@/lib/types'
import { getProfile, type CareerStats, type LeagueStats, type HallOfFameEntry } from '@/lib/storage'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/lib/achievements'

const LEAGUE_ORDER: LeagueId[] = ['pl', 'laliga', 'seriea', 'ucl', 'worldcup', 'worldcup2026', 'legends']

type ProfileData = ReturnType<typeof getProfile>

export default function ProfilePage() {
  const router = useRouter()
  const [data, setData] = useState<ProfileData | null>(null)

  // Read localStorage after mount so SSR and first client paint agree.
  useEffect(() => { setData(getProfile()) }, [])

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-slate-500">
        Loading…
      </div>
    )
  }

  const { career, achievements, leagues } = data
  const unlockedCount = Object.keys(achievements).length
  const hasPlayed = career.seasonsPlayed > 0

  return (
    <div className="min-h-screen text-slate-100 flex flex-col"
      style={{ background: 'radial-gradient(900px 480px at 50% -120px, #f59e0b10, transparent), var(--background)' }}>
      <header className="sticky top-0 z-30 border-b border-white/5 px-4 py-3 flex items-center gap-4 backdrop-blur-md bg-[var(--background)]/70">
        <button onClick={() => router.push('/')} className="text-slate-400 hover:text-white transition-colors text-sm">
          ← Back
        </button>
        <span className="font-black text-white">Career</span>
        <span className="ml-auto text-xs text-slate-500">{unlockedCount}/{ACHIEVEMENTS.length} badges</span>
      </header>

      <div className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full space-y-8 animate-slide-up">
        {!hasPlayed && (
          <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center space-y-3">
            <div className="text-4xl">🏆</div>
            <h2 className="text-lg font-black text-white">Your trophy cabinet is empty</h2>
            <p className="text-sm text-slate-400">Play a season to start building your career.</p>
            <Link href="/" className="inline-block mt-2 px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:brightness-110 transition">
              Play now →
            </Link>
          </div>
        )}

        {hasPlayed && <CareerSummary career={career} />}

        {/* Achievements */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Achievements</h2>
          {ACHIEVEMENT_CATEGORIES.map(cat => {
            const items = ACHIEVEMENTS.filter(a => a.category === cat)
            return (
              <div key={cat} className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{cat}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map(a => {
                    const unlocked = !!achievements[a.id]
                    return (
                      <div key={a.id}
                        className={`rounded-xl border p-3 flex items-start gap-2.5 transition ${
                          unlocked ? 'border-amber-500/30 bg-amber-500/8' : 'border-white/8 bg-white/2'
                        }`}>
                        <span className={`text-xl shrink-0 ${unlocked ? '' : 'grayscale opacity-30'}`}>{a.emoji}</span>
                        <div className="min-w-0">
                          <div className={`text-xs font-black ${unlocked ? 'text-white' : 'text-slate-500'}`}>{a.name}</div>
                          <div className={`text-[10px] leading-tight mt-0.5 ${unlocked ? 'text-slate-400' : 'text-slate-600'}`}>
                            {a.description}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>

        {/* Per-league history */}
        {hasPlayed && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">By Competition</h2>
            {LEAGUE_ORDER.filter(id => leagues[id]).map(id => (
              <LeagueCard key={id} leagueId={id} stats={leagues[id]!} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

function CareerSummary({ career }: { career: CareerStats }) {
  const cards = [
    { label: 'Seasons', value: career.seasonsPlayed },
    { label: 'Trophies', value: career.trophies, accent: '#f59e0b' },
    { label: 'Invincible', value: career.invincibles, accent: '#10b981' },
    { label: 'Immortal', value: career.perfectSeasons, accent: '#a855f7' },
    { label: 'Best pts', value: career.bestPoints },
    { label: 'Best run', value: career.longestUnbeatenRun ?? 0, accent: '#3b82f6' },
  ]
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Overview</h2>
      <div className="grid grid-cols-3 gap-2">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
            <div className="text-xl font-black tabular-nums" style={{ color: c.accent ?? '#fff' }}>{c.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-white/8 bg-white/3 p-3">
          <div className="text-sm font-black text-white tabular-nums">
            <span className="text-emerald-400">{career.totalWon}</span> ·
            <span className="text-amber-400"> {career.totalDrawn}</span> ·
            <span className="text-red-400"> {career.totalLost}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">All-time W · D · L</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-3">
          <div className="text-sm font-black text-white tabular-nums">{career.goalsFor} : {career.goalsAgainst}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Goals for : against</div>
        </div>
      </div>
    </section>
  )
}

function LeagueCard({ leagueId, stats }: { leagueId: LeagueId; stats: LeagueStats }) {
  const cfg = LEAGUE_CONFIGS[leagueId]
  const [open, setOpen] = useState(false)
  const accent = cfg.color
  const isTournament = cfg.format === 'tournament'

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: accent + '33', background: accent + '0a' }}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-white">{cfg.name}</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: accent + '22', color: accent }}>
            {stats.seasonsPlayed} season{stats.seasonsPlayed !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Trophies" value={stats.trophies} accent="#f59e0b" />
          <Stat label="Best pts" value={stats.bestPoints} />
          <Stat
            label={isTournament ? 'Won' : 'Best finish'}
            value={isTournament ? (stats.trophies > 0 ? '🏆' : '—') : (stats.bestFinish ? ordinal(stats.bestFinish) : '—')}
          />
        </div>
        {stats.bestTeam && (
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full mt-3 text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1">
            {open ? '▲ Hide' : '▼ Show'} best XI ({stats.bestTeam.points} pts{stats.bestTeam.trophyWon ? ' · 🏆' : ''})
          </button>
        )}
      </div>
      {open && stats.bestTeam && <BestTeam entry={stats.bestTeam} accent={accent} />}
    </div>
  )
}

function BestTeam({ entry, accent }: { entry: HallOfFameEntry; accent: string }) {
  const order = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as Record<string, number>
  const sorted = [...entry.team].sort((a, b) => (order[a.position] ?? 9) - (order[b.position] ?? 9) || b.rating - a.rating)
  return (
    <div className="border-t border-white/8 divide-y divide-white/5">
      <div className="px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>Squad rating {entry.teamRating.toFixed(1)}</span>
        <span>{new Date(entry.date).toLocaleDateString()}</span>
      </div>
      {sorted.map((p, i) => (
        <div key={i} className="flex items-center gap-2 px-4 py-1.5 text-xs">
          <span className="w-8 text-[10px] font-bold shrink-0" style={{ color: accent }}>{p.position}</span>
          <span className="flex-1 text-white truncate">{p.name}</span>
          <span className="font-black tabular-nums text-slate-300">{p.rating}</span>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div>
      <div className="text-lg font-black tabular-nums" style={{ color: accent ?? '#fff' }}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  )
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  if (n % 10 === 1) return `${n}st`
  if (n % 10 === 2) return `${n}nd`
  if (n % 10 === 3) return `${n}rd`
  return `${n}th`
}
