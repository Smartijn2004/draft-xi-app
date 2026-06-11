const VALID_TYPES = ['suggestion', 'bug', 'other'] as const
const MAX_MESSAGE_LENGTH = 2000

// Per-instance only — on serverless each instance has its own map, which is
// fine as a light abuse guard for a hobby project.
const recentSubmissions = new Map<string, number[]>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (recentSubmissions.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT) return true
  timestamps.push(now)
  recentSubmissions.set(ip, timestamps)
  return false
}

async function forwardToWebhook(url: string, type: string, message: string) {
  const formatted = `**New feedback** (${type})\n${message}`
  // Discord expects { content }, Slack expects { text }
  const payload = url.includes('hooks.slack.com')
    ? { text: formatted }
    : { content: formatted }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Webhook responded ${res.status}`)
}

export async function POST(request: Request) {
  let body: { type?: unknown; message?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const type = typeof body.type === 'string' && (VALID_TYPES as readonly string[]).includes(body.type)
    ? body.type
    : 'other'
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!message) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: `Message must be under ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return Response.json({ error: 'Too many submissions, please try again later' }, { status: 429 })
  }

  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL
  if (webhookUrl) {
    try {
      await forwardToWebhook(webhookUrl, type, message)
    } catch (err) {
      // Still log it so the feedback isn't lost, but tell the client it failed
      console.error('[feedback] webhook delivery failed:', err)
      console.log('[feedback]', { type, message })
      return Response.json({ error: 'Failed to deliver feedback' }, { status: 502 })
    }
  } else {
    // No webhook configured — server log is the inbox
    console.log('[feedback]', { type, message })
  }

  return Response.json({ ok: true })
}
