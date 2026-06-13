import Link from 'next/link'
import { LeagueSelector } from '@/components/LeagueSelector'
import { DailyChallengeCard } from '@/components/DailyChallengeCard'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0f] text-slate-100">
      {/* Top bar */}
      <div className="absolute top-0 right-0 z-20 p-4">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
        >
          🏆 Career
        </Link>
      </div>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-12 overflow-hidden">
        {/* subtle grid bg */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,#1a2e1a 0,#1a2e1a 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#1a2e1a 0,#1a2e1a 1px,transparent 1px,transparent 60px)',
          }}
        />
        <div className="relative z-10 text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6 text-amber-400 text-xs font-semibold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Unofficial Fan Draft Game
          </div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-4 leading-none">
            <span className="text-white">Draft</span>
            <span className="text-emerald-400"> XI</span>
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-lg mx-auto mb-3 font-light">
            Build the ultimate XI from five competitions.
            <br />
            Simulate the season. Chase the perfect record.
          </p>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-10">
            Spin the wheel. Draft legends. Can you go unbeaten?
          </p>

          {/* stat pills */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-center mb-12">
            {[
              { value: '5', label: 'Leagues' },
              { value: '1,200+', label: 'Player Seasons' },
              { value: '1966–2025', label: 'Eras' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily challenge */}
      <section className="relative z-10 px-6">
        <DailyChallengeCard />
      </section>

      {/* League picker */}
      <section className="relative z-10 px-6 pb-16">
        <h2 className="text-center text-sm font-bold text-slate-400 tracking-widest uppercase mb-6">
          Choose your competition
        </h2>
        <LeagueSelector />
      </section>

      {/* How to play */}
      <section className="max-w-2xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-black text-white mb-6">How to play</h2>
        <ol className="space-y-4">
          {[
            ['Spin the wheel', 'Land on a real club from a specific season.'],
            ['Draft a player', 'Pick from their squad and fill a slot in your XI.'],
            ['Build your XI', 'Spin and draft until all 11 positions are filled.'],
            ['Simulate', 'Play out the season — can you achieve a perfect record?'],
          ].map(([title, desc], i) => (
            <li key={i} className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 font-black flex items-center justify-center text-sm">
                {i + 1}
              </span>
              <div>
                <div className="font-bold text-white">{title}</div>
                <div className="text-slate-400 text-sm mt-0.5">{desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center border-t border-white/5 text-xs text-slate-600 space-y-2">
        <p>
          Draft XI is an independent, fan-made game. Not affiliated with or endorsed by any league, club, or governing body.
          All player names and historical data are used for informational and descriptive purposes only.
        </p>
        <p>Inspired by <span className="text-slate-400">38-0.app</span> and <span className="text-slate-400">82-0.com</span>.</p>
      </footer>
    </main>
  )
}
