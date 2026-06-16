import 'server-only'
// HTTP-only client (no native bindings) — the default '@libsql/client' entry
// pulls a platform-specific native module, which breaks on Vercel's Linux
// runtime when the lockfile was generated on another OS. The web client talks
// to Turso over HTTPS and works the same with libsql:// URLs.
import { createClient, type Client } from '@libsql/client/web'

// Daily-challenge leaderboard, backed by Turso (libSQL). The whole feature
// degrades gracefully: if the env vars aren't set (e.g. local dev before
// provisioning) every function returns an "unavailable" result instead of
// throwing, so the rest of the app keeps working and the UI just hides itself.

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
// who got there first. Used identically by the rank query and the top-N sort.
const ORDER_BY = 'points DESC, won DESC, lost ASC, created_at ASC'

let client: Client | null = null
let schemaReady: Promise<void> | null = null

function getClient(): Client | null {
  if (client) return client
  const raw = process.env.TURSO_DATABASE_URL?.trim()
  if (!raw) return null
  // The HTTP web client talks over fetch, which only understands http(s).
  // Turso hands out libsql:// URLs, so map the scheme explicitly rather than
  // relying on the client to do it (avoids "fetch failed" on serverless).
  const url = raw.startsWith('libsql://') ? 'https://' + raw.slice('libsql://'.length) : raw
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim()
  client = createClient({ url, authToken })
  return client
}

async function ensureSchema(db: Client): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS daily_scores (
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
        )
      `)
      await db.execute(
        `CREATE INDEX IF NOT EXISTS idx_daily_rank ON daily_scores (date, points DESC, won DESC, lost ASC, created_at ASC)`,
      )
    })().catch(err => {
      schemaReady = null // allow a retry on the next request
      throw err
    })
  }
  return schemaReady
}

export function leaderboardEnabled(): boolean {
  return !!process.env.TURSO_DATABASE_URL
}

// Records a player's daily result. One attempt per day is kept (first write
// wins) to mirror the game's "one attempt per day" rule.
export async function submitScore(s: ScoreSubmission): Promise<void> {
  const db = getClient()
  if (!db) return
  await ensureSchema(db)
  await db.execute({
    sql: `INSERT INTO daily_scores
            (date, player_id, nickname, points, won, drawn, lost, is_perfect, trophy_won, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(date, player_id) DO NOTHING`,
    args: [
      s.date, s.playerId, s.nickname, s.points, s.won, s.drawn, s.lost,
      s.isPerfect ? 1 : 0, s.trophyWon ? 1 : 0, new Date().toISOString(),
    ],
  })
}

type DbRow = {
  nickname: string; points: number; won: number; drawn: number; lost: number
  is_perfect: number; trophy_won: number; created_at: string
}

function toRow(r: DbRow, rank: number): LeaderboardRow {
  return {
    rank,
    nickname: r.nickname,
    points: r.points,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    isPerfect: !!r.is_perfect,
    trophyWon: !!r.trophy_won,
  }
}

export async function getLeaderboard(
  date: string,
  playerId: string | null,
  limit = 20,
): Promise<LeaderboardView> {
  const db = getClient()
  if (!db) return { available: false, total: 0, top: [], you: null }
  await ensureSchema(db)

  const totalRes = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM daily_scores WHERE date = ?`,
    args: [date],
  })
  const total = Number(totalRes.rows[0]?.n ?? 0)

  const topRes = await db.execute({
    sql: `SELECT nickname, points, won, drawn, lost, is_perfect, trophy_won, created_at
          FROM daily_scores WHERE date = ? ORDER BY ${ORDER_BY} LIMIT ?`,
    args: [date, limit],
  })
  const top = topRes.rows.map((r, i) => toRow(r as unknown as DbRow, i + 1))

  let you: LeaderboardRow | null = null
  if (playerId) {
    const meRes = await db.execute({
      sql: `SELECT nickname, points, won, drawn, lost, is_perfect, trophy_won, created_at
            FROM daily_scores WHERE date = ? AND player_id = ?`,
      args: [date, playerId],
    })
    const me = meRes.rows[0] as unknown as DbRow | undefined
    if (me) {
      // Rank = (rows strictly ahead of me under the tiebreak order) + 1.
      const rankRes = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM daily_scores
              WHERE date = ? AND (
                points > ?
                OR (points = ? AND won > ?)
                OR (points = ? AND won = ? AND lost < ?)
                OR (points = ? AND won = ? AND lost = ? AND created_at < ?)
              )`,
        args: [
          date,
          me.points,
          me.points, me.won,
          me.points, me.won, me.lost,
          me.points, me.won, me.lost, me.created_at,
        ],
      })
      const ahead = Number(rankRes.rows[0]?.n ?? 0)
      you = toRow(me, ahead + 1)
    }
  }

  return { available: true, total, top, you }
}
