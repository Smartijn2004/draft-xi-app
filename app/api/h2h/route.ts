import { createChallenge, getChallenge, leaderboardEnabled, type H2HTeamPlayer } from '@/lib/leaderboard'

// Head-to-head: POST saves an XI as a challenge (returns a short id); GET ?id=
// fetches it so a friend can duel it. Validated/clamped, rate-limited per IP.

const POSITIONS = new Set(['GK', 'DEF', 'MID', 'FWD'])
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

function cleanNick(raw: unknown): string {
  if (typeof raw !== 'string') return 'Anonymous'
  const n = Array.from(raw).filter(ch => { const c = ch.charCodeAt(0); return c >= 32 && c !== 127 })
    .join('').replace(/\s+/g, ' ').trim().slice(0, MAX_NICK)
  return n || 'Anonymous'
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.slice(0, 16) ?? ''
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  try {
    const challenge = await getChallenge(id)
    if (!challenge) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json(challenge)
  } catch (err) {
    console.error('[h2h] read failed:', err)
    return Response.json({ error: 'Failed to load' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  if (!leaderboardEnabled()) return Response.json({ error: 'Unavailable' }, { status: 503 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) return Response.json({ error: 'Too many submissions' }, { status: 429 })

  const rawTeam = Array.isArray(body.team) ? body.team : []
  const team: H2HTeamPlayer[] = rawTeam
    .filter((p): p is { name: string; rating: number; position: string } =>
      !!p && typeof (p as { name?: unknown }).name === 'string'
      && typeof (p as { rating?: unknown }).rating === 'number'
      && POSITIONS.has((p as { position?: unknown }).position as string))
    .slice(0, 11)
    .map(p => ({ name: p.name.slice(0, 48), rating: Math.max(0, Math.min(99, Math.round(p.rating))), position: p.position }))

  if (team.length < 11) return Response.json({ error: 'Need a full XI' }, { status: 400 })

  const nickname = cleanNick(body.nickname)
  const mode = typeof body.mode === 'string' ? body.mode.slice(0, 40) : 'Draft XI'
  const rating = typeof body.rating === 'number' ? Math.max(0, Math.min(99, body.rating)) : 0

  try {
    const id = await createChallenge({ nickname, mode, rating, team })
    if (!id) return Response.json({ error: 'Unavailable' }, { status: 503 })
    return Response.json({ ok: true, id })
  } catch (err) {
    console.error('[h2h] create failed:', err)
    return Response.json({ error: 'Failed to save' }, { status: 502 })
  }
}
