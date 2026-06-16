import { getLeaderboard, submitScore, leaderboardEnabled } from '@/lib/leaderboard'

// Daily challenge leaderboard. GET reads the board for a date; POST records a
// player's result. Scores are trusted from the client (casual hobby game) but
// validated/clamped, and writes are lightly rate-limited per IP.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_NICK = 24

const recent = new Map<string, number[]>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_LIMIT) return true
  hits.push(now)
  recent.set(ip, hits)
  return false
}

function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  // Drop control chars (code < 32 and DEL=127), collapse whitespace, cap length.
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
  const date = searchParams.get('date') ?? ''
  if (!DATE_RE.test(date)) {
    return Response.json({ error: 'Invalid date' }, { status: 400 })
  }
  const playerId = searchParams.get('playerId')?.slice(0, 64) || null
  const debug = searchParams.get('debug') === '1'
  try {
    const view = await getLeaderboard(date, playerId)
    if (debug) {
      return Response.json({
        ...view,
        _debug: { enabled: leaderboardEnabled(), hasUrl: !!process.env.TURSO_DATABASE_URL, hasToken: !!process.env.TURSO_AUTH_TOKEN },
      })
    }
    return Response.json(view)
  } catch (err) {
    // Don't 500 the client — hide the board and log for diagnosis instead.
    console.error('[leaderboard] read failed:', err)
    if (debug) {
      const raw = process.env.TURSO_DATABASE_URL?.trim() ?? ''
      let host = '', scheme = ''
      try { const u = new URL(raw); scheme = u.protocol; host = u.host } catch { scheme = '(unparseable)' }
      return Response.json({
        available: false, total: 0, top: [], you: null,
        _debug: {
          marker: 'v2-scheme-norm',
          error: err instanceof Error ? err.message : String(err),
          cause: err instanceof Error && err.cause ? String((err.cause as Error)?.message ?? err.cause) : null,
          rawScheme: scheme, host,
          urlLen: raw.length, tokenLen: (process.env.TURSO_AUTH_TOKEN?.trim() ?? '').length,
        },
      }, { status: 200 })
    }
    return Response.json({ available: false, total: 0, top: [], you: null })
  }
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

  const date = typeof body.date === 'string' && DATE_RE.test(body.date) ? body.date : null
  const playerId = typeof body.playerId === 'string' ? body.playerId.slice(0, 64) : null
  const nickname = cleanNickname(body.nickname)
  // Generous bounds — covers leagues (38 games) and any tournament length.
  const won = intIn(body.won, 0, 64)
  const drawn = intIn(body.drawn, 0, 64)
  const lost = intIn(body.lost, 0, 64)
  const points = intIn(body.points, 0, 999)

  if (!date || !playerId || !nickname || won === null || drawn === null || lost === null || points === null) {
    return Response.json({ error: 'Invalid submission' }, { status: 400 })
  }

  try {
    await submitScore({
      date, playerId, nickname, points, won, drawn, lost,
      isPerfect: body.isPerfect === true,
      trophyWon: body.trophyWon === true,
    })
  } catch (err) {
    console.error('[leaderboard] submit failed:', err)
    return Response.json({ error: 'Failed to record score' }, { status: 502 })
  }

  const view = await getLeaderboard(date, playerId)
  return Response.json({ ok: true, ...view })
}
