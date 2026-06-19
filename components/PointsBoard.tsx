'use client'

// Shared renderer for points-based leaderboards (daily + per-competition).
export type PointsRow = {
  rank: number; nickname: string; points: number
  won: number; drawn: number; lost: number
  isPerfect: boolean; trophyWon: boolean
}
export type PointsView = { available: boolean; total: number; top: PointsRow[]; you: PointsRow | null }

function medal(rank: number): string | null {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
}

function RankRow({ row, you, accent }: { row: PointsRow; you: boolean; accent: string }) {
  const m = medal(row.rank)
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2"
      style={you ? { background: accent + '1f', border: `1px solid ${accent}55` } : undefined}
    >
      <span className="w-7 shrink-0 text-center text-sm font-black tabular-nums" style={{ color: m ? accent : undefined }}>
        {m ?? row.rank}
      </span>
      <span className={`flex-1 min-w-0 truncate text-sm font-bold ${you ? 'text-white' : 'text-slate-200'}`}>
        {row.nickname}
        {you && <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: accent }}>you</span>}
        {row.isPerfect && <span className="ml-1" title="Flawless">👑</span>}
        {!row.isPerfect && row.trophyWon && <span className="ml-1" title="Trophy">🏆</span>}
      </span>
      <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
        {row.won}-{row.drawn}-{row.lost}
      </span>
      <span className="w-10 shrink-0 text-right text-sm font-black text-white tabular-nums">{row.points}</span>
    </div>
  )
}

export function PointsBoard({ view, accent, emptyLabel = 'No scores yet — be the first!' }: {
  view: PointsView; accent: string; emptyLabel?: string
}) {
  const { top, you } = view
  const youInTop = you ? top.some(r => r.rank === you.rank) : false

  if (top.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-500">{emptyLabel}</p>
  }
  return (
    <div className="flex flex-col gap-1">
      {top.map(r => <RankRow key={r.rank} row={r} you={you?.rank === r.rank} accent={accent} />)}
      {you && !youInTop && (
        <>
          <div className="text-center text-slate-600 text-xs py-0.5">···</div>
          <RankRow row={you} you accent={accent} />
        </>
      )}
    </div>
  )
}
