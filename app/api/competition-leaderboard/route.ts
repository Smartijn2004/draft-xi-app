import {
  getCompetitionLeaderboard, submitCompetitionScore, leaderboardEnabled,
} from '@/lib/leaderboard'

// Per-competition best-season leaderboard. GET reads a league's board; POST
// records a season (kept only if it's the player's best for that competition).
// Same trust model as the daily board: validated/clamped, rate-limited per IP.

const LEAGUES = new Set(['pl', 'laliga', 'seriea', 'ucl', 'worldcup', 'legends'])
const MAX_NICK = 24

const recent = new Map<string, number[]>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  if (recent.size > 10_000) recent.clear()
  const hits = (recent.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_LIMIT) return true
  hits.push(now)
  recent.set(ip, hits)
  return false
}

function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const printable = Array.from(raw)
    .filter(ch => { const c = ch.charCodeAt(0); return c >= 32 && c !== 127 })
    .join('')
  const n = printable.replace(/\s+/g, ' ').trim().slice(0, MAX_NICK)
  return n.length >= 1 ? n : null
}

function intIn(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isInteger(n) || n < min || n > max) return null
  return n
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('league') ?? ''
  if (!LEAGUES.has(leagueId)) {
    return Response.json({ error: 'Invalid league' }, { status: 400 })
  }
  const playerId = searchParams.get('playerId')?.slice(0, 64) || null
  const view = await getCompetitionLeaderboard(leagueId, playerId)
  return Response.json(view)
}

export async function POST(request: Request) {
  if (!leaderboardEnabled()) {
    return Response.json({ available: false })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return Response.json({ error: 'Too many submissions' }, { status: 429 })
  }

  const leagueId = typeof body.leagueId === 'string' && LEAGUES.has(body.leagueId) ? body.leagueId : null
  const playerId = typeof body.playerId === 'string' ? body.playerId.slice(0, 64) : null
  const nickname = cleanNickname(body.nickname)
  const won = intIn(body.won, 0, 64)
  const drawn = intIn(body.drawn, 0, 64)
  const lost = intIn(body.lost, 0, 64)

  if (!leagueId || !playerId || !nickname || won === null || drawn === null || lost === null) {
    return Response.json({ error: 'Invalid submission' }, { status: 400 })
  }
  // Derive points server-side so a forged value can't out-rank.
  const points = won * 3 + drawn

  try {
    await submitCompetitionScore({
      leagueId, playerId, nickname, points, won, drawn, lost,
      isPerfect: body.isPerfect === true,
      trophyWon: body.trophyWon === true,
    })
  } catch (err) {
    console.error('[competition-leaderboard] submit failed:', err)
    return Response.json({ error: 'Failed to record score' }, { status: 502 })
  }

  const view = await getCompetitionLeaderboard(leagueId, playerId)
  return Response.json({ ok: true, ...view })
}
