'use client'
import type { DraftedPlayer, Formation, LeagueConfig } from '@/lib/types'

type Props = {
  formation: Formation
  team: DraftedPlayer[]
  league: LeagueConfig
  compact?: boolean
  highlightSlotIndexes?: number[]
  onSlotClick?: (slotIndex: number) => void
}

const POS_COLORS: Record<string, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
}

export function TeamFormation({ formation, team, league, compact = false, highlightSlotIndexes, onSlotClick }: Props) {
  const slots = formation.slots

  // Vertical band each slot sits in. Splitting MID into a defensive (DM) band
  // and the rest keeps a 4-2-3-1 looking like one — holding pair behind an
  // attacking three — instead of a flat five. Every other formation keeps a
  // single midfield row since they have no DM slots.
  const tierOf = (slot: { position: string; label: string }) => {
    if (slot.position === 'GK') return 0
    if (slot.position === 'DEF') return 1
    if (slot.position === 'MID') return slot.label === 'DM' ? 2 : 3
    return 4 // FWD
  }

  const rows: typeof slots[number][][] = []
  let current: typeof slots[number][] = []
  let lastTier = -1
  slots.forEach(slot => {
    const tier = tierOf(slot)
    if (tier !== lastTier && current.length > 0) { rows.push(current); current = [] }
    current.push(slot)
    lastTier = tier
  })
  if (current.length > 0) rows.push(current)
  rows.reverse()

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-white/10 ${compact ? 'aspect-[3/4]' : 'aspect-[2/3]'}`}
      style={{ background: 'linear-gradient(180deg, #0a2e0a 0%, #0d3d0d 50%, #0a2e0a 100%)' }}
    >
      {/* Mow stripes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 28px, transparent 28px, transparent 56px)' }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)' }}
      />
      {/* Pitch markings */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
        <div className="w-3/4 h-1/2 border border-white/40 rounded-sm" />
        <div className="absolute w-1/3 h-12 border border-white/40 bottom-0 left-1/2 -translate-x-1/2" />
        <div className="absolute w-12 h-12 rounded-full border border-white/40" style={{ top: '50%', transform: 'translate(-50%, -50%)', left: '50%' }} />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40" />
      </div>

      {/* Rows */}
      <div className="relative z-10 flex flex-col justify-around h-full py-3 px-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-around items-center">
            {row.map((slot, si) => {
              const globalIndex = slots.indexOf(slot)
              const player = team.find(p => p.slotIndex === globalIndex)
              const highlighted = !player && (highlightSlotIndexes?.includes(globalIndex) ?? false)
              return (
                <PlayerSlot
                  key={si}
                  slot={slot}
                  player={player}
                  league={league}
                  compact={compact}
                  highlighted={highlighted}
                  onClick={highlighted && onSlotClick ? () => onSlotClick(globalIndex) : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function JerseyIcon({ color, rating, compact }: { color: string; rating: number; compact: boolean }) {
  const sz = compact ? 36 : 44
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: sz, height: sz, filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.45))' }}
    >
      <svg
        viewBox="0 0 24 26"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        fill="none"
      >
        {/* Jersey body */}
        <path
          d="M8.5 2 Q12 5 15.5 2 L19 4 L23 7 L21 11 L18 9.5 L18 24 L6 24 L6 9.5 L3 11 L1 7 L5 4 Z"
          fill={color + '28'}
          stroke={color}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="relative z-10 font-black leading-none"
        style={{ color, fontSize: compact ? 10 : 11, marginTop: compact ? 4 : 5 }}
      >
        {rating}
      </span>
    </div>
  )
}

function PlayerSlot({
  slot, player, league, compact, highlighted, onClick
}: {
  slot: { position: string; label: string }
  player: DraftedPlayer | undefined
  league: LeagueConfig
  compact: boolean
  highlighted?: boolean
  onClick?: () => void
}) {
  const color = POS_COLORS[slot.position] ?? '#9ca3af'
  const filled = !!player

  if (filled) {
    return (
      <div className={`flex flex-col items-center gap-0.5 ${compact ? 'w-14' : 'w-16'}`}>
        <div className="flex flex-col items-center gap-0.5 animate-pop">
          <JerseyIcon color={color} rating={player.rating} compact={compact} />
          <div
            className="text-center font-bold leading-tight truncate"
            style={{ maxWidth: compact ? 52 : 60, color, fontSize: compact ? 8 : 9 }}
          >
            {player.name.split(' ').pop()}
          </div>
          {!compact && (
            <div className="text-[8px] text-slate-400 truncate" style={{ maxWidth: 60 }}>
              {player.club}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (highlighted) {
    // Eligible slot while choosing a position — pulsing accent ring, clickable
    return (
      <div className={`flex flex-col items-center gap-0.5 ${compact ? 'w-14' : 'w-16'}`}>
        <button
          onClick={onClick}
          className={`rounded-full flex items-center justify-center font-black border-2 transition-transform hover:scale-110 active:scale-95
            ${compact ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm'}`}
          style={{
            borderColor: league.color,
            color: league.color,
            background: league.color + '22',
            animation: 'glow-pulse 1.4s ease-in-out infinite',
            ['--glow-color' as string]: league.color + '66',
          }}
        >
          {slot.label}
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-0.5 ${compact ? 'w-14' : 'w-16'}`}>
      <div className="flex flex-col items-center gap-0.5 opacity-40">
        <div
          className={`rounded-full flex items-center justify-center font-bold border-2 border-dashed
            ${compact ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm'}`}
          style={{ borderColor: color + '80', color: color + '80' }}
        >
          {slot.label}
        </div>
        {compact && (
          <div className="text-[8px]" style={{ color: color + '60' }}>—</div>
        )}
      </div>
    </div>
  )
}
