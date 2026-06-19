'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPlayerId } from '@/lib/playerIdentity'
import { PointsBoard, type PointsView } from '@/components/PointsBoard'

// League display info kept local (not imported from lib/data) so the whole
// player database isn't pulled into this client bundle.
type Tab = { kind: 'comp' | 'daily' | 'event'; key: string; label: string; color: string }
const TABS: Tab[] = [
  { kind: 'daily', key: 'daily', label: 'Daily', color: '#34d399' },
  { kind: 'comp', key: 'pl', label: 'Premier League', color: '#10b981' },
  { kind: 'comp', key: 'laliga', label: 'La Liga', color: '#ef4444' },
  { kind: 'comp', key: 'seriea', label: 'Serie A', color: '#3b82f6' },
  { kind: 'comp', key: 'ucl', label: 'Champions League', color: '#f59e0b' },
  { kind: 'comp', key: 'worldcup', label: 'World Cup', color: '#eab308' },
  { kind: 'comp', key: 'legends', label: 'Legends', color: '#a855f7' },
  { kind: 'event', key: 'worldcup2026', label: 'WC 2026 Cups', color: '#16a34a' },
]

type WinsRow = { rank: number; nickname: string; wins: number }
type WinsView = { available: boolean; total: number; top: WinsRow[]; you: WinsRow | null }
type Difficulty = 'easy' | 'normal' | 'hard'

export default function LeaderboardsPage() {
  const [active, setActive] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('hard')
  const [points, setPoints] = useState<PointsView | null>(null)
  const [wins, setWins] = useState<WinsView | null>(null)
  const [loading, setLoading] = useState(true)

  const tab = TABS[active]

  useEffect(() => {
    let alive = true
    setLoading(true)
    setPoints(null)
    setWins(null)
    const pid = getPlayerId()
    const today = new Date().toISOString().slice(0, 10)
    const url =
      tab.kind === 'comp' ? `/api/competition-leaderboard?league=${tab.key}&playerId=${encodeURIComponent(pid)}`
        : tab.kind === 'daily' ? `/api/leaderboard?date=${today}&playerId=${encodeURIComponent(pid)}`
          : `/api/event-leaderboard?event=worldcup2026&difficulty=${difficulty}&playerId=${encodeURIComponent(pid)}`
    fetch(url)
      .then(r => r.json())
      .then(v => { if (!alive) return; if (tab.kind === 'event') setWins(v); else setPoints(v) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [active, difficulty, tab.kind, tab.key])

  const view = tab.kind === 'event' ? wins : points
  const subtitle =
    tab.kind === 'comp' ? 'All-time best seasons' :
      tab.kind === 'daily' ? "Today's challenge" : 'Cups won'

  return (
    <main className="min-h-screen bg-[var(--background)] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/5 px-4 py-3 flex items-center gap-4 backdrop-blur-md bg-[var(--background)]/70">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1">← Home</Link>
        <span className="font-black text-white">🏆 Leaderboards</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setActive(i)}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all border"
              style={i === active
                ? { background: t.color, borderColor: t.color, color: '#fff' }
                : { background: t.color + '14', borderColor: t.color + '44', color: t.color }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Board */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/3 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-white">{tab.label}</h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
            {view && view.available && view.total > 0 && (
              <span className="text-xs font-semibold text-slate-400">{view.total} player{view.total !== 1 ? 's' : ''}</span>
            )}
          </div>

          {tab.kind === 'event' && (
            <div className="flex gap-1.5 mb-4">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className="rounded-lg px-3 py-1 text-xs font-bold capitalize transition-all border"
                  style={d === difficulty
                    ? { background: tab.color + '22', borderColor: tab.color + '66', color: tab.color }
                    : { background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {loading && <div className="py-8 text-center text-xs text-slate-500">Loading…</div>}

          {!loading && view && !view.available && (
            <div className="py-8 text-center text-xs text-slate-500">Leaderboards aren&apos;t available right now.</div>
          )}

          {!loading && tab.kind !== 'event' && points && points.available && (
            <PointsBoard view={points} accent={tab.color} emptyLabel="No seasons logged yet — be the first!" />
          )}

          {!loading && tab.kind === 'event' && wins && wins.available && (
            <WinsBoard view={wins} accent={tab.color} />
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-600">
          Play a competition to log your best season · win the live event to climb the cups board.
        </p>
      </div>
    </main>
  )
}

function medal(rank: number): string | null {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
}

function WinsBoard({ view, accent }: { view: WinsView; accent: string }) {
  const { top, you } = view
  const youInTop = you ? top.some(r => r.rank === you.rank) : false
  if (top.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-500">No cups won yet — be the first to lift it!</p>
  }
  const Row = ({ r, isYou }: { r: WinsRow; isYou: boolean }) => {
    const m = medal(r.rank)
    return (
      <div className="flex items-center gap-3 rounded-lg px-3 py-2"
        style={isYou ? { background: accent + '1f', border: `1px solid ${accent}55` } : undefined}>
        <span className="w-7 shrink-0 text-center text-sm font-black tabular-nums" style={{ color: m ? accent : undefined }}>{m ?? r.rank}</span>
        <span className={`flex-1 min-w-0 truncate text-sm font-bold ${isYou ? 'text-white' : 'text-slate-200'}`}>
          {r.nickname}
          {isYou && <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: accent }}>you</span>}
        </span>
        <span className="shrink-0 text-sm font-black text-white tabular-nums">{r.wins} <span className="text-[11px] text-slate-500">🏆</span></span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      {top.map(r => <Row key={r.rank} r={r} isYou={you?.rank === r.rank} />)}
      {you && !youInTop && (
        <>
          <div className="text-center text-slate-600 text-xs py-0.5">···</div>
          <Row r={you} isYou />
        </>
      )}
    </div>
  )
}
