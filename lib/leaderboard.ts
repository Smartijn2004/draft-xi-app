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
type ExecResult = { cols: { name: string }[]; rows: Cell[][]; affected_row_count?: number }

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

// ── Live-event cup-win leaderboard ────────────────────────────────────────────
// A cumulative count of how many times each player has won a given event's cup,
// tracked separately per difficulty. Increments are deduplicated by a per-run
// id so the same finished run can't be counted twice (re-mounts, retries).

export type EventWinRow = { rank: number; nickname: string; wins: number }
export type EventLeaderboardView = {
  available: boolean
  total: number
  top: EventWinRow[]
  you: EventWinRow | null
}

let eventSchemaReady: Promise<void> | null = null
function ensureEventSchema(): Promise<void> {
  if (!eventSchemaReady) {
    eventSchemaReady = pipeline([
      {
        sql: `CREATE TABLE IF NOT EXISTS event_wins (
          event_id    TEXT    NOT NULL,
          difficulty  TEXT    NOT NULL,
          player_id   TEXT    NOT NULL,
          nickname    TEXT    NOT NULL,
          wins        INTEGER NOT NULL DEFAULT 0,
          updated_at  TEXT    NOT NULL,
          PRIMARY KEY (event_id, difficulty, player_id)
        )`,
      },
      { sql: `CREATE INDEX IF NOT EXISTS idx_event_rank ON event_wins (event_id, difficulty, wins DESC, updated_at ASC)` },
      { sql: `CREATE TABLE IF NOT EXISTS event_win_runs (run_id TEXT PRIMARY KEY, created_at TEXT NOT NULL)` },
    ]).then(() => undefined).catch(err => { eventSchemaReady = null; throw err })
  }
  return eventSchemaReady
}

export type EventWinSubmission = {
  event: string
  difficulty: string
  playerId: string
  nickname: string
  runId: string
}

// Records one cup win. The runId makes this idempotent: a duplicate runId is
// ignored, so the same finished run never increments the count twice.
export async function recordEventWin(s: EventWinSubmission): Promise<void> {
  if (!httpBase()) return
  await ensureEventSchema()
  const now = new Date().toISOString()
  const claim = await pipeline([{
    sql: `INSERT INTO event_win_runs (run_id, created_at) VALUES (?, ?) ON CONFLICT(run_id) DO NOTHING`,
    args: [s.runId, now],
  }])
  // Already counted (duplicate run) — nothing to do.
  if ((claim[0]?.affected_row_count ?? 0) === 0) return
  await pipeline([{
    sql: `INSERT INTO event_wins (event_id, difficulty, player_id, nickname, wins, updated_at)
          VALUES (?, ?, ?, ?, 1, ?)
          ON CONFLICT(event_id, difficulty, player_id)
          DO UPDATE SET wins = wins + 1, nickname = excluded.nickname, updated_at = excluded.updated_at`,
    args: [s.event, s.difficulty, s.playerId, s.nickname, now],
  }])
}

export async function getEventLeaderboard(
  event: string,
  difficulty: string,
  playerId: string | null,
  limit = 20,
): Promise<EventLeaderboardView> {
  if (!httpBase()) return { available: false, total: 0, top: [], you: null }
  await ensureEventSchema()

  const stmts: Stmt[] = [
    { sql: `SELECT COUNT(*) AS n FROM event_wins WHERE event_id = ? AND difficulty = ?`, args: [event, difficulty] },
    {
      sql: `SELECT nickname, wins FROM event_wins
            WHERE event_id = ? AND difficulty = ? ORDER BY wins DESC, updated_at ASC LIMIT ?`,
      args: [event, difficulty, limit],
    },
  ]
  if (playerId) {
    stmts.push({
      sql: `SELECT nickname, wins FROM event_wins WHERE event_id = ? AND difficulty = ? AND player_id = ?`,
      args: [event, difficulty, playerId],
    })
    stmts.push({
      sql: `SELECT COUNT(*) + 1 AS rank FROM event_wins o
            WHERE o.event_id = ? AND o.difficulty = ? AND EXISTS (
              SELECT 1 FROM event_wins me
              WHERE me.event_id = ? AND me.difficulty = ? AND me.player_id = ? AND (
                o.wins > me.wins
                OR (o.wins = me.wins AND o.updated_at < me.updated_at)
              ))`,
      args: [event, difficulty, event, difficulty, playerId],
    })
  }

  const results = await pipeline(stmts)
  const total = Number(rowsOf(results[0])[0]?.n ?? 0)
  const top = rowsOf(results[1]).map((r, i): EventWinRow => ({
    rank: i + 1, nickname: String(r.nickname ?? ''), wins: Number(r.wins ?? 0),
  }))

  let you: EventWinRow | null = null
  if (playerId && results[2] && results[3]) {
    const meRows = rowsOf(results[2])
    if (meRows.length > 0) {
      const rank = Number(rowsOf(results[3])[0]?.rank ?? top.length + 1)
      you = { rank, nickname: String(meRows[0].nickname ?? ''), wins: Number(meRows[0].wins ?? 0) }
    }
  }

  return { available: true, total, top, you }
}

// ── Per-competition best-season leaderboard ───────────────────────────────────
// One row per (competition, player): the player's single best season in that
// league, ranked by points. Reuses the daily board's row/view shape.

let compSchemaReady: Promise<void> | null = null
function ensureCompetitionSchema(): Promise<void> {
  if (!compSchemaReady) {
    compSchemaReady = pipeline([
      {
        sql: `CREATE TABLE IF NOT EXISTS competition_scores (
          league_id   TEXT    NOT NULL,
          player_id   TEXT    NOT NULL,
          nickname    TEXT    NOT NULL,
          points      INTEGER NOT NULL,
          won         INTEGER NOT NULL,
          drawn       INTEGER NOT NULL,
          lost        INTEGER NOT NULL,
          is_perfect  INTEGER NOT NULL DEFAULT 0,
          trophy_won  INTEGER NOT NULL DEFAULT 0,
          updated_at  TEXT    NOT NULL,
          PRIMARY KEY (league_id, player_id)
        )`,
      },
      { sql: `CREATE INDEX IF NOT EXISTS idx_comp_rank ON competition_scores (league_id, points DESC, won DESC, lost ASC, updated_at ASC)` },
    ]).then(() => undefined).catch(err => { compSchemaReady = null; throw err })
  }
  return compSchemaReady
}

export type CompetitionSubmission = {
  leagueId: string
  playerId: string
  nickname: string
  points: number
  won: number
  drawn: number
  lost: number
  isPerfect: boolean
  trophyWon: boolean
}

// Records a season, keeping only the player's best (highest points, then wins)
// for that competition.
export async function submitCompetitionScore(s: CompetitionSubmission): Promise<void> {
  if (!httpBase()) return
  await ensureCompetitionSchema()
  await pipeline([{
    sql: `INSERT INTO competition_scores
            (league_id, player_id, nickname, points, won, drawn, lost, is_perfect, trophy_won, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(league_id, player_id) DO UPDATE SET
            nickname = excluded.nickname, points = excluded.points, won = excluded.won,
            drawn = excluded.drawn, lost = excluded.lost, is_perfect = excluded.is_perfect,
            trophy_won = excluded.trophy_won, updated_at = excluded.updated_at
          WHERE excluded.points > competition_scores.points
             OR (excluded.points = competition_scores.points AND excluded.won > competition_scores.won)`,
    args: [
      s.leagueId, s.playerId, s.nickname, s.points, s.won, s.drawn, s.lost,
      s.isPerfect ? 1 : 0, s.trophyWon ? 1 : 0, new Date().toISOString(),
    ],
  }])
}

export async function getCompetitionLeaderboard(
  leagueId: string,
  playerId: string | null,
  limit = 20,
): Promise<LeaderboardView> {
  if (!httpBase()) return { available: false, total: 0, top: [], you: null }
  await ensureCompetitionSchema()

  // competition_scores tiebreaks on updated_at (it has no created_at column).
  const compOrder = 'points DESC, won DESC, lost ASC, updated_at ASC'
  const stmts: Stmt[] = [
    { sql: `SELECT COUNT(*) AS n FROM competition_scores WHERE league_id = ?`, args: [leagueId] },
    {
      sql: `SELECT nickname, points, won, drawn, lost, is_perfect, trophy_won
            FROM competition_scores WHERE league_id = ? ORDER BY ${compOrder} LIMIT ?`,
      args: [leagueId, limit],
    },
  ]
  if (playerId) {
    stmts.push({
      sql: `SELECT nickname, points, won, drawn, lost, is_perfect, trophy_won
            FROM competition_scores WHERE league_id = ? AND player_id = ?`,
      args: [leagueId, playerId],
    })
    stmts.push({
      sql: `SELECT COUNT(*) + 1 AS rank FROM competition_scores o
            WHERE o.league_id = ? AND EXISTS (
              SELECT 1 FROM competition_scores me
              WHERE me.league_id = ? AND me.player_id = ? AND (
                o.points > me.points
                OR (o.points = me.points AND o.won > me.won)
                OR (o.points = me.points AND o.won = me.won AND o.lost < me.lost)
                OR (o.points = me.points AND o.won = me.won AND o.lost = me.lost AND o.updated_at < me.updated_at)
              ))`,
      args: [leagueId, leagueId, playerId],
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

// ── Team of the Week — most-drafted players this week ─────────────────────────
// Every finished draft (any mode) increments a pick count per player for the
// current week; the community XI is the most-drafted player per slot. Anonymous
// and aggregate — no nickname needed.

export type TotwRow = { name: string; position: string; picks: number }
export type TeamOfWeek = { available: boolean; week: string; total: number; xi: TotwRow[] }

// UTC Monday of the current week, as a YYYY-MM-DD key. Server-authoritative so
// reads and writes always target the same window.
export function currentWeekKey(): string {
  const d = new Date()
  const mondayOffset = (d.getUTCDay() + 6) % 7 // Mon = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - mondayOffset))
  return monday.toISOString().slice(0, 10)
}

let totwSchemaReady: Promise<void> | null = null
function ensureTotwSchema(): Promise<void> {
  if (!totwSchemaReady) {
    totwSchemaReady = pipeline([
      {
        sql: `CREATE TABLE IF NOT EXISTS player_picks (
          week     TEXT    NOT NULL,
          name     TEXT    NOT NULL,
          position TEXT    NOT NULL,
          picks    INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (week, name)
        )`,
      },
      { sql: `CREATE INDEX IF NOT EXISTS idx_totw ON player_picks (week, position, picks DESC)` },
    ]).then(() => undefined).catch(err => { totwSchemaReady = null; throw err })
  }
  return totwSchemaReady
}

export async function recordPicks(players: { name: string; position: string }[]): Promise<void> {
  if (!httpBase() || players.length === 0) return
  await ensureTotwSchema()
  const week = currentWeekKey()
  await pipeline(players.map(p => ({
    sql: `INSERT INTO player_picks (week, name, position, picks) VALUES (?, ?, ?, 1)
          ON CONFLICT(week, name) DO UPDATE SET picks = picks + 1`,
    args: [week, p.name, p.position],
  })))
}

export async function getTeamOfWeek(): Promise<TeamOfWeek> {
  if (!httpBase()) return { available: false, week: '', total: 0, xi: [] }
  await ensureTotwSchema()
  const week = currentWeekKey()
  const want: [string, number][] = [['GK', 1], ['DEF', 4], ['MID', 3], ['FWD', 3]]
  const stmts: Stmt[] = [
    { sql: `SELECT COUNT(*) AS n FROM player_picks WHERE week = ?`, args: [week] },
    ...want.map(([pos, lim]) => ({
      sql: `SELECT name, position, picks FROM player_picks WHERE week = ? AND position = ? ORDER BY picks DESC, name LIMIT ?`,
      args: [week, pos, lim] as SqlArg[],
    })),
  ]
  const res = await pipeline(stmts)
  const total = Number(rowsOf(res[0])[0]?.n ?? 0)
  const xi: TotwRow[] = []
  for (let i = 1; i < res.length; i++) {
    for (const r of rowsOf(res[i])) xi.push({ name: String(r.name ?? ''), position: String(r.position ?? ''), picks: Number(r.picks ?? 0) })
  }
  return { available: true, week, total, xi }
}

// ── Head-to-head challenges ───────────────────────────────────────────────────
// A saved XI under a short id, so a friend can open a link and duel it.

export type H2HTeamPlayer = { name: string; rating: number; position: string }
export type H2HChallenge = { id: string; nickname: string; mode: string; rating: number; team: H2HTeamPlayer[] }

let h2hSchemaReady: Promise<void> | null = null
function ensureH2HSchema(): Promise<void> {
  if (!h2hSchemaReady) {
    h2hSchemaReady = pipeline([{
      sql: `CREATE TABLE IF NOT EXISTS h2h_challenges (
        id         TEXT PRIMARY KEY,
        nickname   TEXT NOT NULL,
        mode       TEXT NOT NULL,
        rating     REAL NOT NULL,
        team_json  TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    }]).then(() => undefined).catch(err => { h2hSchemaReady = null; throw err })
  }
  return h2hSchemaReady
}

export async function createChallenge(c: Omit<H2HChallenge, 'id'>): Promise<string | null> {
  if (!httpBase()) return null
  await ensureH2HSchema()
  const id = Math.random().toString(36).slice(2, 10)
  await pipeline([{
    sql: `INSERT INTO h2h_challenges (id, nickname, mode, rating, team_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, c.nickname, c.mode, c.rating, JSON.stringify(c.team), new Date().toISOString()],
  }])
  return id
}

export async function getChallenge(id: string): Promise<H2HChallenge | null> {
  if (!httpBase()) return null
  await ensureH2HSchema()
  const res = await pipeline([{
    sql: `SELECT id, nickname, mode, rating, team_json FROM h2h_challenges WHERE id = ?`,
    args: [id],
  }])
  const r = rowsOf(res[0])[0]
  if (!r) return null
  let team: H2HTeamPlayer[] = []
  try { team = JSON.parse(String(r.team_json ?? '[]')) } catch { /* keep empty */ }
  return { id: String(r.id), nickname: String(r.nickname ?? ''), mode: String(r.mode ?? ''), rating: Number(r.rating ?? 0), team }
}
