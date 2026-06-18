import Link from 'next/link'
import { LEAGUE_DATA, LEAGUE_CONFIGS } from '@/lib/data'
import type { ClubSeason, LeagueId, Player, Position } from '@/lib/types'

export const metadata = {
  title: 'Club Index — Draft XI',
  description: 'Browse every club and national side in the game, season by season.',
}

// Legends is just the union of the others, so it's omitted here.
const ORDER: LeagueId[] = ['pl', 'laliga', 'seriea', 'ucl', 'worldcup', 'worldcup2026']
const POS_ORDER: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 }
const POS_TINT: Record<Position, string> = {
  GK: '#eab308', DEF: '#38bdf8', MID: '#34d399', FWD: '#f87171',
}

function topRating(players: Player[]): number {
  return players.reduce((m, p) => Math.max(m, p.rating), 0)
}

function sortedPlayers(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) => POS_ORDER[a.position] - POS_ORDER[b.position] || b.rating - a.rating,
  )
}

function ClubCard({ cs, accent }: { cs: ClubSeason; accent: string }) {
  const players = sortedPlayers(cs.players)
  return (
    <details className="group rounded-xl border border-white/8 bg-white/3 open:bg-white/5 transition-colors">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cs.color }} />
        <span className="flex-1 min-w-0">
          <span className="font-bold text-white">{cs.club}</span>
          <span className="text-slate-500 font-semibold"> · {cs.season}</span>
        </span>
        <span className="shrink-0 text-[11px] text-slate-500">{cs.players.length} players</span>
        <span
          className="shrink-0 w-9 text-center text-sm font-black rounded-md py-0.5"
          style={{ background: accent + '22', color: accent }}
        >
          {topRating(cs.players)}
        </span>
        <span className="shrink-0 text-slate-500 transition-transform group-open:rotate-90">›</span>
      </summary>
      <ul className="px-4 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {players.map(p => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span
              className="shrink-0 w-9 text-center text-[10px] font-black rounded py-0.5"
              style={{ background: POS_TINT[p.position] + '22', color: POS_TINT[p.position] }}
            >
              {p.position}
            </span>
            <span className="flex-1 min-w-0 truncate text-slate-200">{p.name}</span>
            <span className="shrink-0 font-black text-white tabular-nums">{p.rating}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default function ClubsPage() {
  const total = ORDER.reduce((n, id) => n + LEAGUE_DATA[id].length, 0)

  return (
    <main className="min-h-screen bg-[var(--background)] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/5 px-4 py-3 flex items-center gap-4 backdrop-blur-md bg-[var(--background)]/70">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1">
          ← Home
        </Link>
        <div className="flex items-baseline gap-2">
          <span className="font-black text-white">📚 Club Index</span>
          <span className="text-xs text-slate-500">{total} squads</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <p className="text-sm text-slate-400 -mt-2">
          Every club and national side you can draft from, grouped by competition. Tap a row to see its XI.
        </p>

        {ORDER.map(id => {
          const cfg = LEAGUE_CONFIGS[id]
          const clubs = [...LEAGUE_DATA[id]].sort(
            (a, b) => a.club.localeCompare(b.club) || a.season.localeCompare(b.season),
          )
          return (
            <section key={id}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-black" style={{ color: cfg.color }}>{cfg.name}</h2>
                <span className="text-xs font-semibold text-slate-500">{clubs.length} squads</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {clubs.map(cs => <ClubCard key={cs.id} cs={cs} accent={cfg.color} />)}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
