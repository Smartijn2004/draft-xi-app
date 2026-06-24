'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getProfile, type HallOfFameEntry } from '@/lib/storage'
import { getNickname } from '@/lib/playerIdentity'
import { simulateDuel, type DuelResult } from '@/lib/h2h'

type TeamPlayer = { name: string; rating: number; position: string }
type Challenge = { id: string; nickname: string; mode: string; rating: number; team: TeamPlayer[] }

const LEAGUE_LABEL: Record<string, string> = {
  pl: 'Premier League', laliga: 'La Liga', seriea: 'Serie A', ucl: 'Champions League',
  worldcup: 'World Cup', worldcup2026: 'World Cup 2026', legends: 'Legends',
}
const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD']
const POS_COLOR: Record<string, string> = { GK: '#eab308', DEF: '#3b82f6', MID: '#22c55e', FWD: '#ef4444' }

function XIList({ team }: { team: TeamPlayer[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {POS_ORDER.flatMap(pos => team.filter(p => p.position === pos)).map((p, i) => (
        <div key={p.name + i} className="flex items-center gap-2 text-sm">
          <span className="w-9 shrink-0 text-[10px] font-black text-center rounded px-1 py-0.5"
            style={{ background: (POS_COLOR[p.position] ?? '#888') + '22', color: POS_COLOR[p.position] ?? '#888' }}>{p.position}</span>
          <span className="flex-1 min-w-0 truncate text-slate-200">{p.name}</span>
          <span className="shrink-0 font-black text-white tabular-nums">{p.rating}</span>
        </div>
      ))}
    </div>
  )
}

export default function H2HPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [picked, setPicked] = useState<HallOfFameEntry | null>(null)

  const hallOfFame = useMemo(() => (typeof window === 'undefined' ? [] : getProfile().hallOfFame), [])
  const myName = useMemo(() => getNickname() ?? 'You', [])

  useEffect(() => {
    if (!id) { setState('notfound'); return }
    let alive = true
    fetch(`/api/h2h?id=${encodeURIComponent(id)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((c: Challenge | null) => { if (!alive) return; if (c && c.team) { setChallenge(c); setState('ready') } else setState('notfound') })
      .catch(() => { if (alive) setState('notfound') })
    return () => { alive = false }
  }, [id])

  const duel: DuelResult | null = useMemo(() => {
    if (!challenge || !picked) return null
    const sig = picked.team.map(p => p.name).join(',')
    return simulateDuel(challenge.rating, picked.teamRating, `${challenge.id}|${sig}`)
  }, [challenge, picked])

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-slate-500">Loading challenge…</div>
  }
  if (state === 'notfound' || !challenge) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--background)] text-slate-100 px-6 text-center">
        <p className="text-lg font-black">Challenge not found</p>
        <p className="text-sm text-slate-500">This head-to-head link is invalid or has expired.</p>
        <Link href="/" className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500">Go to Draft XI →</Link>
      </main>
    )
  }

  const youWon = duel?.winner === 'B'

  return (
    <main className="min-h-screen bg-[var(--background)] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/5 px-4 py-3 flex items-center gap-4 backdrop-blur-md bg-[var(--background)]/70">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">← Home</Link>
        <span className="font-black text-white">⚔️ Head-to-Head</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Challenger */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-amber-400">Challenger</div>
              <h2 className="text-lg font-black text-white">{challenge.nickname}</h2>
              <p className="text-xs text-slate-500">{challenge.mode} · squad rating {challenge.rating.toFixed(1)}</p>
            </div>
            <div className="text-3xl">🧤</div>
          </div>
          <XIList team={challenge.team} />
        </div>

        {/* Result or pick */}
        {duel && picked ? (
          <div className="rounded-2xl border p-5 text-center"
            style={{ background: youWon ? '#22c55e1a' : '#ef44441a', borderColor: youWon ? '#22c55e55' : '#ef444455' }}>
            <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: youWon ? '#22c55e' : '#f87171' }}>
              {youWon ? 'You win! 🎉' : `${challenge.nickname} wins`}
            </div>
            <div className="text-4xl font-black text-white my-2">{duel.aggB} <span className="text-slate-500 text-2xl">–</span> {duel.aggA}</div>
            <div className="text-[11px] text-slate-400">aggregate ({myName} – {challenge.nickname})</div>
            <div className="mt-3 text-xs text-slate-300 space-y-0.5">
              <div>Leg 1 · {challenge.nickname} home: {duel.legs[0].aGoals}–{duel.legs[0].bGoals}</div>
              <div>Leg 2 · {myName} home: {duel.legs[1].bGoals}–{duel.legs[1].aGoals}</div>
              {duel.pens && <div className="text-amber-400 font-bold">Penalties: {duel.pens.b}–{duel.pens.a}</div>}
            </div>
            <button onClick={() => setPicked(null)} className="mt-4 text-xs text-slate-400 hover:text-white underline">
              Pick a different XI
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <div className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">Your move</div>
            {hallOfFame.length === 0 ? (
              <div className="text-sm text-slate-400 space-y-3">
                <p>You need an XI to answer this challenge. Play a season first, then come back to this link.</p>
                <Link href="/" className="inline-block px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500">Build an XI →</Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400 mb-3">Choose one of your best XIs to send into battle:</p>
                <div className="flex flex-col gap-2">
                  {hallOfFame.map((e, i) => (
                    <button key={i} onClick={() => setPicked(e)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-left hover:border-white/25 hover:bg-white/6 transition-all">
                      <span className="text-sm font-bold text-white">{LEAGUE_LABEL[e.leagueId] ?? e.leagueId}</span>
                      <span className="text-xs text-slate-400">{e.points} pts · rating {e.teamRating.toFixed(1)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">Want to challenge someone? Play a season and tap “⚔️ Challenge”.</Link>
        </div>
      </div>
    </main>
  )
}
