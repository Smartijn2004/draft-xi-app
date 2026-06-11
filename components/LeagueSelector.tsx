'use client'
import Link from 'next/link'
import { LEAGUE_CONFIGS } from '@/lib/data'
import type { LeagueId } from '@/lib/types'

const LEAGUE_ICONS: Record<LeagueId, string> = {
  pl: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  laliga: '🇪🇸',
  seriea: '🇮🇹',
  ucl: '⭐',
  worldcup: '🏆',
}

export function LeagueSelector() {
  const configs = Object.values(LEAGUE_CONFIGS)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mx-auto">
      {configs.map(league => (
        <Link
          key={league.id}
          href={`/game?league=${league.id}`}
          className="group relative flex flex-col gap-3 bg-white/3 border border-white/8 hover:border-white/20 rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] hover:bg-white/5"
          style={{ '--accent': league.color } as React.CSSProperties}
        >
          {/* top row */}
          <div className="flex items-center justify-between">
            <span className="text-2xl">{LEAGUE_ICONS[league.id]}</span>
            <span
              className="text-xs font-black px-2 py-0.5 rounded-full"
              style={{ background: league.color + '22', color: league.color }}
            >
              {league.format === 'tournament' ? 'KNOCKOUT' : '38 GAMES'}
            </span>
          </div>

          {/* name */}
          <div>
            <h2 className="text-lg font-black text-white leading-tight">{league.name}</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{league.description}</p>
          </div>

          {/* stats row */}
          <div className="flex gap-4 text-center mt-auto pt-3 border-t border-white/5">
            <div>
              <div className="text-sm font-bold text-white">{league.clubs}+</div>
              <div className="text-[10px] text-slate-500">clubs</div>
            </div>
            <div>
              <div className="text-sm font-bold text-white">{league.seasons}</div>
              <div className="text-[10px] text-slate-500">seasons</div>
            </div>
            <div className="ml-auto">
              <div className="text-sm font-black" style={{ color: league.color }}>{league.perfectLabel}</div>
              <div className="text-[10px] text-slate-500">perfect</div>
            </div>
          </div>

          {/* hover arrow */}
          <div
            className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
            style={{ color: league.color }}
          >
            Play →
          </div>
        </Link>
      ))}
    </div>
  )
}
