import 'server-only'

// Daily-challenge leaderboard backed by Turso, talking to its HTTP API
// (the Hrana /v2/pipeline endpoint) directly with fetch. We deliberately avoid
// @libsql/client: its native entry needs a platform-specific binary that isn't
// in a Windows-generated lockfile, and its /web entry hit an undici
// "expected non-null body source" bug on Vercel's Node runtime. Raw fetch
// against the documented JSON API sidesteps both.
//
// The whole feature degrades gracefully: with no TURSO_* env vars every
// function returns an "unavailable" result instead of throwing, so the rest of
// the app keeps working and the UI just hides itself.

export type LeaderboardRow = {
  rank: number
  nickname: string
  points: number
  won: number
  drawn: number
  lost: number
  isPerfect: boolean
  trophyWon: boolean
}

export type LeaderboardView = {
  available: boolean
  total: number
  top: LeaderboardRow[]
  you: LeaderboardRow | null
}

export type ScoreSubmission = {
  date: string
  playerId: string
  nickname: string
  points: number
  won: number
  drawn: number
  lost: number
  isPerfect: boolean
  trophyWon: boolean
}

// Tiebreakers, in order: more points, then more wins, then fewer losses, then
// who got there first.
const ORDER_BY = 'points DESC, won DESC, lost ASC, created_at ASC'

export function leaderboardEnabled(): boolean {
  return !!process.env.TURSO_DATABASE_URL
}

function httpBase(): string | null {
  const raw = process.env.TURSO_DATABASE_URL?.trim()
  if (!raw) return null
  // Turso hands out libsql:// URLs; the HTTP API lives at the https:// host.
  if (raw.startsWith('libsql://')) return 'https://' + raw.slice('libsql://'.length)
  return raw
}

type SqlArg = string | number | boolean | null
type Stmt = { sql: string; args?: SqlArg[] }

function encodeArg(v: SqlArg): { type: string; value?: string } {
  if (v === null) return { type: 'null' }
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' }
  if (typeof v === 'number') return { type: 'integer', value: String(Math.trunc(v)) }
  return { type: 'text', value: v }
}

type Cell = { type: string; value?: string } | null
type ExecResult = { cols: { name: string }[]; rows: Cell[][] }

function cellValue(c: Cell): string | number | null {
  if (!c || c.type === 'null') return null
  if (c.type === 'integer') return Number(c.value)
  if (c.type === 'float') return Number(c.value)
  return c.value ?? null
}

function rowsOf(result: ExecResult): Record<string, string | number | null>[] {
  const names = result.cols.map(c => c.name)
  return result.rows.map(r => {
    const o: Record<string, string | number | null> = {}
    r.forEach((cell, i) => { o[names[i]] = cellValue(cell) })
    return o
  })
}

// Runs a batch of statements in one round trip and returns each execute's
// result. Throws on transport/SQL errors (callers decide how to surface them).
async function pipeline(stmts: Stmt[]): Promise<ExecResult[]> {
  const base = httpBase()
  const token = process.env.TURSO_AUTH_TOKEN?.trim()
  if (!base) throw new Error('leaderboard not configured')

  const requests: unknown[] = stmts.map(s => ({
    type: 'execute',
    stmt: { sql: s.sql, args: (s.args ?? []).map(encodeArg) },
  }))
  requests.push({ type: 'close' })

  const res = await fetch(base + '/v2/pipeline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ requests }),
  })
  if (!res.ok) {
    throw new Error(`Turso HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const data = (await res.json()) as {
    results: { type: string; response?: { result?: ExecResult }; error?: { message?: string } }[]
  }
  const out: ExecResult[] = []
  for (const r of data.results) {
    if (r.type === 'error') throw new Error(r.error?.message ?? 'Turso statement error')
    if (r.response?.result) out.push(r.response.result)
  }
  return out
}

let schemaReady: Promise<void> | null = null
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pipeline([
      {
        sql: `CREATE TABLE IF NOT EXISTS daily_scores (
          date        TEXT    NOT NULL,
          player_id   TEXT    NOT NULL,
          nickname    TEXT    NOT NULL,
          points      INTEGER NOT NULL,
          won         INTEGER NOT NULL,
          drawn       INTEGER NOT NULL,
          lost        INTEGER NOT NULL,
          is_perfect  INTEGER NOT NULL DEFAULT 0,
          trophy_won  INTEGER NOT NULL DEFAULT 0,
          created_at  TEXT    NOT NULL,
          PRIMARY KEY (date, player_id)
        )`,
      },
      { sql: `CREATE INDEX IF NOT EXISTS idx_daily_rank ON daily_scores (date, points DESC, won DESC, lost ASC, created_at ASC)` },
    ]).then(() => undefined).catch(err => { schemaReady = null; throw err })
  }
  return schemaReady
}

// Records a player's daily result. One attempt per day is kept (first write
// wins) to mirror the game's "one attempt per day" rule.
export async function submitScore(s: ScoreSubmission): Promise<void> {
  if (!httpBase()) return
  await ensureSchema()
  await pipeline([{
    sql: `INSERT INTO daily_scores
            (date, player_id, nickname, points, won, drawn, lost, is_perfect, trophy_won, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(date, player_id) DO NOTHING`,
    args: [
      s.date, s.playerId, s.nickname, s.points, s.won, s.drawn, s.lost,
      s.isPerfect ? 1 : 0, s.trophyWon ? 1 : 0, new Date().toISOString(),
    ],
  }])
}

function toRow(r: Record<string, string | number | null>, rank: number): LeaderboardRow {
  return {
    rank,
    nickname: String(r.nickname ?? ''),
    points: Number(r.points ?? 0),
    won: Number(r.won ?? 0),
    drawn: Number(r.drawn ?? 0),
    lost: Number(r.lost ?? 0),
    isPerfect: Number(r.is_perfect ?? 0) === 1,
    trophyWon: Number(r.trophy_won ?? 0) === 1,
  }
}

export async function getLeaderboard(
  date: string,
  playerId: string | null,
  limit = 20,
): Promise<LeaderboardView> {
  if (!httpBase()) return { available: false, total: 0, top: [], you: null }
  await ensureSchema()

  const stmts: Stmt[] = [
    { sql: `SELECT COUNT(*) AS n FROM daily_scores WHERE date = ?`, args: [date] },
    {
      sql: `SELECT nickname, points, won, drawn, lost, is_perfect, trophy_won
            FROM daily_scores WHERE date = ? ORDER BY ${ORDER_BY} LIMIT ?`,
      args: [date, limit],
    },
  ]
  if (playerId) {
    stmts.push({
      sql: `SELECT nickname, points, won, drawn, lost, is_perfect, trophy_won
            FROM daily_scores WHERE date = ? AND player_id = ?`,
      args: [date, playerId],
    })
    // Rank computed in SQL via a correlated reference to the player's own row,
    // so we don't need a second round trip.
    stmts.push({
      sql: `SELECT COUNT(*) + 1 AS rank FROM daily_scores o
            WHERE o.date = ? AND EXISTS (
              SELECT 1 FROM daily_scores me
              WHERE me.date = ? AND me.player_id = ? AND (
                o.points > me.points
                OR (o.points = me.points AND o.won > me.won)
                OR (o.points = me.points AND o.won = me.won AND o.lost < me.lost)
                OR (o.points = me.points AND o.won = me.won AND o.lost = me.lost AND o.created_at < me.created_at)
              ))`,
      args: [date, date, playerId],
    })
  }

  const results = await pipeline(stmts)
  const total = Number(rowsOf(results[0])[0]?.n ?? 0)
  const top = rowsOf(results[1]).map((r, i) => toRow(r, i + 1))

  let you: LeaderboardRow | null = null
  if (playerId && results[2] && results[3]) {
    const meRows = rowsOf(results[2])
    if (meRows.length > 0) {
      const rank = Number(rowsOf(results[3])[0]?.rank ?? top.length + 1)
      you = toRow(meRows[0], rank)
    }
  }

  return { available: true, total, top, you }
}
