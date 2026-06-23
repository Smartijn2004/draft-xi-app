// Builds a shareable "season card" PNG entirely client-side: we render a
// self-contained SVG (no external fonts/images, so the canvas never taints)
// and rasterise it via an <img> + canvas. No dependencies.

export type SeasonCard = {
  modeLabel: string            // e.g. "PREMIER LEAGUE" or "DAILY #12 · LA LIGA"
  headline: string             // e.g. "PERFECT SEASON", "CHAMPIONS", "3RD PLACE"
  accent: string
  pts: number
  won: number
  drawn: number
  lost: number
  gd: number
  teamRating: number
  pots?: string                // player of the season
  team: { name: string; rating: number; position: 'GK' | 'DEF' | 'MID' | 'FWD' }[]
}

const W = 1080
const H = 1350

function lastName(n: string): string {
  const parts = n.trim().split(' ')
  return parts.length > 1 ? parts[parts.length - 1] : n
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function ratingColor(r: number): string {
  if (r >= 90) return '#22c55e'
  if (r >= 85) return '#84cc16'
  if (r >= 80) return '#eab308'
  return '#f97316'
}

function pitchRows(team: SeasonCard['team']): SeasonCard['team'][] {
  const by: Record<string, SeasonCard['team']> = { GK: [], DEF: [], MID: [], FWD: [] }
  for (const p of team) (by[p.position] ?? (by[p.position] = [])).push(p)
  // Top of pitch = attackers, bottom = keeper.
  return [by.FWD, by.MID, by.DEF, by.GK].filter(row => row.length > 0)
}

export function buildSeasonCardSVG(c: SeasonCard): string {
  const accent = c.accent
  // Pitch geometry
  const pitchX = 60, pitchY = 500, pitchW = W - 120, pitchH = 660
  const rows = pitchRows(c.team)
  const rowGap = pitchH / (rows.length + 0.4)

  const chips: string[] = []
  rows.forEach((row, ri) => {
    const cy = pitchY + rowGap * (ri + 0.7)
    const slot = pitchW / row.length
    row.forEach((p, i) => {
      const cx = pitchX + slot * (i + 0.5)
      chips.push(`
        <circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="34" fill="${ratingColor(p.rating)}" />
        <text x="${cx.toFixed(0)}" y="${(cy + 11).toFixed(0)}" text-anchor="middle" font-size="30" font-weight="800" fill="#06120a">${p.rating}</text>
        <text x="${cx.toFixed(0)}" y="${(cy + 66).toFixed(0)}" text-anchor="middle" font-size="24" font-weight="700" fill="#ffffff">${esc(lastName(p.name))}</text>`)
    })
  })

  const statBox = (x: number, label: string, value: string) => `
    <text x="${x}" y="430" text-anchor="middle" font-size="64" font-weight="900" fill="#ffffff">${esc(value)}</text>
    <text x="${x}" y="466" text-anchor="middle" font-size="24" font-weight="700" fill="#94a3b8" letter-spacing="3">${esc(label)}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif">
  <rect width="${W}" height="${H}" fill="#0a0a0f"/>
  <rect width="${W}" height="14" fill="${accent}"/>
  <text x="60" y="130" font-size="78" font-weight="900" fill="#ffffff">Draft <tspan fill="${accent}">XI</tspan></text>
  <text x="64" y="172" font-size="26" font-weight="800" letter-spacing="10" fill="${accent}">INVINCIBLES</text>
  <text x="60" y="250" font-size="34" font-weight="800" letter-spacing="4" fill="#94a3b8">${esc(c.modeLabel)}</text>
  <text x="60" y="340" font-size="60" font-weight="900" fill="${accent}">${esc(c.headline)}</text>
  ${statBox(190, 'POINTS', String(c.pts))}
  ${statBox(540, 'W · D · L', `${c.won}-${c.drawn}-${c.lost}`)}
  ${statBox(890, 'GOAL DIFF', `${c.gd > 0 ? '+' : ''}${c.gd}`)}
  <rect x="${pitchX}" y="${pitchY}" width="${pitchW}" height="${pitchH}" rx="24" fill="#15803d"/>
  <rect x="${pitchX}" y="${pitchY}" width="${pitchW}" height="${pitchH}" rx="24" fill="url(#stripes)" opacity="0.18"/>
  <line x1="${pitchX}" y1="${pitchY + pitchH / 2}" x2="${pitchX + pitchW}" y2="${pitchY + pitchH / 2}" stroke="#ffffff" stroke-opacity="0.25" stroke-width="3"/>
  <circle cx="${W / 2}" cy="${pitchY + pitchH / 2}" r="70" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="3"/>
  ${chips.join('')}
  <text x="60" y="1250" font-size="28" font-weight="700" fill="#cbd5e1">Squad rating ${c.teamRating.toFixed(1)}${c.pots ? `  ·  ⭐ ${esc(c.pots)}` : ''}</text>
  <text x="60" y="1300" font-size="26" font-weight="700" fill="${accent}">draft-xi-invincibles.vercel.app</text>
  <defs>
    <pattern id="stripes" width="120" height="10" patternUnits="userSpaceOnUse">
      <rect width="60" height="10" fill="#ffffff"/>
    </pattern>
  </defs>
</svg>`
}

function svgToPngBlob(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no 2d context'))
      ctx.drawImage(img, 0, 0, W, H)
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    }
    img.onerror = () => reject(new Error('svg load failed'))
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

// Share the card via the native share sheet if files are supported, else
// download it. Returns how it was delivered (for UI feedback).
export async function shareSeasonCard(card: SeasonCard, text: string): Promise<'shared' | 'downloaded'> {
  const blob = await svgToPngBlob(buildSeasonCardSVG(card))
  const file = new File([blob], 'draft-xi-season.png', { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], text, title: 'Draft XI' })
      return 'shared'
    } catch { /* user cancelled or share failed — fall back to download */ }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'draft-xi-season.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
