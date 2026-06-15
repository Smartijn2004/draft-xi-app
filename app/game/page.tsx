'use client'

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { DraftedPlayer, LeagueId, ClubSeason, Player, Position, Difficulty, Tactic } from '@/lib/types'
import { FORMATIONS, FORMATION_DESCRIPTIONS } from '@/lib/types'
import { LEAGUE_CONFIGS, spinClubSeason, getClubSeasonsForLeague, ALL_CLUB_SEASONS } from '@/lib/data'
import { runSimulation } from '@/lib/simulation'
import { SLOT_ACCEPTS } from '@/lib/positions'
import {
  recordSeason, recordDaily, getDailyRecord, getTodayKey,
  getDailyChallengeNumber, getStreak, dateSeed, seededRng,
  type SeasonRecordOutcome, type DailyRecord, type StoredState,
} from '@/lib/storage'
import { getDailyChallenge, getDailySpinPool, isPlayerAllowed } from '@/lib/dailyChallenge'
import { isWorldCup2026Active, getWorldCup2026Pool, worldCup2026PoolSize } from '@/lib/event'
import { emojiGrid, dailyStatusLine, dailyShareText } from '@/lib/share'
import { TeamFormation } from '@/components/TeamFormation'
import { SeasonSimulator } from '@/components/SeasonSimulator'
import { MatchReveal } from '@/components/MatchReveal'

// Page background tinted with the league's accent color
function leagueAmbience(color: string): React.CSSProperties {
  return {
    background: `radial-gradient(900px 480px at 50% -120px, ${color}14, transparent), #0a0a0f`,
  }
}

// World Cup 2026 — a vibrant multi-nation backdrop instead of one accent colour.
function eventAmbience(): React.CSSProperties {
  return {
    background: [
      'radial-gradient(600px 380px at 12% -8%, #ef444426, transparent)',
      'radial-gradient(600px 380px at 88% -8%, #3b82f626, transparent)',
      'radial-gradient(620px 400px at 50% -14%, #eab30822, transparent)',
      'radial-gradient(700px 420px at 30% 8%, #22c55e1f, transparent)',
      'radial-gradient(700px 420px at 72% 6%, #a855f71f, transparent)',
      '#0a0a0f',
    ].join(', '),
  }
}

// Pre-computed career-peak rating for each player name across all leagues/seasons.
const PRIME_RATINGS = new Map<string, number>()
for (const cs of ALL_CLUB_SEASONS) {
  for (const p of cs.players) {
    if (p.rating > (PRIME_RATINGS.get(p.name) ?? 0)) PRIME_RATINGS.set(p.name, p.rating)
  }
}

export type RatingsMode = 'season' | 'prime'

const POS_COLORS: Record<Position, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; emoji: string; desc: string; rerolls: number; hideRatings: boolean }> = {
  easy:   { label: 'Easy',   emoji: '😌', desc: '5 rerolls, ratings visible', rerolls: 5, hideRatings: false },
  normal: { label: 'Normal', emoji: '⚽', desc: '2 rerolls, ratings visible', rerolls: 2, hideRatings: false },
  hard:   { label: 'Hard',   emoji: '🔥', desc: 'No rerolls, ratings hidden', rerolls: 0, hideRatings: true  },
}

// In the World Cup 2026 event, difficulty instead sizes the pool of nations
// you can spin (ranked by strength) — a smaller pool means stronger squads.
const EVENT_DIFFICULTY: Record<Difficulty, { label: string; emoji: string; desc: string }> = {
  easy:   { label: 'Easy',   emoji: '😌', desc: 'Top 16 nations only' },
  normal: { label: 'Medium', emoji: '⚽', desc: 'Top 32 nations' },
  hard:   { label: 'Hard',   emoji: '🔥', desc: 'All 48 nations' },
}

// ── Main game content ─────────────────────────────────────────────────────────

function GameContent() {
  const params = useSearchParams()
  const router = useRouter()
  const isDaily = params.get('daily') === '1'
  const isEvent = (params.get('league') === 'worldcup2026')
  const todayKey = getTodayKey()
  const dailyChallenge = useMemo(() => (isDaily ? getDailyChallenge(todayKey) : null), [isDaily, todayKey])
  const leagueId = dailyChallenge ? dailyChallenge.hostLeague : ((params.get('league') ?? 'pl') as LeagueId)
  const league = LEAGUE_CONFIGS[leagueId] ?? LEAGUE_CONFIGS.pl
  const ambience = isEvent ? eventAmbience() : leagueAmbience(league.color)

  const [phase, setPhase] = useState<'setup' | 'draft' | 'simulating' | 'results'>('setup')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [ratingsMode, setRatingsMode] = useState<RatingsMode>('season')
  const [tactic, setTactic] = useState<Tactic>('balanced')
  const [formationName, setFormationName] = useState('4-3-3')
  const [team, setTeam] = useState<DraftedPlayer[]>([])
  const [draftSub, setDraftSub] = useState<'idle' | 'spinning' | 'landed' | 'selecting'>('idle')
  const [currentSpin, setCurrentSpin] = useState<ClubSeason | null>(null)
  const [spinDisplay, setSpinDisplay] = useState<{ club: string; season: string; color: string }>({ club: '', season: '', color: '#fff' })
  const [usedSpins, setUsedSpins] = useState<string[]>([])
  const [rerollsLeft, setRerollsLeft] = useState(2)
  const [seasonResult, setSeasonResult] = useState<ReturnType<typeof runSimulation> | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingChoice, setPendingChoice] = useState<{
    player: Player
    options: { slotIndex: number; label: string }[]
  } | null>(null)

  // ── Daily challenge state ──
  // dailyDone is read from localStorage in an effect (not during render) to
  // keep server and client first paint identical.
  const [dailyDone, setDailyDone] = useState<DailyRecord | null>(null)
  const [dailyChecked, setDailyChecked] = useState(false)
  const [careerOutcome, setCareerOutcome] = useState<SeasonRecordOutcome | null>(null)
  const [dailyStreak, setDailyStreak] = useState<StoredState['streak'] | null>(null)
  const dailyRngRef = useRef<(() => number) | null>(null)

  useEffect(() => {
    if (!isDaily) return
    setDailyDone(getDailyRecord(todayKey))
    setDailyChecked(true)
  }, [isDaily, todayKey])

  // Daily plays under fixed rules: normal difficulty, 4-3-3, season ratings,
  // balanced tactics — identical for everyone.
  useEffect(() => {
    if (!isDaily) return
    setDifficulty('normal')
    setRatingsMode('season')
    setTactic('balanced')
    setFormationName('4-3-3')
    setRerollsLeft(2)
    setPhase(p => (p === 'setup' ? 'draft' : p))
  }, [isDaily])

  const formation = FORMATIONS[formationName]
  const slots = formation.slots
  const totalSlots = slots.length
  const filled = team.length
  // The event always shows ratings (difficulty there means pool size, not hiding).
  const hideRatings = isEvent ? false : (difficulty ? DIFFICULTY_CONFIG[difficulty].hideRatings : false)

  // Every player eligible in this mode (constraint-filtered for dailies), with
  // the effective rating for the chosen ratings mode — powers the Draft Review's
  // "best available per slot" scout report.
  const referencePlayers = useMemo<Player[]>(() => {
    const clubSeasons = dailyChallenge
      ? getDailySpinPool(dailyChallenge)
      : isEvent
      ? getWorldCup2026Pool(difficulty ?? 'hard')
      : getClubSeasonsForLeague(leagueId)
    const out: Player[] = []
    for (const cs of clubSeasons) {
      for (const p of cs.players) {
        if (dailyChallenge && !isPlayerAllowed(dailyChallenge, p)) continue
        // Event always uses season ratings (no prime option).
        const rating = (!isEvent && ratingsMode === 'prime') ? (PRIME_RATINGS.get(p.name) ?? p.rating) : p.rating
        out.push({ ...p, rating })
      }
    }
    return out
  }, [dailyChallenge, isEvent, difficulty, leagueId, ratingsMode])

  const emptyCounts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  slots.forEach(s => { emptyCounts[s.position as Position]++ })
  team.forEach(p => { emptyCounts[p.slotPosition as Position]-- })
  const allFilled = filled === totalSlots

  const usedSlotIndexes = team.map(p => p.slotIndex)

  // A player can fill a slot if their altPositions overlaps with the slot's accept list,
  // or (if no altPositions) their broad position matches the slot position.
  function canFillSlot(player: import('@/lib/types').Player, slot: typeof slots[number]): boolean {
    if (player.altPositions?.length) {
      const accepted = SLOT_ACCEPTS[slot.label] ?? [slot.label]
      return player.altPositions.some(p => accepted.includes(p))
    }
    return player.position === slot.position
  }

  function hasAvailableSlot(player: import('@/lib/types').Player): boolean {
    return slots.some((slot, i) => !usedSlotIndexes.includes(i) && canFillSlot(player, slot))
  }

  // Same legend in two different seasons is still the same player — one XI spot each.
  function isAlreadyDrafted(player: Player): boolean {
    return team.some(t => t.name === player.name)
  }

  // Daily challenges may forbid players (over the underdog cap, wrong decade).
  function allowedByConstraint(player: Player): boolean {
    return !dailyChallenge || isPlayerAllowed(dailyChallenge, player)
  }

  function isPickable(player: Player): boolean {
    return hasAvailableSlot(player) && !isAlreadyDrafted(player) && allowedByConstraint(player)
  }

  // Dead spin: no one in this squad can join the XI → offer a free re-spin.
  const noFits = draftSub === 'selecting' && currentSpin != null && !allFilled
    && currentSpin.players.every(p => !isPickable(p))

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2500)
  }

  const handleStartDraft = () => {
    if (!difficulty) return
    // Event gives a flat 2 rerolls regardless of difficulty (which only sizes the pool).
    setRerollsLeft(isEvent ? 2 : DIFFICULTY_CONFIG[difficulty].rerolls)
    setPhase('draft')
  }

  // Slot machine spin effect
  const handleSpin = useCallback((isReroll = false) => {
    if (isReroll) setRerollsLeft(r => r - 1)
    setDraftSub('spinning')
    setCurrentSpin(null)

    const pool = dailyChallenge
      ? getDailySpinPool(dailyChallenge)
      : isEvent
      ? getWorldCup2026Pool(difficulty ?? 'hard')
      : getClubSeasonsForLeague(leagueId)
    const start = Date.now()
    const total = 900 + Math.random() * 500

    function tick() {
      const elapsed = Date.now() - start
      const progress = elapsed / total
      if (progress < 1) {
        const item = pool[Math.floor(Math.random() * pool.length)]
        setSpinDisplay({ club: item.club, season: item.season, color: item.color })
        // Ease out: ~60ms at start → ~280ms at end
        setTimeout(tick, 60 + Math.pow(progress, 1.8) * 220)
      } else {
        let result: ClubSeason | null
        if (dailyChallenge) {
          // Seeded by today's date: every player gets the same spin sequence
          // from the same constraint-filtered pool.
          if (!dailyRngRef.current) dailyRngRef.current = seededRng(dateSeed(getTodayKey()))
          const all = pool
          const available = all.filter(cs => !usedSpins.includes(cs.id))
          const from = available.length > 0 ? available : all
          result = from[Math.floor(dailyRngRef.current() * from.length)]
        } else if (isEvent) {
          // Draw from the difficulty-sliced nation pool.
          const available = pool.filter(cs => !usedSpins.includes(cs.id))
          const from = available.length > 0 ? available : pool
          result = from[Math.floor(Math.random() * from.length)]
        } else {
          result = spinClubSeason(leagueId, usedSpins)
        }
        if (result) {
          setCurrentSpin(result)
          setUsedSpins(prev => [...prev, result.id])
          setSpinDisplay({ club: result.club, season: result.season, color: result.color })
        }
        setDraftSub('landed')
        // 1-second pause so the result feels special before players appear
        setTimeout(() => setDraftSub('selecting'), 1000)
      }
    }

    tick()
  }, [leagueId, usedSpins, isDaily, dailyChallenge, isEvent, difficulty])

  const assignToSlot = useCallback((player: Player, slotIndex: number) => {
    const slot = slots[slotIndex]
    const effectiveRating = ratingsMode === 'prime'
      ? (PRIME_RATINGS.get(player.name) ?? player.rating)
      : player.rating
    setTeam(prev => [...prev, { ...player, rating: effectiveRating, slotPosition: slot.position, slotIndex, slotLabel: slot.label }])
    setPendingChoice(null)
    setCurrentSpin(null)
    setDraftSub('idle')
    if (filled + 1 === totalSlots) showMessage('XI complete! Hit Simulate to play the season.')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled, slots, totalSlots, ratingsMode])

  const handleDraftPlayer = useCallback((player: Player) => {
    if (team.some(t => t.name === player.name)) {
      showMessage(`${player.name} is already in your XI.`)
      return
    }
    // All open slots this player can fill, deduped by label (three CMs = one option)
    const options: { slotIndex: number; label: string }[] = []
    const seenLabels = new Set<string>()
    slots.forEach((s, i) => {
      if (usedSlotIndexes.includes(i) || !canFillSlot(player, s)) return
      if (seenLabels.has(s.label)) return
      seenLabels.add(s.label)
      options.push({ slotIndex: i, label: s.label })
    })
    if (options.length === 0) {
      const posLabel = player.altPositions?.join('/') ?? player.position
      showMessage(`No ${posLabel} slots left in your ${formationName}.`)
      return
    }
    if (options.length === 1) {
      assignToSlot(player, options[0].slotIndex)
      return
    }
    setPendingChoice({ player, options })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationName, slots, usedSlotIndexes, assignToSlot, team])

  const handleSimulate = useCallback(() => {
    if (team.length < totalSlots) return
    const result = runSimulation(team, leagueId, isDaily ? dateSeed(getTodayKey()) : undefined, tactic)
    setSeasonResult(result)
    setPhase('simulating')

    // Record once, at simulation time — backing out mid-reveal still counts.
    setCareerOutcome(recordSeason(result, leagueId, team))
    if (isDaily) {
      const record: DailyRecord = {
        date: getTodayKey(),
        leagueId,
        won: result.won,
        drawn: result.drawn,
        lost: result.lost,
        points: result.won * 3 + result.drawn,
        trophyWon: result.trophyWon,
        isPerfect: result.isPerfect,
        finalPosition: result.finalPosition,
        eliminated: result.eliminated || undefined,
        eliminatedAt: result.eliminatedAt,
        results: result.matches.map(m => m.result),
        team: team.map(p => ({ name: p.name, rating: p.rating })),
      }
      setDailyStreak(recordDaily(record))
      setDailyDone(record)
    }
  }, [team, leagueId, totalSlots, isDaily, tactic])

  const handlePlayAgain = useCallback(() => {
    if (isDaily) { router.push('/'); return } // one attempt per day
    setTeam([])
    setPhase('setup')
    setDraftSub('idle')
    setCurrentSpin(null)
    setPendingChoice(null)
    setUsedSpins([])
    setSeasonResult(null)
    setDifficulty(null)
    setCareerOutcome(null)
  }, [isDaily, router])

  const posNeeds = (Object.entries(emptyCounts) as [Position, number][])
    .filter(([, n]) => n > 0).map(([pos, n]) => `${n}× ${pos}`).join(', ')

  // ── Daily: already played today → recap ──────────────────────────────────
  if (isDaily && dailyChecked && dailyDone && phase !== 'simulating' && phase !== 'results') {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col" style={ambience}>
        <GameHeader league={league} onBack={() => router.push('/')} />
        <DailyRecap record={dailyDone} league={league} onHome={() => router.push('/')} />
      </div>
    )
  }

  // Daily mode: wait for the localStorage check before showing the draft so a
  // returning player never flashes a fresh board they can't actually play.
  if (isDaily && !dailyChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500" style={ambience}>
        Loading today&apos;s challenge…
      </div>
    )
  }

  // ── World Cup 2026 event window guard ────────────────────────────────────
  if (leagueId === 'worldcup2026' && !isWorldCup2026Active()) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col" style={ambience}>
        <GameHeader league={league} onBack={() => router.push('/')} />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center space-y-3">
            <div className="text-4xl">🌎</div>
            <h1 className="text-2xl font-black text-white">The World Cup 2026 event isn&apos;t live</h1>
            <p className="text-slate-400 text-sm">This event is only playable while the real tournament is on. Check back then!</p>
            <button onClick={() => router.push('/')} className="inline-block mt-2 px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:brightness-110 transition">
              Back to home →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Setup ────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col" style={ambience}>
        <GameHeader league={league} onBack={() => router.push('/')} />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-3"
                style={{ background: league.color + '22', color: league.color }}>
                {league.name}
              </div>
              <h1 className="text-3xl font-black text-white">Build Your XI</h1>
              <p className="text-slate-500 text-sm mt-1">{league.tagline}</p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {isEvent ? 'Difficulty — nations you can draft' : 'Difficulty'}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(isEvent ? EVENT_DIFFICULTY : DIFFICULTY_CONFIG) as [Difficulty, { label: string; emoji: string; desc: string }][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => setDifficulty(key)}
                    className={`rounded-xl border p-4 text-center transition-all hover:scale-[1.02] ${
                      difficulty === key ? 'border-transparent' : 'border-white/10 bg-white/3 hover:bg-white/5'
                    }`}
                    style={difficulty === key ? { background: league.color + '22', borderColor: league.color + '66' } : {}}>
                    <div className="text-2xl mb-1">{cfg.emoji}</div>
                    <div className="text-sm font-black text-white">{cfg.label}</div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-tight">{cfg.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {!isEvent && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Player Ratings</div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'season' as RatingsMode, emoji: '📅', label: 'Season Form',   desc: 'Rated as in that season' },
                  { key: 'prime'  as RatingsMode, emoji: '⚡', label: 'Prime Ratings', desc: 'Each player at career peak' },
                ] as const).map(({ key, emoji, label, desc }) => (
                  <button key={key} onClick={() => setRatingsMode(key)}
                    className={`rounded-xl border p-4 text-center transition-all hover:scale-[1.02] ${
                      ratingsMode === key ? 'border-transparent' : 'border-white/10 bg-white/3 hover:bg-white/5'
                    }`}
                    style={ratingsMode === key ? { background: league.color + '22', borderColor: league.color + '66' } : {}}>
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div className="text-sm font-black text-white">{label}</div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-tight">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            )}

            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tactics</div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: 'attacking' as Tactic, emoji: '⚔️', label: 'Attacking', desc: 'More goals, more risk' },
                  { key: 'balanced'  as Tactic, emoji: '⚖️', label: 'Balanced',  desc: 'Even approach' },
                  { key: 'defensive' as Tactic, emoji: '🛡️', label: 'Defensive', desc: 'Park the bus, chase unbeaten' },
                ] as const).map(({ key, emoji, label, desc }) => (
                  <button key={key} onClick={() => setTactic(key)}
                    className={`rounded-xl border p-3 text-center transition-all hover:scale-[1.02] ${
                      tactic === key ? 'border-transparent' : 'border-white/10 bg-white/3 hover:bg-white/5'
                    }`}
                    style={tactic === key ? { background: league.color + '22', borderColor: league.color + '66' } : {}}>
                    <div className="text-xl mb-1">{emoji}</div>
                    <div className="text-xs font-black text-white">{label}</div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-tight">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Formation</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(FORMATIONS).map(f => (
                  <button key={f} onClick={() => setFormationName(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 ${
                      formationName === f ? 'text-white' : 'text-slate-400 bg-white/5 hover:bg-white/8'
                    }`}
                    style={formationName === f ? { background: league.color } : {}}>
                    {f}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">{FORMATION_DESCRIPTIONS[formationName]}</p>
            </div>

            <button onClick={handleStartDraft} disabled={!difficulty}
              className={`w-full py-4 rounded-xl font-black text-white text-lg transition-all ${
                difficulty ? 'hover:scale-[1.02] hover:brightness-110' : 'opacity-30 cursor-not-allowed'
              }`}
              style={{ background: league.color }}>
              {difficulty ? 'Start Drafting →' : 'Choose a difficulty first'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Simulating — sequential match reveal ─────────────────────────────────
  if (phase === 'simulating' && seasonResult) {
    return (
      <div className="h-screen text-slate-100 flex flex-col" style={ambience}>
        <GameHeader league={league} onBack={() => router.push('/')} />
        <MatchReveal result={seasonResult} league={league} onDone={() => setPhase('results')} />
      </div>
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (phase === 'results' && seasonResult) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col" style={ambience}>
        <GameHeader league={league} onBack={() => router.push('/')} />
        <div className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full animate-slide-up">
          <SeasonSimulator
            result={seasonResult}
            league={league}
            onPlayAgain={handlePlayAgain}
            team={team}
            careerOutcome={careerOutcome}
            daily={isDaily ? { number: getDailyChallengeNumber(todayKey), streak: dailyStreak?.current ?? 1 } : undefined}
            referencePlayers={referencePlayers}
            modeName={dailyChallenge
              ? (dailyChallenge.constraint.kind === 'league' ? league.name : dailyChallenge.label)
              : league.name}
          />
        </div>
      </div>
    )
  }

  // ── Draft ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-slate-100 flex flex-col" style={ambience}>
      <GameHeader league={league} onBack={() => router.push('/')} />

      {message && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-white/10 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-fade-in">
          {message}
        </div>
      )}

      {/* Mobile bottom sheet backdrop — dismissing keeps the spin active so you
          can't escape it for a free re-spin; reopen via "Resume pick". */}
      {(draftSub === 'selecting' || draftSub === 'landed') && currentSpin && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => { setDraftSub('idle'); setPendingChoice(null) }}
        />
      )}

      {dailyChallenge && (
        <div className="max-w-6xl mx-auto w-full px-4 pt-4">
          <div className="rounded-xl border px-4 py-2.5 flex items-center gap-3"
            style={{ background: league.color + '12', borderColor: league.color + '44' }}>
            <span className="text-base">📅</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: league.color }}>
                Daily #{dailyChallenge.number} · {dailyChallenge.label}
              </span>
              <span className="text-[11px] text-slate-400">{dailyChallenge.description}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-6 px-4 py-6 max-w-6xl mx-auto w-full">
        {/* LEFT sidebar */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Formation</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(FORMATIONS).map(f => (
                <button key={f}
                  onClick={() => {
                    if (isDaily) { showMessage('Daily challenge is locked to 4-3-3.'); return }
                    if (team.length > 0) { showMessage('Clear your team first to change formation.'); return }
                    setFormationName(f)
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    formationName === f ? 'text-white' : 'text-slate-500 bg-white/5 hover:text-white hover:bg-white/8'
                  }`}
                  style={formationName === f ? { background: league.color } : {}}>
                  {f}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">{FORMATION_DESCRIPTIONS[formationName]}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{filled}/{totalSlots} drafted</span>
              <span style={{ color: league.color }}>{posNeeds || '✓ XI complete'}</span>
            </div>
          </div>

          <TeamFormation
            formation={formation}
            team={team}
            league={league}
            compact
            highlightSlotIndexes={pendingChoice?.options.map(o => o.slotIndex)}
            onSlotClick={pendingChoice ? (i) => assignToSlot(pendingChoice.player, i) : undefined}
          />

          {difficulty && (
            <div className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-xl px-4 py-2.5">
              <span className="text-base">{DIFFICULTY_CONFIG[difficulty].emoji}</span>
              <div className="flex-1">
                <div className="text-xs font-bold text-white">
                  {DIFFICULTY_CONFIG[difficulty].label}
                  {ratingsMode === 'prime' && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: league.color + '33', color: league.color }}>
                      ⚡ Prime
                    </span>
                  )}
                  {tactic !== 'balanced' && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: league.color + '33', color: league.color }}>
                      {tactic === 'defensive' ? '🛡️ Defensive' : '⚔️ Attacking'}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">
                  {rerollsLeft > 0 ? `${rerollsLeft} reroll${rerollsLeft !== 1 ? 's' : ''} left` : 'No rerolls'}
                </div>
              </div>
            </div>
          )}

          {allFilled && (
            <button onClick={handleSimulate}
              className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-[1.02] animate-slide-up"
              style={{ background: league.color }}>
              Simulate Season →
            </button>
          )}
        </aside>

        {/* RIGHT: Draft area */}
        <main className="flex-1 space-y-6">
          {/* Spin panel */}
          {!allFilled && (
            <div className="rounded-2xl border p-6 transition-shadow duration-500"
              style={{
                background: league.color + '0d',
                borderColor: league.color + '33',
                ...((draftSub === 'landed' || draftSub === 'selecting') && currentSpin
                  ? { boxShadow: `0 0 44px ${league.color}26, inset 0 0 0 1px ${league.color}33` }
                  : {}),
              }}>
              {draftSub === 'idle' && currentSpin && (
                /* A spin was dismissed without picking — resume it (no free re-spin). */
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-1">You spun</p>
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <span className="font-black text-white">{currentSpin.club}</span>
                    <span className="text-slate-600">×</span>
                    <span className="font-black" style={{ color: currentSpin.color }}>{currentSpin.season}</span>
                  </div>
                  <button onClick={() => setDraftSub('selecting')}
                    className="px-10 py-4 rounded-xl font-black text-xl text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: league.color, boxShadow: `0 8px 30px ${league.color}44` }}>
                    Resume pick →
                  </button>
                </div>
              )}

              {draftSub === 'idle' && !currentSpin && (
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-5">
                    Still need: <span className="text-white font-semibold">{posNeeds}</span>
                  </p>
                  <button onClick={() => handleSpin(false)}
                    className="px-10 py-4 rounded-xl font-black text-xl text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: league.color, boxShadow: `0 8px 30px ${league.color}44` }}>
                    Spin ⚽
                  </button>
                </div>
              )}

              {/* Slot machine — live cycling display */}
              {draftSub === 'spinning' && (
                <div className="flex items-center justify-center gap-6 py-2 select-none">
                  <div className="text-center min-w-[130px]">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">CLUB</div>
                    <div className="text-xl font-black text-white truncate animate-score-pop" key={spinDisplay.club}>
                      {spinDisplay.club || '—'}
                    </div>
                  </div>
                  <div className="text-slate-600 text-2xl font-bold shrink-0">×</div>
                  <div className="text-center min-w-[80px]">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SEASON</div>
                    <div className="text-xl font-black animate-score-pop"
                      style={{ color: spinDisplay.color || '#ffffff' }} key={spinDisplay.season}>
                      {spinDisplay.season || '—'}
                    </div>
                  </div>
                </div>
              )}

              {(draftSub === 'landed' || draftSub === 'selecting') && currentSpin && (
                <div className="animate-spin-in flex flex-col items-center gap-3 py-2">
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">CLUB</div>
                      <div className="text-xl font-black text-white">{currentSpin.club}</div>
                    </div>
                    <div className="text-slate-500 text-2xl font-bold">×</div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SEASON</div>
                      <div className="text-xl font-black" style={{ color: currentSpin.color }}>{currentSpin.season}</div>
                    </div>
                  </div>
                  {draftSub === 'landed' && (
                    <div className="text-xs text-slate-600 animate-pulse">Loading squad…</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Player pick panel — bottom sheet on mobile, inline on desktop */}
          {draftSub === 'selecting' && currentSpin && (
            <div className={[
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-[#0e0e1c] border-t border-white/10 rounded-t-2xl',
              'max-h-[82vh] overflow-y-auto overscroll-contain',
              'lg:static lg:z-auto lg:bg-transparent lg:border-0',
              'lg:rounded-none lg:max-h-none lg:overflow-visible',
              'lg:animate-fade-in',
            ].join(' ')}>
              {/* Drag handle — mobile only */}
              <div className="flex justify-center pt-3 pb-1 lg:hidden">
                <div className="w-12 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="px-4 pb-8 lg:px-0 lg:pb-0 space-y-3 pt-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pick a player</h3>
                    <div className="flex items-center gap-2 mt-1 lg:hidden">
                      <span className="font-black text-white text-sm">{currentSpin.club}</span>
                      <span className="text-slate-600 text-sm">×</span>
                      <span className="font-black text-sm" style={{ color: currentSpin.color }}>{currentSpin.season}</span>
                    </div>
                  </div>
                </div>

                {pendingChoice ? (
                  /* Position chooser — player fits multiple open slots */
                  <div className="space-y-3 animate-fade-in">
                    <div className="text-center py-2">
                      <div className="text-white font-black text-base">{pendingChoice.player.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Where do you want to play them?</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {pendingChoice.options.map(opt => (
                        <button
                          key={opt.slotIndex}
                          onClick={() => assignToSlot(pendingChoice.player, opt.slotIndex)}
                          className="min-h-[52px] rounded-xl border font-black text-lg transition-all hover:scale-[1.03] active:scale-95"
                          style={{ background: league.color + '15', borderColor: league.color + '55', color: league.color }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setPendingChoice(null)}
                      className="w-full py-3 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-colors">
                      ← Back to squad
                    </button>
                  </div>
                ) : (
                  <>
                    {(['GK', 'DEF', 'MID', 'FWD'] as Position[]).map(pos => {
                      const posPlayers = currentSpin.players.filter(p => p.position === pos)
                      if (posPlayers.length === 0) return null
                      const allDisabled = posPlayers.every(p => !isPickable(p))
                      return (
                        <div key={pos}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: POS_COLORS[pos] + '22', color: POS_COLORS[pos] }}>
                              {pos}
                            </span>
                            {allDisabled && <span className="text-xs text-slate-500">no slots available</span>}
                          </div>
                          <div className="grid gap-2">
                            {posPlayers.map(player => (
                              <PlayerRow
                                key={player.id}
                                player={player}
                                disabled={!isPickable(player)}
                                alreadyDrafted={isAlreadyDrafted(player)}
                                blockedReason={!allowedByConstraint(player)
                                  ? (dailyChallenge?.constraint.kind === 'underdog' ? 'over cap' : 'wrong era')
                                  : undefined}
                                hideRatings={hideRatings}
                                accentColor={league.color}
                                primeRating={ratingsMode === 'prime' ? (PRIME_RATINGS.get(player.name) ?? player.rating) : undefined}
                                onDraft={handleDraftPlayer}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {noFits ? (
                      <button
                        onClick={() => handleSpin(false)}
                        className="w-full py-3 rounded-xl border text-sm font-bold transition-all hover:scale-[1.01]"
                        style={{ borderColor: league.color + '66', color: league.color, background: league.color + '11' }}>
                        No one here fits your XI — free re-spin ↻
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSpin(true)}
                        disabled={rerollsLeft <= 0}
                        className={`w-full py-3 rounded-xl border text-sm transition-colors ${
                          rerollsLeft > 0
                            ? 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                            : 'border-white/5 text-slate-700 cursor-not-allowed'
                        }`}>
                        {rerollsLeft > 0
                          ? `Re-spin — ${rerollsLeft} reroll${rerollsLeft !== 1 ? 's' : ''} left`
                          : 'No rerolls left'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Team list */}
          {team.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Your XI</h3>
                <button
                  onClick={() => { setTeam([]); setCurrentSpin(null); setDraftSub('idle'); setPendingChoice(null) }}
                  className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                  Clear team
                </button>
              </div>
              <div className="grid gap-1">
                {team.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold w-10 text-center shrink-0 px-1.5 py-0.5 rounded"
                      style={{ background: POS_COLORS[p.position as Position] + '22', color: POS_COLORS[p.position as Position] }}>
                      {p.position}
                    </span>
                    <span className="text-white text-sm flex-1 font-medium">{p.name}</span>
                    <span className="text-slate-500 text-xs hidden sm:block">{p.club} · {p.season}</span>
                    {!hideRatings && (
                      <span className="text-xs font-bold w-8 text-center shrink-0" style={{ color: league.color }}>
                        {p.rating}
                      </span>
                    )}
                    <button
                      onClick={() => setTeam(prev => prev.filter(x => x.id !== p.id))}
                      className="text-slate-600 hover:text-red-400 transition-colors text-sm ml-1">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allFilled && (
            <div className="lg:hidden">
              <button onClick={handleSimulate}
                className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-[1.02]"
                style={{ background: league.color }}>
                Simulate Season →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Player row in pick panel ──────────────────────────────────────────────────

function PlayerRow({ player, disabled, alreadyDrafted, blockedReason, hideRatings, accentColor, primeRating, onDraft }: {
  player: Player; disabled: boolean; alreadyDrafted?: boolean; blockedReason?: string; hideRatings: boolean; accentColor: string
  primeRating?: number; onDraft: (p: Player) => void
}) {
  const posColor = POS_COLORS[player.position as Position] ?? '#9ca3af'
  const posLabel = player.altPositions?.length ? player.altPositions.join('/') : player.position
  const isPrime = primeRating !== undefined
  const displayRating = isPrime ? primeRating : player.rating
  const isBoosted = isPrime && primeRating > player.rating

  return (
    <button
      onClick={() => !disabled && onDraft(player)}
      disabled={disabled}
      className={`flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl border transition-all
        ${disabled
          ? 'opacity-30 cursor-not-allowed bg-white/2 border-white/5'
          : 'bg-white/3 border-white/8 hover:border-white/25 hover:bg-white/6 hover:scale-[1.01] active:scale-[0.99]'
        }`}
    >
      <span className="text-[10px] font-bold min-w-[28px] text-center shrink-0 py-0.5 px-1 rounded whitespace-nowrap"
        style={{ background: posColor + '22', color: posColor }}>
        {posLabel}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm truncate">{player.name}</div>
        <div className="text-xs truncate" style={{ color: isBoosted ? accentColor + 'aa' : undefined }}>
          {isBoosted
            ? <span><span className="text-slate-600">{player.rating}</span> → <span style={{ color: accentColor }}>{primeRating} peak</span></span>
            : <span className="text-slate-500">{player.club} · {player.season}</span>
          }
        </div>
      </div>
      {alreadyDrafted && (
        <span className="text-[10px] font-bold text-slate-500 shrink-0">✓ in your XI</span>
      )}
      {!alreadyDrafted && blockedReason && (
        <span className="text-[10px] font-bold text-amber-500/70 shrink-0 whitespace-nowrap">🚫 {blockedReason}</span>
      )}
      {!hideRatings && (
        <div className="text-sm font-black shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: accentColor + '22', color: accentColor }}>
          {displayRating}
        </div>
      )}
      {!disabled && (
        <svg className="w-4 h-4 shrink-0 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
    </button>
  )
}

// ── Daily recap (already played today) ────────────────────────────────────────

function DailyRecap({ record, league, onHome }: {
  record: DailyRecord
  league: import('@/lib/types').LeagueConfig
  onHome: () => void
}) {
  const [copied, setCopied] = useState(false)
  // Re-render every 30s so the countdown stays fresh.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const streak = getStreak()
  const n = getDailyChallengeNumber(record.date)
  const challengeLabel = getDailyChallenge(record.date).label

  const utcNow = new Date(now)
  const nextMidnight = Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + 1)
  const msLeft = Math.max(0, nextMidnight - now)
  const hoursLeft = Math.floor(msLeft / 3600000)
  const minsLeft = Math.floor((msLeft % 3600000) / 60000)

  const handleShare = async () => {
    const text = dailyShareText(record, league.name, streak.current)
    const url = `${window.location.origin}/`
    if (navigator.share) {
      try { await navigator.share({ text, url }); return } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-5 text-center animate-slide-up">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-3"
            style={{ background: league.color + '22', color: league.color }}>
            Daily #{n} · {challengeLabel}
          </div>
          <h1 className="text-2xl font-black text-white">✓ Played today</h1>
          <p className="text-slate-500 text-sm mt-1">One attempt per day — come back tomorrow!</p>
        </div>

        <div className="rounded-2xl border p-5 space-y-3"
          style={{ background: league.color + '0d', borderColor: league.color + '33' }}>
          <div className="text-base leading-relaxed whitespace-pre-line">{emojiGrid(record.results)}</div>
          <div className="font-black text-white">{dailyStatusLine(record)}</div>
          <div className="text-xs text-slate-400">
            {record.won}W {record.drawn}D {record.lost}L
            {streak.current > 1 && <span className="ml-2">🔥 {streak.current}-day streak</span>}
          </div>
        </div>

        <div className="text-sm text-slate-500">
          Next challenge in <span className="text-white font-bold">{hoursLeft}h {minsLeft}m</span>
        </div>

        <div className="flex gap-3">
          <button onClick={handleShare}
            className="px-6 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] border border-white/10 bg-white/5 hover:bg-white/8 text-slate-300 shrink-0">
            {copied ? '✓ Copied!' : '↑ Share'}
          </button>
          <button onClick={onHome}
            className="flex-1 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02] hover:brightness-110"
            style={{ background: league.color }}>
            Play casual mode →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function GameHeader({ league, onBack }: { league: import('@/lib/types').LeagueConfig; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 px-4 py-3 flex items-center gap-4 backdrop-blur-md bg-[#0a0a0f]/70">
      <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1">
        ← Back
      </button>
      <div className="flex items-center gap-2 flex-1">
        <span className="font-black text-white">{league.name}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: league.color + '22', color: league.color }}>
          {league.perfectLabel}
        </span>
      </div>
      <span className="text-xs text-slate-500 hidden sm:block">{league.tagline}</span>
    </header>
  )
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    }>
      <GameContent />
    </Suspense>
  )
}
