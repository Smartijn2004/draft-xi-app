import { getTeamOfWeek, recordPicks, leaderboardEnabled } from '@/lib/leaderboard'

// Community "Team of the Week": GET the most-drafted XI this week; POST the 11
// players from a finished draft to increment the week's pick counts. Anonymous
// and aggregate (no nickname). Lightly rate-limited per IP.

const POSITIONS = new Set(['GK', 'DEF', 'MID', 'FWD'])

const recent = new Map<string, number[]>()
const RATE_LIMIT = 15
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

export async function GET() {
  try {
    return Response.json(await getTeamOfWeek())
  } catch (err) {
    console.error('[team-of-week] read failed:', err)
    return Response.json({ available: false, week: '', total: 0, xi: [] })
  }
}

export async function POST(request: Request) {
  if (!leaderboardEnabled()) return Response.json({ ok: false })

  let body: { players?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) return Response.json({ error: 'Too many submissions' }, { status: 429 })

  const raw = Array.isArray(body.players) ? body.players : []
  const players = raw
    .filter((p): p is { name: string; position: string } =>
      !!p && typeof (p as { name?: unknown }).name === 'string' && POSITIONS.has((p as { position?: unknown }).position as string))
    .slice(0, 11)
    .map(p => ({ name: p.name.slice(0, 64), position: p.position }))

  if (players.length === 0) return Response.json({ error: 'No valid players' }, { status: 400 })

  try {
    await recordPicks(players)
  } catch (err) {
    console.error('[team-of-week] record failed:', err)
    return Response.json({ error: 'Failed to record picks' }, { status: 502 })
  }
  return Response.json({ ok: true })
}
