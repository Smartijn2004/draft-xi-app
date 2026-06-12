// Audits lib/data/*.ts for duplicate club-season entries and duplicate player ids.
// Relies on the regular one-line format of club headers and player rows.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'data')
const files = readdirSync(dataDir).filter(f => f.endsWith('.ts') && f !== 'index.ts')

let failed = false
const allClubIds = new Map() // id -> [{file, line}]
const allPlayerIds = new Map()

for (const file of files) {
  const lines = readFileSync(join(dataDir, file), 'utf8').split('\n')
  const clubSeasonKeys = new Map() // club|season -> [{id, line}]
  lines.forEach((text, i) => {
    const lineNo = i + 1
    const header = text.match(/^\s{4}id: '([^']+)', club: '([^']+)', shortName: '[^']+', season: '([^']+)'/)
    if (header) {
      const [, id, club, season] = header
      const key = `${club}|${season}`
      if (!clubSeasonKeys.has(key)) clubSeasonKeys.set(key, [])
      clubSeasonKeys.get(key).push({ id, line: lineNo })
      if (!allClubIds.has(id)) allClubIds.set(id, [])
      allClubIds.get(id).push({ file, line: lineNo })
      return
    }
    const player = text.match(/^\s{6}\{ id: '([^']+)', name: '/)
    if (player) {
      const id = player[1]
      if (!allPlayerIds.has(id)) allPlayerIds.set(id, [])
      allPlayerIds.get(id).push({ file, line: lineNo })
    }
  })
  for (const [key, entries] of clubSeasonKeys) {
    if (entries.length > 1) {
      failed = true
      console.log(`DUPLICATE club+season in ${file}: ${key}`)
      entries.forEach(e => console.log(`   id '${e.id}' at line ${e.line}`))
    }
  }
}

for (const [id, locs] of allClubIds) {
  if (locs.length > 1) {
    failed = true
    console.log(`DUPLICATE club-season id '${id}': ${locs.map(l => `${l.file}:${l.line}`).join(', ')}`)
  }
}
for (const [id, locs] of allPlayerIds) {
  if (locs.length > 1) {
    failed = true
    console.log(`DUPLICATE player id '${id}': ${locs.map(l => `${l.file}:${l.line}`).join(', ')}`)
  }
}

console.log(`\nChecked ${files.length} files, ${allClubIds.size} club-season ids, ${allPlayerIds.size} player ids.`)
console.log(failed ? 'FAIL: duplicates found' : 'OK: no duplicates')
process.exit(failed ? 1 : 0)
