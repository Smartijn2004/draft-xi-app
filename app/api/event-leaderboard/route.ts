import {
  getEventLeaderboard, recordEventWin, leaderboardEnabled,
} from '@/lib/leaderboard'

// Live-event cup-win leaderboard. GET reads the per-difficulty board; POST
// records one cup win (idempotent via runId). Same trust model as the daily
// board — validated/clamped, rate-limited per IP.

const EVENTS = new Set(['worldcup2026'])
const DIFFICULTIES = new Set(['easy', 'normal', 'hard'])
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const event = searchParams.get('event') ?? ''
  const difficulty = searchParams.get('difficulty') ?? ''
  if (!EVENTS.has(event) || !DIFFICULTIES.has(difficulty)) {
    return Response.json({ error: 'Invalid event or difficulty' }, { status: 400 })
  }
  const playerId = searchParams.get('playerId')?.slice(0, 64) || null
  const view = await getEventLeaderboard(event, difficulty, playerId)
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

  const event = typeof body.event === 'string' && EVENTS.has(body.event) ? body.event : null
  const difficulty = typeof body.difficulty === 'string' && DIFFICULTIES.has(body.difficulty) ? body.difficulty : null
  const playerId = typeof body.playerId === 'string' ? body.playerId.slice(0, 64) : null
  const runId = typeof body.runId === 'string' ? body.runId.slice(0, 64) : null
  const nickname = cleanNickname(body.nickname)

  if (!event || !difficulty || !playerId || !runId || !nickname) {
    return Response.json({ error: 'Invalid submission' }, { status: 400 })
  }

  try {
    await recordEventWin({ event, difficulty, playerId, nickname, runId })
  } catch (err) {
    console.error('[event-leaderboard] record failed:', err)
    return Response.json({ error: 'Failed to record win' }, { status: 502 })
  }

  const view = await getEventLeaderboard(event, difficulty, playerId)
  return Response.json({ ok: true, ...view })
}
