// Anonymous, accountless identity for the global leaderboard. A random id is
// generated once per device and a nickname is chosen the first time a player
// submits a score. No email, no login — just enough to attribute entries.

const ID_KEY = 'draftxi:playerId'
const NICK_KEY = 'draftxi:nickname'

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {
    // fall through to the Math.random fallback below
  }
  return 'p-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getPlayerId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.localStorage.getItem(ID_KEY)
    if (!id) {
      id = randomId()
      window.localStorage.setItem(ID_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

export function getNickname(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(NICK_KEY)
  } catch {
    return null
  }
}

export function setNickname(name: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NICK_KEY, name)
  } catch {
    // private mode — leaderboard submit will just be skipped
  }
}
